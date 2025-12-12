import React, { useEffect, useState } from 'react';
import { FileText, Plus, FolderOpen, Clock, Loader2, AlertCircle, Film, PenTool, Sparkles } from 'lucide-react';
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
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Top Half - Hero Section (50%) */}
      <div className="h-[50vh] relative flex flex-col items-center justify-center border-b border-zinc-800/50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 overflow-hidden shrink-0">
        
        {/* Artistic Background Elements */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
            {/* Soft Glows */}
            <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[20%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] mix-blend-screen" />
            
            {/* Grid Pattern */}
            <div 
                className="absolute inset-0 opacity-[0.03]" 
                style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-8 p-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Icon Logo */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-sm rotate-[-6deg]">
                    <Film className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-sm rotate-[6deg]">
                    <PenTool className="w-8 h-8 text-indigo-500" />
                </div>
            </div>

            {/* Main Title */}
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 drop-shadow-sm text-center">
                PlotFrame
            </h1>
            
            {/* Tagline */}
            <div className="flex items-center gap-4">
                <div className="h-px w-8 md:w-16 bg-gradient-to-r from-transparent to-emerald-500/50"></div>
                <p className="text-xl md:text-2xl text-zinc-400 font-light tracking-[0.2em] uppercase">
                    You are the storyteller
                </p>
                <div className="h-px w-8 md:w-16 bg-gradient-to-l from-transparent to-emerald-500/50"></div>
            </div>
        </div>
      </div>

      {/* Bottom Half - Projects Section (50%) */}
      <div className="h-[50vh] bg-zinc-950 relative flex flex-col shrink-0">
         {/* Gradient transition to blend section */}
         <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-zinc-950/50 to-transparent pointer-events-none z-10" />

         <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-center mb-10 opacity-60">
                     <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-4 py-1 border border-zinc-800 rounded-full">
                        <FolderOpen className="w-3 h-3" /> Workspace
                     </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 px-4">
                    {/* New Project Card */}
                    <button 
                        onClick={onCreateNew}
                        className="group flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900 hover:border-emerald-500/30 transition-all duration-300 min-h-[200px] hover:shadow-2xl hover:shadow-emerald-900/10 hover:-translate-y-1"
                    >
                        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 transition-all duration-300">
                           <Plus className="w-6 h-6 text-zinc-500 group-hover:text-emerald-500" />
                        </div>
                        <h3 className="font-bold text-lg text-zinc-300 group-hover:text-white transition-colors">New Project</h3>
                        <p className="text-xs text-zinc-600 mt-2 group-hover:text-zinc-500 transition-colors">Start from scratch</p>
                    </button>

                    {/* Loading State */}
                    {loading && (
                        <div className="col-span-1 md:col-span-2 flex items-center justify-center p-12 border border-zinc-800/50 rounded-2xl bg-zinc-900/20">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-600 mr-2" />
                            <span className="text-zinc-500 text-sm">Loading library...</span>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="col-span-1 md:col-span-2 flex items-center justify-center p-12 border border-red-900/30 rounded-2xl bg-red-900/5">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                            <span className="text-red-400 text-sm">{error}</span>
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
                                className="group relative flex flex-col p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-300 text-left hover:shadow-2xl hover:-translate-y-1 min-h-[200px]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
                                
                                <div className="flex justify-between items-start mb-auto relative z-10">
                                    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl group-hover:bg-zinc-800 transition-colors shadow-sm">
                                        <FileText className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                                         <Clock className="w-4 h-4 text-zinc-600" />
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mt-8 relative z-10">
                                    <h3 className="font-bold text-xl text-zinc-200 group-hover:text-white truncate tracking-tight">
                                        {name}
                                    </h3>
                                    <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-zinc-600 group-hover:text-zinc-500 transition-colors">
                                        <span className="flex items-center gap-1.5 bg-zinc-950/50 px-2 py-1 rounded">
                                            {sceneCount} Scenes
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-zinc-950/50 px-2 py-1 rounded">
                                            {charCount} Characters
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mt-auto pt-6 flex items-center justify-between text-xs font-medium relative z-10">
                                    <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">Last edited recently</span>
                                    <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        Open &rarr;
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};