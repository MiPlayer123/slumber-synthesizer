
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, // Use 204 No Content for OPTIONS
      headers: corsHeaders 
    });
  }

  try {
    // Check if request is POST
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Get the body data
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body format');
    }
    
    const { audioBase64 } = body;
    
    if (!audioBase64) {
      console.error('No audio data provided in request');
      throw new Error('No audio data provided');
    }

    console.log('Received audio data for transcription, length:', audioBase64.length);
    
    // Check if OPENAI_API_KEY is available
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OpenAI API key is not set');
      throw new Error('OpenAI API key is not configured');
    }
    
    // Convert base64 audio to binary
    let audioBlob;
    try {
      audioBlob = base64Decode(audioBase64);
      console.log('Decoded audio data, size:', audioBlob.length);
    } catch (error) {
      console.error('Error decoding base64 audio:', error);
      throw new Error('Invalid audio data format');
    }
    
    // Create a FormData object to send to OpenAI
    const formData = new FormData();
    formData.append('file', new Blob([audioBlob], { type: 'audio/webm' }), 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Optional: specify language
    
    console.log('Sending request to OpenAI API');
    
    // Send request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || `Transcription failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Transcription completed successfully');
    
    return new Response(
      JSON.stringify({ text: data.text }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    );
  }
});
