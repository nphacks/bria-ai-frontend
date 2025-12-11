import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Wand2, Eraser, Move, Undo2, Download, RefreshCw, Layers, Check, X, Sparkles, ImagePlus, Upload } from 'lucide-react';
import { GeneratedImage } from '../types';
import { eraseImage, generativeFill, removeBackground, replaceBackground } from '../services/apiService';

interface ImageEditStudioProps {
  image: GeneratedImage | null;
  onBack: () => void;
  onSave: (original: GeneratedImage, newImage: GeneratedImage) => void;
  projectImages?: GeneratedImage[];
}

export const ImageEditStudio: React.FC<ImageEditStudioProps> = ({ 
    image: initialImage, 
    onBack, 
    onSave,
    projectImages = []
}) => {
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(initialImage);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<'move' | 'eraser' | 'gen_fill' | 'remove_bg' | 'replace_bg'>('move');
  const [brushSize, setBrushSize] = useState(50);
  const [genFillPrompt, setGenFillPrompt] = useState('');
  
  // Replace BG State
  const [replaceBgMode, setReplaceBgMode] = useState<'prompt' | 'reference'>('prompt');
  const [replaceBgPrompt, setReplaceBgPrompt] = useState('');
  const [replaceBgReferences, setReplaceBgReferences] = useState<string[]>([]);
  
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
    
    // For touch events we need to prevent scrolling
    if (e.type.startsWith('touch')) {
       // e.preventDefault(); 
    }

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
        } else if (activeTool === 'replace_bg') {
            if (replaceBgMode === 'prompt') {
                if (!replaceBgPrompt.trim()) {
                    alert("Please enter a prompt.");
                    setIsProcessing(false);
                    return;
                }
                result = await replaceBackground(currentImage.image_url, replaceBgPrompt);
            } else {
                if (replaceBgReferences.length === 0) {
                    alert("Please select at least one reference image.");
                    setIsProcessing(false);
                    return;
                }
                result = await replaceBackground(currentImage.image_url, undefined, replaceBgReferences);
            }
        } else {
            return;
        }
        
        setCurrentImage(result);
        if (isMaskingTool) clearCanvas();
        
        setActiveTool('move');
        setGenFillPrompt('');
        setReplaceBgPrompt('');
        setReplaceBgReferences([]);
    } catch (error) {
        console.error("Operation failed", error);
        alert("Failed to process image. See console for details.");
    } finally {
        setIsProcessing(false);
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

  const handleUploadReference = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        Array.from(files).forEach((file: any) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setReplaceBgReferences(prev => [...prev, base64]);
          };
          reader.readAsDataURL(file);
        });
      }
  };

  const toggleBgReference = (url: string) => {
      setReplaceBgReferences(prev => 
          prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
      );
  };

  if (!initialImage) return null;

  const hasUnsavedChanges = currentImage?.image_url !== initialImage?.image_url;

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
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-6 z-20 shadow-xl">
              
              {/* Tool Selection */}
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
                        onClick={() => setActiveTool('remove_bg')}
                        disabled={hasUnsavedChanges}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'remove_bg' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                      >
                          <Layers className="w-6 h-6" />
                          <span className="text-xs font-medium">Remove BG</span>
                      </button>
                      <button 
                        onClick={() => setActiveTool('replace_bg')}
                        disabled={hasUnsavedChanges}
                        className={`p-4 col-span-2 rounded-xl border flex flex-row items-center justify-center gap-3 transition-all ${activeTool === 'replace_bg' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                      >
                          <ImagePlus className="w-5 h-5" />
                          <span className="text-xs font-medium">Replace Background</span>
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

                {/* Replace BG Controls */}
                {activeTool === 'replace_bg' && !hasUnsavedChanges && (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6 flex flex-col h-full">
                        {/* Mode Toggle */}
                        <div className="flex bg-zinc-800 rounded-lg p-1 border border-zinc-700">
                            <button 
                                onClick={() => setReplaceBgMode('prompt')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${replaceBgMode === 'prompt' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                            >
                                Text Prompt
                            </button>
                            <button 
                                onClick={() => setReplaceBgMode('reference')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${replaceBgMode === 'reference' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                            >
                                Reference Image
                            </button>
                        </div>

                        {replaceBgMode === 'prompt' ? (
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
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Reference Images</label>
                                
                                {/* Selected References */}
                                {replaceBgReferences.length > 0 && (
                                    <div className="flex gap-2 flex-wrap mb-4 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                                        {replaceBgReferences.map((url, i) => (
                                            <div key={i} className="relative w-12 h-12 rounded overflow-hidden border border-zinc-600">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => toggleBgReference(url)}
                                                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upload */}
                                <div className="mb-4">
                                    <label className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 border-dashed rounded-lg text-xs text-zinc-400 cursor-pointer transition-colors">
                                        <Upload className="w-3 h-3" /> Upload Image
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadReference} multiple />
                                    </label>
                                </div>

                                {/* Project Gallery Grid */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-zinc-800 pt-2">
                                    <h5 className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Project Assets</h5>
                                    <div className="grid grid-cols-3 gap-2">
                                        {projectImages.length > 0 ? projectImages.map((img, idx) => {
                                            const isSelected = replaceBgReferences.includes(img.image_url);
                                            return (
                                                <div 
                                                    key={idx}
                                                    onClick={() => toggleBgReference(img.image_url)}
                                                    className={`relative aspect-square rounded overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-emerald-500' : 'border-transparent hover:border-zinc-600'}`}
                                                >
                                                    <img src={img.image_url} className="w-full h-full object-cover" loading="lazy" />
                                                    {isSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />}
                                                </div>
                                            );
                                        }) : (
                                            <div className="col-span-3 text-center py-4 text-xs text-zinc-600">No generated images yet.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-zinc-800">
                             <button 
                                onClick={handleApplyTool}
                                disabled={isProcessing || (replaceBgMode === 'prompt' && !replaceBgPrompt.trim()) || (replaceBgMode === 'reference' && replaceBgReferences.length === 0)}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                <ImagePlus className="w-4 h-4" />
                                Replace Background
                            </button>
                        </div>
                    </div>
                )}
              </div>

              {/* Save / Discard Actions */}
              {hasUnsavedChanges && (
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