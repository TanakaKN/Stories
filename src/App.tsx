import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Play, 
  Volume2, 
  Video, 
  BookOpen, 
  History,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { GeminiService, StoryScript } from './services/geminiService';

// Extend window for AI Studio API Key selection
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [inputStory, setInputStory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [script, setScript] = useState<StoryScript | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [status, setStatus] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const processStory = async () => {
    if (!inputStory.trim()) return;
    
    if (!hasApiKey) {
      await handleOpenKeySelector();
      // Proceeding immediately as per guidelines: "Assume the key selection was successful after triggering openSelectKey() and proceed to the app."
    }

    setIsProcessing(true);
    setError(null);
    setScript(null);
    setVideoUrl(null);
    setAudioData(null);
    setStatus('Analyzing story and crafting script...');

    try {
      // Standard tasks use the platform-provided key
      const standardKey = process.env.GEMINI_API_KEY || '';
      const gemini = new GeminiService(standardKey);
      
      // 1. Process Story into Script
      const generatedScript = await gemini.processStory(inputStory);
      setScript(generatedScript);
      
      // 2. Generate Narration
      setStatus('Generating narration voice...');
      const audioBase64 = await gemini.generateNarration(generatedScript.narrationText);
      if (audioBase64) {
        setAudioData(`data:audio/wav;base64,${audioBase64}`);
      }

      // 3. Generate Video
      // Veo MUST use the user-selected paid API key
      const veoApiKey = process.env.API_KEY;
      if (!veoApiKey) {
        throw new Error("A paid API key is required for video generation. Please connect your key.");
      }

      setStatus('Generating cinematic video (this may take a minute)...');
      const videoUri = await gemini.generateVideo(generatedScript.visualPrompts[0], veoApiKey);
      
      if (videoUri) {
        setStatus('Downloading video...');
        // Fetch the video with the paid API key in headers
        const videoResponse = await fetch(videoUri, {
          method: 'GET',
          headers: {
            'x-goog-api-key': veoApiKey,
          },
        });
        
        if (!videoResponse.ok) {
          const errorText = await videoResponse.text();
          console.error('Video fetch failed:', errorText);
          throw new Error(`Failed to fetch generated video: ${videoResponse.status} ${videoResponse.statusText}`);
        }
        
        const videoBlob = await videoResponse.blob();
        if (videoBlob.size === 0) throw new Error('Generated video file is empty');
        
        const localVideoUrl = URL.createObjectURL(videoBlob);
        setVideoUrl(localVideoUrl);
      }

      setStatus('Complete!');
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key session expired. Please re-select your key.");
      } else {
        setError(err.message || "An error occurred while processing your story.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-serif selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a1a]/10 px-6 py-8 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
            <Sparkles size={20} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Ngano AI</h1>
        </div>
        
        {!hasApiKey && (
          <button 
            onClick={handleOpenKeySelector}
            className="px-4 py-2 bg-[#5A5A40] text-white rounded-full text-sm font-sans hover:bg-[#4a4a35] transition-colors flex items-center gap-2"
          >
            <AlertCircle size={16} />
            Connect API Key
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column: Input */}
          <section className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl leading-tight">
                Tell your story. <br />
                <span className="italic text-[#5A5A40]">We'll bring it to life.</span>
              </h2>
              <p className="text-lg text-[#1a1a1a]/60 font-sans">
                Paste your Shona or English story below. We'll transform it into a cinematic experience with African roots.
              </p>
            </div>

            <div className="relative">
              <textarea
                value={inputStory}
                onChange={(e) => setInputStory(e.target.value)}
                placeholder="Once upon a time in a small village near the Great Zimbabwe..."
                className="w-full h-64 p-6 bg-white rounded-3xl border border-[#1a1a1a]/10 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all resize-none text-lg leading-relaxed shadow-sm"
              />
              <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
                {!hasApiKey && inputStory.trim() && (
                  <motion.span 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] font-sans font-bold text-[#5A5A40] bg-[#5A5A40]/10 px-2 py-1 rounded-md uppercase tracking-wider"
                  >
                    API Key Required for Video
                  </motion.span>
                )}
                <button
                  onClick={processStory}
                  disabled={isProcessing || !inputStory.trim()}
                  className="p-4 bg-[#5A5A40] text-white rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      <span className="font-sans font-semibold">Generate</span>
                      <Send size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-sans">{error}</p>
              </motion.div>
            )}

            {isProcessing && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-sans text-[#1a1a1a]/60">
                  <span>{status}</span>
                  <span className="animate-pulse">Processing...</span>
                </div>
                <div className="h-1.5 w-full bg-[#1a1a1a]/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#5A5A40]"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 60, ease: "linear" }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Output */}
          <section className="space-y-8">
            <AnimatePresence mode="wait">
              {!script && !isProcessing && (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] border-2 border-dashed border-[#1a1a1a]/10 rounded-3xl flex flex-col items-center justify-center p-12 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-[#1a1a1a]/5 rounded-full flex items-center justify-center text-[#1a1a1a]/30">
                    <Video size={32} />
                  </div>
                  <h3 className="text-xl font-semibold">Your story awaits</h3>
                  <p className="text-[#1a1a1a]/40 font-sans">
                    The generated video, script, and narration will appear here.
                  </p>
                </motion.div>
              )}

              {(script || isProcessing) && (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  {/* Video Preview */}
                  <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative group">
                    {videoUrl ? (
                      <video 
                        src={videoUrl} 
                        controls 
                        className="w-full h-full object-cover"
                        autoPlay
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/50 space-y-4">
                        <Loader2 className="animate-spin" size={48} />
                        <p className="font-sans text-sm tracking-widest uppercase">Generating Visuals</p>
                      </div>
                    )}
                  </div>

                  {/* Audio Player */}
                  {audioData && (
                    <div className="bg-white p-6 rounded-3xl border border-[#1a1a1a]/10 shadow-sm flex items-center gap-4">
                      <button 
                        onClick={() => audioRef.current?.play()}
                        className="w-12 h-12 bg-[#5A5A40] text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        <Volume2 size={24} />
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-sans font-semibold">Narration Voice</p>
                        <p className="text-xs text-[#1a1a1a]/40 font-sans">African Storyteller (Charon)</p>
                      </div>
                      <audio ref={audioRef} src={audioData} />
                    </div>
                  )}

                  {/* Script Details */}
                  {script && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-[#5A5A40]">
                        <BookOpen size={20} />
                        <h3 className="text-xl font-bold">The Script</h3>
                      </div>
                      
                      <div className="space-y-6 font-sans">
                        <div className="p-6 bg-white rounded-2xl border border-[#1a1a1a]/5 space-y-2">
                          <span className="text-[10px] uppercase tracking-widest text-[#5A5A40] font-bold">The Hook</span>
                          <p className="text-lg leading-relaxed">{script.hook}</p>
                        </div>

                        <div className="p-6 bg-white rounded-2xl border border-[#1a1a1a]/5 space-y-4">
                          <span className="text-[10px] uppercase tracking-widest text-[#5A5A40] font-bold">The Dialogue</span>
                          <div className="space-y-3">
                            {script.dialogue.map((d, i) => (
                              <div key={i} className="flex gap-3">
                                <span className="font-bold min-w-[80px] text-[#5A5A40]">{d.character}:</span>
                                <span className="italic">"{d.text}"</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-6 bg-white rounded-2xl border border-[#1a1a1a]/5 space-y-2">
                          <span className="text-[10px] uppercase tracking-widest text-[#5A5A40] font-bold">The Payoff</span>
                          <p className="leading-relaxed">{script.payoff}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-[#1a1a1a]/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[#1a1a1a]/40 font-sans text-sm">
        <p>© 2026 Ngano AI - Preserving African Storytelling</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-[#1a1a1a] transition-colors">Documentation</a>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="hover:text-[#1a1a1a] transition-colors underline">Billing Info</a>
        </div>
      </footer>
    </div>
  );
}
