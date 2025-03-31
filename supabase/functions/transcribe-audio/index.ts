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
    
    const { 
      audioBase64, 
      fileExtension = 'webm', // Default fallback
      mimeType = 'audio/webm', // Default fallback
      userAgent = 'Unknown'   // Capture user agent if sent
    } = body;
    
    if (!audioBase64) {
      console.error('No audio data provided in request');
      throw new Error('No audio data provided');
    }

    console.log(`Received request: User-Agent: ${userAgent}`);
    console.log(`Received parameters: fileExtension=${fileExtension}, mimeType=${mimeType}`);
    
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
      console.log('Decoded audio data, size:', audioBlob.length, 'bytes');
    } catch (error) {
      console.error('Error decoding base64 audio:', error);
      throw new Error('Invalid audio data format');
    }
    
    // Create a FormData object to send to OpenAI
    const formData = new FormData();
    const fileName = `recording.${fileExtension}`; // Use the determined extension
    
    try {
      // Create a file object from the binary data
      console.log(`Attempting to create File object: name=${fileName}, type=${mimeType}`);
      const file = new File([audioBlob], fileName, { type: mimeType });
      
      formData.append('file', file);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      
      console.log('FormData created successfully with File object');
    } catch (fileError) {
      console.error('Error creating File object:', fileError);
      
      // Fallback to Blob if File constructor fails
      try {
        console.log(`Attempting to create Blob object: name=${fileName}, type=${mimeType}`);
        const blob = new Blob([audioBlob], { type: mimeType });
        formData.append('file', blob, fileName);
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
        
        console.log('FormData created successfully with Blob fallback');
      } catch (blobError) {
        console.error('Error creating Blob:', blobError);
        throw new Error(`Cannot create form data: ${blobError.message}`);
      }
    }
    
    console.log('Sending request to OpenAI API with file:', fileName);
    
    // Send request to OpenAI API with enhanced error handling
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });
      
      console.log('Received response from OpenAI API, status:', response.status);
    } catch (error) {
      console.error('Network error when calling OpenAI API:', error);
      throw new Error(`Network error: ${error.message}`);
    }
    
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.error?.message || `Status ${response.status}`;
        } catch {
          errorDetails = errorText || `Status ${response.status}`;
        }
      } catch (e) {
        console.error('Error parsing error response:', e);
        errorDetails = `Status ${response.status}`;
      }
      
      throw new Error(`Transcription failed: ${errorDetails}`);
    }
    
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Invalid response from OpenAI API');
    }
    
    if (!data.text) {
      console.error('No transcription in response:', data);
      throw new Error('No transcription returned from OpenAI');
    }
    
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
