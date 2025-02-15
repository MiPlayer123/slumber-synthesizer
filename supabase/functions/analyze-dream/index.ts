
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { dreamContent, dreamId } = await req.json()
    
    if (!dreamContent || !dreamId) {
      throw new Error('Dream content and dream ID are required')
    }

    console.log('Analyzing dream:', { dreamId, contentLength: dreamContent.length })
    
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
            content: 'You are a dream analyst. Analyze the dream and provide a structured response with a rating (1-5), themes (array), symbols (array), emotions (array), and interpretation (string). Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: dreamContent
          }
        ],
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error('Failed to get analysis from OpenAI')
    }

    const openAIData = await openAIResponse.json()
    console.log('OpenAI response received')
    
    let analysis
    try {
      analysis = JSON.parse(openAIData.choices[0].message.content)
    } catch (error) {
      console.error('Failed to parse OpenAI response:', openAIData.choices[0].message.content)
      throw new Error('Invalid analysis format received from OpenAI')
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
          rating: analysis.rating,
          themes: analysis.themes,
          symbols: analysis.symbols,
          emotions: analysis.emotions,
          interpretation: analysis.interpretation,
        },
      ])

    if (insertError) {
      console.error('Database insertion error:', insertError)
      throw insertError
    }

    console.log('Analysis stored successfully')

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )
  }
})
