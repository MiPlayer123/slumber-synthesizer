import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { parseOpenAIError, createErrorResponse } from "../_shared/errors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Client-Info',
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
    
    // Validate and normalize the file extension and mime type
    let normalizedExtension = fileExtension.replace(/^audio\//, '');
    let normalizedMimeType = mimeType;
    
    if (!normalizedMimeType.startsWith('audio/')) {
      normalizedMimeType = `audio/${normalizedExtension}`;
    }
    
    console.log(`Normalized parameters: extension=${normalizedExtension}, mimeType=${normalizedMimeType}`);
    
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
    const fileName = `recording.${normalizedExtension}`; // Use the determined extension
    
    try {
      // Create a file object from the binary data
      console.log(`Attempting to create File object: name=${fileName}, type=${normalizedMimeType}`);
      const file = new File([audioBlob], fileName, { type: normalizedMimeType });
      
      formData.append('file', file);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      
      console.log('FormData created successfully with File object');
    } catch (fileError) {
      console.error('Error creating File object:', fileError);
      
      // Fallback to Blob if File constructor fails
      try {
        console.log(`Attempting to create Blob object: name=${fileName}, type=${normalizedMimeType}`);
        const blob = new Blob([audioBlob], { type: normalizedMimeType });
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
      const errorResponse = parseOpenAIError(`Network error: ${error.message}`);
      return createErrorResponse(errorResponse);
    }
    
    if (!response.ok) {
      try {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        
        // Use the new error handler for OpenAI errors
        const errorResponse = parseOpenAIError(errorText);
        
        // Return a proper error response using our utility
        return createErrorResponse(errorResponse);
      } catch (e) {
        console.error('Error parsing error response:', e);
        const errorResponse = parseOpenAIError(`Status ${response.status}`);
        return createErrorResponse(errorResponse);
      }
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
    
    // Using the new error handler for all types of errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse = parseOpenAIError(errorMessage);
    return createErrorResponse(errorResponse);
  }
});
