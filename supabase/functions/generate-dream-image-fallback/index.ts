import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { dreamId, description } = await req.json();

    if (!dreamId || !description) {
      return new Response(
        JSON.stringify({ error: "Dream ID and description are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Processing dream (fallback):", dreamId);
    console.log("Initial description:", description);

    // SIMPLIFIED VERSION: Skip OpenAI enhancement and use the description directly
    // This avoids the 400 error we were getting with the description enhancement

    // Create a simple enhanced description using string manipulation
    const dreamDescription = description || "abstract dream";
    const enhancedDescription =
      dreamDescription.length > 10
        ? dreamDescription
        : "abstract surreal dreamscape";

    // Generate a simple prompt for the image generation
    const imagePrompt = `Generate a dreamy, surreal image of: ${enhancedDescription}. Use a dreamlike, ethereal style with soft lighting and mystical elements.`;

    console.log("Using fallback image prompt:", imagePrompt);

    // Get the API key with validation
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({
          error: "Configuration error",
          message:
            "The image generation service is not properly configured. Please contact support.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate image using Imagen 3 API
    const imageResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=" +
        geminiApiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: imagePrompt,
            },
          ],
          parameters: {
            sampleCount: 1,
          },
        }),
      },
    );

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Imagen API error response text (fallback):", errorText);

      try {
        const errorJson = JSON.parse(errorText);
        // Check for specific Google AI safety error
        if (
          errorJson.error &&
          errorJson.error.status === "INVALID_ARGUMENT" &&
          errorJson.error.message &&
          (errorJson.error.message.includes("sensitive words") ||
            errorJson.error.message.includes("Responsible AI practices"))
        ) {
          console.warn(
            "Imagen API blocked request due to content policy:",
            errorJson.error.message,
          );
          // Return a 200 OK response but indicate the blocking reason
          return new Response(
            JSON.stringify({
              success: false,
              status: "blocked_content",
              message:
                "Image generation was blocked because the description contained potentially sensitive content. Please try rephrasing.",
              imageUrl: null,
              enhancedDescription: enhancedDescription,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (parseError) {
        console.error("Failed to parse Imagen API error JSON:", parseError);
      }

      // If it's not the specific content policy error, handle as a generic API error
      console.error("Unhandled Imagen API error (fallback):", errorText);
      return new Response(
        JSON.stringify({
          error: "Image generation failed",
          details: errorText,
          message:
            "The fallback image generation service encountered an error.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const imageData = await imageResponse.json();
    console.log("Image generated successfully (fallback)");

    // Extract base64 image data from Imagen response
    let base64ImageData;

    // First check if response is in the new Imagen 3 format
    if (imageData.predictions && imageData.predictions[0]?.bytesBase64Encoded) {
      base64ImageData = imageData.predictions[0].bytesBase64Encoded;
      console.log(
        "Found image data in predictions[0].bytesBase64Encoded format",
      );
    }
    // Fallback to the older format in case the API changes
    else if (imageData.candidates && imageData.candidates[0]?.content?.parts) {
      const imagePart = imageData.candidates[0].content.parts.find(
        (part) => part.inlineData,
      );
      if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
        base64ImageData = imagePart.inlineData.data;
        console.log(
          "Found image data in candidates[0].content.parts[].inlineData.data format",
        );
      }
    }

    if (!base64ImageData) {
      console.error(
        "Response format (fallback):",
        JSON.stringify(imageData).substring(0, 200) + "...",
      );
      return new Response(
        JSON.stringify({
          error: "No image data found in response",
          details: "Unsupported format",
          message:
            "The fallback image generation service returned an unexpected format.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Successfully extracted image data from response (fallback)");

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Convert base64 to Uint8Array
    const imageBytes = base64Decode(base64ImageData);
    const fileName = `${dreamId}_fallback_${Date.now()}.png`;

    // Create a Blob with the correct MIME type to fix the upload issue
    const blob = new Blob([imageBytes], { type: "image/png" });

    // Upload image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("dream-images")
      .upload(fileName, blob, {
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error (fallback):", uploadError);
      return new Response(
        JSON.stringify({
          error: `Storage upload error: ${uploadError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get public URL for the uploaded image
    const {
      data: { publicUrl },
    } = supabase.storage.from("dream-images").getPublicUrl(fileName);

    // Update the dream with the generated image URL
    const { error: updateError } = await supabase
      .from("dreams")
      .update({
        image_url: publicUrl,
        enhanced_description: enhancedDescription,
      })
      .eq("id", dreamId);

    if (updateError) {
      console.error("Error updating dream (fallback):", updateError);
      return new Response(
        JSON.stringify({
          error: `Database update error: ${updateError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        status: "generated",
        imageUrl: publicUrl,
        enhancedDescription,
        source: "fallback",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating dream image (fallback):", error);

    return new Response(
      JSON.stringify({
        error: "Fallback image generation failed",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
