import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  parseOpenAIError,
  createErrorResponse,
  handleParsingError,
  handleDatabaseError,
  sanitizeAIResponse,
  extractFallbackAnalysis,
} from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, X-Client-Info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dreamContent, dreamId, userId } = await req.json();

    if (!dreamContent || !dreamId || !userId) {
      throw new Error("Dream content, dream ID, and user ID are required");
    }

    console.log("Analyzing dream:", {
      dreamId,
      userId,
      contentLength: dreamContent.length,
    });

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are DreamGuideGPT, a master dream analyst trained in Jungian psychology, Freudian analysis, and modern dream science. Your role is to provide DEEP, MEANINGFUL interpretations that reveal the subconscious messages behind dreams.

CRITICAL INSTRUCTIONS:
1. DO NOT simply summarize or retell what happened in the dream
2. DO NOT give vague, generic interpretations that could apply to any dream
3. ALWAYS focus on the PSYCHOLOGICAL MEANING and what the dream reveals about the dreamer's inner world
4. Connect symbols to their deeper significance in the dreamer's psyche
5. Explain what unresolved emotions, fears, desires, or life situations the dream might be processing
6. Be specific and insightful - make the dreamer feel like you truly understand what their subconscious is telling them

For your interpretation, address:
- What deep-seated emotions, fears, or desires might this dream be expressing?
- What aspects of the dreamer's waking life could be manifesting symbolically?
- What is the subconscious trying to communicate or work through?
- What personal growth or self-awareness might this dream be pointing toward?
- Any archetypal patterns (shadow self, anima/animus, transformation, etc.)

Rate the dream 1-5 based on:
1 = Very negative/disturbing themes
2 = Somewhat negative or anxiety-inducing
3 = Neutral or mixed
4 = Positive, growth-oriented
5 = Very positive, transformative, or enlightening

Return ONLY valid JSON in this exact format:
{
  "rating": number (1-5),
  "themes": string[] (3-5 deep psychological themes, NOT plot points),
  "symbols": string[] (key symbolic elements and their meanings),
  "emotions": string[] (underlying emotional states being processed),
  "interpretation": string (2-3 paragraphs of deep psychological analysis - NO SUMMARY, only meaning and insight)
}`,
            },
            {
              role: "user",
              content: dreamContent,
            },
          ],
        }),
      },
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);

      // Use the new error parsing utility
      const errorResponse = parseOpenAIError(errorText);
      return createErrorResponse(errorResponse);
    }

    const openAIData = await openAIResponse.json();
    console.log("OpenAI response received");

    let analysis;
    try {
      // Sanitize the response before attempting to parse it
      const sanitizedContent = sanitizeAIResponse(
        openAIData.choices[0].message.content,
      );

      // Log the sanitized content for debugging
      console.log(
        "Sanitized content:",
        sanitizedContent.substring(0, 100) + "...",
      );

      // Parse the sanitized content
      analysis = JSON.parse(sanitizedContent);

      // Validate the analysis structure before proceeding
      if (!analysis || typeof analysis !== "object") {
        throw new Error("OpenAI response is not a valid object");
      }

      // Validate and sanitize required fields for database compatibility
      const requiredFields = [
        "rating",
        "themes",
        "symbols",
        "emotions",
        "interpretation",
      ];
      for (const field of requiredFields) {
        if (analysis[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Ensure rating is a number 1-5
      analysis.rating = Number(analysis.rating);
      if (
        isNaN(analysis.rating) ||
        analysis.rating < 1 ||
        analysis.rating > 5
      ) {
        analysis.rating = 3; // Default to middle rating if invalid
      }

      // Make sure all array fields are actually arrays
      ["themes", "symbols", "emotions"].forEach((field) => {
        if (!Array.isArray(analysis[field])) {
          analysis[field] =
            typeof analysis[field] === "string" ? [analysis[field]] : [];
        }
      });

      // Ensure interpretation is a string
      if (typeof analysis.interpretation !== "string") {
        analysis.interpretation = String(analysis.interpretation || "");
      }
    } catch (parsingError) {
      console.error(
        "Failed to parse OpenAI response:",
        openAIData.choices[0].message.content,
        parsingError,
      );

      // Try fallback extraction before giving up
      console.log("Attempting fallback extraction...");
      const fallbackAnalysis = extractFallbackAnalysis(
        openAIData.choices[0].message.content,
      );

      if (fallbackAnalysis) {
        console.log("Fallback extraction succeeded");
        analysis = fallbackAnalysis;
      } else {
        // If fallback extraction also fails, return error
        console.error("Fallback extraction failed");
        const errorResponse = handleParsingError(
          openAIData.choices[0].message.content,
        );
        return createErrorResponse(errorResponse);
      }
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      },
    );

    console.log("Storing analysis in database");

    const { error: insertError } = await supabaseClient
      .from("dream_analyses")
      .insert([
        {
          dream_id: dreamId,
          user_id: userId,
          rating: analysis.rating,
          themes: analysis.themes,
          symbols: analysis.symbols,
          emotions: analysis.emotions,
          interpretation: analysis.interpretation,
        },
      ]);

    if (insertError) {
      console.error("Database insertion error:", insertError);
      // Use the specialized database error handler
      const errorResponse = handleDatabaseError(insertError);
      return createErrorResponse(errorResponse);
    }

    console.log("Analysis stored successfully");

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);

    // Use the new error handling utility for all errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse = parseOpenAIError(errorMessage);
    return createErrorResponse(errorResponse);
  }
});
