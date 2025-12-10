import { GenerateRequest, GenerateResponse } from '../types';

const API_URL = 'http://localhost:8000';

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const payload: GenerateRequest = { prompt };
    
    const response = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error ${response.status}: ${errorText || response.statusText}`);
    }

    const data: GenerateResponse = await response.json();
    
    if (!data.image_url) {
      throw new Error('Invalid response format: Missing image_url');
    }

    return data.image_url;
  } catch (error) {
    console.error('Generation failed:', error);
    throw error;
  }
};