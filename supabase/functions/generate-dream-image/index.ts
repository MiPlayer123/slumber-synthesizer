import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { corsHeaders } from '../_shared/cors.ts'

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
      const error = await openAiResponse.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${error}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const openAiData = await openAiResponse.json();
    const enhancedDescription = openAiData.choices[0].message.content;
    console.log('Enhanced description:', enhancedDescription);

    // Generate image using Imagen 3 API
    const imageResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=' + Deno.env.get('GEMINI_API_KEY'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: `Generate a dreamy, surreal image of: ${enhancedDescription}. Use a dreamlike, ethereal style with soft lighting and mystical elements.`
          }
        ],
        parameters: {
          sampleCount: 1
        }
      }),
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.text();
      console.error('Imagen API error:', error);
      return new Response(
        JSON.stringify({ error: `Imagen API error: ${error}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const imageData = await imageResponse.json();
    console.log('Image generated successfully');

    // Extract base64 image data from Imagen response with fallbacks for different response formats
    let base64ImageData;
    
    // First check if response is in the new Imagen 3 format
    if (imageData.predictions && imageData.predictions[0]?.bytesBase64Encoded) {
      base64ImageData = imageData.predictions[0].bytesBase64Encoded;
      console.log('Found image data in predictions[0].bytesBase64Encoded format');
    } 
    // Fallback to the older format in case the API changes
    else if (imageData.candidates && imageData.candidates[0]?.content?.parts) {
      const imagePart = imageData.candidates[0].content.parts.find(part => part.inlineData);
      if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
        base64ImageData = imagePart.inlineData.data;
        console.log('Found image data in candidates[0].content.parts[].inlineData.data format');
      }
    }
    
    if (!base64ImageData) {
      console.error('Response format:', JSON.stringify(imageData).substring(0, 200) + '...');
      return new Response(
        JSON.stringify({ error: 'No image data found in response. Unsupported format.' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('Successfully extracted image data from response');

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert base64 to Uint8Array
    const imageBytes = base64Decode(base64ImageData);
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
    console.error('Error in generate-dream-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      },
    );
  }
});
