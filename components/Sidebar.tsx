import React from 'react';
import { HistoryItem } from '../types';
import { Plus, MessageSquare } from 'lucide-react';

interface SidebarProps {
  history: HistoryItem[];
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ history, onNewChat, onSelectChat }) => {
  return (
    <div className="w-64 bg-neo-yellow border-r-4 border-black flex flex-col h-full">
      <div className="p-4 border-b-4 border-black">
        <h1 className="text-2xl font-black font-sans mb-1">AGENT_01</h1>
        <p className="text-xs font-mono">NEO-BRUTALIST DASHBOARD</p>
      </div>
      
      <div className="p-4">
        <button 
          onClick={onNewChat}
          className="w-full bg-white text-black font-bold font-mono py-3 px-4 border-2 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-hover transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> NEW_SESSION
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {history.map((item) => (
            <div 
                key={item.id}
                onClick={() => onSelectChat(item.id)}
                className="group cursor-pointer bg-white border-2 border-black p-3 shadow-neo-sm hover:bg-neo-pink hover:text-white transition-colors"
            >
                <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={14} />
                    <span className="text-xs font-bold font-mono uppercase truncate">{item.timestamp.toLocaleDateString()}</span>
                </div>
                <div className="font-sans font-bold text-sm truncate">{item.title}</div>
            </div>
        ))}
      </div>
      
      <div className="p-4 border-t-4 border-black text-[10px] font-mono text-center opacity-60">
        POWERED BY GEMINI 3
      </div>
    </div>
  );
};

export default Sidebar;
