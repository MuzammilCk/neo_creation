import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, FileVideo, Music, X, AlertTriangle, CheckCircle, ShieldAlert, Zap } from 'lucide-react';
import { Message, FileAttachment, Persona, AppMode } from '../types';
import MusicDashboard from './MusicDashboard';
import clsx from 'clsx';

interface ChatInterfaceProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (text: string, files: FileAttachment[]) => void;
  selectedPersona: Persona;
  onSelectPersona: (p: Persona) => void;
  appMode: AppMode;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    messages, 
    isStreaming, 
    onSendMessage,
    selectedPersona,
    onSelectPersona,
    appMode
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (files: FileList | null) => {
    if (!files) return;
    const newAttachments: FileAttachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Logic for accepted types based on mode
      const isAudio = file.type.startsWith('audio/');
      const isVideoOrImage = file.type.startsWith('image/') || file.type.startsWith('video/');

      if ((appMode === 'music' && isAudio) || (appMode === 'video' && isVideoOrImage)) {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         await new Promise<void>((resolve) => {
             reader.onload = () => {
                 newAttachments.push({
                     name: file.name,
                     type: file.type,
                     data: reader.result as string
                 });
                 resolve();
             }
         });
      } else {
          alert(`Invalid file type for ${appMode.toUpperCase()} mode.`);
      }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await processFiles(e.dataTransfer.files);
  };

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(input, attachments);
    setInput('');
    setAttachments([]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div 
      className="flex flex-col h-full bg-white relative border-r-4 border-black"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header with Persona Selector (Only for Video Mode) */}
      {appMode === 'video' && (
        <div className="p-2 border-b-2 border-black flex items-center justify-between bg-neo-bg">
            <div className="text-xs font-mono font-bold flex gap-2">
                {['Safety', 'Cinematography', 'Copyright'].map((p) => (
                    <button
                        key={p}
                        onClick={() => !isStreaming && onSelectPersona(p as Persona)}
                        className={clsx(
                            "px-3 py-1 border-2 border-black transition-all",
                            selectedPersona === p 
                                ? "bg-black text-white shadow-neo-sm" 
                                : "bg-white text-black hover:bg-gray-200",
                            isStreaming && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {p.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
      )}
      
      {appMode === 'music' && (
        <div className="p-2 border-b-2 border-black flex items-center justify-between bg-black text-white">
             <span className="text-xs font-mono font-bold px-2">MODE: SONIC ANALYZER // AI PRODUCER LENS</span>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-neo-yellow bg-opacity-95 z-50 flex flex-col items-center justify-center border-4 border-dashed border-black m-4 pointer-events-none">
          {appMode === 'music' ? <Music size={64} className="mb-4 animate-bounce" /> : <FileVideo size={64} className="mb-4 animate-bounce" />}
          <div className="text-4xl font-black font-mono">DROP {appMode === 'music' ? 'AUDIO' : 'MEDIA'}</div>
          <div className="mt-2 font-bold font-sans">SUPPORTED: {appMode === 'music' ? 'MP3, WAV' : 'IMAGES, VIDEO'}</div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={clsx(
            "flex flex-col w-full",
            msg.role === 'user' ? "items-end ml-auto max-w-[85%]" : "items-start mr-auto max-w-[90%]"
          )}>
             <span className="mb-1 font-mono text-xs font-bold uppercase text-gray-500">
                {msg.role === 'user' ? 'Input' : appMode === 'music' ? 'Sonic Report' : `Analysis: ${selectedPersona}`}
             </span>
             
             {/* Render User Message */}
             {msg.role === 'user' && (
                <div className="p-4 border-2 border-black shadow-neo-sm bg-neo-blue text-white w-full">
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {msg.attachments.map((att, idx) => (
                                <div key={idx} className="bg-black/20 p-2 rounded flex items-center gap-2">
                                    {att.type.startsWith('audio') ? <Music size={16} /> : <FileVideo size={16} />}
                                    <span className="text-xs font-mono truncate max-w-[150px]">{att.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {msg.content && <div className="whitespace-pre-wrap font-sans">{msg.content}</div>}
                </div>
             )}

             {/* Render Model Message */}
             {msg.role === 'model' && (
                 <div className="w-full">
                     {/* MUSIC RESULT */}
                     {msg.musicResult && (
                         <MusicDashboard data={msg.musicResult} />
                     )}

                     {/* VIDEO RESULT */}
                     {msg.analysisResult && (
                         <div className="bg-white border-4 border-black shadow-neo p-0 overflow-hidden w-full md:w-[600px]">
                             <div className="bg-black text-white p-3 flex justify-between items-center">
                                 <h3 className="font-mono font-bold text-lg">ANALYSIS_RESULTS // {selectedPersona.toUpperCase()}</h3>
                                 <span className="text-xs font-mono">{new Date().toLocaleTimeString()}</span>
                             </div>
                             
                             <div className="p-6">
                                 <div className="flex items-center gap-6 mb-6">
                                     <div className="flex flex-col items-center">
                                         <span className="font-mono text-xs font-bold mb-1">SCORE</span>
                                         <div className={clsx(
                                             "w-20 h-20 border-4 border-black flex items-center justify-center rounded-full text-2xl font-black shadow-neo-sm",
                                             msg.analysisResult.riskScore > 75 ? "bg-red-500 text-white" :
                                             msg.analysisResult.riskScore > 40 ? "bg-neo-yellow text-black" :
                                             "bg-neo-green text-black"
                                         )}>
                                             {msg.analysisResult.riskScore}
                                         </div>
                                     </div>
                                     
                                     <div className="flex-1">
                                         <h2 className="text-xl font-black mb-2 leading-tight font-sans">
                                             EXECUTIVE SUMMARY
                                         </h2>
                                         <p className="font-mono text-sm border-l-4 border-black pl-3 py-1 bg-gray-100">
                                             {msg.analysisResult.summary}
                                         </p>
                                     </div>
                                 </div>

                                 <div className="mt-4">
                                     <h4 className="font-black font-mono text-sm mb-2 uppercase flex items-center gap-2">
                                         <Zap size={16} /> Detected Events
                                     </h4>
                                     <div className="border-2 border-black max-h-[300px] overflow-y-auto">
                                         <table className="w-full font-mono text-xs text-left">
                                             <thead className="bg-neo-yellow text-black border-b-2 border-black sticky top-0">
                                                 <tr>
                                                     <th className="p-2 w-16 text-black font-bold border-r-2 border-black">TIME</th>
                                                     <th className="p-2 text-black font-bold border-r-2 border-black">EVENT DESCRIPTION</th>
                                                     <th className="p-2 w-24 text-black font-bold">LEVEL</th>
                                                 </tr>
                                             </thead>
                                             <tbody>
                                                 {msg.analysisResult.detectedEvents.map((event, i) => (
                                                     <tr key={i} className="border-b border-gray-300 hover:bg-neo-bg">
                                                         <td className="p-2 border-r-2 border-black font-bold text-black">
                                                             {event.timestamp}s
                                                         </td>
                                                         <td className="p-2 border-r-2 border-black text-black font-bold">
                                                             {event.description}
                                                         </td>
                                                         <td className="p-2">
                                                             <span className={clsx(
                                                                 "px-2 py-0.5 text-[10px] font-bold border border-black",
                                                                 event.riskLevel === 'critical' ? "bg-red-500 text-white" :
                                                                 event.riskLevel === 'medium' ? "bg-neo-yellow text-black" :
                                                                 "bg-neo-green text-black"
                                                             )}>
                                                                 {event.riskLevel.toUpperCase()}
                                                             </span>
                                                         </td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     )}

                     {/* LOADING STATE */}
                     {!msg.analysisResult && !msg.musicResult && (
                         <div className="p-4 border-2 border-black border-dashed bg-gray-50 text-gray-500 font-mono animate-pulse w-full max-w-[400px]">
                            {appMode === 'music' ? 'LISTENING TO AUDIO...' : `ANALYZING MEDIA WITH ${selectedPersona.toUpperCase()} PROTOCOLS...`}
                            <div className="mt-2 text-xs opacity-50">
                                Please wait for full JSON validation...
                            </div>
                         </div>
                     )}
                 </div>
             )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-neo-bg border-t-4 border-black">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
            <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
                {attachments.map((att, i) => (
                    <div key={i} className="relative group bg-white border-2 border-black p-2 shadow-neo-sm min-w-[120px]">
                        <button 
                            onClick={() => removeAttachment(i)}
                            className="absolute -top-3 -right-3 bg-red-500 text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform"
                        >
                            <X size={12} />
                        </button>
                        <div className="h-16 w-full bg-gray-100 flex items-center justify-center mb-1 overflow-hidden">
                            {att.type.startsWith('image') ? (
                                <img src={att.data} alt="preview" className="h-full w-full object-cover" />
                            ) : att.type.startsWith('audio') ? (
                                <Music size={32} className="text-black" />
                            ) : (
                                <FileVideo size={32} className="text-gray-400"/>
                            )}
                        </div>
                        <p className="text-[10px] font-mono truncate">{att.name}</p>
                    </div>
                ))}
            </div>
        )}

        <div className="flex gap-2">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white p-3 border-2 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-hover transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
                <Paperclip size={24} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                accept={appMode === 'music' ? "audio/*" : "image/*,video/*"}
                onChange={(e) => processFiles(e.target.files)}
            />

            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={appMode === 'music' ? "Ask about BPM, genre, mood..." : "Specific instructions..."}
                className="flex-1 bg-white border-2 border-black p-3 font-mono focus:outline-none shadow-neo focus:shadow-neo-hover focus:translate-x-[2px] focus:translate-y-[2px] transition-all placeholder:text-gray-400"
                disabled={isStreaming}
            />
            
            <button 
                onClick={handleSend}
                disabled={isStreaming}
                className={clsx(
                    "bg-neo-green p-3 border-2 border-black shadow-neo transition-all",
                    !isStreaming ? "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-hover active:translate-x-[4px] active:translate-y-[4px] active:shadow-none" : "opacity-50 cursor-not-allowed"
                )}
            >
                <Send size={24} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
