
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

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

    const openAIData = await openAIResponse.json()
    const analysis = JSON.parse(openAIData.choices[0].message.content)

    // Store the analysis in the database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
