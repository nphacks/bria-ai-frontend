import { GeneratedImage } from '../types';

// Helper to ensure GeneratedImage is always flat and consistent
export const normalizeGeneratedImage = (data: any): GeneratedImage => {
  if (!data) return { image_url: '' };

  // Handle legacy string array case
  if (typeof data === 'string') {
    return { image_url: data };
  }

  // Handle nested image_url object (The specific fix requested)
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

export const generateImage = async (prompt: string, referenceImages?: string[]): Promise<GeneratedImage> => {
  try {
    const response = await fetch('http://localhost:8000/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, referenceImages }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
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