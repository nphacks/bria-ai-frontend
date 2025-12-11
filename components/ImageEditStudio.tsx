import React from 'react';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageEditStudioProps {
  image: GeneratedImage | null;
  onBack: () => void;
}

export const ImageEditStudio: React.FC<ImageEditStudioProps> = ({ image, onBack }) => {
  return (
    <div className="h-full bg-zinc-950 flex flex-col animate-in fade-in duration-300">
       <div className="flex items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
          <button onClick={onBack} className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> <span>Back</span>
          </button>
          <div className="ml-6 flex items-center gap-2 font-bold text-zinc-200">
             <Wand2 className="w-5 h-5 text-indigo-500" />
             Image Edit Studio
          </div>
       </div>
       <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-500 bg-zinc-950/50">
          {image ? (
            <div className="max-w-4xl w-full flex flex-col items-center gap-6">
                 <div className="relative group rounded-lg overflow-hidden border border-zinc-800 shadow-2xl">
                    <img 
                        src={image.image_url} 
                        alt="Editing target" 
                        className="max-h-[70vh] w-auto object-contain" 
                    />
                 </div>
                 
                 <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 max-w-md text-center">
                    <Wand2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold text-white mb-2">Edit Studio Coming Soon</h3>
                    <p className="text-sm text-zinc-400">
                        Advanced editing tools including inpainting, outpainting, and style transfer will be available here.
                    </p>
                 </div>
            </div>
          ) : (
            <p>No image selected.</p>
          )}
       </div>
    </div>
  );
};