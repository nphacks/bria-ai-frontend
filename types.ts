
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

export interface StoryboardItem {
  id: string;
  image: GeneratedImage;
  note: string;
  
  // Legacy fields
  shotType?: string;
  shotComposition?: string;
  
  // New fields
  shotSize?: string;
  framing?: string;
  cameraAngle?: string;
  
  // Sequence fields
  sceneNumber?: number;
  shotNumber?: string;

  description: string; // The visual description used for generation
  scriptContext: string; // The selected text from the script
}

export interface ProjectData {
  screenplay: ScriptElement[];
  characters: CharacterProfile[];
  storyboards: Record<string, StoryboardItem[]>; // Key is the SCENE_HEADING element ID
}
