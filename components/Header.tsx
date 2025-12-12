import React, { useRef } from 'react';
import { FileText, Save, Users, Upload, Download, Home } from 'lucide-react';

interface HeaderProps {
  onGoHome: () => void;
  onOpenCharacterList: () => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onGoHome,
  onOpenCharacterList, 
  onExportProject,
  onImportProject 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
    }
    // Reset value so same file can be selected again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <header className="w-full border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md z-50 h-14 flex-none">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <button 
            onClick={onGoHome}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none"
        >
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-500 p-1.5 rounded-md">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-zinc-200 tracking-tight">
            PlotFrame
          </h1>
        </button>
        <div className="flex items-center space-x-3">
          <button 
             onClick={onGoHome}
             className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700 mr-2"
             title="Go to Home"
          >
            <Home className="w-3 h-3" />
            <span>Home</span>
          </button>

          <button 
            onClick={onOpenCharacterList}
            className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700"
          >
            <Users className="w-3 h-3" />
            <span>Character List</span>
          </button>
          
          <div className="h-4 w-px bg-zinc-700 mx-1"></div>

          <button 
             onClick={onExportProject}
             className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
             title="Save Project (JSON)"
          >
            <Download className="w-3 h-3" />
            <span>Save Project</span>
          </button>
          
          <label className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer">
            <Upload className="w-3 h-3" />
            <span>Open Project</span>
            <input 
                type="file" 
                ref={fileInputRef}
                accept=".json" 
                onChange={handleFileChange} 
                className="hidden" 
            />
          </label>
        </div>
      </div>
    </header>
  );
};