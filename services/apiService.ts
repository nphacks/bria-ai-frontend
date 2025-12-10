export const generateImage = async (prompt: string, referenceImages?: string[]): Promise<string> => {
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

    return data.image_url;
  } catch (error) {
    console.error('Generation failed:', error);
    throw error;
  }
};