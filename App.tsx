import React, { useState } from 'react';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { Header } from './components/Header';
import { Storyboard } from './components/Storyboard';
import { CharacterListModal } from './components/CharacterListModal';
import { ScriptElement, CharacterProfile, GeneratedImage, ProjectData } from './types';
import { normalizeGeneratedImage } from './services/apiService';

type ViewState = 'EDITOR' | 'STORYBOARD';

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
  const [storyboards, setStoryboards] = useState<Record<string, GeneratedImage>>({});

  const [selectedScene, setSelectedScene] = useState<ScriptElement[]>([]);
  const [isCharacterListOpen, setIsCharacterListOpen] = useState(false);

  const handleNavigateToStoryboard = (sceneElements: ScriptElement[]) => {
    setSelectedScene(sceneElements);
    setView('STORYBOARD');
  };

  const handleBackToEditor = () => {
    setView('EDITOR');
    setSelectedScene([]);
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
                const cleanStoryboards: Record<string, GeneratedImage> = {};
                if (data.storyboards) {
                    Object.entries(data.storyboards).forEach(([k, v]) => {
                        cleanStoryboards[k] = normalizeGeneratedImage(v);
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

  const handleImportCharacters = (newChars: CharacterProfile[]) => {
    setSavedCharacters(newChars);
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
  const handleUpdateStoryboard = (image: GeneratedImage) => {
      // The selected scene's ID is used as the key. 
      // Assuming selectedScene[0] is always the Scene Heading or the primary element linking the scene.
      if (selectedScene.length > 0) {
          const sceneId = selectedScene[0].id;
          setStoryboards(prev => ({
              ...prev,
              [sceneId]: image
          }));
      }
  };

  const getActiveStoryboardImage = () => {
      if (selectedScene.length > 0) {
          return storyboards[selectedScene[0].id];
      }
      return undefined;
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
        ) : (
          <Storyboard 
            sceneElements={selectedScene} 
            onBack={handleBackToEditor} 
            savedCharacters={savedCharacters}
            onAddCharacter={handleAddCharacter}
            onOpenCharacterList={() => setIsCharacterListOpen(true)}
            existingStoryboard={getActiveStoryboardImage()}
            onUpdateStoryboard={handleUpdateStoryboard}
          />
        )}
      </main>
      
      <CharacterListModal 
        isOpen={isCharacterListOpen}
        onClose={() => setIsCharacterListOpen(false)}
        characters={savedCharacters}
        onUpdateCharacter={handleUpdateCharacter}
        onImportCharacters={handleImportCharacters}
      />
    </div>
  );
};

export default App;