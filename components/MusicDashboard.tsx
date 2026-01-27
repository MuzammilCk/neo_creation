import React from 'react';
import { SongAnalysis } from '../types';
import { Music, Disc, Activity } from 'lucide-react';
import clsx from 'clsx';

interface MusicDashboardProps {
  data: SongAnalysis;
}

const MusicDashboard: React.FC<MusicDashboardProps> = ({ data }) => {
  return (
    <div className="w-full md:w-[600px] border-4 border-black shadow-neo bg-white overflow-hidden flex flex-col relative">
      {/* Tape Header / Label */}
      <div 
        className="p-4 border-b-4 border-black flex justify-between items-center"
        style={{ backgroundColor: data.mood.colorCode || '#ddd' }}
      >
        <div className="bg-white px-3 py-1 border-2 border-black -rotate-1 shadow-sm">
            <h3 className="font-mono font-black text-xl uppercase tracking-tighter">SONIC_ANALYZER_V1</h3>
        </div>
        <div className="flex gap-2">
             <div className="w-4 h-4 rounded-full bg-black border-2 border-white"></div>
             <div className="w-4 h-4 rounded-full bg-black border-2 border-white"></div>
        </div>
      </div>

      <div className="p-6 bg-neo-bg relative">
        {/* Genre Sticker */}
        <div className="absolute top-4 right-4 bg-yellow-300 text-black px-4 py-1 font-bold font-mono border-2 border-black -rotate-2 shadow-neo-sm z-10">
            {data.technical.genre.toUpperCase()}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
            {/* BPM & Key - Big Typo */}
            <div className="bg-white border-2 border-black p-4 shadow-neo-sm flex flex-col justify-center items-center h-32">
                <span className="text-xs font-mono font-bold text-gray-500">BPM</span>
                <span className="text-5xl font-black">{data.technical.bpm}</span>
            </div>
            <div className="bg-white border-2 border-black p-4 shadow-neo-sm flex flex-col justify-center items-center h-32">
                <span className="text-xs font-mono font-bold text-gray-500">KEY</span>
                <span className="text-4xl font-black">{data.technical.key}</span>
                <span className="text-xs font-mono mt-1">{data.technical.timeSignature}</span>
            </div>
        </div>

        {/* Visualizer & Mood */}
        <div className="bg-black text-white p-4 border-2 border-black mb-6 shadow-neo-sm">
            <div className="flex justify-between items-end mb-2">
                 <span className="font-mono text-xs text-neo-green animate-pulse">PLAYING...</span>
                 <span className="font-mono text-xs text-white">{data.mood.primary.toUpperCase()}</span>
            </div>
            
            {/* CSS Animated Bars */}
            <div className="flex items-end justify-between h-16 gap-1">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i} 
                        className="bg-neo-green w-full"
                        style={{ 
                            height: `${Math.random() * 100}%`,
                            animation: `bounce ${0.5 + Math.random() * 0.5}s infinite ease-in-out alternate`
                        }}
                    />
                ))}
            </div>
            <style>{`
                @keyframes bounce {
                    0% { height: 10%; }
                    100% { height: 100%; }
                }
            `}</style>
            
            <div className="mt-4 flex flex-wrap gap-2">
                {data.mood.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] font-mono border border-neo-green px-2 py-0.5 text-neo-green">
                        #{tag.toUpperCase()}
                    </span>
                ))}
            </div>
        </div>

        {/* Instrumentation */}
        <div className="bg-white border-2 border-black p-4">
             <h4 className="font-black font-sans text-sm mb-3 border-b-2 border-black inline-block">STRUCTURE // RAW</h4>
             <div className="font-mono text-xs grid grid-cols-2 gap-2">
                 <div>
                    <span className="font-bold block mb-1">VOCALS:</span>
                    <span className="bg-gray-200 px-2 py-0.5">{data.structure.vocals.toUpperCase()}</span>
                 </div>
                 <div>
                    <span className="font-bold block mb-1">INSTRUMENTS:</span>
                    <div className="flex flex-wrap gap-1">
                        {data.structure.instrumentation.map((inst, i) => (
                            <span key={i} className="bg-gray-200 px-1">{inst}</span>
                        ))}
                    </div>
                 </div>
             </div>
        </div>

      </div>
      
      {/* Tape Bottom */}
      <div className="bg-gray-800 h-8 border-t-4 border-black flex justify-center items-center gap-8">
            <div className="w-16 h-2 bg-black rounded-full"></div>
            <div className="w-16 h-2 bg-black rounded-full"></div>
      </div>
    </div>
  );
};

export default MusicDashboard;
