import { apiKeyService } from './apiKeyService';

/**
 * Initialize application-wide configurations and services
 * This should be called once when the app starts up
 */
export const initializeApp = (): void => {
  // The API key is already initialized in the apiKeyService
  // This function exists to ensure other initialization steps are done in one place
  
  // Print confirmation that the app is initialized (for development only)
  if (import.meta.env.DEV) {
    console.log('App initialized');
    console.log('API services ready:', apiKeyService.hasApiKey());
  }
}; 