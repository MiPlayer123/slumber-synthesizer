
import { supabase } from '@/integrations/supabase/client';

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
      // Create a structured request for title generation
      const request = {
        prompt: description.substring(0, 500),
        type: 'title',
        maxWords: 6
      };

      // Call the analyze-dream Edge Function
      // We use the existing Edge Function since it already has OpenAI access
      const { data, error } = await supabase.functions.invoke('analyze-dream', {
        body: request
      });

      if (error) {
        console.error('Error generating title:', error);
        return createFallbackTitle(description);
      }

      // Extract the title from the response
      const generatedTitle = data?.title || createFallbackTitle(description);
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
