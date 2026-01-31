import React from 'react';
import { HistoryItem, AppMode } from '../types';
import { Plus, MessageSquare, Video, Music, ChevronLeft, ChevronRight, LayoutDashboard, AudioLines } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  history: HistoryItem[];
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  currentMode: AppMode;
  onSwitchMode: (mode: AppMode) => void;
  isOpen: boolean;
  onToggle: () => void;
  currentSessionId: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  history, 
  onNewChat, 
  onSelectChat, 
  currentMode, 
  onSwitchMode,
  isOpen,
  onToggle,
  currentSessionId
}) => {
  return (
    <div className={clsx(
        "bg-neo-yellow border-r-4 border-black flex flex-col h-full transition-all duration-300 ease-in-out relative",
        isOpen ? "w-72" : "w-20"
    )}>
      
      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className="absolute -right-4 top-6 bg-black text-white p-1 border-2 border-white rounded-full z-50 hover:scale-110 transition-transform"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Header */}
      <div className={clsx("p-4 border-b-4 border-black overflow-hidden whitespace-nowrap", !isOpen && "flex justify-center px-0")}>
        {isOpen ? (
            <>
                <h1 className="text-2xl font-black font-sans mb-1">AGENT_01</h1>
                <p className="text-xs font-mono">NEO-BRUTALIST</p>
            </>
        ) : (
            <div className="font-black text-xl">A_01</div>
        )}
      </div>

      {/* Mode Switcher */}
      <div className={clsx("p-4 border-b-4 border-black bg-neo-bg", !isOpen && "px-2")}>
          <div className={clsx("flex gap-2", isOpen ? "flex-row" : "flex-col")}>
            <button
                onClick={() => onSwitchMode('video')}
                title="Video Mode"
                className={clsx(
                    "flex-1 py-2 border-2 border-black font-bold font-mono text-xs flex items-center justify-center gap-1 transition-all",
                    currentMode === 'video' ? "bg-black text-white shadow-neo-sm" : "bg-white hover:bg-gray-200"
                )}
            >
                <Video size={14} /> {isOpen && "VIDEO"}
            </button>
            <button
                onClick={() => onSwitchMode('music')}
                title="Music Mode"
                className={clsx(
                    "flex-1 py-2 border-2 border-black font-bold font-mono text-xs flex items-center justify-center gap-1 transition-all",
                    currentMode === 'music' ? "bg-black text-white shadow-neo-sm" : "bg-white hover:bg-gray-200"
                )}
            >
                <Music size={14} /> {isOpen && "MUSIC"}
            </button>
          </div>
          {/* Live Button Row */}
          <button
                onClick={() => onSwitchMode('live')}
                title="Live Mode"
                className={clsx(
                    "w-full mt-2 py-2 border-2 border-black font-bold font-mono text-xs flex items-center justify-center gap-1 transition-all",
                    currentMode === 'live' ? "bg-neo-green text-black shadow-neo-sm" : "bg-white hover:bg-gray-200"
                )}
            >
                <AudioLines size={14} /> {isOpen && "LIVE / VOICE"}
            </button>

          {isOpen && (
            <div className="text-[10px] font-mono text-center uppercase text-gray-500 mt-2">
                Active: {currentMode === 'video' ? 'Visual Intel' : currentMode === 'music' ? 'Sonic Analyzer' : 'Native Audio'}
            </div>
          )}
      </div>
      
      {/* New Session Button */}
      <div className="p-4">
        <button 
          onClick={onNewChat}
          className={clsx(
              "w-full bg-white text-black font-bold font-mono border-2 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-hover transition-all flex items-center justify-center gap-2",
              isOpen ? "py-4 px-4 text-sm" : "py-3 px-0 rounded-full w-10 h-10 mx-auto"
          )}
          title="New Session"
        >
          <Plus size={isOpen ? 20 : 24} /> {isOpen && "NEW_SESSION"}
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {history.map((item) => (
            <div 
                key={item.id}
                onClick={() => onSelectChat(item.id)}
                className={clsx(
                    "group cursor-pointer border-2 border-black transition-colors overflow-hidden",
                    item.id === currentSessionId ? "bg-neo-pink text-black" : "bg-white hover:bg-gray-100",
                    isOpen ? "p-3 shadow-neo-sm" : "p-2 aspect-square flex items-center justify-center shadow-sm"
                )}
                title={item.title}
            >
                {isOpen ? (
                    <>
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare size={14} />
                            <span className="text-xs font-bold font-mono uppercase truncate">{item.timestamp.toLocaleDateString()}</span>
                        </div>
                        <div className="font-sans font-bold text-sm truncate">{item.title}</div>
                    </>
                ) : (
                    <LayoutDashboard size={20} />
                )}
            </div>
        ))}
      </div>
      
      {isOpen && (
        <div className="p-4 border-t-4 border-black text-[10px] font-mono text-center opacity-60">
            POWERED BY GEMINI 3
        </div>
      )}
    </div>
  );
};

export default Sidebar;
