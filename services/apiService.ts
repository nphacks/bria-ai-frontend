import { GeneratedImage } from '../types';

// Helper to ensure GeneratedImage is always flat and consistent
export const normalizeGeneratedImage = (data: any): GeneratedImage => {
  if (!data) return { image_url: '' };

  // Handle legacy string array case
  if (typeof data === 'string') {
    return { image_url: data };
  }

  // Handle nested image_url object
  if (data.image_url && typeof data.image_url === 'object') {
    const nested = data.image_url;
    return {
      ...data,       // Keep parent props
      ...nested,     // Merge nested props (like seed, structured_prompt)
      image_url: nested.image_url || '' // Flatten the actual URL
    } as GeneratedImage;
  }

  // Already correct structure
  return data as GeneratedImage;
};

export const generateImage = async (prompt: string, referenceImages?: (string | GeneratedImage)[]): Promise<GeneratedImage> => {
  try {
    // Default to prompt-only endpoint
    let url = 'http://localhost:8000/generate/prompt';
    let body: any = { prompt };

    // Switch to unified endpoint if reference images exist
    if (referenceImages && referenceImages.length > 0) {
      url = 'http://localhost:8000/generate/unified';
      
      const images: string[] = [];
      const seeds: number[] = [];
      const structured_prompts: any[] = [];

      referenceImages.forEach(ref => {
        if (typeof ref === 'string') {
          // External image (base64 or url)
          images.push(ref);
        } else {
          // Bria GeneratedImage object
          images.push(ref.image_url);
          
          // Extract metadata if available (specific to Bria images)
          if (ref.seed !== undefined) {
             seeds.push(ref.seed);
          }
          if (ref.structured_prompt) {
             structured_prompts.push(ref.structured_prompt);
          }
        }
      });

      body = {
        prompt,
        images,
        // Only include seeds and structured_prompts if we actually collected some
        seeds: seeds.length > 0 ? seeds : undefined,
        structured_prompts: structured_prompts.length > 0 ? structured_prompts : undefined
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.image_url) {
      throw new Error('No image URL returned from backend');
    }

    // Return normalized object
    return normalizeGeneratedImage(data);
  } catch (error) {
    console.error('Generation failed:', error);
    throw error;
  }
};