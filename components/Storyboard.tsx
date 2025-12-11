import React, { useState, useRef, useEffect } from 'react';
import { ScriptElement, CharacterProfile, ArtStyle, GeneratedImage, StoryboardItem } from '../types';
import { ArrowLeft, Loader2, Image as ImageIcon, Clapperboard, User, Film, Sparkles, X, Plus, Users, Save, Trash2, ArrowUp, ArrowDown, Edit3, Camera, Quote, CheckCircle2 } from 'lucide-react';
import { generateImage } from '../services/apiService';

interface StoryboardProps {
  sceneElements: ScriptElement[];
  onBack: () => void;
  savedCharacters: CharacterProfile[];
  onAddCharacter: (char: CharacterProfile) => void;
  onOpenCharacterList: () => void;
  storyboardItems: StoryboardItem[];
  onUpdateStoryboard: (items: StoryboardItem[]) => void;
}

interface SelectionMenu {
  x: number;
  y: number;
  text: string;
  elementId?: string;
}

interface CharacterFormState {
  name: string;
  description: string;
  visualDetails: string;
  artStyle: ArtStyle;
  referenceImages: string[];
  currentPreview: GeneratedImage | null;
}

interface ShotFormState {
  shotSize: string;
  framing: string;
  cameraAngle: string;
  description: string;
  sceneNumber: string | number;
  shotNumber: string;
  scriptElementId?: string;
  referenceImages: string[];
}

const ART_STYLES: ArtStyle[] = [
  'Cinematic/Digital',
  'Pencil Sketch',
  'Oil Painting',
  'Watercolor',
  'Ink Illustration'
];

const SHOT_SIZES = [
  'Establishing', 'Master', 'Wide', 'Full', 'Medium Full', 'Medium', 'Medium Close Up', 'Close Up', 'Extreme Close Up'
];

const FRAMING_OPTIONS = [
  'Single', 'Two Character', '3 or more characters', 'Crowd', 'Over the Shoulder', 'Point of View', 'Insert'
];

const CAMERA_ANGLES = [
  'Low', 'High', 'Overhead', 'Dutch', 'Eye Level', 'Shoulder', 'Hip/Cowboy', 'Knee', 'Ground'
];

export const Storyboard: React.FC<StoryboardProps> = ({ 
  sceneElements, 
  onBack, 
  savedCharacters,
  onAddCharacter,
  onOpenCharacterList,
  storyboardItems,
  onUpdateStoryboard
}) => {
  // --- State ---
  const [isLoading, setIsLoading] = useState(false);
  
  // Selection Menu State
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu | null>(null);
  const scriptRef = useRef<HTMLDivElement>(null);
  
  // Refs for scrolling to shots
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Character Creation State (Separate from the List Modal)
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  
  // Context for the shot being created
  const [activeScriptContext, setActiveScriptContext] = useState<string | null>(null);

  // Character Form State
  const [charForm, setCharForm] = useState<CharacterFormState>({
    name: '',
    description: '',
    visualDetails: '',
    artStyle: 'Cinematic/Digital',
    referenceImages: [],
    currentPreview: null
  });

  // New Shot Form State
  const [shotForm, setShotForm] = useState<ShotFormState>({
      shotSize: '',
      framing: '',
      cameraAngle: '',
      description: '',
      sceneNumber: '',
      shotNumber: '',
      scriptElementId: undefined,
      referenceImages: []
  });

  // State for the currently generated but unsaved image
  const [generatedPreview, setGeneratedPreview] = useState<GeneratedImage | null>(null);
  const [previewNote, setPreviewNote] = useState('');

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

  const sceneHeadingEl = sceneElements.find(el => el.type === 'SCENE_HEADING');
  const heading = sceneHeadingEl?.content || 'Unknown Scene';
  const currentSceneNumber = sceneHeadingEl?.sceneNumber;
  
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
    
    // Attempt to find the script element ID from the DOM
    let elementId: string | undefined;
    let currentNode: Node | null = selection.anchorNode;
    while(currentNode && currentNode !== scriptRef.current) {
        if (currentNode instanceof HTMLElement && currentNode.dataset.id) {
            elementId = currentNode.dataset.id;
            break;
        }
        currentNode = currentNode.parentNode;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionMenu({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: text,
      elementId: elementId
    });
  };

  const scrollToShot = (shotId: string) => {
      const el = itemRefs.current[shotId];
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary flash effect
          el.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2', 'ring-offset-zinc-900');
          setTimeout(() => {
              el.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2', 'ring-offset-zinc-900');
          }, 2000);
      }
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

  // --- Storyboard / Shot Logic ---

  const handlePrepareSceneShot = (text: string, elementId?: string) => {
      // Set the selected text as the context, but start with empty description
      setActiveScriptContext(text);
      setShotForm({
          shotSize: '',
          framing: '',
          cameraAngle: '',
          description: '', 
          sceneNumber: currentSceneNumber || '',
          shotNumber: (storyboardItems.length + 1).toString(),
          scriptElementId: elementId,
          referenceImages: []
      });
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
  };

  const handleShotReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: any) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setShotForm(prev => ({
            ...prev,
            referenceImages: [...prev.referenceImages, base64]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const toggleShotReference = (url: string) => {
      if (!activeScriptContext) return; // Only work when creating a shot
      setShotForm(prev => {
          const exists = prev.referenceImages.includes(url);
          return {
              ...prev,
              referenceImages: exists 
                  ? prev.referenceImages.filter(u => u !== url)
                  : [...prev.referenceImages, url]
          };
      });
  };

  const handleGenerateShot = async () => {
    setIsLoading(true);
    try {
        let finalPrompt = `Cinematic movie scene. 8k resolution. `;
        if (shotForm.shotSize) finalPrompt += `Shot Size: ${shotForm.shotSize}. `;
        if (shotForm.framing) finalPrompt += `Framing: ${shotForm.framing}. `;
        if (shotForm.cameraAngle) finalPrompt += `Camera Angle: ${shotForm.cameraAngle}. `;
        
        // Use the manual description for the prompt, NOT the context
        finalPrompt += `Description: ${shotForm.description}`;

        const result = await generateImage(finalPrompt, shotForm.referenceImages);
        setGeneratedPreview(result);
        setPreviewNote('');
    } catch (error) {
        console.error("Failed to generate shot", error);
        alert("Failed to generate shot");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveShot = () => {
      if (!generatedPreview || !activeScriptContext) return;
      
      const newItem: StoryboardItem = {
          id: Date.now().toString(),
          image: generatedPreview,
          note: previewNote,
          shotSize: shotForm.shotSize,
          framing: shotForm.framing,
          cameraAngle: shotForm.cameraAngle,
          description: shotForm.description,
          scriptContext: activeScriptContext,
          sceneNumber: typeof shotForm.sceneNumber === 'number' ? shotForm.sceneNumber : parseInt(shotForm.sceneNumber as string) || 0,
          shotNumber: shotForm.shotNumber,
          scriptElementId: shotForm.scriptElementId
      };

      onUpdateStoryboard([...storyboardItems, newItem]);
      setGeneratedPreview(null);
      setActiveScriptContext(null); // Close the form after saving
  };

  const handleDeleteItem = (id: string) => {
      onUpdateStoryboard(storyboardItems.filter(item => item.id !== id));
      delete itemRefs.current[id];
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
      const newItems = [...storyboardItems];
      if (direction === 'up' && index > 0) {
          [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
      } else if (direction === 'down' && index < newItems.length - 1) {
          [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      }
      onUpdateStoryboard(newItems);
  };

  const handleUpdateNote = (id: string, newNote: string) => {
      const newItems = storyboardItems.map(item => item.id === id ? { ...item, note: newNote } : item);
      onUpdateStoryboard(newItems);
  };

  // Helper to highlight text in the script
  const renderScriptContent = (element: ScriptElement) => {
      // Find items that reference this element
      const items = storyboardItems.filter(
          item => item.scriptElementId === element.id && item.scriptContext
      );

      if (items.length === 0) return element.content;

      // Sort items by position of their context in the text
      // Note: This naive approach matches the first occurrence. 
      // Ideally we would store start indices, but we'll infer for now.
      const sortedItems = [...items].sort((a, b) => {
         return element.content.indexOf(a.scriptContext) - element.content.indexOf(b.scriptContext);
      });

      const parts = [];
      let lastIndex = 0;

      sortedItems.forEach((item, idx) => {
          const start = element.content.indexOf(item.scriptContext, lastIndex);
          if (start === -1) return; // Not found after lastIndex

          // Text before highlight
          if (start > lastIndex) {
              parts.push(<span key={`text-${idx}`}>{element.content.substring(lastIndex, start)}</span>);
          }

          // Highlight
          const end = start + item.scriptContext.length;
          parts.push(
              <span 
                key={`highlight-${item.id}`} 
                onClick={(e) => { e.stopPropagation(); scrollToShot(item.id); }}
                className="bg-indigo-900/50 text-indigo-200 border-b border-indigo-500 cursor-pointer hover:bg-indigo-800/80 rounded px-0.5 relative group inline-block mx-0.5 transition-colors"
                title={`Go to Shot ${item.shotNumber || '#'}`}
              >
                  {element.content.substring(start, end)}
                  <span className="absolute -top-3 left-0 text-[8px] font-bold bg-indigo-500 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Shot {item.shotNumber}
                  </span>
              </span>
          );

          lastIndex = end;
      });

      // Remaining text
      if (lastIndex < element.content.length) {
          parts.push(<span key="text-end">{element.content.substring(lastIndex)}</span>);
      }

      return <>{parts}</>;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden relative">
      
      {/* Character Creation Modal */}
      {isCharacterModalOpen && (
        <div className="fixed inset-0 z-[50] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">
            {/* ... Character Form UI (same as before) ... */}
            <div className="p-6 md:w-1/2 space-y-4 border-r border-zinc-800">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  Create Character
                </h3>
              </div>
              {/* Fields */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Character Name</label>
                <input type="text" value={charForm.name} onChange={e => setCharForm({...charForm, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="e.g. Willy Wonka" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Description</label>
                <textarea value={charForm.description} onChange={e => setCharForm({...charForm, description: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 outline-none h-20" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Visual Details</label>
                <textarea value={charForm.visualDetails} onChange={e => setCharForm({...charForm, visualDetails: e.target.value})} placeholder="Green waistcoat..." className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 outline-none h-20" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Art Style</label>
                <select value={charForm.artStyle} onChange={e => setCharForm({...charForm, artStyle: e.target.value as ArtStyle})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white outline-none">
                  {ART_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
              </div>
               <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Reference Images</label>
                <div className="flex gap-2 items-center overflow-x-auto pb-2">
                   {charForm.referenceImages?.map((img, idx) => (
                     <div key={idx} className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden border border-zinc-700">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => setCharForm(prev => ({...prev, referenceImages: prev.referenceImages?.filter((_, i) => i !== idx)}))} className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-red-500"><X className="w-4 h-4" /></button>
                     </div>
                   ))}
                   <label className="w-12 h-12 flex-shrink-0 rounded border border-dashed border-zinc-600 flex items-center justify-center hover:bg-zinc-800 cursor-pointer">
                      <Plus className="w-4 h-4 text-zinc-500" />
                      <input type="file" accept="image/*" multiple onChange={handleReferenceImageUpload} className="hidden" />
                   </label>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                 <button onClick={handleGenerateCharacterPreview} disabled={isLoading || !charForm.name} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded font-medium flex items-center justify-center gap-2">
                   {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Preview
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
                     <button onClick={handleSaveCharacter} className="bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"><Save className="w-4 h-4" /> Save to Gallery</button>
                  </div>
                </>
              ) : (
                <div className="text-zinc-600 flex flex-col items-center"><User className="w-16 h-16 mb-2 opacity-20" /><p className="text-sm">Preview will appear here</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Selection Menu */}
      {selectionMenu && (
        <div 
          className="fixed z-50 flex items-center gap-1 p-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{ left: selectionMenu.x, top: selectionMenu.y, transform: 'translate(-50%, -120%)' }}
        >
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleOpenCharacterModal(selectionMenu.text)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-md transition-colors whitespace-nowrap">
            <User className="w-3 h-3 text-emerald-400" /> Create character
          </button>
          <div className="w-px h-4 bg-zinc-600" />
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => handlePrepareSceneShot(selectionMenu.text, selectionMenu.elementId)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-md transition-colors whitespace-nowrap">
            <Film className="w-3 h-3 text-indigo-400" /> Create shot
          </button>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 flex-none">
        <div className="flex items-center">
          <button onClick={onBack} className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> <span>Back to Script</span>
          </button>
          <div className="ml-6 flex items-center space-x-2 text-zinc-500">
              <span>/</span><span className="font-screenplay font-bold text-zinc-200">{heading}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={onOpenCharacterList} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-md text-sm transition-colors border border-zinc-700">
                <Users className="w-4 h-4" /> <span>Character List</span>
                {savedCharacters.length > 0 && <span className="bg-emerald-600 text-white text-[10px] px-1.5 rounded-full">{savedCharacters.length}</span>}
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
               <div key={el.id} data-id={el.id} className={
                 el.type === 'SCENE_HEADING' ? 'font-bold uppercase mb-4 text-zinc-100' :
                 el.type === 'CHARACTER' ? 'mt-4 uppercase font-bold text-zinc-300 text-center' :
                 el.type === 'DIALOGUE' ? 'text-zinc-400 text-center px-8' :
                 el.type === 'PARENTHETICAL' ? 'text-zinc-500 text-center italic' :
                 'text-zinc-300'
               }>
                 {renderScriptContent(el)}
               </div>
             ))}
          </div>
          <div className="mt-12 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs flex items-center gap-3">
             <Sparkles className="w-4 h-4 text-emerald-600" />
             <span>Highlight text to Create Character or Scene. Click highlight to view shot.</span>
          </div>
        </div>

        {/* Right: Visualization Workspace */}
        <div className="w-2/3 flex flex-col bg-zinc-950 overflow-hidden">
            
            {/* Top: Shot Generator (Visible ONLY when activeScriptContext is set) */}
            {activeScriptContext && (
                <div className="flex-none p-6 border-b border-zinc-800 bg-zinc-900/30 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold uppercase tracking-wider">
                             <Clapperboard className="w-4 h-4" />
                             New Shot
                         </div>
                         <button onClick={() => setActiveScriptContext(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="max-w-4xl mx-auto flex gap-6">
                        {/* Form */}
                        <div className="flex-1 space-y-4">
                            {/* Script Context Display */}
                            <div className="bg-black/50 border-l-2 border-indigo-500 p-3 rounded-r text-xs text-zinc-400 font-screenplay italic">
                                "{activeScriptContext}"
                            </div>
                            
                            {/* Scene # and Shot # */}
                            <div className="flex gap-4">
                                <div className="w-1/4">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Scene #</label>
                                    <input 
                                        type="text"
                                        readOnly
                                        value={shotForm.sceneNumber}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded p-2 text-sm text-zinc-500 outline-none cursor-not-allowed"
                                    />
                                </div>
                                <div className="w-1/4">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Shot #</label>
                                    <input 
                                        type="text"
                                        value={shotForm.shotNumber}
                                        onChange={e => setShotForm(p => ({...p, shotNumber: e.target.value}))}
                                        placeholder="1, 1A..."
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Shot Params: Shot Size, Framing, Camera Angle */}
                            <div className="flex gap-4">
                                <div className="w-1/3">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Shot Size</label>
                                    <select 
                                        value={shotForm.shotSize}
                                        onChange={e => setShotForm(p => ({...p, shotSize: e.target.value}))}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white outline-none focus:border-emerald-500"
                                    >
                                        <option value="">Select...</option>
                                        {SHOT_SIZES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Framing</label>
                                    <select 
                                        value={shotForm.framing}
                                        onChange={e => setShotForm(p => ({...p, framing: e.target.value}))}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white outline-none focus:border-emerald-500"
                                    >
                                        <option value="">Select...</option>
                                        {FRAMING_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Camera Angle</label>
                                    <select 
                                        value={shotForm.cameraAngle}
                                        onChange={e => setShotForm(p => ({...p, cameraAngle: e.target.value}))}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white outline-none focus:border-emerald-500"
                                    >
                                        <option value="">Select...</option>
                                        {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Visual Description <span className="text-emerald-500">*</span></label>
                                <textarea 
                                    value={shotForm.description}
                                    onChange={e => setShotForm(p => ({...p, description: e.target.value}))}
                                    placeholder="Describe the imagery: lighting, mood, action details..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-sm text-white outline-none h-24 resize-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Reference Images Section */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase mb-1 block">Reference Images</label>
                                <div className="flex gap-2 items-center overflow-x-auto pb-2 min-h-[56px]">
                                   {shotForm.referenceImages.map((img, idx) => (
                                     <div key={idx} className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden border border-zinc-700">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button onClick={() => setShotForm(prev => ({...prev, referenceImages: prev.referenceImages.filter((_, i) => i !== idx)}))} className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-red-500"><X className="w-4 h-4" /></button>
                                     </div>
                                   ))}
                                   <label className="w-12 h-12 flex-shrink-0 rounded border border-dashed border-zinc-600 flex items-center justify-center hover:bg-zinc-800 cursor-pointer" title="Upload Image">
                                      <Plus className="w-4 h-4 text-zinc-500" />
                                      <input type="file" accept="image/*" multiple onChange={handleShotReferenceUpload} className="hidden" />
                                   </label>
                                   <div className="ml-2 text-[10px] text-zinc-500 italic flex items-center gap-1 border-l border-zinc-800 pl-3">
                                       <Sparkles className="w-3 h-3" />
                                       Click images in the sequence list below to use as references.
                                   </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerateShot}
                                disabled={isLoading || !shotForm.description.trim()}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                Generate Shot
                            </button>
                        </div>

                        {/* Preview Area */}
                        <div className="w-[320px] bg-black rounded-lg border border-zinc-800 flex flex-col overflow-hidden relative">
                            {generatedPreview ? (
                                <>
                                    <img src={generatedPreview.image_url} className="w-full h-48 object-cover" />
                                    <div className="p-3 flex-1 flex flex-col gap-2">
                                        <input 
                                            type="text" 
                                            value={previewNote}
                                            onChange={e => setPreviewNote(e.target.value)}
                                            placeholder="Add a note (e.g., 'V2, warmer light')"
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-white outline-none"
                                        />
                                        <div className="flex gap-2 mt-auto">
                                            <button onClick={handleSaveShot} className="flex-1 bg-white text-black py-1.5 rounded text-xs font-bold hover:bg-zinc-200">Save</button>
                                            <button onClick={() => setGeneratedPreview(null)} className="px-3 bg-zinc-800 text-zinc-400 py-1.5 rounded text-xs hover:text-white">Discard</button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center flex-col text-zinc-700 gap-2">
                                    {isLoading ? <Loader2 className="w-8 h-8 animate-spin text-emerald-600" /> : <ImageIcon className="w-12 h-12" />}
                                    <span className="text-xs">{isLoading ? 'Generating...' : 'Preview will appear here'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom: Storyboard Sequence (List) */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
                <div className="max-w-4xl mx-auto">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Clapperboard className="w-5 h-5 text-indigo-500" />
                        Sequence ({storyboardItems.length})
                    </h3>
                    
                    {storyboardItems.length === 0 ? (
                        <div className="border-2 border-dashed border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-zinc-600">
                            <Film className="w-12 h-12 mb-3 opacity-20" />
                            <p>No shots generated for this scene yet.</p>
                            <p className="text-sm">Highlight text in the script to start visualizing.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {storyboardItems.map((item, index) => {
                                const isReference = activeScriptContext && shotForm.referenceImages.includes(item.image.image_url);
                                
                                return (
                                <div 
                                    key={item.id} 
                                    ref={(el) => { itemRefs.current[item.id] = el; }}
                                    className={`flex flex-col bg-zinc-900 border rounded-lg overflow-hidden group transition-all duration-500 ${isReference ? 'border-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]' : 'border-zinc-800 hover:border-zinc-700'}`}
                                >
                                    <div className="flex">
                                        {/* Handle / Index */}
                                        <div className="w-12 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center justify-center gap-1 text-zinc-500 px-1">
                                            {item.sceneNumber !== undefined && (
                                                <span className="text-[10px] uppercase font-bold text-zinc-600">SC {item.sceneNumber}</span>
                                            )}
                                            <span className="font-mono text-xl font-bold text-white">{item.shotNumber || (index + 1)}</span>
                                        </div>
                                        
                                        {/* Image */}
                                        <div 
                                            className="w-64 aspect-video bg-black flex-shrink-0 relative cursor-pointer border-r border-zinc-800 group/image" 
                                            onClick={() => activeScriptContext ? toggleShotReference(item.image.image_url) : window.open(item.image.image_url, '_blank')}
                                        >
                                            <img src={item.image.image_url} className="w-full h-full object-cover" />
                                            {/* Reference Toggle Overlay */}
                                            {activeScriptContext && (
                                                <div className={`absolute inset-0 flex items-center justify-center transition-all ${isReference ? 'bg-emerald-500/20' : 'bg-black/0 group-hover/image:bg-black/40'}`}>
                                                    {isReference && (
                                                        <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                                                            <CheckCircle2 className="w-3 h-3" /> Reference
                                                        </div>
                                                    )}
                                                    {!isReference && (
                                                        <div className="opacity-0 group-hover/image:opacity-100 bg-zinc-900/80 text-white px-3 py-1 rounded-full text-xs font-bold border border-zinc-600">
                                                            Use as Reference
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {!activeScriptContext && <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors" />}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 p-4 flex flex-col gap-3">
                                            {/* Reference Text */}
                                            {item.scriptContext && (
                                                <div className="flex items-start gap-2">
                                                    <Quote className="w-3 h-3 text-zinc-600 mt-1 flex-shrink-0" />
                                                    <p className="text-xs text-zinc-500 font-screenplay italic leading-relaxed">"{item.scriptContext}"</p>
                                                </div>
                                            )}

                                            {/* Technical Details (Legacy + New) */}
                                            <div className="flex gap-2 flex-wrap">
                                                {/* Legacy Display */}
                                                {item.shotType && <span className="text-[10px] font-bold uppercase bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900">{item.shotType}</span>}
                                                {item.shotComposition && <span className="text-[10px] font-bold uppercase bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded border border-emerald-900">{item.shotComposition}</span>}
                                                
                                                {/* New Fields Display */}
                                                {item.shotSize && <span className="text-[10px] font-bold uppercase bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900">{item.shotSize}</span>}
                                                {item.framing && <span className="text-[10px] font-bold uppercase bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-900">{item.framing}</span>}
                                                {item.cameraAngle && <span className="text-[10px] font-bold uppercase bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-900">{item.cameraAngle}</span>}
                                            </div>

                                            {/* Visual Description */}
                                            <div>
                                                <span className="text-[10px] uppercase text-zinc-600 font-bold block mb-1">Visual Prompt</span>
                                                <p className="text-sm text-zinc-300">"{item.description}"</p>
                                            </div>
                                            
                                            {/* Notes Input */}
                                            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-zinc-800/50">
                                                <Edit3 className="w-3 h-3 text-zinc-600" />
                                                <input 
                                                    type="text" 
                                                    value={item.note}
                                                    onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                                                    placeholder="Add production notes..."
                                                    className="bg-transparent text-sm text-zinc-300 placeholder-zinc-600 outline-none w-full border-b border-transparent focus:border-zinc-700"
                                                />
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="w-12 border-l border-zinc-800 flex flex-col items-center justify-center gap-2 bg-zinc-900">
                                            <button 
                                                onClick={() => handleMoveItem(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                                            >
                                                <ArrowUp className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleMoveItem(index, 'down')}
                                                disabled={index === storyboardItems.length - 1}
                                                className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                                            >
                                                <ArrowDown className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-1 text-zinc-500 hover:text-red-500 mt-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};