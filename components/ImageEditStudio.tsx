import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Wand2, Eraser, Move, Undo2, Download, RefreshCw, Layers, Check, X, Sparkles } from 'lucide-react';
import { GeneratedImage } from '../types';
import { eraseImage, generativeFill } from '../services/apiService';

interface ImageEditStudioProps {
  image: GeneratedImage | null;
  onBack: () => void;
  onSave: (original: GeneratedImage, newImage: GeneratedImage) => void;
}

export const ImageEditStudio: React.FC<ImageEditStudioProps> = ({ image: initialImage, onBack, onSave }) => {
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(initialImage);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<'move' | 'eraser' | 'gen_fill'>('move');
  const [brushSize, setBrushSize] = useState(50);
  const [genFillPrompt, setGenFillPrompt] = useState('');
  
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
    if (!currentImage || !canvasRef.current || !hasMask) return;

    setIsProcessing(true);
    try {
        const maskBase64 = canvasRef.current.toDataURL('image/png');
        let result: GeneratedImage;

        if (activeTool === 'eraser') {
            result = await eraseImage(currentImage.image_url, maskBase64);
        } else if (activeTool === 'gen_fill') {
            if (!genFillPrompt.trim()) {
                alert("Please enter a prompt for Generative Fill.");
                setIsProcessing(false);
                return;
            }
            result = await generativeFill(currentImage.image_url, maskBase64, genFillPrompt);
        } else {
            return;
        }
        
        setCurrentImage(result);
        clearCanvas();
        setActiveTool('move');
        setGenFillPrompt('');
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
              <div className="relative shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50">
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
                        className={`p-4 col-span-2 rounded-xl border flex flex-row items-center justify-center gap-3 transition-all ${activeTool === 'gen_fill' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                      >
                          <Sparkles className="w-5 h-5" />
                          <span className="text-xs font-medium">Generative Fill</span>
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
                        
                        <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                            {activeTool === 'gen_fill' 
                                ? 'Paint over the area you want to modify, describe the change, and generate.' 
                                : 'Paint over the area you want to remove. The AI will fill it based on context.'}
                        </p>
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