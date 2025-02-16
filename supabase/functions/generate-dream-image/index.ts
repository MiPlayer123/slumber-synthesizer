
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dreamId, description } = await req.json();
    
    console.log('Processing dream:', dreamId);
    console.log('Initial description:', description);

    // First, use Mistral to enhance the description
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MISTRAL_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "mistral-medium",
        messages: [
          {
            role: "system",
            content: "You are a creative writer specializing in vivid, detailed descriptions for image generation. Take the user's dream description and enhance it with visual details, making it more suitable for image generation. Focus on visual elements, atmosphere, and artistic style. Keep the description concise but detailed, around 2-3 sentences."
          },
          {
            role: "user",
            content: `Please enhance this dream description for image generation: ${description}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!mistralResponse.ok) {
      const error = await mistralResponse.text();
      console.error('Mistral API error:', error);
      throw new Error(`Mistral API error: ${error}`);
    }

    const mistralData = await mistralResponse.json();
    const enhancedDescription = mistralData.choices[0].message.content;
    console.log('Enhanced description:', enhancedDescription);

    // Now use DALL-E 3 to generate the image
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Generate a dreamy, surreal image of: ${enhancedDescription}. Use a dreamlike, ethereal style with soft lighting and mystical elements.`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid"
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI response received');

    if (!openaiData.data || !openaiData.data[0]?.url) {
      throw new Error('No image URL in OpenAI response');
    }

    const imageUrl = openaiData.data[0].url;

    // Update the dream with the generated image URL
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('dreams')
      .update({ 
        image_url: imageUrl,
        enhanced_description: enhancedDescription  // Store the enhanced description too
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Error updating dream:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        enhancedDescription 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in generate-dream-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      },
    );
  }
});
