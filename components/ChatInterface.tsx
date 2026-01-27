import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, FileVideo, Music, X, Zap, Volume2, Clapperboard, Disc, Wand2, Headphones, Copy, Check } from 'lucide-react';
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
  onAgentAction: (action: 'shorts' | 'remix' | 'soundtrack', context: any) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    messages, 
    isStreaming, 
    onSendMessage,
    selectedPersona,
    onSelectPersona,
    appMode,
    onAgentAction
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  // FEATURE A: INTERACTIVE XAI (Timestamp Jumping)
  const jumpToTimestamp = (prevMsgId: string, seconds: number) => {
    const mediaEl = document.getElementById(`media-${prevMsgId}`) as HTMLMediaElement;
    if (mediaEl) {
        mediaEl.currentTime = seconds;
        mediaEl.play();
    }
  };

  // FEATURE C: DIRECTOR'S COMMENTARY
  const speakSummary = (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Voice modulation based on Persona
      if (selectedPersona === 'Safety') {
          utterance.pitch = 0.6; // Deep, serious
          utterance.rate = 0.9;
      } else if (selectedPersona === 'Cinematography') {
          utterance.pitch = 1.1; // Enthusiastic
          utterance.rate = 1.0;
      } else if (selectedPersona === 'Feynman') {
          utterance.pitch = 1.0; // Normal, helpful
          utterance.rate = 1.1; // Slightly faster/energetic
      } else {
          utterance.pitch = 0.9; // Formal
      }
      
      window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
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
            <div className="text-xs font-mono font-bold flex gap-2 overflow-x-auto pb-1">
                {['Safety', 'Cinematography', 'Copyright', 'Feynman'].map((p) => (
                    <button
                        key={p}
                        onClick={() => !isStreaming && onSelectPersona(p as Persona)}
                        className={clsx(
                            "px-3 py-1 border-2 border-black transition-all whitespace-nowrap",
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
        {messages.map((msg, index) => (
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
                        <div className="flex flex-wrap gap-4 mb-3">
                            {msg.attachments.map((att, idx) => (
                                <div key={idx} className="bg-black/20 p-2 rounded flex flex-col gap-2 w-full max-w-[300px]">
                                    {att.type.startsWith('video') ? (
                                        <video 
                                            id={`media-${msg.id}`} 
                                            controls 
                                            src={att.data} 
                                            className="w-full h-auto border-2 border-black" 
                                        />
                                    ) : att.type.startsWith('audio') ? (
                                        <audio 
                                            id={`media-${msg.id}`}
                                            controls 
                                            src={att.data} 
                                            className="w-full border-2 border-black" 
                                        />
                                    ) : (
                                        <img src={att.data} alt="uploaded content" className="w-full h-auto border-2 border-black" />
                                    )}
                                    <div className="flex items-center gap-2">
                                        {att.type.startsWith('audio') ? <Music size={16} /> : <FileVideo size={16} />}
                                        <span className="text-xs font-mono truncate">{att.name}</span>
                                    </div>
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
                         <>
                            <MusicDashboard data={msg.musicResult} />
                            {/* FEATURE B: AGENTIC ACTIONS (MUSIC) */}
                             {!isStreaming && (
                                 <div className="mt-2 flex gap-2">
                                     <button 
                                         onClick={() => onAgentAction('remix', msg.musicResult)}
                                         className="bg-neo-pink text-black border-2 border-black px-3 py-1 font-mono text-xs font-bold shadow-neo-sm hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
                                     >
                                         <Disc size={14} /> REMIX IDEAS
                                     </button>
                                 </div>
                             )}
                         </>
                     )}

                     {/* VIDEO RESULT */}
                     {msg.analysisResult && (
                         <div className="bg-white border-4 border-black shadow-neo p-0 overflow-hidden w-full md:w-[600px]">
                             <div className="bg-black text-white p-3 flex justify-between items-center">
                                 <h3 className="font-mono font-bold text-lg">ANALYSIS_RESULTS // {selectedPersona.toUpperCase()}</h3>
                                 <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => speakSummary(msg.analysisResult?.summary || '')}
                                        className="hover:text-neo-yellow transition-colors"
                                        title="Director's Commentary"
                                     >
                                         <Volume2 size={16} />
                                     </button>
                                     <span className="text-xs font-mono">{new Date().toLocaleTimeString()}</span>
                                 </div>
                             </div>
                             
                             <div className="p-6">
                                 <div className="flex items-center gap-6 mb-6">
                                     <div className="flex flex-col items-center">
                                         <span className="font-mono text-xs font-bold mb-1">
                                             {selectedPersona === 'Feynman' ? 'ERROR_PROBABILITY' : 'RISK_SCORE'}
                                         </span>
                                         <div className={clsx(
                                             "w-20 h-20 border-4 border-black flex items-center justify-center rounded-full text-2xl font-black shadow-neo-sm",
                                             msg.analysisResult.riskScore > 75 ? "bg-red-500 text-white" :
                                             msg.analysisResult.riskScore > 40 ? "bg-neo-yellow text-black" :
                                             "bg-neo-green text-black"
                                         )}>
                                             {msg.analysisResult.riskScore}
                                         </div>
                                         <div className="mt-2 text-[10px] font-bold font-mono text-center">
                                            {selectedPersona === 'Feynman' 
                                                ? (msg.analysisResult.riskScore > 50 ? "LOGIC FLAW" : "VALID")
                                                : (msg.analysisResult.riskScore > 75 ? "CRITICAL" : "SAFE")
                                            }
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
                                                     <tr 
                                                        key={i} 
                                                        className="border-b border-gray-300 hover:bg-neo-blue hover:text-white cursor-pointer transition-colors"
                                                        onClick={() => {
                                                            // Find the previous message (User Input) which contains the media
                                                            if (index > 0) {
                                                                jumpToTimestamp(messages[index - 1].id, event.timestamp);
                                                            }
                                                        }}
                                                        title="Click to jump to timestamp"
                                                     >
                                                         <td className="p-2 border-r-2 border-black font-bold text-inherit">
                                                             {event.timestamp}s
                                                         </td>
                                                         <td className="p-2 border-r-2 border-black text-inherit font-bold">
                                                             {event.description}
                                                         </td>
                                                         <td className="p-2">
                                                             <span className={clsx(
                                                                 "px-2 py-0.5 text-[10px] font-bold border border-black text-black",
                                                                 event.riskLevel === 'critical' ? "bg-red-500 text-white" :
                                                                 event.riskLevel === 'medium' ? "bg-neo-yellow" :
                                                                 "bg-neo-green"
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

                             {/* FEATURE B & D: AGENTIC ACTIONS (VIDEO) */}
                             {!isStreaming && (
                                 <div className="bg-neo-bg border-t-4 border-black p-2 flex gap-2 overflow-x-auto">
                                     <span className="font-mono text-xs font-bold self-center mr-2">ACTIONS:</span>
                                     <button 
                                        onClick={() => onAgentAction('shorts', msg.analysisResult)}
                                        className="bg-white border-2 border-black px-3 py-1 font-mono text-xs font-bold shadow-neo-sm hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-1 whitespace-nowrap"
                                     >
                                         <Cl