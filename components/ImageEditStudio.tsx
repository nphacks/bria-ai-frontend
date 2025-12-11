import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Wand2, Eraser, Move, Undo2, Download, RefreshCw, Layers } from 'lucide-react';
import { GeneratedImage } from '../types';
import { eraseImage } from '../services/apiService';

interface ImageEditStudioProps {
  image: GeneratedImage | null;
  onBack: () => void;
}

export const ImageEditStudio: React.FC<ImageEditStudioProps> = ({ image: initialImage, onBack }) => {
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(initialImage);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<'move' | 'eraser'>('move');
  const [brushSize, setBrushSize] = useState(50);
  
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
    if (activeTool !== 'eraser') return;
    setIsDrawing(true);
    draw(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update custom cursor position
    if (activeTool === 'eraser' && cursorRef.current) {
      cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    }

    if (isDrawing) {
        draw(e);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    if (activeTool !== 'eraser' || !canvasRef.current) return;
    
    // For touch events we need to prevent scrolling
    if (e.type.startsWith('touch')) {
       // e.preventDefault(); // Moved to listener level if possible or keep here
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

  const handleApplyErase = async () => {
    if (!currentImage || !canvasRef.current || !hasMask) return;

    setIsProcessing(true);
    try {
        // Prepare Mask
        // Convert canvas to base64
        const maskBase64 = canvasRef.current.toDataURL('image/png');
        
        // Call API
        const result = await eraseImage(currentImage.image_url, maskBase64);
        
        // Update current image with result
        setCurrentImage(result);
        clearCanvas();
        setActiveTool('move'); // Reset tool to view mode
    } catch (error) {
        console.error("Erase failed", error);
        alert("Failed to erase area. See console for details.");
    } finally {
        setIsProcessing(false);
    }
  };

  if (!initialImage) return null;

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
          
          <div className="flex items-center gap-3">
              {currentImage !== initialImage && (
                  <button 
                    onClick={() => { setCurrentImage(initialImage); clearCanvas(); }}
                    className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
                  >
                      <Undo2 className="w-4 h-4" /> Reset Original
                  </button>
              )}
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden">
          {/* Main Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center justify-center p-8 select-none"
            style={{ cursor: activeTool === 'eraser' ? 'none' : 'default' }}
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
                    className={`absolute inset-0 w-full h-full touch-none transition-opacity duration-200 ${activeTool === 'eraser' ? 'pointer-events-auto opacity-60' : 'pointer-events-none opacity-0'}`}
                    style={{ mixBlendMode: 'plus-lighter' }} // Makes the white mask look like a highlight
                  />

                  {/* Custom Cursor for Eraser */}
                  {activeTool === 'eraser' && !isProcessing && (
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
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-8 z-20 shadow-xl">
              
              {/* Tool Selection */}
              <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Tools</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setActiveTool('move')}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'move' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                      >
                          <Move className="w-6 h-6" />
                          <span className="text-xs font-medium">View / Move</span>
                      </button>
                      <button 
                        onClick={() => setActiveTool('eraser')}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'eraser' ? 'bg-zinc-800 border-indigo-500 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                      >
                          <Eraser className="w-6 h-6" />
                          <span className="text-xs font-medium">Erase Area</span>
                      </button>
                  </div>
              </div>

              {/* Tool Options */}
              {activeTool === 'eraser' && (
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
                        onClick={handleApplyErase}
                        disabled={!hasMask || isProcessing}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                      >
                         <Wand2 className="w-4 h-4" />
                         Generate Erase
                      </button>
                      
                      <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                          Paint over the area you want to remove. The AI will fill it based on the surrounding context.
                      </p>
                  </div>
              )}
          </div>
       </div>
    </div>
  );
};