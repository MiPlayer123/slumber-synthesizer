import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { corsHeaders } from '../_shared/cors.ts'
import { parseOpenAIError, createErrorResponse } from '../_shared/errors.ts' // Keep enhanced error handling imports

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // Using standard error response for auth, consistent with both branches
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
      // Using standard error response for missing params, consistent with both branches
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
      
      // Use the new error handling utility from samaylakhani branch
      const errorResponse = parseOpenAIError(errorText);
      return createErrorResponse(errorResponse); 
    }

    const openAiData = await openAiResponse.json();
    const enhancedDescription = openAiData.choices[0].message.content;
    console.log('Enhanced description:', enhancedDescription);

    // Generate image using Imagen 3 API (from main branch)
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

    // --- Conflict Resolution 1 Start ---
    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      // Log Imagen error (from main branch) but use utility error handling (from samaylakhani branch)
      console.error('Imagen API error:', errorText); 
      const errorResponse = parseOpenAIError(errorText); // Assuming parseOpenAIError can handle generic text or needs adjustment
      return createErrorResponse(errorResponse);
    }
    // --- Conflict Resolution 1 End ---

    const imageData = await imageResponse.json();
    console.log('Image generated successfully'); // Kept from main branch

    // --- Conflict Resolution 2 Start ---
    // Extract base64 image data from Imagen response with fallbacks (logic from main branch)
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
      // Use utility error handling (from samaylakhani branch)
      const errorResponse = parseOpenAIError('No image data found in response. Unsupported format.'); 
      return createErrorResponse(errorResponse, 500); // Specify status code if needed
    }
    // --- Conflict Resolution 2 End ---
    
    console.log('Successfully extracted image data from response'); // Added this log for clarity

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert base64 to Uint8Array
    const imageBytes = base64Decode(base64ImageData); // Use the extracted base64ImageData
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
      // Using standard error response for Supabase errors, consistent with both branches
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
      // Using standard error response for Supabase errors, consistent with both branches
      return new Response(
        JSON.stringify({ error: `Database update error: ${updateError.message}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Success response
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
    
    // Use the new error handling utility from samaylakhani branch in the main catch block
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse = parseOpenAIError(errorMessage); 
    return createErrorResponse(errorResponse);
  }
});