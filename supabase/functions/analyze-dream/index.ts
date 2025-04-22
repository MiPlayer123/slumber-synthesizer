import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { 
  parseOpenAIError, 
  createErrorResponse, 
  handleParsingError, 
  handleDatabaseError,
  sanitizeAIResponse,
  extractFallbackAnalysis
} from '../_shared/errors.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { dreamContent, dreamId, userId } = await req.json()
    
    if (!dreamContent || !dreamId || !userId) {
      throw new Error('Dream content, dream ID, and user ID are required')
    }

    console.log('Analyzing dream:', { dreamId, userId, contentLength: dreamContent.length })
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a dream analyst. Analyze the dream and provide a structured response with a rating (1-5), themes (array), symbols (array), emotions (array), and interpretation (string).
Return ONLY valid JSON.
You are DreamGuideGPT, a wise and empathetic dream analysis expert with deep knowledge of psychology, symbolism, and emotional insight.
Analyze the user's dream in great detail. Consider **all** of the following in your interpretation:
- The **specific imagery and symbols** in the dream (and what they might represent subconsciously or culturally).
- The **emotions** the dreamer experienced.
- The **narrative structure** and flow of the dream.
- Potential **connections to waking life** situations or stressors.
- The overall **tone and atmosphere**.
Please provide your analysis in the following JSON format ONLY:
{
  "rating": number (1-5),
  "themes": string[],
  "symbols": string[],
  "emotions": string[],
  "interpretation": string
}
Ensure the JSON is complete and valid. Do not include any introductory text or explanations outside the JSON structure.`
          },
          {
            role: 'user',
            content: dreamContent
          }
        ],
      }),
    })

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text()
      console.error('OpenAI API error:', errorText)
      
      // Use the new error parsing utility
      const errorResponse = parseOpenAIError(errorText)
      return createErrorResponse(errorResponse)
    }

    const openAIData = await openAIResponse.json()
    console.log('OpenAI response received')
    
    let analysis
    try {
      // Sanitize the response before attempting to parse it
      const sanitizedContent = sanitizeAIResponse(openAIData.choices[0].message.content);
      
      // Log the sanitized content for debugging
      console.log('Sanitized content:', sanitizedContent.substring(0, 100) + '...');
      
      // Parse the sanitized content
      analysis = JSON.parse(sanitizedContent)
      
      // Validate the analysis structure before proceeding
      if (!analysis || typeof analysis !== 'object') {
        throw new Error('OpenAI response is not a valid object');
      }
      
      // Validate and sanitize required fields for database compatibility
      const requiredFields = ['rating', 'themes', 'symbols', 'emotions', 'interpretation'];
      for (const field of requiredFields) {
        if (analysis[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Ensure rating is an integer (handle decimal ratings by rounding)
      if (typeof analysis.rating === 'string') {
        // Convert string ratings like "3.5" to numbers and round them
        const parsedRating = parseFloat(analysis.rating);
        if (isNaN(parsedRating)) {
          analysis.rating = 3; // Default to middle rating if unparseable
        } else {
          analysis.rating = Math.round(parsedRating);
        }
      } else if (typeof analysis.rating === 'number') {
        // Round any decimal ratings
        analysis.rating = Math.round(analysis.rating);
      }
      
      // Ensure arrays are actually arrays
      ['themes', 'symbols', 'emotions'].forEach(field => {
        if (!Array.isArray(analysis[field])) {
          analysis[field] = typeof analysis[field] === 'string' 
            ? [analysis[field]] 
            : [];
        }
      });
      
      // Ensure interpretation is a string
      if (typeof analysis.interpretation !== 'string') {
        analysis.interpretation = String(analysis.interpretation || '');
      }
      
    } catch (error) {
      console.error('Failed to parse OpenAI response:', openAIData.choices[0].message.content);
      
      // Try fallback extraction before giving up
      console.log('Attempting fallback extraction...');
      const fallbackAnalysis = extractFallbackAnalysis(openAIData.choices[0].message.content);
      
      if (fallbackAnalysis) {
        console.log('Fallback extraction succeeded');
        analysis = fallbackAnalysis;
      } else {
        // If fallback extraction also fails, return error
        console.error('Fallback extraction failed');
        const errorResponse = handleParsingError(openAIData.choices[0].message.content);
        return createErrorResponse(errorResponse);
      }
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    )

    console.log('Storing analysis in database')

    const { error: insertError } = await supabaseClient
      .from('dream_analyses')
      .insert([
        {
          dream_id: dreamId,
          user_id: userId,
          rating: analysis.rating,
          themes: analysis.themes,
          symbols: analysis.symbols,
          emotions: analysis.emotions,
          interpretation: analysis.interpretation,
        },
      ])

    if (insertError) {
      console.error('Database insertion error:', insertError);
      // Use the specialized database error handler
      const errorResponse = handleDatabaseError(insertError);
      return createErrorResponse(errorResponse);
    }

    console.log('Analysis stored successfully')

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Function error:', error)
    
    // Use the new error handling utility for all errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorResponse = parseOpenAIError(errorMessage)
    return createErrorResponse(errorResponse)
  }
})
