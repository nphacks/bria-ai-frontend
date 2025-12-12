import React, { useState } from 'react';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { Header } from './components/Header';
import { Storyboard } from './components/Storyboard';
import { CharacterListModal } from './components/CharacterListModal';
import { ImageEditStudio } from './components/ImageEditStudio';
import { HomePage } from './components/HomePage';
import { ScriptElement, CharacterProfile, StoryboardItem, ProjectData, GeneratedImage } from './types';
import { normalizeGeneratedImage } from './services/apiService';

type ViewState = 'HOME' | 'EDITOR' | 'STORYBOARD' | 'EDIT_STUDIO';

// Basic template for a new project
const EMPTY_SCRIPT: ScriptElement[] = [
    { id: '1', type: 'SCENE_HEADING', content: 'INT. UNTITLED SCENE - DAY', sceneNumber: 1 },
    { id: '2', type: 'ACTION', content: 'Start your story here...' },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  
  // Unified Project State
  const [elements, setElements] = useState<ScriptElement[]>(EMPTY_SCRIPT);
  const [savedCharacters, setSavedCharacters] = useState<CharacterProfile[]>([]);
  // storyboards is now Record<SceneID, StoryboardItem[]>
  const [storyboards, setStoryboards] = useState<Record<string, StoryboardItem[]>>({});

  const [selectedScene, setSelectedScene] = useState<ScriptElement[]>([]);
  const [isCharacterListOpen, setIsCharacterListOpen] = useState(false);
  
  // Edit Studio State
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<GeneratedImage | null>(null);

  const loadProjectData = (data: any) => {
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
                          scriptContext: item.scriptContext || ''
                      }));
                }
            });
        }
        setStoryboards(cleanStoryboards);
        return true;
    } else {
        alert("Invalid project file format.");
        return false;
    }
  };

  const handleSelectProject = (name: string, data: any) => {
      if (loadProjectData(data)) {
          setView('EDITOR');
      }
  };

  const handleCreateNewProject = () => {
      setElements(EMPTY_SCRIPT);
      setSavedCharacters([]);
      setStoryboards({});
      setView('EDITOR');
  };

  const handleGoHome = () => {
      setView('HOME');
  };

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
    const processedNewImage = { ...newImage };
    
    const getBaseUrl = (url: string) => url ? url.split('?')[0] : '';

    const originalBase = getBaseUrl(originalImage.image_url);
    const newBase = getBaseUrl(newImage.image_url);

    // Cache Busting
    if (originalBase === newBase && newBase !== '') {
        processedNewImage.image_url = `${newBase}?t=${Date.now()}`;
    }

    const targetBase = originalBase;

    // Helper to check if an image matches the target
    const isMatch = (imgUrl: string) => {
        const currentBase = getBaseUrl(imgUrl);
        return currentBase === targetBase || imgUrl === originalImage.image_url;
    };

    // Update Characters
    setSavedCharacters(prev => prev.map(char => ({
        ...char,
        generatedPortraits: char.generatedPortraits.map(img => {
            return isMatch(img.image_url) ? processedNewImage : img;
        })
    })));

    // Update Storyboards
    setStoryboards(prev => {
        const next = { ...prev };
        
        Object.keys(next).forEach(key => {
            const items = next[key];
            const newItems = items.map(item => {
                if (isMatch(item.image.image_url)) {
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
            loadProjectData(data);
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
      const storyboardImages = Object.values(storyboards).flatMap((list: StoryboardItem[]) => list.map(item => item.image));
      return [...charImages, ...storyboardImages];
  };

  if (view === 'HOME') {
      return (
          <HomePage 
            onSelectProject={handleSelectProject}
            onCreateNew={handleCreateNewProject}
          />
      );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <Header 
        onGoHome={handleGoHome}
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