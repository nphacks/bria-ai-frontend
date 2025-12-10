export type ScriptElementType = 
  | 'SCENE_HEADING'
  | 'ACTION'
  | 'CHARACTER'
  | 'DIALOGUE'
  | 'PARENTHETICAL'
  | 'TRANSITION';

export interface ScriptElement {
  id: string;
  type: ScriptElementType;
  content: string;
  sceneNumber?: number;
}

export interface Screenplay {
  title: string;
  elements: ScriptElement[];
}

export type ArtStyle = 'Cinematic/Digital' | 'Pencil Sketch' | 'Oil Painting' | 'Watercolor' | 'Ink Illustration';

export interface GeneratedImage {
  image_url: string;
  seed?: number;
  structured_prompt?: any;
}

export interface CharacterProfile {
  id: string;
  name: string;
  description: string;
  visualDetails: string;
  artStyle: ArtStyle;
  referenceImages: string[]; // Base64 strings
  generatedPortraits: GeneratedImage[]; // Array of result image objects
}