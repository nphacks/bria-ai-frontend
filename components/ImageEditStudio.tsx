import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ArrowLeft, Wand2, Eraser, Move, Undo2, Download, RefreshCw, Layers, Check, X, Sparkles, ImagePlus, Aperture, UserMinus, Maximize, FileText, Palette, Sun, Box, BookOpen, PenTool, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { GeneratedImage } from '../types';
import { eraseImage, generativeFill, removeBackground, replaceBackground, blurBackground, removeForeground, expandImage, generateFullDescriptions, generateImage } from '../services/apiService';

interface ImageEditStudioProps {
  image: GeneratedImage | null;
  onBack: () => void;
  onSave: (original: GeneratedImage, newImage: GeneratedImage) => void;
}

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];

type EditTool = 'move' | 'eraser' | 'gen_fill' | 'remove_bg' | 'replace_bg' | 'blur_bg' | 'remove_fg' | 'expand' | 'advanced';

// Helper to guess icon based on key name
const getKeyIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('light')) return <Sun className="w-4 h-4 text-amber-500" />;
    if (k.includes('color') || k.includes('palette')) return <Palette className="w-4 h-4 text-purple-500" />;
    if (k.includes('object') || k.includes('item')) return <Box className="w-4 h-4 text-blue-500" />;
    if (k.includes('context') || k.includes('story')) return <BookOpen className="w-4 h-4 text-emerald-500" />;
    if (k.includes('style') || k.includes('art')) return <PenTool className="w-4 h-4 text-pink-500" />;
    if (k.includes('background') || k.includes('setting')) return <ImagePlus className="w-4 h-4 text-cyan-500" />;
    return <FileText className="w-4 h-4 text-zinc-500" />;
};

const formatKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const AutoResizeTextarea = ({ 
    value, 
    onChange, 
    className, 
    placeholder, 
    minHeight = "60px", 
    maxHeight = "300px" 
}: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
}) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        if (ref.current) {
            // Reset height to auto to correctly calculate shrink
            ref.current.style.height = 'auto';
            // Set height to scrollHeight
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`${className} overflow-y-auto resize-none block`}
            style={{ minHeight, maxHeight }}
        />
    );
};

export const ImageEditStudio: React.FC<ImageEditStudioProps> = ({ 
    image: initialImage, 
    onBack, 
    onSave
}) => {
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(initialImage);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<EditTool>('move');
  const [brushSize, setBrushSize] = useState(50);
  const [genFillPrompt, setGenFillPrompt] = useState('');
  
  // Replace BG State
  const [replaceBgPrompt, setReplaceBgPrompt] = useState('');

  // Blur BG State
  const [blurScale, setBlurScale] = useState(3);

  // Expand State
  const [expandAspectRatio, setExpandAspectRatio] = useState('16:9');
  const [expandPrompt, setExpandPrompt] = useState('');
  
  // Advanced Edit State
  const [advancedData, setAdvancedData] = useState<any | null>(null);
  const [editedData, setEditedData] = useState<Record<string, string | string[]>>({});
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [preRegenerationImage, setPreRegenerationImage] = useState<GeneratedImage | null>(null);

  // Canvas & Image Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  const isMaskingTool = activeTool === 'eraser' || activeTool === 'gen_fill';

  // Sync state when prop updates (e.g. after save)
  useEffect(() => {
    setCurrentImage(initialImage);
    // When image changes (e.g. save or discard), clear canvas
    clearCanvas();
    // Reset advanced data on new image
    setAdvancedData(null);
    setEditedData({});
    setAdditionalPrompt('');
    setPreRegenerationImage(null);
  }, [initialImage]);

  // Initialize canvas size to match image natural size once image loads
  const handleImageLoad = () => {
    if (imgRef.current && canvasRef.current) {
      canvasRef.current.width = imgRef.current.naturalWidth;
      canvasRef.current.height = imgRef.current.naturalHeight;
      updateImageScale();
      clearCanvas();
    }
  };

  const updateImageScale = () => {
    if (imgRef.current) {
        setImageScale(imgRef.current.width / imgRef.current.naturalWidth);
    }
  };

  // Update scale on resize
  useEffect(() => {
    window.addEventListener('resize', updateImageScale);
    return () => window.removeEventListener('resize', updateImageScale);
  }, []);

  // Initialize edited data when analysis completes
  useEffect(() => {
    if (advancedData) {
        const initial: Record<string, string | string[]> = {};
        const initialExpanded: Record<string, boolean> = {};
        
        Object.entries(advancedData).forEach(([k, v]) => {
            if (Array.isArray(v)) {
                initial[k] = v.map(item => typeof item === 'string' ? item : JSON.stringify(item));
            } else if (typeof v === 'string') {
                initial[k] = v;
            } else {
                initial[k] = JSON.stringify(v, null, 2);
            }
            // Auto expand logic
            initialExpanded[k] = Array.isArray(v) || (typeof initial[k] === 'string' && initial[k].length < 100);
        });
        setEditedData(initial);
        setExpandedKeys(initialExpanded);
    }
  }, [advancedData]);

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasMask(false);
      }
    }
  };

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || !imgRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Scale coordinates to match natural image size
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMaskingTool) return;
    setIsDrawing(true);
    draw(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update custom cursor position
    if (isMaskingTool && cursorRef.current) {
      cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    }

    if (isDrawing) {
        draw(e);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    if (!isMaskingTool || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPointerPos(e);

    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)'; 
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    setHasMask(true);
  };

  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current) return;
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    ctx?.beginPath(); // Reset path
  };

  const handleApplyTool = async () => {
    if (!currentImage) return;
    
    // Validations
    if (isMaskingTool && (!canvasRef.current || !hasMask)) return;

    setIsProcessing(true);
    try {
        let result: GeneratedImage;

        if (activeTool === 'eraser') {
            const maskBase64 = canvasRef.current!.toDataURL('image/png');
            result = await eraseImage(currentImage.image_url, maskBase64);
        } else if (activeTool === 'gen_fill') {
            const maskBase64 = canvasRef.current!.toDataURL('image/png');
            if (!genFillPrompt.trim()) {
                alert("Please enter a prompt for Generative Fill.");
                setIsProcessing(false);
                return;
            }
            result = await generativeFill(currentImage.image_url, maskBase64, genFillPrompt);
        } else if (activeTool === 'remove_bg') {
            result = await removeBackground(currentImage.image_url);
        } else if (activeTool === 'remove_fg') {
            result = await removeForeground(currentImage.image_url);
        } else if (activeTool === 'blur_bg') {
            result = await blurBackground(currentImage.image_url, blurScale);
        } else if (activeTool === 'replace_bg') {
            if (!replaceBgPrompt.trim()) {
                alert("Please enter a prompt.");
                setIsProcessing(false);
                return;
            }
            result = await replaceBackground(currentImage.image_url, replaceBgPrompt);
        } else if (activeTool === 'expand') {
            result = await expandImage(currentImage.image_url, expandAspectRatio, expandPrompt);
        } else if (activeTool === 'advanced') {
            if (!currentImage.structured_prompt) {
                alert("No structured data available for this image.");
                setIsProcessing(false);
                return;
            }
            const data = await generateFullDescriptions(currentImage.structured_prompt);
            setAdvancedData(data);
            setIsProcessing(false);
            return; // Don't replace current image
        } else {
            return;
        }
        
        // Preserve structured_prompt if missing in result
        // This is crucial for enabling "Advanced Remix" on images modified by standard tools
        if (currentImage.structured_prompt && !result.structured_prompt) {
            result.structured_prompt = currentImage.structured_prompt;
        }

        setCurrentImage(result);
        if (isMaskingTool) clearCanvas();
        
        setActiveTool('move');
        setGenFillPrompt('');
        setReplaceBgPrompt('');
        setExpandPrompt('');
    } catch (error) {
        console.error("Operation failed", error);
        alert("Failed to process image. See console for details.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRegenerateFromAdvanced = async () => {
      if (!currentImage || !advancedData) return;
      
      setPreRegenerationImage(currentImage); // Snapshot state
      setIsProcessing(true);
      
      try {
          const changedParts: string[] = [];

          // Compare editedData with advancedData
          Object.entries(editedData).forEach(([key, currentValue]) => {
              const originalValueRaw = advancedData[key];
              
              // Normalize original value to match editedData structure for comparison
              let originalValueNormalized: string | string[];
              if (Array.isArray(originalValueRaw)) {
                  originalValueNormalized = originalValueRaw.map(item => typeof item === 'string' ? item : JSON.stringify(item));
              } else if (typeof originalValueRaw === 'string') {
                  originalValueNormalized = originalValueRaw;
              } else {
                  originalValueNormalized = JSON.stringify(originalValueRaw, null, 2);
              }

              let hasChanged = false;
              if (Array.isArray(currentValue)) {
                  // Compare arrays
                  if (!Array.isArray(originalValueNormalized)) {
                      hasChanged = true;
                  } else {
                      if (currentValue.length !== originalValueNormalized.length) {
                          hasChanged = true;
                      } else {
                           // Compare elements
                           for (let i = 0; i < currentValue.length; i++) {
                               if (currentValue[i] !== originalValueNormalized[i]) {
                                   hasChanged = true;
                                   break;
                               }
                           }
                      }
                  }
                  
                  if (hasChanged) {
                      // For arrays, we send the key and the new list joined by newlines
                      changedParts.push(`${formatKey(key)}:\n${currentValue.join('\n')}`);
                  }

              } else {
                  // Compare strings
                  if (currentValue !== originalValueNormalized) {
                      hasChanged = true;
                      changedParts.push(`${formatKey(key)}: ${currentValue.trim()}`);
                  }
              }
          });
          
          if (additionalPrompt.trim()) {
              changedParts.push(`Additional Instructions: ${additionalPrompt.trim()}`);
          }

          if (changedParts.length === 0) {
              alert("No changes detected. Please modify fields or add instructions.");
              setIsProcessing(false);
              setPreRegenerationImage(null);
              return;
          }

          const fullPrompt = changedParts.join('\n\n');
          
          // Generate new image using the reference + new prompt.
          // By passing [currentImage], we ensure the structured_prompt is sent to the backend.
          const result = await generateImage(fullPrompt, [currentImage]);
          
          // Preserve structured_prompt if missing in result
          if (currentImage.structured_prompt && !result.structured_prompt) {
              result.structured_prompt = currentImage.structured_prompt;
          }

          setCurrentImage(result);
          
      } catch (error) {
          console.error("Regeneration failed", error);
          alert("Failed to regenerate image.");
          setPreRegenerationImage(null); // Revert state tracking on error
      } finally {
          setIsProcessing(false);
      }
  };

  const acceptVariation = () => {
      setPreRegenerationImage(null);
  };

  const discardVariation = () => {
      if (preRegenerationImage) {
          setCurrentImage(preRegenerationImage);
          setPreRegenerationImage(null);
      }
  };

  const handleSave = () => {
      if (initialImage && currentImage) {
          onSave(initialImage, currentImage);
      }
  };

  const handleDiscard = () => {
      setCurrentImage(initialImage);
      clearCanvas();
  };

  const toggleExpandKey = (key: string) => {
      setExpandedKeys(prev => ({...prev, [key]: !prev[key]}));
  };
  
  const handleArrayUpdate = (key: string, index: number, newValue: string) => {
    setEditedData(prev => {
        const current = prev[key];
        if (Array.isArray(current)) {
            const next = [...current];
            next[index] = newValue;
            return { ...prev, [key]: next };
        }
        return prev;
    });
  };

  const handleAddArrayItem = (key: string) => {
    setEditedData(prev => {
        const current = prev[key];
        if (Array.isArray(current)) {
            return { ...prev, [key]: [...current, ''] };
        }
        return prev;
    });
  };

  const handleDeleteArrayItem = (key: string, index: number) => {
    setEditedData(prev => {
        const current = prev[key];
        if (Array.isArray(current)) {
            const next = current.filter((_, i) => i !== index);
            return { ...prev, [key]: next };
        }
        return prev;
    });
  };

  if (!initialImage) return null;

  // Check object reference to ensure save button appears even if URL string is identical
  const hasUnsavedChanges = currentImage !== initialImage;

  return (
    <div className="h-full bg-zinc-950 flex flex-col animate-in fade-in duration-300">
       {/* Top Bar */}
       <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 flex-none z-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" /> <span>Back</span>
            </button>
            <div className="h-6 w-px bg-zinc-700" />
            <div className="flex items-center gap-2 font-bold text-zinc-200">
                <Wand2 className="w-5 h-5 text-indigo-500" />
                Image Edit Studio
            </div>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden">
          {/* Main Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center justify-center p-8 select-none"
            style={{ cursor: isMaskingTool ? 'none' : 'default' }}
          >
              <div 
                className="relative shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #1f1f23 25%, transparent 25%), 
                    linear-gradient(-45deg, #1f1f23 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #1f1f23 75%), 
                    linear-gradient(-45deg, transparent 75%, #1f1f23 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              >
                  {/* Base Image */}
                  {currentImage && (
                      <img 
                        ref={imgRef}
                        src={currentImage.image_url} 
                        alt="Editing Target" 
                        onLoad={handleImageLoad}
                        className="max-h-[75vh] max-w-full object-contain block"
                        draggable={false}
                      />
                  )}
                  
                  {/* Drawing Canvas Overlay */}
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={() => { stopDrawing(); setIsHoveringCanvas(false); }}
                    onMouseEnter={() => setIsHoveringCanvas(true)}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className={`absolute inset-0 w-full h-full touch-none transition-opacity duration-200 ${isMaskingTool ? 'pointer-events-auto opacity-60' : 'pointer-events-none opacity-0'}`}
                    style={{ mixBlendMode: 'plus-lighter' }} // Makes the white mask look like a highlight
                  />

                  {/* Custom Cursor for Masking Tools */}
                  {isMaskingTool && !isProcessing && (
                      <div 
                        ref={cursorRef}
                        className="fixed pointer-events-none rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-50 bg-white/20 transition-opacity duration-75"
                        style={{ 
                            width: brushSize * imageScale,
                            height: brushSize * imageScale,
                            left: 0,
                            top: 0,
                            opacity: isHoveringCanvas ? 1 : 0
                        }} 
                      />
                  )}
                  
                  {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                          <span className="text-white font-bold tracking-wider">Processing...</span>
                      </div>
                  )}
              </div>
          </div>

          {/* Right Toolbar */}
          <div className="w-[500px] border-l border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-6 z-20 shadow-xl">
              
              {activeTool === 'advanced' ? (
                /* Advanced Editing View */
                <div className="flex flex-col h-full animate-in slide-in-from-right-8 fade-in duration-300">
                    <div className="flex items-center gap-2 mb-4 flex-none">
                        <button 
                            onClick={() => setActiveTool('move')} 
                            className="p-2 -ml-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold text-white">Advanced Remix</h3>
                    </div>
                    
                    {!advancedData ? (
                        <div className="p-6 bg-zinc-950/50 rounded-xl border border-zinc-800 flex-1 flex flex-col items-center justify-center text-center">
                            <Sparkles className="w-12 h-12 text-indigo-500 mb-4 opacity-50" />
                            <h4 className="text-lg font-bold text-white mb-2">Analyze & Remix</h4>
                            <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-xs">
                                Extract the image's structure, style, and content, then modify specific details to generate high-fidelity variations.
                            </p>
                            <button 
                                onClick={handleApplyTool}
                                disabled={isProcessing || !currentImage?.structured_prompt}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                <Sparkles className="w-4 h-4" />
                                Analyze Image Structure
                            </button>
                             {!currentImage?.structured_prompt && (
                                     <p className="text-xs text-red-400 mt-4">
                                         Structured prompt data is missing.
                                     </p>
                                 )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-20">
                                <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-xs text-indigo-200 flex items-start gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>Review the analyzed details below. Modify specific fields to guide the remix, or add new instructions at the bottom.</span>
                                </div>

                                {Object.entries(editedData).map(([key, value]) => {
                                    const isExpanded = expandedKeys[key];
                                    const isArray = Array.isArray(value);

                                    return (
                                        <div key={key} className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden transition-all hover:border-zinc-700">
                                            <button 
                                                onClick={() => toggleExpandKey(key)}
                                                className="w-full flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {getKeyIcon(key)}
                                                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                                                        {formatKey(key)}
                                                    </span>
                                                    {isArray && <span className="bg-zinc-800 text-zinc-500 text-[10px] px-1.5 rounded">{value.length}</span>}
                                                </div>
                                                <div className="text-zinc-500">
                                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </div>
                                            </button>
                                            
                                            {isExpanded && (
                                                <div className="p-2 bg-black border-t border-zinc-800/50">
                                                    {isArray ? (
                                                        <div className="space-y-2">
                                                            {value.map((item, idx) => (
                                                                <div key={idx} className="flex gap-2 items-start group">
                                                                    <AutoResizeTextarea 
                                                                        value={item}
                                                                        onChange={(e) => handleArrayUpdate(key, idx, e.target.value)}
                                                                        className="flex-1 bg-zinc-900 text-sm text-zinc-300 p-2 rounded border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                        minHeight="60px"
                                                                    />
                                                                    <button 
                                                                        onClick={() => handleDeleteArrayItem(key, idx)}
                                                                        className="p-1.5 text-zinc-600 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800 mt-1"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button 
                                                                onClick={() => handleAddArrayItem(key)}
                                                                className="w-full py-2 flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900/50 rounded border border-dashed border-zinc-800 hover:border-indigo-900 transition-colors"
                                                            >
                                                                <Plus className="w-3 h-3" /> Add Item
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <AutoResizeTextarea 
                                                            value={value as string}
                                                            onChange={(e) => setEditedData(prev => ({...prev, [key]: e.target.value}))}
                                                            className="w-full bg-zinc-900 text-sm text-zinc-300 p-3 rounded border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed"
                                                            placeholder={`Describe ${formatKey(key)}...`}
                                                            minHeight="100px"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="pt-4 border-t border-zinc-800 mt-4">
                                    <label className="text-xs font-bold text-emerald-500 uppercase mb-2 block flex items-center gap-2">
                                        <Plus className="w-3 h-3" /> Additional Instructions
                                    </label>
                                    <AutoResizeTextarea 
                                        value={additionalPrompt}
                                        onChange={(e) => setAdditionalPrompt(e.target.value)}
                                        placeholder="E.g., Make it look more cinematic, change the time of day to sunset..."
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 outline-none"
                                        minHeight="96px"
                                    />
                                </div>
                             </div>

                             {/* Sticky Bottom Actions */}
                             <div className="pt-4 mt-auto border-t border-zinc-800 bg-zinc-900 z-10">
                                 {preRegenerationImage ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                                            <span>Variation Generated</span>
                                            <span className="text-indigo-400">Previewing...</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={acceptVariation}
                                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <Check className="w-4 h-4" /> Keep Variation
                                            </button>
                                            <button 
                                                onClick={discardVariation}
                                                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold flex items-center justify-center gap-2"
                                            >
                                                <Undo2 className="w-4 h-4" /> Discard
                                            </button>
                                        </div>
                                    </div>
                                 ) : (
                                     <button 
                                         onClick={handleRegenerateFromAdvanced}
                                         disabled={isProcessing}
                                         className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition-all hover:scale-[1.01]"
                                     >
                                         {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                         Generate Variation
                                     </button>
                                 )}
                             </div>
                        </div>
                    )}
                </div>
              ) : (
                /* Standard Tool View */
                <>
                  <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Tools</h3>
                      <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setActiveTool('move')}
                            disabled={hasUnsavedChanges}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'move' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          >
                              <Move className="w-6 h-6" />
                              <span className="text-xs font-medium">View / Move</span>
                          </button>
                          <button 
                            onClick={() => setActiveTool('eraser')}
                            disabled={hasUnsavedChanges}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'eraser' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          >
                              <Eraser className="w-6 h-6" />
                              <span className="text-xs font-medium">Erase Object</span>
                          </button>
                          <button 
                            onClick={() => setActiveTool('gen_fill')}
                            disabled={hasUnsavedChanges}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'gen_fill' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          >
                              <Sparkles className="w-6 h-6" />
                              <span className="text-xs font-medium">Gen Fill</span>
                          </button>
                          <button 
                            onClick={() => setActiveTool('blur_bg')}
                            disabled={hasUnsavedChanges}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'blur_bg' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          >
                              <Aperture className="w-6 h-6" />
                              <span className="text-xs font-medium">Blur BG</span>
                          </button>
                          <button 
                            onClick={() => setActiveTool('remove_bg')}
                            disabled={hasUnsavedChanges}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'remove_bg' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          >
                              <Layers className="w-6 h-6" />
                              <span className="text-xs font-medium">Remove BG</span>
                          </button>
                           <button 
                            onClick={() => setActiveTool('remove_fg')}
                            disabled={hasUnsavedChanges}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'remove_fg' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          >
                              <UserMinus className="w-6 h-6" />
                              <span className="text-xs font-medium">Remove FG</span>
                          </button>
                           <button 
                            onClick={() => setActiveTool('expand')}
                            disabled={hasUnsavedChanges}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'expand' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          >
                              <Maximize className="w-6 h-6" />
                              <span className="text-xs font-medium">Expand</span>
                          </button>
                          <button 
                            onClick={() => setActiveTool('replace_bg')}
                            disabled={hasUnsavedChanges}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'replace_bg' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          >
                              <ImagePlus className="w-6 h-6" />
                              <span className="text-xs font-medium">Replace BG</span>
                          </button>

                          <button 
                            onClick={() => setActiveTool('advanced')}
                            disabled={hasUnsavedChanges}
                            className="p-4 col-span-2 rounded-xl border flex flex-row items-center justify-center gap-3 transition-all border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          >
                              <FileText className="w-5 h-5" />
                              <span className="text-xs font-medium">Advanced Remix</span>
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {/* Common Masking Controls */}
                    {isMaskingTool && !hasUnsavedChanges && (
                        <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
                            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                <div className="flex justify-between mb-2">
                                    <label className="text-xs font-bold text-zinc-400 uppercase">Brush Size</label>
                                    <span className="text-xs text-zinc-500">{brushSize}px</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="10" 
                                    max="300" 
                                    value={brushSize} 
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-center mt-4">
                                    <div 
                                        className="rounded-full bg-white border border-zinc-600"
                                        style={{ width: (brushSize * imageScale) / 2, height: (brushSize * imageScale) / 2, maxHeight: 100, maxWidth: 100 }} // Preview scaled down
                                    />
                                </div>
                            </div>

                            {activeTool === 'gen_fill' && (
                                 <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-400 uppercase">Prompt</label>
                                    <textarea 
                                        value={genFillPrompt}
                                        onChange={(e) => setGenFillPrompt(e.target.value)}
                                        placeholder="Describe what to add in the masked area..."
                                        className="w-full h-20 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                                    />
                                 </div>
                            )}

                            <div className="flex gap-2">
                                <button 
                                        onClick={clearCanvas}
                                        disabled={!hasMask}
                                        className="flex-1 py-2 px-4 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:text-white hover:bg-zinc-800 disabled:opacity-50"
                                >
                                    Clear Mask
                                </button>
                            </div>

                            <button 
                                onClick={handleApplyTool}
                                disabled={!hasMask || isProcessing || (activeTool === 'gen_fill' && !genFillPrompt.trim())}
                                className={`w-full py-4 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                    activeTool === 'gen_fill' 
                                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20' 
                                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
                                }`}
                            >
                                {activeTool === 'gen_fill' ? <Sparkles className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                                {activeTool === 'gen_fill' ? 'Generate Fill' : 'Erase Area'}
                            </button>
                        </div>
                    )}
                    
                    {/* Remove BG Controls */}
                    {activeTool === 'remove_bg' && !hasUnsavedChanges && (
                        <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
                            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                 <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-500" />
                                    Remove Background
                                 </h4>
                                 <p className="text-xs text-zinc-400 leading-relaxed">
                                    Automatically detect the main subject and remove the background, leaving it transparent.
                                 </p>
                            </div>
                            
                            <button 
                                onClick={handleApplyTool}
                                disabled={isProcessing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                <Layers className="w-4 h-4" />
                                Remove Background
                            </button>
                        </div>
                    )}

                    {/* Remove FG Controls */}
                    {activeTool === 'remove_fg' && !hasUnsavedChanges && (
                        <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
                            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                 <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <UserMinus className="w-4 h-4 text-indigo-500" />
                                    Remove Foreground
                                 </h4>
                                 <p className="text-xs text-zinc-400 leading-relaxed">
                                    Automatically detect and remove the main subject (foreground), leaving the background.
                                 </p>
                            </div>
                            
                            <button 
                                onClick={handleApplyTool}
                                disabled={isProcessing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                <UserMinus className="w-4 h-4" />
                                Remove Foreground
                            </button>
                        </div>
                    )}

                    {/* Blur BG Controls */}
                    {activeTool === 'blur_bg' && !hasUnsavedChanges && (
                        <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
                            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                 <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <Aperture className="w-4 h-4 text-indigo-500" />
                                    Blur Background
                                 </h4>
                                 <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                                    Apply a depth-of-field effect by blurring the background while keeping the subject sharp.
                                 </p>
                                 
                                 <div className="space-y-3">
                                    <div className="flex justify-between mb-1">
                                        <label className="text-xs font-bold text-zinc-400 uppercase">Blur Intensity</label>
                                        <span className="text-xs text-zinc-500">{blurScale}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="5" 
                                        step="1"
                                        value={blurScale} 
                                        onChange={(e) => setBlurScale(parseInt(e.target.value))}
                                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-zinc-600 px-1">
                                        <span>Soft</span>
                                        <span>Strong</span>
                                    </div>
                                 </div>
                            </div>
                            
                            <button 
                                onClick={handleApplyTool}
                                disabled={isProcessing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                <Aperture className="w-4 h-4" />
                                Apply Blur
                            </button>
                        </div>
                    )}

                    {/* Expand Image Controls */}
                    {activeTool === 'expand' && !hasUnsavedChanges && (
                        <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
                             <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                 <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <Maximize className="w-4 h-4 text-indigo-500" />
                                    Expand Image
                                 </h4>
                                 <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                                    Extend the borders of the image to a new aspect ratio, filling the space with AI-generated content.
                                 </p>
                                 
                                 <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">New Aspect Ratio</label>
                                        <select 
                                            value={expandAspectRatio}
                                            onChange={(e) => setExpandAspectRatio(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white outline-none focus:border-indigo-500"
                                        >
                                            {ASPECT_RATIOS.map(ratio => (
                                                <option key={ratio} value={ratio}>{ratio}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">Prompt (Optional)</label>
                                        <textarea 
                                            value={expandPrompt}
                                            onChange={(e) => setExpandPrompt(e.target.value)}
                                            placeholder="Describe the extended surroundings..."
                                            className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white outline-none focus:border-indigo-500 resize-none"
                                        />
                                    </div>
                                 </div>
                            </div>
                            
                            <button 
                                onClick={handleApplyTool}
                                disabled={isProcessing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                <Maximize className="w-4 h-4" />
                                Expand Image
                            </button>
                        </div>
                    )}

                    {/* Replace BG Controls */}
                    {activeTool === 'replace_bg' && !hasUnsavedChanges && (
                        <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6 flex flex-col h-full">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">New Background Prompt</label>
                                    <textarea 
                                        value={replaceBgPrompt}
                                        onChange={(e) => setReplaceBgPrompt(e.target.value)}
                                        placeholder="e.g. A futuristic city skyline at night..."
                                        className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-zinc-800">
                                 <button 
                                    onClick={handleApplyTool}
                                    disabled={isProcessing || !replaceBgPrompt.trim()}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                                >
                                    <ImagePlus className="w-4 h-4" />
                                    Replace Background
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
                </>
              )}

              {/* Save / Discard Actions */}
              {hasUnsavedChanges && !preRegenerationImage && (
                  <div className="mt-auto border-t border-zinc-800 pt-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
                      <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 mb-4">
                          <h4 className="text-sm font-bold text-white mb-1">Unsaved Changes</h4>
                          <p className="text-xs text-zinc-400">You have generated a new version of this image.</p>
                      </div>
                      <div className="space-y-3">
                          <button 
                              onClick={handleSave}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                          >
                              <Check className="w-4 h-4" /> Save This Version
                          </button>
                          <button 
                              onClick={handleDiscard}
                              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium flex items-center justify-center gap-2"
                          >
                              <X className="w-4 h-4" /> Discard Edits
                          </button>
                      </div>
                  </div>
              )}
          </div>
       </div>
    </div>
  );
};