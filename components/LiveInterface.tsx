import React, { useEffect, useRef, useState } from 'react';
import { liveService } from '../services/liveService';
import { Mic, Power, Activity } from 'lucide-react';
import clsx from 'clsx';

const LiveInterface: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<{role: 'user'|'model', text: string}[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll transcript
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Visualizer Loop
  useEffect(() => {
    if (!isConnected || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    const draw = () => {
        const width = canvasRef.current!.width;
        const height = canvasRef.current!.height;
        ctx.clearRect(0, 0, width, height);
        
        ctx.fillStyle = '#39ff14'; // Neo Green
        
        // Simple bar visualizer based on volume state
        const bars = 20;
        const barWidth = width / bars;
        
        for (let i = 0; i < bars; i++) {
            // Randomize slightly for "activity" feel, scaled by volume
            const h = Math.max(2, (Math.random() * volume * 500) + (volume * 100)); 
            const x = i * barWidth;
            const y = (height - h) / 2;
            
            ctx.fillRect(x + 1, y, barWidth - 2, h);
        }
        
        animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isConnected, volume]);

  const toggleConnection = async () => {
    if (isConnected) {
        liveService.disconnect();
        setIsConnected(false);
    } else {
        try {
            await liveService.connect({
                onOpen: () => setIsConnected(true),
                onClose: () => setIsConnected(false),
                onVolume: (v) => setVolume(v),
                onTranscript: (text, role) => {
                    setTranscripts(prev => {
                        // Simple logic to append to last message if same role, else new
                        const last = prev[prev.length - 1];
                        if (last && last.role === role) {
                            // Simple dedupe/append logic could go here
                            return [...prev.slice(0, -1), { role, text: last.text + " " + text }];
                        }
                        return [...prev, { role, text }];
                    });
                }
            });
        } catch (e) {
            console.error(e);
            alert("Failed to connect to Live API");
        }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative border-r-4 border-black font-mono">
      {/* Header */}
      <div className="p-4 border-b-4 border-black bg-neo-bg flex justify-between items-center">
          <h2 className="text-xl font-bold">GEMINI_LIVE // NATIVE_AUDIO</h2>
          <div className={clsx("w-4 h-4 rounded-full border-2 border-black", isConnected ? "bg-neo-green animate-pulse" : "bg-red-500")} />
      </div>

      {/* Main Display */}
      <div className="flex-1 p-8 flex flex-col items-center justify-center bg-gray-100 relative overflow-hidden">
          
          {/* Central Transmitter Box */}
          <div className="w-full max-w-md bg-white border-4 border-black shadow-neo p-6 z-10">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-2">
                      <div className="w-12 h-1 bg-black"></div>
                      <div className="w-12 h-1 bg-black"></div>
                      <div className="w-12 h-1 bg-black"></div>
                  </div>
                  <span className="text-xs font-bold">FREQ: 24000Hz</span>
              </div>

              {/* Visualizer Screen */}
              <div className="h-32 bg-black border-2 border-black mb-6 relative flex items-center justify-center">
                  <canvas ref={canvasRef} width={300} height={128} className="w-full h-full opacity-80" />
                  {!isConnected && <span className="absolute text-neo-green text-xs animate-pulse">OFFLINE</span>}
              </div>

              {/* Main Button */}
              <button 
                onClick={toggleConnection}
                className={clsx(
                    "w-full py-4 border-2 border-black font-black text-xl shadow-neo-sm transition-all hover:translate-y-1 active:translate-y-2 active:shadow-none flex items-center justify-center gap-3",
                    isConnected ? "bg-neo-pink hover:bg-red-400" : "bg-neo-green hover:bg-green-400"
                )}
              >
                {isConnected ? <><Power size={24}/> DISCONNECT</> : <><Mic size={24}/> GO LIVE</>}
              </button>
          </div>

          {/* Background Decorative Grid */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none opacity-10">
              {[...Array(36)].map((_, i) => (
                  <div key={i} className="border border-black"></div>
              ))}
          </div>
      </div>

      {/* Transcript Log */}
      <div className="h-1/3 border-t-4 border-black bg-black p-4 text-neo-green font-mono text-sm overflow-y-auto" ref={scrollRef}>
          {transcripts.length === 0 && <div className="opacity-50 text-center mt-4">>> WAITING FOR AUDIO STREAM...</div>}
          {transcripts.map((t, i) => (
              <div key={i} className="mb-2">
                  <span className="font-bold opacity-50">[{t.role === 'user' ? 'USER' : 'AI__'}]:</span> {t.text}
              </div>
          ))}
      </div>
    </div>
  );
};

export default LiveInterface;
