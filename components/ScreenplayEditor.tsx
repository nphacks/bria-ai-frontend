import React, { useRef, useEffect, useState } from 'react';
import { ScriptElement, ScriptElementType } from '../types';
import { Trash2, ArrowDown, Camera } from 'lucide-react';

interface ScreenplayEditorProps {
  elements: ScriptElement[];
  onUpdateElements: (elements: ScriptElement[]) => void;
  onNavigateToStoryboard: (sceneElements: ScriptElement[]) => void;
}

export const ScreenplayEditor: React.FC<ScreenplayEditorProps> = ({ 
  elements, 
  onUpdateElements, 
  onNavigateToStoryboard 
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [currentType, setCurrentType] = useState<ScriptElementType>('ACTION');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when elements change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [elements.length]);

  const handleAddElement = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentInput.trim()) return;

    let nextType: ScriptElementType = 'ACTION';
    let nextSceneNum = undefined;

    if (currentType === 'SCENE_HEADING') {
      const lastScene = elements.filter(el => el.type === 'SCENE_HEADING').pop();
      nextSceneNum = (lastScene?.sceneNumber || 0) + 1;
      nextType = 'ACTION';
    } else if (currentType === 'CHARACTER') {
      nextType = 'DIALOGUE';
    } else if (currentType === 'PARENTHETICAL') {
      nextType = 'DIALOGUE';
    } else if (currentType === 'DIALOGUE') {
      nextType = 'CHARACTER'; 
    }

    const newElement: ScriptElement = {
      id: Date.now().toString(),
      type: currentType,
      content: currentInput,
      sceneNumber: currentType === 'SCENE_HEADING' ? nextSceneNum : undefined
    };

    onUpdateElements([...elements, newElement]);
    setCurrentInput('');
    setCurrentType(nextType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddElement();
    }
  };

  const handlePictureThis = (sceneId: string) => {
    const sceneIndex = elements.findIndex(el => el.id === sceneId);
    if (sceneIndex === -1) return;

    // Get all elements from this scene until the next scene heading
    const sceneElements = [elements[sceneIndex]];
    for (let i = sceneIndex + 1; i < elements.length; i++) {
      if (elements[i].type === 'SCENE_HEADING') break;
      sceneElements.push(elements[i]);
    }
    onNavigateToStoryboard(sceneElements);
  };

  const getElementClasses = (type: ScriptElementType) => {
    switch (type) {
      case 'SCENE_HEADING':
        return 'font-bold uppercase mt-8 mb-4 text-zinc-100';
      case 'ACTION':
        return 'mb-4 text-zinc-300 text-left';
      case 'CHARACTER':
        return 'mt-6 mb-0 uppercase font-bold text-zinc-200 ml-[37%] w-full';
      case 'DIALOGUE':
        return 'mb-2 text-zinc-300 ml-[25%] w-[50%]';
      case 'PARENTHETICAL':
        return 'mb-0 italic text-zinc-400 ml-[31%] w-[38%]';
      case 'TRANSITION':
        return 'mt-4 mb-4 uppercase font-bold text-right text-zinc-200';
      default:
        return 'mb-4';
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full w-full max-w-7xl mx-auto">
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-8 sm:p-12 bg-[#1a1a1a] shadow-2xl border-x border-zinc-800 custom-scrollbar"
      >
        <div className="max-w-3xl mx-auto font-screenplay text-lg leading-relaxed">
          {elements.map((el, index) => (
            <div key={el.id} className={`relative group ${getElementClasses(el.type)}`}>
              {el.type === 'SCENE_HEADING' && (
                <>
                  <span className="absolute -left-12 top-0 text-zinc-500 font-normal select-none">
                    {el.sceneNumber || index + 1}
                  </span>
                  {/* Picture This Button */}
                  <button
                    onClick={() => handlePictureThis(el.id)}
                    className="absolute -left-48 top-0.5 flex items-center gap-1.5 px-2 py-1 bg-zinc-900 hover:bg-emerald-900/30 text-zinc-500 hover:text-emerald-400 text-[10px] font-sans rounded border border-zinc-800 hover:border-emerald-800 transition-all uppercase font-medium tracking-wide backdrop-blur-sm shadow-sm"
                    title="Generate Storyboard"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Picture this</span>
                  </button>
                </>
              )}
              
              {el.content}

              <button 
                onClick={() => onUpdateElements(elements.filter(e => e.id !== el.id))}
                className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-opacity"
                title="Delete line"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {elements.length === 0 && (
            <div className="text-zinc-600 text-center mt-20 italic">
              Start your masterpiece below...
            </div>
          )}
          <div className="h-20" /> {/* Spacer */}
        </div>
      </div>

      {/* Input / Controls Area */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex-none">
        <div className="max-w-3xl mx-auto space-y-3">
          
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'SCENE_HEADING', label: 'Scene Heading' },
              { id: 'ACTION', label: 'Action' },
              { id: 'CHARACTER', label: 'Character' },
              { id: 'DIALOGUE', label: 'Dialogue' },
              { id: 'PARENTHETICAL', label: 'Parenthetical' },
              { id: 'TRANSITION', label: 'Transition' },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => setCurrentType(tool.id as ScriptElementType)}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentType === tool.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {tool.label.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type ${currentType.toLowerCase().replace('_', ' ')}...`}
              className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-700 p-4 pr-14 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none font-screenplay text-lg h-24"
            />
            <button
              onClick={() => handleAddElement()}
              disabled={!currentInput.trim()}
              className="absolute right-3 bottom-3 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex justify-between text-xs text-zinc-500 px-1">
            <span>Press <strong>Enter</strong> to submit & auto-switch format</span>
            <span>{currentInput.length} chars</span>
          </div>
        </div>
      </div>
    </div>
  );
};