import React from 'react';
import { FileText, Save, Users } from 'lucide-react';

interface HeaderProps {
  onOpenCharacterList: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCharacterList }) => {
  return (
    <header className="w-full border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md z-50 h-14 flex-none">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-500 p-1.5 rounded-md">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-zinc-200 tracking-tight">
            Screenplay Studio
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={onOpenCharacterList}
            className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700"
          >
            <Users className="w-3 h-3" />
            <span>Characters</span>
          </button>
          <button className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors">
            <Save className="w-3 h-3" />
            <span>Auto-Saved</span>
          </button>
        </div>
      </div>
    </header>
  );
};