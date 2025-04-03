import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { corsHeaders } from '../_shared/cors.ts'
import { parseOpenAIError, createErrorResponse } from '../_shared/errors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { dreamId, description } = await req.json();
    
    if (!dreamId || !description) {
      return new Response(
        JSON.stringify({ error: 'Dream ID and description are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Processing dream:', dreamId);
    console.log('Initial description:', description);

    // Use OpenAI to enhance the description
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Use the new error handling utility
      const errorResponse = parseOpenAIError(errorText);
      return createErrorResponse(errorResponse);
    }

    const openAiData = await openAiResponse.json();
    const enhancedDescription = openAiData.choices[0].message.content;
    console.log('Enhanced description:', enhancedDescription);

    // Generate image using DALL-E 3
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
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
        response_format: "b64_json"
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('DALL-E API error:', errorText);
      
      // Use the new error handling utility
      const errorResponse = parseOpenAIError(errorText);
      return createErrorResponse(errorResponse);
    }

    const imageData = await imageResponse.json();
    console.log('Image generated successfully');

    if (!imageData.data || !imageData.data[0]?.b64_json) {
      const errorResponse = parseOpenAIError('No image data in OpenAI response');
      return createErrorResponse(errorResponse);
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert base64 to Uint8Array
    const imageBytes = base64Decode(imageData.data[0].b64_json);
    const fileName = `${dreamId}_${Date.now()}.png`;

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('dream-images')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Storage upload error: ${uploadError.message}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase
      .storage
      .from('dream-images')
      .getPublicUrl(fileName);

    // Update the dream with the generated image URL
    const { error: updateError } = await supabase
      .from('dreams')
      .update({ 
        image_url: publicUrl,
        enhanced_description: enhancedDescription
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Error updating dream:', updateError);
      return new Response(
        JSON.stringify({ error: `Database update error: ${updateError.message}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        enhancedDescription 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error generating dream image:', error);
    
    // Use the new error handling utility
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse = parseOpenAIError(errorMessage);
    return createErrorResponse(errorResponse);
  }
});
