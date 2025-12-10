import React, { useState, useCallback } from 'react';
import { Send, Loader2, Image as ImageIcon, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { generateImage } from '../services/apiService';

export const Generator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const url = await generateImage(prompt);
      setImageUrl(url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image. Please ensure the backend is running at localhost:8000');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download image', err);
    }
  }, [imageUrl]);

  return (
    <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: Input Controls */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Visualize your ideas.
          </h2>
          <p className="text-gray-400">
            Enter a descriptive prompt below to generate high-quality images using our custom backend engine.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A photorealistic dog with sunglasses..."
                className="w-full h-40 bg-gray-900 text-white rounded-xl border border-gray-700 p-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder-gray-500 transition-all text-lg"
                disabled={isLoading}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                {prompt.length} chars
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className={`w-full flex items-center justify-center space-x-2 py-4 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] ${
              isLoading || !prompt.trim()
                ? 'bg-gray-800 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start space-x-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="hidden lg:block">
           <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Pro Tips</h3>
            <ul className="text-sm text-gray-500 space-y-2 list-disc pl-4">
              <li>Be specific about lighting (e.g., "cinematic lighting", "sunset").</li>
              <li>Mention the style (e.g., "photorealistic", "oil painting", "cyberpunk").</li>
              <li>Describe the camera angle (e.g., "wide angle", "close up").</li>
            </ul>
           </div>
        </div>
      </div>

      {/* Right Column: Image Display */}
      <div className="relative aspect-square lg:aspect-auto lg:h-full bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl flex flex-col items-center justify-center group">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={prompt}
              className="w-full h-full object-cover animate-in fade-in zoom-in duration-500"
            />
            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-6">
              <div className="flex space-x-2 w-full">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-colors border border-white/10"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-lg transition-colors border border-white/10"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-600 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              {isLoading ? (
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              ) : (
                <ImageIcon className="w-10 h-10" />
              )}
            </div>
            <p className="text-lg font-medium mb-1">
              {isLoading ? 'Creating masterpiece...' : 'Ready to generate'}
            </p>
            <p className="text-sm text-gray-500 max-w-xs">
              {isLoading
                ? 'This might take a few seconds. Connecting to localhost backend...'
                : 'Your generated image will appear here in high resolution.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};