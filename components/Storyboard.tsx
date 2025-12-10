import React, { useState, useRef, useEffect } from 'react';
import { ScriptElement, CharacterProfile, ArtStyle, GeneratedImage } from '../types';
import { ArrowLeft, Loader2, Image as ImageIcon, Clapperboard, User, Film, Sparkles, X, Plus, Users, Save } from 'lucide-react';
import { generateImage } from '../services/apiService';

interface StoryboardProps {
  sceneElements: ScriptElement[];
  onBack: () => void;
  savedCharacters: CharacterProfile[];
  onAddCharacter: (char: CharacterProfile) => void;
  onOpenCharacterList: () => void;
  existingStoryboard: GeneratedImage | undefined;
  onUpdateStoryboard: (image: GeneratedImage) => void;
}

interface SelectionMenu {
  x: number;
  y: number;
  text: string;
}

interface CharacterFormState {
  name: string;
  description: string;
  visualDetails: string;
  artStyle: ArtStyle;
  referenceImages: string[];
  currentPreview: GeneratedImage | null;
}

const ART_STYLES: ArtStyle[] = [
  'Cinematic/Digital',
  'Pencil Sketch',
  'Oil Painting',
  'Watercolor',
  'Ink Illustration'
];

export const Storyboard: React.FC<StoryboardProps> = ({ 
  sceneElements, 
  onBack, 
  savedCharacters,
  onAddCharacter,
  onOpenCharacterList,
  existingStoryboard,
  onUpdateStoryboard
}) => {
  // Main Visualization State
  const [generatedScene, setGeneratedScene] = useState<GeneratedImage | null>(existingStoryboard || null);
  const [isLoading, setIsLoading] = useState(false);
  const [generationType, setGenerationType] = useState<'SCENE' | 'CHARACTER' | 'FULL_SCENE'>('FULL_SCENE');
  const [promptUsed, setPromptUsed] = useState<string>('');
  
  // Selection Menu State
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu | null>(null);
  const scriptRef = useRef<HTMLDivElement>(null);

  // Character Creation State (Separate from the List Modal)
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  
  // Character Form State
  const [charForm, setCharForm] = useState<CharacterFormState>({
    name: '',
    description: '',
    visualDetails: '',
    artStyle: 'Cinematic/Digital',
    referenceImages: [],
    currentPreview: null
  });

  // Sync state with prop if prop changes (e.g. navigation or update)
  useEffect(() => {
    if (existingStoryboard) {
        setGeneratedScene(existingStoryboard);
    }
  }, [existingStoryboard]);

  // Handle outside clicks to close menu
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (selectionMenu && window.getSelection()?.isCollapsed) {
        setSelectionMenu(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [selectionMenu]);

  const heading = sceneElements.find(el => el.type === 'SCENE_HEADING')?.content || 'Unknown Scene';
  
  const constructFullScenePrompt = () => {
    return sceneElements
      .filter(el => el.type === 'ACTION' || el.type === 'SCENE_HEADING')
      .map(el => el.content)
      .join(' ');
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    if (scriptRef.current && !scriptRef.current.contains(selection.anchorNode)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionMenu({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: text
    });
  };

  // --- Character Logic ---

  const handleOpenCharacterModal = (selectedText: string) => {
    setCharForm({
      name: selectedText,
      description: selectedText,
      visualDetails: '',
      artStyle: 'Cinematic/Digital',
      referenceImages: [],
      currentPreview: null
    });
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
    setIsCharacterModalOpen(true);
  };

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: any) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setCharForm(prev => ({
            ...prev,
            referenceImages: [...(prev.referenceImages || []), base64]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleGenerateCharacterPreview = async () => {
    setIsLoading(true);
    try {
      const { name, description, visualDetails, artStyle, referenceImages } = charForm;
      const prompt = `Character Design Sheet for "${name}". 
      Description: ${description}. 
      Visual Details: ${visualDetails}. 
      Art Style: ${artStyle}.
      Ensure consistency with provided reference images if any.
      High quality, detailed character portrait.`;

      const result = await generateImage(prompt, referenceImages);
      setCharForm(prev => ({ ...prev, currentPreview: result }));
    } catch (error) {
      console.error(error);
      alert('Failed to generate character preview.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCharacter = () => {
    if (charForm.name && charForm.currentPreview) {
      const newChar: CharacterProfile = {
        id: Date.now().toString(),
        name: charForm.name,
        description: charForm.description,
        visualDetails: charForm.visualDetails,
        artStyle: charForm.artStyle,
        referenceImages: charForm.referenceImages,
        generatedPortraits: [charForm.currentPreview!]
      };
      
      onAddCharacter(newChar);
      setIsCharacterModalOpen(false);
    }
  };

  // --- Main Generate Handler ---
  
  const handleGenerateMain = async (text: string, type: 'SCENE' | 'CHARACTER' | 'FULL_SCENE') => {
    setIsLoading(true);
    setSelectionMenu(null);
    setGenerationType(type);
    setPromptUsed(text);
    window.getSelection()?.removeAllRanges();

    try {
      let finalPrompt = text;
      if (type === 'SCENE') {
        finalPrompt = `Cinematic movie scene, wide angle, 8k resolution, detailed environment: ${text}`;
      } else if (type === 'CHARACTER') {
        finalPrompt = `Character Portrait, detailed, 8k: ${text}`;
      } else {
         finalPrompt = `Cinematic storyboard frame, movie still, 8k: ${text}`;
      }
      const result = await generateImage(finalPrompt);
      setGeneratedScene(result);
      
      // If we generated a scene or full scene, save it as the storyboard for this scene
      if (type === 'SCENE' || type === 'FULL_SCENE') {
          onUpdateStoryboard(result);
      }

    } catch (error) {
      console.error("Failed to generate", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden relative">
      
      {/* Character Creation Modal */}
      {isCharacterModalOpen && (
        <div className="fixed inset-0 z-[50] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">
            
            {/* Form Side */}
            <div className="p-6 md:w-1/2 space-y-4 border-r border-zinc-800">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  Create Character
                </h3>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Character Name</label>
                <input 
                  type="text" 
                  value={charForm.name}
                  onChange={e => setCharForm({...charForm, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Willy Wonka"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Description</label>
                <textarea 
                  value={charForm.description}
                  onChange={e => setCharForm({...charForm, description: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 outline-none h-20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Visual Details (Looks, Accessories, Colors)</label>
                <textarea 
                  value={charForm.visualDetails}
                  onChange={e => setCharForm({...charForm, visualDetails: e.target.value})}
                  placeholder="Green waistcoat, colorful scarf, top hat, crazy eyes..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 outline-none h-20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Art Style</label>
                <select 
                  value={charForm.artStyle}
                  onChange={e => setCharForm({...charForm, artStyle: e.target.value as ArtStyle})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white outline-none"
                >
                  {ART_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Reference Images</label>
                <div className="flex gap-2 items-center overflow-x-auto pb-2">
                   {charForm.referenceImages?.map((img, idx) => (
                     <div key={idx} className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden border border-zinc-700">
                        <img src={img} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setCharForm(prev => ({...prev, referenceImages: prev.referenceImages?.filter((_, i) => i !== idx)}))}
                          className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                     </div>
                   ))}
                   <label className="w-12 h-12 flex-shrink-0 rounded border border-dashed border-zinc-600 flex items-center justify-center hover:bg-zinc-800 cursor-pointer">
                      <Plus className="w-4 h-4 text-zinc-500" />
                      <input type="file" accept="image/*" multiple onChange={handleReferenceImageUpload} className="hidden" />
                   </label>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                 <button 
                   onClick={handleGenerateCharacterPreview}
                   disabled={isLoading || !charForm.name}
                   className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded font-medium flex items-center justify-center gap-2"
                 >
                   {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                   Generate Preview
                 </button>
                 <button onClick={() => setIsCharacterModalOpen(false)} className="px-4 py-2 border border-zinc-600 rounded hover:bg-zinc-800">Cancel</button>
              </div>
            </div>

            {/* Preview Side */}
            <div className="p-6 md:w-1/2 bg-black flex flex-col items-center justify-center relative border-l border-zinc-800 min-h-[300px]">
              {charForm.currentPreview ? (
                <>
                  <img src={charForm.currentPreview.image_url} alt="Preview" className="w-full h-full object-contain max-h-[400px] rounded" />
                  <div className="absolute bottom-6 flex gap-2">
                     <button 
                        onClick={handleSaveCharacter}
                        className="bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                     >
                       <Save className="w-4 h-4" />
                       Save to Gallery
                     </button>
                  </div>
                </>
              ) : (
                <div className="text-zinc-600 flex flex-col items-center">
                  <User className="w-16 h-16 mb-2 opacity-20" />
                  <p className="text-sm">Preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Selection Menu */}
      {selectionMenu && (
        <div 
          className="fixed z-50 flex items-center gap-1 p-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            left: selectionMenu.x, 
            top: selectionMenu.y,
            transform: 'translate(-50%, -120%)'
          }}
        >
          <button 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleOpenCharacterModal(selectionMenu.text)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-md transition-colors whitespace-nowrap"
          >
            <User className="w-3 h-3 text-emerald-400" />
            Create character
          </button>
          <div className="w-px h-4 bg-zinc-600" />
          <button 
             onMouseDown={(e) => e.preventDefault()}
             onClick={() => handleGenerateMain(selectionMenu.text, 'SCENE')}
             className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-md transition-colors whitespace-nowrap"
          >
            <Film className="w-3 h-3 text-indigo-400" />
            Create scene
          </button>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Script</span>
          </button>
          <div className="ml-6 flex items-center space-x-2 text-zinc-500">
              <span>/</span>
              <span className="font-screenplay font-bold text-zinc-200">{heading}</span>
          </div>
        </div>

        {/* Character Bank Controls */}
        <div className="flex items-center space-x-2">
            <button 
                onClick={onOpenCharacterList}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-md text-sm transition-colors border border-zinc-700"
            >
                <Users className="w-4 h-4" />
                <span>Character List</span>
                {savedCharacters.length > 0 && (
                    <span className="bg-emerald-600 text-white text-[10px] px-1.5 rounded-full">{savedCharacters.length}</span>
                )}
            </button>
            <div className="h-4 w-px bg-zinc-700 mx-1"></div>
            <div className="flex items-center gap-1">
                {savedCharacters.slice(0, 3).map(char => (
                    <img key={char.id} src={char.generatedPortraits[0].image_url} className="w-8 h-8 rounded-full border border-zinc-600 object-cover" title={char.name} />
                ))}
                {savedCharacters.length > 3 && <span className="text-xs text-zinc-500">+{savedCharacters.length - 3}</span>}
            </div>
        </div>
      </div>

      <div className="flex-grow flex overflow-hidden">
        {/* Left: Scene Script */}
        <div 
          ref={scriptRef}
          onMouseUp={handleTextSelection}
          className="w-1/3 border-r border-zinc-800 overflow-y-auto p-8 bg-[#1a1a1a] cursor-text selection:bg-emerald-500/30 selection:text-emerald-50"
        >
          <div className="font-screenplay text-sm space-y-4">
             {sceneElements.map(el => (
               <div key={el.id} className={
                 el.type === 'SCENE_HEADING' ? 'font-bold uppercase mb-4 text-zinc-100' :
                 el.type === 'CHARACTER' ? 'mt-4 uppercase font-bold text-zinc-300 text-center' :
                 el.type === 'DIALOGUE' ? 'text-zinc-400 text-center px-8' :
                 el.type === 'PARENTHETICAL' ? 'text-zinc-500 text-center italic' :
                 'text-zinc-300'
               }>
                 {el.content}
               </div>
             ))}
          </div>
          <div className="mt-12 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs flex items-center gap-3">
             <Sparkles className="w-4 h-4 text-emerald-600" />
             <span>Highlight text to Create Character or Scene.</span>
          </div>
        </div>

        {/* Right: Visualization */}
        <div className="w-2/3 p-12 flex flex-col items-center justify-center bg-zinc-950 relative">
          
          {generatedScene ? (
            <div className="w-full max-w-4xl flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                <div className="relative group w-full aspect-video rounded-lg overflow-hidden shadow-2xl border border-zinc-800 bg-black">
                    <img src={generatedScene.image_url} alt="Storyboard" className="w-full h-full object-contain" />
                </div>
                <div className="flex justify-between items-start text-sm">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            generationType === 'CHARACTER' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-900' :
                            generationType === 'SCENE' ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-900' :
                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                            {generationType.replace('_', ' ')}
                        </span>
                        <p className="text-zinc-500 line-clamp-1 italic max-w-md">"{promptUsed}"</p>
                    </div>
                    <button 
                        onClick={() => handleGenerateMain(promptUsed, generationType)}
                        className="text-zinc-400 hover:text-white flex items-center gap-2 text-xs"
                    >
                        <Loader2 className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                        Regenerate
                    </button>
                </div>
            </div>
          ) : (
            <div className="text-center space-y-6 max-w-md">
              <div className="w-24 h-24 bg-zinc-900 rounded-2xl mx-auto flex items-center justify-center border border-zinc-800">
                 {isLoading ? <Loader2 className="w-10 h-10 animate-spin text-emerald-500" /> : <Clapperboard className="w-10 h-10 text-zinc-600" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Visualize Scene</h3>
                <p className="text-zinc-500">
                  Select text from the script to generate specific details, or generate a master shot for the whole scene below.
                </p>
              </div>
              <button
                onClick={() => handleGenerateMain(constructFullScenePrompt(), 'FULL_SCENE')}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to Backend...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span>Generate Master Shot</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};