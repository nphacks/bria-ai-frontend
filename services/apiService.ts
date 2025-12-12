import { GeneratedImage } from '../types';

// Helper to ensure GeneratedImage is always flat and consistent
export const normalizeGeneratedImage = (data: any): GeneratedImage => {
  if (!data) return { image_url: '' };

  // Handle legacy string array case
  if (typeof data === 'string') {
    return { image_url: data };
  }

  let result: GeneratedImage;

  // Handle nested image_url object
  if (data.image_url && typeof data.image_url === 'object') {
    const nested = data.image_url;
    result = {
      ...data,       // Keep parent props
      ...nested,     // Merge nested props (like seed, structured_prompt)
      image_url: nested.image_url || '' // Flatten the actual URL
    } as GeneratedImage;
  } else {
    // Already correct structure
    result = data as GeneratedImage;
  }

  // Ensure structured_prompt is an object, not a string
  if (result.structured_prompt && typeof result.structured_prompt === 'string') {
    try {
      result.structured_prompt = JSON.parse(result.structured_prompt);
    } catch (e) {
      console.warn('Failed to parse structured_prompt in normalize', e);
    }
  }

  return result;
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
          // Strip data URI prefix if present (for uploaded images)
          const cleanRef = ref.replace(/^data:image\/\w+;base64,/, "");
          images.push(cleanRef);
        } else {
          // Bria GeneratedImage object
          images.push(ref.image_url);
          
          // Extract metadata if available (specific to Bria images)
          if (ref.seed !== undefined) {
             seeds.push(ref.seed);
          }
          if (ref.structured_prompt) {
             let sp = ref.structured_prompt;
             // Ensure it is parsed if it represents a JSON string
             if (typeof sp === 'string') {
                 try {
                     sp = JSON.parse(sp);
                 } catch (e) {
                     console.warn("Failed to parse structured_prompt during generation prep", e);
                 }
             }
             structured_prompts.push(sp);
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

export const eraseImage = async (imageUrl: string, maskBase64: string): Promise<GeneratedImage> => {
  try {
    // Remove data URI prefix if present (e.g., "data:image/png;base64,")
    const cleanMask = maskBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch('http://localhost:8000/edit/erase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        mask: cleanMask,
        mask_type: "manual",
        preserve_alpha: true,
        sync: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.image_url) {
        // Fallback if the backend returns the raw object directly
        if (data.result_url) return normalizeGeneratedImage({ image_url: data.result_url });
        throw new Error('No image URL returned from backend');
    }

    return normalizeGeneratedImage(data);
  } catch (error) {
    console.error('Erase failed:', error);
    throw error;
  }
};

export const generativeFill = async (imageUrl: string, maskBase64: string, prompt: string): Promise<GeneratedImage> => {
  try {
    // Remove data URI prefix if present
    const cleanMask = maskBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch('http://localhost:8000/edit/gen_fill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        mask: cleanMask,
        prompt: prompt,
        version: 2,
        sync: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.image_url) {
        if (data.result_url) return normalizeGeneratedImage({ image_url: data.result_url });
        throw new Error('No image URL returned from backend');
    }

    return normalizeGeneratedImage(data);
  } catch (error) {
    console.error('Generative fill failed:', error);
    throw error;
  }
};

export const removeBackground = async (imageUrl: string): Promise<GeneratedImage> => {
  try {
    const response = await fetch('http://localhost:8000/edit/remove_bg/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        preserve_alpha: true,
        sync: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.image_url) {
        if (data.result_url) return normalizeGeneratedImage({ image_url: data.result_url });
        throw new Error('No image URL returned from backend');
    }

    return normalizeGeneratedImage(data);
  } catch (error) {
    console.error('Remove background failed:', error);
    throw error;
  }
};

export const removeForeground = async (imageUrl: string): Promise<GeneratedImage> => {
  try {
    const response = await fetch('http://localhost:8000/edit/erase_fg/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        preserve_alpha: true,
        sync: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.image_url) {
        if (data.result_url) return normalizeGeneratedImage({ image_url: data.result_url });
        throw new Error('No image URL returned from backend');
    }

    return normalizeGeneratedImage(data);
  } catch (error) {
    console.error('Remove foreground failed:', error);
    throw error;
  }
};

export const blurBackground = async (imageUrl: string, scale: number): Promise<GeneratedImage> => {
  try {
    const response = await fetch('http://localhost:8000/edit/blur_bg/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        scale: scale,
        preserve_alpha: true,
        sync: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.image_url) {
        if (data.result_url) return normalizeGeneratedImage({ image_url: data.result_url });
        throw new Error('No image URL returned from backend');
    }

    return normalizeGeneratedImage(data);
  } catch (error) {
    console.error('Blur background failed:', error);
    throw error;
  }
};

export const replaceBackground = async (imageUrl: string, prompt: string): Promise<GeneratedImage> => {
  try {
    if (!prompt || !prompt.trim()) {
      throw new Error("Prompt is required for background replacement.");
    }

    const response = await fetch('http://localhost:8000/edit/replace_bg/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        mode: 'high_control',
        prompt: prompt,
        sync: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.image_url) {
        if (data.result_url) return normalizeGeneratedImage({ image_url: data.result_url });
        throw new Error('No image URL returned from backend');
    }

    return normalizeGeneratedImage(data);
  } catch (error) {
    console.error('Replace background failed:', error);
    throw error;
  }
};

export const expandImage = async (imageUrl: string, aspectRatio?: string, prompt?: string): Promise<GeneratedImage> => {
  try {
    const body: any = {
      image: imageUrl,
      preserve_alpha: true,
      sync: true
    };
    if (aspectRatio) body.aspect_ratio = aspectRatio;
    if (prompt) body.prompt = prompt;

    const response = await fetch('http://localhost:8000/edit/expand/', {
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
        if (data.result_url) return normalizeGeneratedImage({ image_url: data.result_url });
        throw new Error('No image URL returned from backend');
    }

    return normalizeGeneratedImage(data);
  } catch (error) {
    console.error('Expand image failed:', error);
    throw error;
  }
};

export const generateFullDescriptions = async (structuredPrompt: any): Promise<any> => {
  try {
    const response = await fetch('http://localhost:8000/edit/generate_full_descriptions/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structured_prompt: structuredPrompt
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Generate full descriptions failed:', error);
    throw error;
  }
};