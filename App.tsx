import React, { useState } from 'react';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { Header } from './components/Header';
import { Storyboard } from './components/Storyboard';
import { CharacterListModal } from './components/CharacterListModal';
import { ImageEditStudio } from './components/ImageEditStudio';
import { ScriptElement, CharacterProfile, StoryboardItem, ProjectData, GeneratedImage } from './types';
import { normalizeGeneratedImage } from './services/apiService';

type ViewState = 'EDITOR' | 'STORYBOARD' | 'EDIT_STUDIO';

const DEFAULT_SCRIPT: ScriptElement[] = [
    { id: '1', type: 'SCENE_HEADING', content: 'EXT. OCEAN - DAY', sceneNumber: 1 },
    { id: '2', type: 'ACTION', content: 'FADE UP on a cold, foggy sky. The only sounds are the lapping of the ocean waves and the distant tolling of a ship\'s bell.' },
    { id: '3', type: 'ACTION', content: 'Then, chugging out of the thick mist, comes a 1940s TRAWLER.' },
    { id: '4', type: 'ACTION', content: 'A strange figure wearing a bright green waistcoat and wildly colourful scarf climbs the mast. This is Willy Wonka.' },
    { id: '5', type: 'ACTION', content: 'As he peers into the fog, he sings A HATFUL OF DREAMS.' },
    { id: '6', type: 'CHARACTER', content: 'WILLY' },
    { id: '7', type: 'DIALOGUE', content: 'After seven years of life upon the ocean,' },
    { id: '8', type: 'DIALOGUE', content: 'It is time to bid the seven seas farewell,' },
    { id: '9', type: 'DIALOGUE', content: 'And the city I’ve pinned seven years of hopes on' },
    { id: '10', type: 'DIALOGUE', content: 'Lies just over the horizon. I can hear the harbour bell!' },
    { id: '11', type: 'ACTION', content: 'He spies a GRAND OLD CITY looming out of the freezing fog.' },
    { id: '12', type: 'CHARACTER', content: 'WILLY (CONT\'D)' },
    { id: '13', type: 'DIALOGUE', content: 'Land ahoy!!' },
    { id: '14', type: 'ACTION', content: 'Willy grabs a rope and ABSEILS DOWN to the deck as the other sailors prepare the boat to come into harbour.' },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('EDITOR');
  
  // Unified Project State
  const [elements, setElements] = useState<ScriptElement[]>(DEFAULT_SCRIPT);
  const [savedCharacters, setSavedCharacters] = useState<CharacterProfile[]>([]);
  // storyboards is now Record<SceneID, StoryboardItem[]>
  const [storyboards, setStoryboards] = useState<Record<string, StoryboardItem[]>>({});

  const [selectedScene, setSelectedScene] = useState<ScriptElement[]>([]);
  const [isCharacterListOpen, setIsCharacterListOpen] = useState(false);
  
  // Edit Studio State
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<GeneratedImage | null>(null);

  const handleNavigateToStoryboard = (sceneElements: ScriptElement[]) => {
    setSelectedScene(sceneElements);
    setView('STORYBOARD');
  };

  const handleBackToEditor = () => {
    setView('EDITOR');
    setSelectedScene([]);
  };

  const handleNavigateToEditStudio = (image: GeneratedImage) => {
    setSelectedImageForEdit(image);
    setIsCharacterListOpen(false);
    setView('EDIT_STUDIO');
  };

  const handleBackFromEditStudio = () => {
      // Return to previous context based on state
      if (selectedScene.length > 0) {
          setView('STORYBOARD');
      } else {
          setView('EDITOR');
      }
      setSelectedImageForEdit(null);
  };

  const handleSaveEditedImage = (originalImage: GeneratedImage, newImage: GeneratedImage) => {
    // Clone new image to avoid reference issues
    const processedNewImage = { ...newImage };
    
    // Normalize URLs by stripping query params (like timestamps)
    const originalBase = originalImage.image_url.split('?')[0];
    const newBase = newImage.image_url.split('?')[0];

    // Cache Busting:
    // If the backend returned the exact same filename (e.g. overwrite), we append a timestamp.
    // If the backend returned a new filename (e.g. advanced remix), we use it as is.
    if (originalBase === newBase) {
        processedNewImage.image_url = `${newBase}?t=${Date.now()}`;
    }

    // We search for items matching the ORIGINAL base URL to replace them.
    const targetBase = originalBase;

    // Update Characters
    setSavedCharacters(prev => prev.map(char => ({
        ...char,
        generatedPortraits: char.generatedPortraits.map(img => {
            const imgBase = img.image_url.split('?')[0];
            return imgBase === targetBase ? processedNewImage : img;
        })
    })));

    // Update Storyboards
    setStoryboards(prev => {
        const next = { ...prev };
        
        Object.keys(next).forEach(key => {
            const items = next[key];
            const newItems = items.map(item => {
                const itemBase = item.image.image_url.split('?')[0];
                
                if (itemBase === targetBase) {
                    return {
                        ...item,
                        image: processedNewImage
                    };
                }
                return item;
            });
            next[key] = newItems;
        });
        
        return next;
    });

    // Update the currently selected image reference so the UI reflects the save immediately
    // This is crucial for keeping the Studio in sync if the user stays in it
    setSelectedImageForEdit(processedNewImage);
  };

  // --- Project Import / Export ---
  const handleExportProject = () => {
    const projectData: ProjectData = {
        screenplay: elements,
        characters: savedCharacters,
        storyboards: storyboards
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `project-${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            // Basic validation check
            if (data.screenplay && Array.isArray(data.screenplay)) {
                setElements(data.screenplay);
                
                // Normalize characters data structure
                const cleanCharacters = (data.characters || []).map((c: any) => ({
                    ...c,
                    generatedPortraits: Array.isArray(c.generatedPortraits) 
                        ? c.generatedPortraits.map(normalizeGeneratedImage) 
                        : []
                }));
                setSavedCharacters(cleanCharacters);

                // Normalize storyboards data structure
                const cleanStoryboards: Record<string, StoryboardItem[]> = {};
                if (data.storyboards) {
                    Object.entries(data.storyboards).forEach(([k, v]: [string, any]) => {
                        // Handle legacy format where value was just GeneratedImage
                        if (!Array.isArray(v) && v.image_url) {
                             const normImg = normalizeGeneratedImage(v);
                             cleanStoryboards[k] = [{
                                 id: Date.now().toString(),
                                 image: normImg,
                                 note: '',
                                 description: 'Imported shot',
                                 scriptContext: ''
                             }];
                        } else if (Array.isArray(v)) {
                             cleanStoryboards[k] = v.map((item: any) => ({
                                 ...item,
                                 image: normalizeGeneratedImage(item.image),
                                 scriptContext: item.scriptContext || '' // Ensure backward compat
                             }));
                        }
                    });
                }
                setStoryboards(cleanStoryboards);

            } else {
                alert("Invalid project file format.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to parse project file.");
        }
    };
    reader.readAsText(file);
  };

  // --- Character Management ---
  const handleUpdateCharacter = (updatedChar: CharacterProfile) => {
    setSavedCharacters(prev => prev.map(c => c.id === updatedChar.id ? updatedChar : c));
  };

  const handleAddCharacter = (newChar: CharacterProfile) => {
    setSavedCharacters(prev => {
        const existingIndex = prev.findIndex(c => c.name.toLowerCase() === newChar.name.toLowerCase());
        
        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const merged: CharacterProfile = {
            ...existing,
            description: newChar.description,
            visualDetails: newChar.visualDetails,
            artStyle: newChar.artStyle,
            referenceImages: [...new Set([...existing.referenceImages, ...newChar.referenceImages])],
            generatedPortraits: [...newChar.generatedPortraits, ...existing.generatedPortraits]
          };
          const copy = [...prev];
          copy[existingIndex] = merged;
          return copy;
        } else {
          return [...prev, newChar];
        }
    });
  };

  // --- Storyboard Management ---
  const handleUpdateStoryboardItems = (items: StoryboardItem[]) => {
      if (selectedScene.length > 0) {
          const sceneId = selectedScene[0].id;
          setStoryboards(prev => ({
              ...prev,
              [sceneId]: items
          }));
      }
  };

  const getActiveStoryboardItems = (): StoryboardItem[] => {
      if (selectedScene.length > 0) {
          return storyboards[selectedScene[0].id] || [];
      }
      return [];
  };

  const getAllProjectImages = (): GeneratedImage[] => {
      const charImages = savedCharacters.flatMap(c => c.generatedPortraits);
      const storyboardImages = Object.values(storyboards).flatMap(list => list.map(item => item.image));
      // Removing duplicates by URL might be nice, but simple concat is fast and sufficient
      return [...charImages, ...storyboardImages];
  };

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <Header 
        onOpenCharacterList={() => setIsCharacterListOpen(true)} 
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
      />
      <main className="flex-grow flex flex-col relative overflow-hidden">
        {view === 'EDITOR' ? (
          <ScreenplayEditor 
            elements={elements}
            onUpdateElements={setElements}
            onNavigateToStoryboard={handleNavigateToStoryboard} 
          />
        ) : view === 'STORYBOARD' ? (
          <Storyboard 
            key={selectedScene[0]?.id || 'storyboard'} // Force remount on scene change
            sceneElements={selectedScene} 
            onBack={handleBackToEditor} 
            savedCharacters={savedCharacters}
            onAddCharacter={handleAddCharacter}
            onOpenCharacterList={() => setIsCharacterListOpen(true)}
            storyboardItems={getActiveStoryboardItems()}
            onUpdateStoryboard={handleUpdateStoryboardItems}
            onNavigateToEditStudio={handleNavigateToEditStudio}
          />
        ) : (
          <ImageEditStudio 
            image={selectedImageForEdit}
            onBack={handleBackFromEditStudio}
            onSave={handleSaveEditedImage}
          />
        )}
      </main>
      
      <CharacterListModal 
        isOpen={isCharacterListOpen}
        onClose={() => setIsCharacterListOpen(false)}
        characters={savedCharacters}
        onUpdateCharacter={handleUpdateCharacter}
        onNavigateToEditStudio={handleNavigateToEditStudio}
      />
    </div>
  );
};

export default App;