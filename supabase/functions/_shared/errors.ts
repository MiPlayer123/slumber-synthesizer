import { corsHeaders } from "./cors.ts";

// Error types that can be returned from the functions
export enum ErrorType {
  INVALID_REQUEST = "INVALID_REQUEST",
  AUTHORIZATION = "AUTHORIZATION",
  CONTENT_MODERATION = "CONTENT_MODERATION",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  RATE_LIMIT = "RATE_LIMIT",
  DATABASE_ERROR = "DATABASE_ERROR",
  PARSING_ERROR = "PARSING_ERROR",
  UNKNOWN = "UNKNOWN",
}

// Interface for standardized error responses
export interface ErrorResponse {
  error: string;
  errorType: ErrorType;
  details?: string;
  suggestedAction?: string;
}

/**
 * Handles errors from AI API responses, with special handling for content moderation issues
 * @param error The error object or text from the API
 * @param source Optional source of the error (e.g., 'OpenAI', 'Gemini')
 * @returns Standardized error response with type and suggested actions
 */
export function handleAIError(
  error: unknown,
  source: string = "AI Service",
): ErrorResponse {
  // Convert error to string for processing
  const errorStr =
    typeof error === "object" ? JSON.stringify(error) : String(error);

  const errorLower = errorStr.toLowerCase();

  // Enhanced content moderation detection - covers more cases
  if (
    errorLower.includes("content policy") ||
    errorLower.includes("moderation") ||
    errorLower.includes("inappropriate") ||
    errorLower.includes("violat") ||
    errorLower.includes("harmful") ||
    errorLower.includes("offensive") ||
    errorLower.includes("nsfw") ||
    errorLower.includes("content filter") ||
    errorLower.includes("sensitive words") ||
    errorLower.includes("responsible ai") ||
    errorLower.includes("could not be submitted") ||
    errorLower.includes("policy violation")
  ) {
    return {
      error: `Your request contains content that ${source} cannot process`,
      errorType: ErrorType.CONTENT_MODERATION,
      details:
        "The content may violate usage policies or contain inappropriate material",
      suggestedAction:
        "Please modify your request to remove any potentially sensitive or inappropriate content",
    };
  }

  // Enhanced parsing error detection for malformed or unexpected response formats
  if (
    errorLower.includes("parse") ||
    errorLower.includes("parsing") ||
    errorLower.includes("invalid format") ||
    errorLower.includes("failed to parse") ||
    errorLower.includes("syntax error")
  ) {
    return {
      error: `Failed to process ${source} response`,
      errorType: ErrorType.PARSING_ERROR,
      details: "The response was received but could not be properly processed",
      suggestedAction:
        "Try again with a more straightforward request or contact support",
    };
  }

  // Database errors
  if (
    errorLower.includes("database") ||
    errorLower.includes("invalid input syntax") ||
    errorLower.includes("duplicate key") ||
    errorLower.includes("violates constraint") ||
    errorLower.includes("db error")
  ) {
    return {
      error: "Database operation failed",
      errorType: ErrorType.DATABASE_ERROR,
      details: errorStr,
      suggestedAction: "Please check your input data format and try again",
    };
  }

  // Authentication/authorization errors
  if (
    errorLower.includes("api key") ||
    errorLower.includes("auth") ||
    errorLower.includes("unauthorized") ||
    errorLower.includes("permission")
  ) {
    return {
      error: `${source} authentication error`,
      errorType: ErrorType.AUTHORIZATION,
      details: errorStr.replace(/sk-[a-zA-Z0-9]{1,}/g, "[API_KEY_REDACTED]"), // Redact any API keys
      suggestedAction: "Please check your API key and permissions",
    };
  }

  // Rate limiting
  if (
    errorLower.includes("rate limit") ||
    errorLower.includes("too many") ||
    errorLower.includes("quota")
  ) {
    return {
      error: `${source} rate limit exceeded`,
      errorType: ErrorType.RATE_LIMIT,
      details: errorStr,
      suggestedAction:
        "Please try again later or reduce the frequency of requests",
    };
  }

  // Service unavailable
  if (
    errorLower.includes("unavailable") ||
    errorLower.includes("down") ||
    errorLower.includes("maintenance")
  ) {
    return {
      error: `${source} is currently unavailable`,
      errorType: ErrorType.SERVICE_UNAVAILABLE,
      details: errorStr,
      suggestedAction: "Please try again later",
    };
  }

  // Default unknown error
  return {
    error: `${source} request failed`,
    errorType: ErrorType.UNKNOWN,
    details: errorStr,
    suggestedAction:
      "Please try again or contact support if the issue persists",
  };
}

/**
 * Parses error text from OpenAI API responses and extracts structured information
 * @param errorText The error text from OpenAI
 * @returns Standardized error response
 */
export function parseOpenAIError(errorText: string): ErrorResponse {
  try {
    // Try to parse JSON error
    const errorData = JSON.parse(errorText);
    const errorMessage =
      errorData.error?.message ||
      errorData.error?.code ||
      "Unknown OpenAI error";
    return handleAIError(errorMessage, "OpenAI");
  } catch {
    // If not JSON, handle as plain text
    return handleAIError(errorText, "OpenAI");
  }
}

/**
 * Parses error text from Gemini API responses and extracts structured information
 * @param errorText The error text from Gemini
 * @returns Standardized error response
 */
export function parseGeminiError(errorText: string): ErrorResponse {
  try {
    // Try to parse JSON error
    const errorData = JSON.parse(errorText);

    // Handle nested error structure that Gemini often uses
    if (errorData.error && typeof errorData.error === "object") {
      // Extract nested code and message
      const code = errorData.error.code;
      const message = errorData.error.message;
      const status = errorData.error.status;

      // Check for specific content policy violations in the message
      if (
        message &&
        (message.includes("prompt could not be submitted") ||
          message.includes("sensitive words") ||
          message.includes("violate Google's Responsible AI") ||
          message.includes("content policy") ||
          message.includes("safety filter"))
      ) {
        return {
          error: "Your request contains content that Gemini cannot process",
          errorType: ErrorType.CONTENT_MODERATION,
          details: message,
          suggestedAction:
            "Please modify your request to remove any potentially sensitive content or try rephrasing your request",
        };
      }

      // Create detailed error message combining all available info
      const detailedMessage = [
        code ? `Code: ${code}` : null,
        message ? `Message: ${message}` : null,
        status ? `Status: ${status}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      return handleAIError(detailedMessage, "Gemini");
    }

    // Fallback to standard error format
    const errorMessage =
      errorData.error?.message ||
      errorData.error?.status ||
      "Unknown Gemini error";
    return handleAIError(errorMessage, "Gemini");
  } catch {
    // If not JSON, handle as plain text
    return handleAIError(errorText, "Gemini");
  }
}

/**
 * Creates a standardized error Response object
 * @param errorResponse The structured error information
 * @param status HTTP status code (default: 400)
 * @returns Response object with error information
 */
export function createErrorResponse(
  errorResponse: ErrorResponse,
  status: number = 400,
): Response {
  // Adjust status code based on error type
  if (errorResponse.errorType === ErrorType.AUTHORIZATION) {
    status = 401;
  } else if (errorResponse.errorType === ErrorType.RATE_LIMIT) {
    status = 429;
  } else if (errorResponse.errorType === ErrorType.SERVICE_UNAVAILABLE) {
    status = 503;
  } else if (errorResponse.errorType === ErrorType.CONTENT_MODERATION) {
    status = 422; // Unprocessable Entity
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Special handler for database errors
 * @param error The database error
 * @returns Standardized error response
 */
export function handleDatabaseError(error: unknown): ErrorResponse {
  const errorStr =
    typeof error === "object" ? JSON.stringify(error) : String(error);
  const errorLower = errorStr.toLowerCase();

  // Handle type conversion errors
  if (errorLower.includes("invalid input syntax for type")) {
    return {
      error: "Data type conversion error",
      errorType: ErrorType.DATABASE_ERROR,
      details: errorStr,
      suggestedAction:
        "Please ensure your data matches the required format. For numeric fields, use whole numbers where required.",
    };
  }

  // Handle duplicate key errors
  if (
    errorLower.includes("duplicate key") ||
    errorLower.includes("unique constraint")
  ) {
    return {
      error: "Duplicate record error",
      errorType: ErrorType.DATABASE_ERROR,
      details: errorStr,
      suggestedAction:
        "This record already exists in the database. Please update the existing record instead.",
    };
  }

  // Default database error
  return {
    error: "Database operation failed",
    errorType: ErrorType.DATABASE_ERROR,
    details: errorStr,
    suggestedAction: "Please check your input data and try again",
  };
}

/**
 * Handles JSON parsing errors from AI responses that appear valid but don't match expected structure
 * @param rawResponse The raw response string that failed to parse as expected
 * @returns Standardized error response
 */
export function handleParsingError(rawResponse: string): ErrorResponse {
  // If it's a very large response, truncate it for the error details
  const truncatedResponse =
    rawResponse.length > 500
      ? rawResponse.substring(0, 500) + "... (truncated)"
      : rawResponse;

  return {
    error: "Failed to process AI response",
    errorType: ErrorType.PARSING_ERROR,
    details: `The response was received but couldn't be properly processed: ${truncatedResponse}`,
    suggestedAction:
      "Try again with a more straightforward request. If the issue persists, contact support.",
  };
}

/**
 * Sanitizes AI responses to extract valid JSON from potentially mixed content
 * @param response Raw response text from AI that may contain extra text, markdown, etc.
 * @returns The extracted JSON string, or the original response if no JSON found
 */
export function sanitizeAIResponse(response: string): string {
  // Try to extract JSON if it's wrapped in markdown code blocks
  const jsonBlockRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
  const jsonBlockMatch = response.match(jsonBlockRegex);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }

  // Try to extract JSON if it's anywhere in the text
  const jsonRegex = /({[\s\S]*})/;
  const jsonMatch = response.match(jsonRegex);
  if (jsonMatch && jsonMatch[1]) {
    try {
      // Verify it's actually valid JSON
      JSON.parse(jsonMatch[1]);
      return jsonMatch[1].trim();
    } catch {
      // Not valid JSON, continue with other methods
    }
  }

  // Return original if no JSON pattern found
  return response;
}

/**
 * Attempts to extract structured dream analysis data from unstructured or partially structured AI responses
 * This is a fallback when JSON parsing fails but we still want to try to salvage usable data
 * @param response The raw AI response text
 * @returns A structured analysis object or null if extraction fails
 */
export function extractFallbackAnalysis(
  response: string,
): Record<string, any> | null {
  try {
    const result: Record<string, any> = {
      rating: 3, // Default rating
      themes: [],
      symbols: [],
      emotions: [],
      interpretation: "",
    };

    // Try to find rating (number between 1-5, possibly with decimals)
    const ratingMatch =
      response.match(/rating[:\s]*([1-5](?:\.\d+)?)/i) ||
      response.match(/([1-5](?:\.\d+)?)\s*\/\s*5/i);
    if (ratingMatch && ratingMatch[1]) {
      const parsedRating = parseFloat(ratingMatch[1]);
      if (!isNaN(parsedRating)) {
        result.rating = Math.round(parsedRating);
      }
    }

    // Try to extract arrays using common patterns
    const arrayFields = ["themes", "symbols", "emotions"];
    for (const field of arrayFields) {
      // Look for arrays in multiple formats
      // Format: field: ["item1", "item2"...]
      const jsonArrayMatch = new RegExp(
        `"?${field}"?\\s*[:=]\\s*(\\[[^\\]]+\\])`,
        "i",
      ).exec(response);
      if (jsonArrayMatch && jsonArrayMatch[1]) {
        try {
          const parsedArray = JSON.parse(jsonArrayMatch[1]);
          if (Array.isArray(parsedArray)) {
            result[field] = parsedArray;
            continue;
          }
        } catch {
          // Silently handle JSON parse errors, will try other extraction methods
        }
      }

      // Format: field: item1, item2, item3
      const commaListMatch = new RegExp(
        `"?${field}"?\\s*[:=]\\s*([^\\[\\]\\n]+?)(?:,|\\n|$)`,
        "i",
      ).exec(response);
      if (commaListMatch && commaListMatch[1]) {
        const items = commaListMatch[1]
          .split(",")
          .map(
            (item) => item.trim().replace(/^["']|["']$/g, ""), // Remove quotes
          )
          .filter(Boolean);

        if (items.length > 0) {
          result[field] = items;
          continue;
        }
      }

      // Format: - item1\n- item2\n- item3
      const bulletMatch = response.match(
        new RegExp(`"?${field}"?[^\\n]*\\n((?:\\s*-[^\\n]+\\n?)+)`, "i"),
      );
      if (bulletMatch && bulletMatch[1]) {
        const items = bulletMatch[1]
          .split("\n")
          .map((line) => line.replace(/^\s*-\s*/, "").trim())
          .filter(Boolean);

        if (items.length > 0) {
          result[field] = items;
        }
      }
    }

    // Extract interpretation (the largest text block)
    const interpretationMatch = response.match(
      /interpretation[:\s]*([\s\S]+?)(?:(?:\n\s*[a-zA-Z]+:)|$)/i,
    );
    if (interpretationMatch && interpretationMatch[1]) {
      result.interpretation = interpretationMatch[1].trim();
    } else {
      // If no labeled interpretation found, use the largest paragraph as interpretation
      const paragraphs = response.split(/\n\s*\n/);
      let longestParagraph = "";
      for (const paragraph of paragraphs) {
        if (paragraph.length > longestParagraph.length) {
          longestParagraph = paragraph;
        }
      }

      if (longestParagraph) {
        result.interpretation = longestParagraph.trim();
      }
    }

    // Validate we have some useful data
    if (
      result.interpretation &&
      (result.themes.length > 0 ||
        result.symbols.length > 0 ||
        result.emotions.length > 0)
    ) {
      return result;
    }

    return null;
  } catch (error) {
    console.error("Error in fallback extraction:", error);
    return null;
  }
}

/**
 * Enhanced detection for Gemini content policy blocks
 * Some strings that commonly appear in Gemini content policy blocks
 */
export const geminiBlockPatterns = [
  "I cannot fulfill this request",
  "I'm not able to process this request",
  "I apologize, but I cannot",
  "I cannot generate content that",
  "This content may violate our policies",
  "violate Google's Responsible AI",
  "This request appears to",
  "try rephrasing the prompt",
  "sensitive words",
  "content policy",
  "safety guidelines",
  "potentially harmful",
  "potentially sensitive",
];

/**
 * Checks if a Gemini response contains content policy blocks even if status code is 200
 * @param responseText The response text from Gemini
 * @returns True if the response contains content policy blocks
 */
export function hasGeminiContentBlock(responseText: string): boolean {
  const lowerText = responseText.toLowerCase();

  for (const pattern of geminiBlockPatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Create a fallback error response for cases where the API returns a "success"
 * but the content indicates a policy violation or other issue
 * @param model The AI model name (e.g., 'gpt-4', 'gemini-pro')
 * @param responseText The response text to check for issues
 * @returns ErrorResponse if issues detected, null otherwise
 */
export function detectHiddenResponseIssues(
  model: string,
  responseText: string,
): ErrorResponse | null {
  // For Gemini, check for content policy blocks
  if (
    model.toLowerCase().includes("gemini") &&
    hasGeminiContentBlock(responseText)
  ) {
    return {
      error: "Your request triggered Gemini's content filter",
      errorType: ErrorType.CONTENT_MODERATION,
      details:
        "Gemini returned a response that indicates content policy violation",
      suggestedAction:
        "Please modify your request to remove any potentially sensitive content or try rephrasing your request",
    };
  }

  // For OpenAI/general models, check for generic refusal patterns
  if (
    responseText.toLowerCase().includes("i cannot") ||
    responseText.toLowerCase().includes("i'm not able to") ||
    responseText.toLowerCase().includes("i apologize") ||
    responseText.toLowerCase().includes("i'm unable to")
  ) {
    // Check if it's most likely a content moderation issue
    if (
      responseText.toLowerCase().includes("policy") ||
      responseText.toLowerCase().includes("guideline") ||
      responseText.toLowerCase().includes("harmful") ||
      responseText.toLowerCase().includes("inappropriate") ||
      responseText.toLowerCase().includes("offensive")
    ) {
      return {
        error: "The AI model refused to process this content",
        errorType: ErrorType.CONTENT_MODERATION,
        details:
          "The model's response indicates a possible content policy violation",
        suggestedAction:
          "Please modify your request to remove any potentially sensitive content",
      };
    }
  }

  return null;
}
