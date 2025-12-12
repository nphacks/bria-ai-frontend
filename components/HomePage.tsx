import React, { useEffect, useState } from 'react';
import { FileText, Plus, FolderOpen, Clock, Loader2, AlertCircle } from 'lucide-react';
import { PROJECT_URLS } from '../data/sampleProjects';

interface HomePageProps {
  onSelectProject: (name: string, data: any) => void;
  onCreateNew: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectProject, onCreateNew }) => {
  const [projectsData, setProjectsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const results: Record<string, any> = {};
        const promises = Object.entries(PROJECT_URLS).map(async ([name, url]) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${name}`);
            const json = await response.json();
            results[name] = json;
        });
        await Promise.all(promises);
        setProjectsData(results);
      } catch (err) {
          console.error(err);
          setError("Failed to load project files. Ensure files exist in /scripts/ folder.");
      } finally {
          setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const projectNames = Object.keys(PROJECT_URLS);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-500 p-2 rounded-lg shadow-lg shadow-emerald-900/20">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">PlotFrame</h1>
          </div>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Welcome back. Select an existing screenplay project or start a new masterpiece.
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* New Project Card */}
          <button 
            onClick={onCreateNew}
            className="group flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/80 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-900/10 hover:-translate-y-1"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
              <Plus className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-bold text-lg text-zinc-200">New Project</h3>
            <p className="text-sm text-zinc-500 mt-2">Start from scratch</p>
          </button>

          {/* Loading State */}
          {loading && (
             <div className="col-span-1 md:col-span-3 flex items-center justify-center p-12 border border-zinc-800 rounded-2xl bg-zinc-900/50">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
                <span className="text-zinc-400">Loading projects...</span>
             </div>
          )}

           {/* Error State */}
          {!loading && error && (
             <div className="col-span-1 md:col-span-3 flex items-center justify-center p-12 border border-red-900/50 rounded-2xl bg-red-900/10">
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                <span className="text-red-400">{error}</span>
             </div>
          )}

          {/* Existing Projects */}
          {!loading && projectNames.map(name => {
              const data = projectsData[name];
              if (!data) return null;

              const sceneCount = data.screenplay?.filter((el: any) => el.type === 'SCENE_HEADING').length || 0;
              const charCount = data.characters?.length || 0;

              return (
                <button 
                    key={name}
                    onClick={() => onSelectProject(name, data)}
                    className="group relative flex flex-col p-6 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-all duration-300 text-left hover:shadow-xl hover:-translate-y-1"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-auto">
                        <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
                            <FolderOpen className="w-6 h-6 text-indigo-400" />
                        </div>
                    </div>
                    
                    <div className="space-y-1 mt-8">
                        <h3 className="font-bold text-xl text-zinc-100 group-hover:text-white truncate">
                            {name}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                             <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" /> {sceneCount} Scenes
                             </span>
                             <span className="flex items-center gap-1">
                                <FolderOpen className="w-3 h-3" /> {charCount} Chars
                             </span>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Ready to edit
                        </span>
                        <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            Open Project &rarr;
                        </span>
                    </div>
                </button>
              );
          })}
        </div>
      </div>
    </div>
  );
};
