import React, { useState, useEffect } from 'react';
import { CharacterProfile, ArtStyle } from '../types';
import { Users, Download, Upload, X, ChevronLeft, ImageIcon, Sparkles, Loader2, Wand2, CheckCircle2, User } from 'lucide-react';
import { generateImage, normalizeGeneratedImage } from '../services/apiService';

interface CharacterListModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterProfile[];
  onUpdateCharacter: (character: CharacterProfile) => void;
  onImportCharacters: (characters: CharacterProfile[]) => void;
}

const ART_STYLES: ArtStyle[] = [
  'Cinematic/Digital',
  'Pencil Sketch',
  'Oil Painting',
  'Watercolor',
  'Ink Illustration'
];

export const CharacterListModal: React.FC<CharacterListModalProps> = ({
  isOpen,
  onClose,
  characters,
  onUpdateCharacter,
  onImportCharacters
}) => {
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [newGenPrompt, setNewGenPrompt] = useState('');
  const [selectedReferenceUrls, setSelectedReferenceUrls] = useState<string[]>([]);
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);
  const [generationArtStyle, setGenerationArtStyle] = useState<ArtStyle>('Cinematic/Digital');
  
  // Track which field is currently being edited
  const [editingField, setEditingField] = useState<'name' | 'description' | 'visualDetails' | null>(null);

  const activeCharacter = characters.find(c => c.id === activeCharacterId);

  // Reset editing state when switching characters
  useEffect(() => {
    setEditingField(null);
  }, [activeCharacterId]);

  if (!isOpen) return null;

  const handleDownloadCharacters = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(characters));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "characters.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleUploadCharacters = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loaded = JSON.parse(event.target?.result as string);
          if (Array.isArray(loaded)) {
            const valid = loaded.every((c: any) => c.name && Array.isArray(c.generatedPortraits));
            if (valid) {
                const existingIds = new Set(characters.map(p => p.id));
                const newChars = loaded.filter((c: CharacterProfile) => !existingIds.has(c.id));
                
                // Normalize imported characters to ensure flat image structure
                const normalizedNewChars = newChars.map((c: any) => ({
                    ...c,
                    generatedPortraits: c.generatedPortraits.map(normalizeGeneratedImage)
                }));

                onImportCharacters([...characters, ...normalizedNewChars]);
            } else {
                alert('JSON format does not match expected CharacterProfile structure.');
            }
          }
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const toggleReferenceImage = (url: string) => {
    setSelectedReferenceUrls(prev => {
        if (prev.includes(url)) {
            return prev.filter(u => u !== url);
        } else {
            return [...prev, url];
        }
    });
  };

  const handleGenerateVariation = async () => {
    if (!activeCharacter) return;
    
    setIsGeneratingNew(true);
    try {
        const prompt = `Character: ${activeCharacter.name}. 
        ${activeCharacter.description}. 
        ${activeCharacter.visualDetails}. 
        Art Style: ${generationArtStyle}. 
        
        Specific Scenario/Action: ${newGenPrompt}`;

        // Map selected URLs back to full GeneratedImage objects if possible
        const references = selectedReferenceUrls.map(url => {
            const generated = activeCharacter.generatedPortraits.find(p => p.image_url === url);
            return generated || url;
        });

        const result = await generateImage(prompt, references);
        
        const updatedChar: CharacterProfile = {
            ...activeCharacter,
            generatedPortraits: [result, ...activeCharacter.generatedPortraits]
        };

        onUpdateCharacter(updatedChar);
        setNewGenPrompt('');
        setSelectedReferenceUrls([]);
    } catch (error) {
        console.error("Failed to generate variation", error);
        alert("Failed to generate image variation.");
    } finally {
        setIsGeneratingNew(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900 flex-none">
            <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-emerald-500" />
                <h2 className="text-xl font-bold">Character List</h2>
                <span className="text-zinc-500 text-sm bg-zinc-800 px-2 py-0.5 rounded-full">{characters.length}</span>
            </div>
            <div className="flex items-center gap-4">
                 <button onClick={handleDownloadCharacters} title="Export Library" className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-300">
                    <Download className="w-4 h-4" /> Export
                 </button>
                 <label title="Import Library" className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-300 cursor-pointer">
                    <Upload className="w-4 h-4" /> Import
                    <input type="file" accept=".json" onChange={handleUploadCharacters} className="hidden" />
                 </label>
                <button onClick={() => { onClose(); setActiveCharacterId(null); }} className="p-2 hover:bg-zinc-800 rounded-full">
                    <X className="w-6 h-6 text-zinc-400" />
                </button>
            </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            {activeCharacterId && activeCharacter ? (
                 <div className="flex w-full h-full">
                     {/* Panel 1: Info (20%) */}
                     <div className="w-[20%] border-r border-zinc-800 bg-zinc-900/50 p-6 overflow-y-auto space-y-6">
                         <button 
                            onClick={() => {setActiveCharacterId(null); setSelectedReferenceUrls([]); setNewGenPrompt('');}}
                            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 text-sm font-medium"
                         >
                             <ChevronLeft className="w-4 h-4" /> Back to list
                         </button>
                         
                         <div>
                             {editingField === 'name' ? (
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={activeCharacter.name}
                                    onChange={(e) => onUpdateCharacter({...activeCharacter, name: e.target.value})}
                                    onBlur={() => setEditingField(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                    className="text-2xl font-bold text-white mb-1 bg-zinc-800 border-b border-emerald-500 outline-none w-full px-1 rounded-t"
                                />
                             ) : (
                                <h2 
                                    onClick={() => setEditingField('name')}
                                    className="text-2xl font-bold text-white mb-1 cursor-pointer hover:bg-zinc-800/50 rounded px-1 -mx-1 border border-transparent hover:border-zinc-700/50 truncate"
                                    title="Click to edit name"
                                >
                                    {activeCharacter.name}
                                </h2>
                             )}
                             <span className="inline-block bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded border border-zinc-700">
                                 {activeCharacter.artStyle}
                             </span>
                         </div>

                         <div className="space-y-4">
                            <div>
                                <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">Description</h4>
                                {editingField === 'description' ? (
                                    <textarea 
                                        autoFocus
                                        value={activeCharacter.description}
                                        onChange={(e) => onUpdateCharacter({...activeCharacter, description: e.target.value})}
                                        onBlur={() => setEditingField(null)}
                                        className="text-sm text-zinc-300 leading-relaxed bg-zinc-800 w-full h-32 border border-emerald-500 rounded p-2 outline-none resize-none"
                                    />
                                ) : (
                                    <div 
                                        onClick={() => setEditingField('description')}
                                        className="text-sm text-zinc-300 leading-relaxed cursor-pointer hover:bg-zinc-800/50 rounded p-2 -ml-2 border border-transparent hover:border-zinc-700/50 min-h-[50px] whitespace-pre-wrap"
                                        title="Click to edit description"
                                    >
                                        {activeCharacter.description || <span className="italic text-zinc-600">No description. Click to add.</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">Visual Details</h4>
                                {editingField === 'visualDetails' ? (
                                    <textarea 
                                        autoFocus
                                        value={activeCharacter.visualDetails}
                                        onChange={(e) => onUpdateCharacter({...activeCharacter, visualDetails: e.target.value})}
                                        onBlur={() => setEditingField(null)}
                                        className="text-sm text-zinc-300 leading-relaxed bg-zinc-800 w-full h-32 border border-emerald-500 rounded p-2 outline-none resize-none"
                                    />
                                ) : (
                                    <div 
                                        onClick={() => setEditingField('visualDetails')}
                                        className="text-sm text-zinc-300 leading-relaxed cursor-pointer hover:bg-zinc-800/50 rounded p-2 -ml-2 border border-transparent hover:border-zinc-700/50 min-h-[50px] whitespace-pre-wrap"
                                        title="Click to edit visual details"
                                    >
                                        {activeCharacter.visualDetails || <span className="italic text-zinc-600">No visual details. Click to add.</span>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Source Images</h4>
                                <div className="flex flex-wrap gap-2">
                                    {activeCharacter.referenceImages.map((ref, i) => (
                                        <img key={i} src={ref} className="w-12 h-12 rounded object-cover border border-zinc-700 opacity-60 hover:opacity-100" />
                                    ))}
                                    {activeCharacter.referenceImages.length === 0 && <p className="text-xs text-zinc-600 italic">None</p>}
                                </div>
                            </div>
                         </div>
                     </div>

                     {/* Panel 2: Gallery & Selection (50%) */}
                     <div className="w-[50%] border-r border-zinc-800 bg-black p-6 flex flex-col">
                         <div className="flex items-center justify-between mb-4 flex-none">
                             <h3 className="font-bold text-lg flex items-center gap-2">
                                 <ImageIcon className="w-5 h-5 text-indigo-500" />
                                 Image Gallery
                             </h3>
                             <div className="text-xs text-zinc-500">
                                 Click images to select as reference
                             </div>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                 {activeCharacter.generatedPortraits.map((img, idx) => {
                                     // Direct access now safe due to normalization
                                     const imgUrl = img.image_url;
                                     const isSelected = selectedReferenceUrls.includes(imgUrl);
                                     
                                     return (
                                         <div 
                                            key={idx} 
                                            onClick={() => toggleReferenceImage(imgUrl)}
                                            className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                                isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-zinc-800 hover:border-zinc-600'
                                            }`}
                                         >
                                             <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                             {isSelected && (
                                                 <div className="absolute top-2 right-2 bg-emerald-500 text-black rounded-full p-1 shadow-lg">
                                                     <CheckCircle2 className="w-4 h-4" />
                                                 </div>
                                             )}
                                             {!isSelected && (
                                                 <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                     <span className="text-xs bg-black/70 px-2 py-1 rounded text-white">Use as Ref</span>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     </div>

                     {/* Panel 3: Generate New (30%) */}
                     <div className="w-[30%] bg-zinc-900 p-6 flex flex-col">
                         <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
                             <Sparkles className="w-5 h-5 text-emerald-500" />
                             Create Variation
                         </h3>

                         <div className="flex-1 overflow-y-auto space-y-6">
                             <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase mb-2 block">Art Style</label>
                                <select 
                                    value={generationArtStyle} 
                                    onChange={(e) => setGenerationArtStyle(e.target.value as ArtStyle)}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                >
                                    {ART_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                                </select>
                             </div>

                             <div>
                                 <label className="text-xs font-semibold text-zinc-400 uppercase mb-2 block">Prompt / Scenario</label>
                                 <textarea 
                                     value={newGenPrompt}
                                     onChange={(e) => setNewGenPrompt(e.target.value)}
                                     placeholder="e.g. Walking in the rain, holding a red umbrella, angry expression..."
                                     className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none h-32 resize-none"
                                 />
                                 <p className="text-[10px] text-zinc-500 mt-2">
                                     This will be combined with the character's base description and visual details.
                                 </p>
                             </div>

                             <div>
                                 <label className="text-xs font-semibold text-zinc-400 uppercase mb-2 block flex justify-between">
                                     <span>Selected References</span>
                                     <span className="text-emerald-500">{selectedReferenceUrls.length} selected</span>
                                 </label>
                                 {selectedReferenceUrls.length > 0 ? (
                                     <div className="grid grid-cols-4 gap-2">
                                         {selectedReferenceUrls.map((url, i) => (
                                             <div key={i} className="relative aspect-square rounded overflow-hidden border border-zinc-700">
                                                 <img src={url} className="w-full h-full object-cover" />
                                                 <button 
                                                    onClick={() => toggleReferenceImage(url)}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 text-white"
                                                 >
                                                     <X className="w-4 h-4" />
                                                 </button>
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="h-20 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 text-xs">
                                         Select images from gallery
                                     </div>
                                 )}
                             </div>
                         </div>

                         <div className="mt-6 pt-6 border-t border-zinc-800">
                             <button 
                                 onClick={handleGenerateVariation}
                                 disabled={isGeneratingNew || (!newGenPrompt.trim() && selectedReferenceUrls.length === 0)}
                                 className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-900/20"
                             >
                                 {isGeneratingNew ? (
                                     <>
                                         <Loader2 className="w-4 h-4 animate-spin" />
                                         Generating...
                                     </>
                                 ) : (
                                     <>
                                         <Wand2 className="w-4 h-4" />
                                         Create Image
                                     </>
                                 )}
                             </button>
                         </div>
                     </div>
                 </div>
            ) : (
                // List View
                <div className="h-full overflow-y-auto p-8">
                    {characters.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                            <User className="w-16 h-16 opacity-20" />
                            <p>No characters saved yet. Create one from the script!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {characters.map(char => (
                                <div 
                                    key={char.id} 
                                    onClick={() => setActiveCharacterId(char.id)}
                                    className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 hover:shadow-xl transition-all flex flex-col"
                                >
                                    <div className="aspect-square bg-black relative overflow-hidden">
                                        {char.generatedPortraits[0] ? (
                                            <img 
                                                // Direct access due to normalization
                                                src={char.generatedPortraits[0].image_url} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                                <User className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <span className="text-xs font-bold text-white uppercase tracking-wider bg-black/50 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
                                                {char.generatedPortraits.length} Images
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">{char.name}</h3>
                                        </div>
                                        <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{char.description}</p>
                                        <div className="mt-auto flex items-center gap-2 text-xs text-zinc-500">
                                            <span className="px-2 py-1 bg-zinc-800 rounded">{char.artStyle}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};