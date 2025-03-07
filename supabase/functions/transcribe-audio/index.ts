
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

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
    const { audioBase64 } = await req.json();
    
    if (!audioBase64) {
      throw new Error('No audio data provided');
    }

    console.log('Received audio data for transcription');
    
    // Convert base64 audio to binary
    const audioBlob = base64Decode(audioBase64);
    
    // Create a FormData object to send to OpenAI
    const formData = new FormData();
    formData.append('file', new Blob([audioBlob], { type: 'audio/webm' }), 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Optional: specify language
    
    // Send request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'Transcription failed');
    }
    
    const data = await response.json();
    console.log('Transcription completed successfully');
    
    return new Response(
      JSON.stringify({ text: data.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
