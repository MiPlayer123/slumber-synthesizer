// Service to manage API keys securely
// This provides a layer of abstraction so the actual key is not directly exposed in components

// We're using a hard-coded key here as requested by the user
// In a production environment, this would be handled more securely via server-side processing
//const OPENAI_API_KEY = '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';

export const apiKeyService = {
  // Get the API key for use
  getApiKey: (): string => {
    return OPENAI_API_KEY;
  },
  
  // Check if we have a valid API key
  hasApiKey: (): boolean => {
    return !!OPENAI_API_KEY;
  }
}; 