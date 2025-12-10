import React, { useState } from 'react';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { Header } from './components/Header';
import { Storyboard } from './components/Storyboard';
import { CharacterListModal } from './components/CharacterListModal';
import { ScriptElement, CharacterProfile } from './types';

type ViewState = 'EDITOR' | 'STORYBOARD';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('EDITOR');
  const [selectedScene, setSelectedScene] = useState<ScriptElement[]>([]);
  
  // Shared Character State
  const [savedCharacters, setSavedCharacters] = useState<CharacterProfile[]>([]);
  const [isCharacterListOpen, setIsCharacterListOpen] = useState(false);

  const handleNavigateToStoryboard = (sceneElements: ScriptElement[]) => {
    setSelectedScene(sceneElements);
    setView('STORYBOARD');
  };

  const handleBackToEditor = () => {
    setView('EDITOR');
    setSelectedScene([]);
  };

  // Character Management Handlers
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
          // Merge with existing character
          const existing = prev[existingIndex];
          const merged: CharacterProfile = {
            ...existing,
            description: newChar.description, // Overwrite text details with latest from storyboard? Yes.
            visualDetails: newChar.visualDetails,
            artStyle: newChar.artStyle,
            referenceImages: [...new Set([...existing.referenceImages, ...newChar.referenceImages])],
            generatedPortraits: [...newChar.generatedPortraits, ...existing.generatedPortraits]
          };
          const copy = [...prev];
          copy[existingIndex] = merged;
          return copy;
        } else {
          // Add new character
          return [...prev, newChar];
        }
    });
  };

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <Header onOpenCharacterList={() => setIsCharacterListOpen(true)} />
      <main className="flex-grow flex flex-col relative overflow-hidden">
        {view === 'EDITOR' ? (
          <ScreenplayEditor onNavigateToStoryboard={handleNavigateToStoryboard} />
        ) : (
          <Storyboard 
            sceneElements={selectedScene} 
            onBack={handleBackToEditor} 
            savedCharacters={savedCharacters}
            onAddCharacter={handleAddCharacter}
            onOpenCharacterList={() => setIsCharacterListOpen(true)}
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