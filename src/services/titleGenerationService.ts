import { apiKeyService } from './apiKeyService';

/**
 * Service to generate dream titles from descriptions using OpenAI
 */
export const titleGenerationService = {
  /**
   * Generate a title for a dream based on its description
   * @param description The dream description to generate a title for
   * @returns A promise that resolves to the generated title
   */
  generateTitle: async (description: string): Promise<string> => {
    if (!description) {
      return 'My Dream';
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeyService.getApiKey()}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates short, creative titles for dreams. Generate a brief, imaginative title (4-6 words max) based on the dream description provided. Do not include quotes or any explanations, just return the title text.'
            },
            {
              role: 'user',
              content: `Generate a title for this dream: ${description.substring(0, 500)}...`
            }
          ],
          temperature: 0.7,
          max_tokens: 30
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Error generating title:', data);
        return createFallbackTitle(description);
      }

      // Extract the title from the response
      const generatedTitle = data.choices?.[0]?.message?.content?.trim() || createFallbackTitle(description);
      return generatedTitle;
    } catch (error) {
      console.error('Failed to generate title:', error);
      return createFallbackTitle(description);
    }
  }
};

/**
 * Create a fallback title if the API request fails
 * @param description The dream description to create a title from
 * @returns A simple title based on the first few words
 */
function createFallbackTitle(description: string): string {
  if (!description) {
    return 'My Dream';
  }

  // Take the first few words of the description
  const words = description.split(' ');
  const titleWords = words.slice(0, 4);
  const title = titleWords.join(' ');

  // If the title is too short, just use a generic one
  if (title.length < 10) {
    return 'My Dream';
  }

  return title + (title.endsWith('.') ? '' : '...');
} 