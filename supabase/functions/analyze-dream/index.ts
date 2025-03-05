
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
            content: 'You are a dream analyst. Analyze the dream and provide a structured response with a rating (1-5), themes (array), symbols (array), emotions (array), and interpretation (string). Return ONLY valid JSON. You are DreamGuideGPT, a wise and empathetic dream analysis expert with deep knowledge of psychology, symbolism, and emotional insight. Analyze the user’s dream in great detail. Consider **all** of the following in your interpretation: - The **specific imagery and symbols** in the dream (and what they might represent subconsciously or culturally). - The **emotions** the user experienced in the dream and upon waking. - Any provided context about the user’s **life situation, mood, or recent events** (connect the dream’s themes to the user’s personal experiences or stresses). - The dream’s storyline and how it **progressed or changed**, noting any significant turning points or patterns. - Relevant **psychological theories** (e.g. Jungian archetypes, Freudian themes) or common dream symbolism that could shed light on the dream’s meaning. - **Past dream patterns** if available (e.g. “This is another dream about falling; in your past entries, falling tended to appear during times of anxiety at work”). Now **compose a thorough interpretation** directly addressing the user. Use an engaging and supportive tone, as if guiding them through the meaning of their dream. Be **highly specific** – reference the dream’s key details and symbols and explain what each aspect might mean **for *them*** (avoid generic platitudes). Show that you understand how the user *felt* in the dream. Finally, provide insightful conclusions or questions for reflection. For example, you might gently suggest what the dream could be telling the user about their waking life or emotions, and invite them to think about it (“Perhaps the dark forest in your dream reflects feeling uncertainty in your career path. How do you feel about that possibility?”). Make sure the user feels their dream has been deeply understood and leave them with a sense of clarity or curiosity about their subconscious mind.'
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
