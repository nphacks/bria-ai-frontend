import React, { useState } from 'react';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import { Header } from './components/Header';
import { Storyboard } from './components/Storyboard';
import { ScriptElement } from './types';

type ViewState = 'EDITOR' | 'STORYBOARD';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('EDITOR');
  const [selectedScene, setSelectedScene] = useState<ScriptElement[]>([]);

  const handleNavigateToStoryboard = (sceneElements: ScriptElement[]) => {
    setSelectedScene(sceneElements);
    setView('STORYBOARD');
  };

  const handleBackToEditor = () => {
    setView('EDITOR');
    setSelectedScene([]);
  };

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-grow flex flex-col relative overflow-hidden">
        {view === 'EDITOR' ? (
          <ScreenplayEditor onNavigateToStoryboard={handleNavigateToStoryboard} />
        ) : (
          <Storyboard sceneElements={selectedScene} onBack={handleBackToEditor} />
        )}
      </main>
    </div>
  );
};

export default App;