import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, FileVideo, Music, X, Zap, Volume2, Clapperboard, Disc, Wand2, Headphones, Copy, Check, Mic, Download, Play, Loader2 } from 'lucide-react';
import { Message, FileAttachment, Persona, AppMode, ActionResult } from '../types';
import MusicDashboard from './MusicDashboard';
import { ffmpegService } from '../services/ffmpegService';
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
  const [isRecording, setIsRecording] = useState(false);
  const [processingVideo, setProcessingVideo] = useState<string | null>(null); // ID of message being processed
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, processingVideo]);

  // VOICE INPUT LOGIC
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
          mediaRecorder.onstop = async () => {
              const blob = new Blob(chunks, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                  const base64 = reader.result as string;
                  setAttachments(prev => [...prev, { name: 'voice_command.webm', type: 'audio/webm', data: base64 }]);
                  // Auto-send if it's just a command
                  if (!input) setInput("Voice Command Received. Analyze/Execute.");
              };
              stream.getTracks().forEach(t => t.stop());
          };

          mediaRecorder.start();
          setIsRecording(true);
      } catch (e) {
          alert("Microphone access denied.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  // ... (Existing drag/drop handlers same as before)
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); await processFiles(e.dataTransfer.files); };
  const processFiles = async (files: FileList | null) => {
    if (!files) return;
    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAudio = file.type.startsWith('audio/');
      const isVideoOrImage = file.type.startsWith('image/') || file.type.startsWith('video/');
      if ((appMode === 'music' && isAudio) || (appMode === 'video' && isVideoOrImage)) {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         await new Promise<void>((resolve) => {
             reader.onload = () => {
                 newAttachments.push({ name: file.name, type: file.type, data: reader.result as string });
                 resolve();
             }
         });
      }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };
  const removeAttachment = (index: number) => { setAttachments(prev => prev.filter((_, i) => i !== index)); };
  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(input, attachments);
    setInput('');
    setAttachments([]);
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
      if (selectedPersona === 'Safety') { utterance.pitch = 0.6; utterance.rate = 0.9; }
      else if (selectedPersona === 'Cinematography') { utterance.pitch = 1.1; utterance.rate = 1.0; }
      else if (selectedPersona === 'Feynman') { utterance.pitch = 1.0; utterance.rate = 1.1; }
      else { utterance.pitch = 0.9; }
      window.speechSynthesis.speak(utterance);
  };

  // CLIENT-SIDE EXECUTION (FFmpeg)
  const handleExecuteCut = async (msgId: string, planIndex: number, start: number, end: number) => {
      // Find the original video attachment in history. 
      // Assumption: The video is in the closest previous user message.
      const lastUserMsg = messages.filter(m => m.role === 'user' && m.attachments?.some(a => a.type.startsWith('video'))).pop();
      if (!lastUserMsg || !lastUserMsg.attachments) {
          alert("No source video found to cut.");
          return;
      }
      
      const videoAtt = lastUserMsg.attachments.find(a => a.type.startsWith('video'));
      if (!videoAtt) return;

      setProcessingVideo(`${msgId}-${planIndex}`);

      try {
          // Convert base64 back to File for FFmpeg
          const res = await fetch(videoAtt.data);
          const blob = await res.blob();
          const file = new File([blob], "input.mp4", { type: "video/mp4" });

          const url = await ffmpegService.cutVideo(file, start, end);
          
          // Force download
          const a = document.createElement('a');
          a.href = url;
          a.download = `viral_short_${start}_${end}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

      } catch (error) {
          console.error(error);
          alert("Video processing failed. Browser may block SharedArrayBuffer.");
      } finally {
          setProcessingVideo(null);
      }
  };

  return (
    <div 
      className="flex flex-col h-full bg-white relative border-r-4 border-black"
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      {/* Header with Persona Selector */}
      {appMode === 'video' && (
        <div className="p-2 border-b-2 border-black flex items-center justify-between bg-neo-bg">
            <div className="text-xs font-mono font-bold flex gap-2 overflow-x-auto pb-1">
                {['Safety', 'Cinematography', 'Copyright', 'Feynman'].map((p) => (
                    <button key={p} onClick={() => !isStreaming && onSelectPersona(p as Persona)}
                        className={clsx( "px-3 py-1 border-2 border-black transition-all whitespace-nowrap", selectedPersona === p ? "bg-black text-white shadow-neo-sm" : "bg-white text-black hover:bg-gray-200", isStreaming && "opacity-50 cursor-not-allowed" )}
                    > {p.toUpperCase()} </button>
                ))}
            </div>
        </div>
      )}
      {appMode === 'music' && ( <div className="p-2 border-b-2 border-black flex items-center justify-between bg-black text-white"> <span className="text-xs font-mono font-bold px-2">MODE: SONIC ANALYZER // AI PRODUCER LENS</span> </div> )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={msg.id} className={clsx("flex flex-col w-full", msg.role === 'user' ? "items-end ml-auto max-w-[85%]" : "items-start mr-auto max-w-[90%]")}>
             <span className="mb-1 font-mono text-xs font-bold uppercase text-gray-500">{msg.role === 'user' ? 'Input' : 'Response'}</span>
             
             {/* USER MESSAGE */}
             {msg.role === 'user' && (
                <div className="p-4 border-2 border-black shadow-neo-sm bg-neo-blue text-white w-full">
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-4 mb-3">
                            {msg.attachments.map((att, idx) => (
                                <div key={idx} className="bg-black/20 p-2 rounded flex flex-col gap-2 w-full max-w-[300px]">
                                    {att.type.startsWith('video') ? <video id={`media-${msg.id}`} controls src={att.data} className="w-full h-auto border-2 border-black" /> : att.type.startsWith('audio') ? <audio id={`media-${msg.id}`} controls src={att.data} className="w-full border-2 border-black" /> : <img src={att.data} alt="uploaded" className="w-full h-auto border-2 border-black" />}
                                    <div className="flex items-center gap-2"><span className="text-xs font-mono truncate">{att.name}</span></div>
                                </div>
                            ))}
                        </div>
                    )}
                    {msg.content && <div className="whitespace-pre-wrap font-sans">{msg.content}</div>}
                </div>
             )}

             {/* MODEL MESSAGE */}
             {msg.role === 'model' && (
                 <div className="w-full">
                     {/* 1. MUSIC CARD */}
                     {msg.musicResult && (
                         <>
                            <MusicDashboard data={msg.musicResult} />
                             {!isStreaming && (
                                 <div className="mt-2 flex gap-2">
                                     <button onClick={() => onAgentAction('remix', msg.musicResult)} className="bg-neo-pink text-black border-2 border-black px-3 py-1 font-mono text-xs font-bold shadow-neo-sm hover:translate-y-1 transition-all flex items-center gap-2"><Disc size={14} /> REMIX IDEAS</button>
                                 </div>
                             )}
                         </>
                     )}

                     {/* 2. VIDEO ANALYSIS CARD */}
                     {msg.analysisResult && (
                         <div className="bg-white border-4 border-black shadow-neo p-0 overflow-hidden w-full md:w-[600px]">
                             <div className="bg-black text-white p-3 flex justify-between items-center">
                                 <h3 className="font-mono font-bold text-lg">ANALYSIS // {selectedPersona.toUpperCase()}</h3>
                                 <button onClick={() => speakSummary(msg.analysisResult?.summary || '')}><Volume2 size={16} /></button>
                             </div>
                             <div className="p-6">
                                 <div className="flex items-center gap-6 mb-6">
                                     <div className="flex flex-col items-center">
                                         <span className="font-mono text-xs font-bold mb-1">{selectedPersona === 'Feynman' ? 'ERROR %' : 'RISK'}</span>
                                         <div className={clsx("w-20 h-20 border-4 border-black flex items-center justify-center rounded-full text-2xl font-black shadow-neo-sm", msg.analysisResult.riskScore > 75 ? "bg-red-500 text-white" : "bg-neo-green")}>{msg.analysisResult.riskScore}</div>
                                     </div>
                                     <div className="flex-1">
                                         <h2 className="text-xl font-black mb-2">SUMMARY</h2>
                                         <p className="font-mono text-sm border-l-4 border-black pl-3 bg-gray-100">{msg.analysisResult.summary}</p>
                                     </div>
                                 </div>
                                 <div className="mt-4 border-2 border-black max-h-[200px] overflow-y-auto">
                                     <table className="w-full font-mono text-xs text-left">
                                         <thead className="bg-neo-yellow text-black border-b-2 border-black sticky top-0"><tr><th className="p-2">TIME</th><th className="p-2">EVENT</th><th className="p-2">LEVEL</th></tr></thead>
                                         <tbody>
                                             {msg.analysisResult.detectedEvents.map((ev, i) => (
                                                 <tr key={i} className="border-b hover:bg-neo-blue hover:text-white cursor-pointer" onClick={() => index > 0 && jumpToTimestamp(messages[index-1].id, ev.timestamp)}>
                                                     <td className="p-2 border-r border-black font-bold">{ev.timestamp}s</td>
                                                     <td className="p-2 border-r border-black">{ev.description}</td>
                                                     <td className="p-2"><span className={clsx("px-1 border border-black", ev.riskLevel==='critical'?"bg-red-500 text-white":"bg-neo-green")}>{ev.riskLevel}</span></td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             </div>
                             {!isStreaming && (
                                 <div className="bg-neo-bg border-t-4 border-black p-2 flex gap-2 overflow-x-auto">
                                     <button onClick={() => onAgentAction('shorts', msg.analysisResult)} className="bg-white border-2 border-black px-3 py-1 font-mono text-xs font-bold shadow-neo-sm hover:translate-y-1 flex gap-1"><Clapperboard size={12} /> VIRAL SHORTS</button>
                                     <button onClick={() => onAgentAction('soundtrack', msg.analysisResult)} className="bg-white border-2 border-black px-3 py-1 font-mono text-xs font-bold shadow-neo-sm hover:translate-y-1 flex gap-1"><Wand2 size={12} /> SCORE</button>
                                 </div>
                             )}
                         </div>
                     )}

                     {/* 3. AGENT PLAN (THE "DO" ENGINE) */}
                     {msg.agentPlan && (
                         <div className="bg-white border-4 border-black shadow-neo w-full md:w-[600px] overflow-hidden">
                             <div className="bg-gray-800 text-white p-2 flex justify-between items-center border-b-4 border-black">
                                <div className="font-mono text-xs font-bold uppercase flex items-center gap-2"><Zap size={14} className="text-neo-yellow fill-neo-yellow" /> AGENT EXECUTION PLAN</div>
                             </div>
                             <div className="p-4 bg-gray-100 font-mono text-sm">
                                {msg.agentPlan.type === 'shorts' && msg.agentPlan.cuts && (
                                    <div className="space-y-3">
                                        <p className="font-bold">Proposed Viral Cuts:</p>
                                        {msg.agentPlan.cuts.map((cut, i) => (
                                            <div key={i} className="bg-white border-2 border-black p-2 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <span className="font-bold block text-xs">{cut.title}</span>
                                                    <span className="text-[10px] text-gray-500">{cut.start}s - {cut.end}s</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleExecuteCut(msg.id, i, cut.start, cut.end)}
                                                    disabled={processingVideo === `${msg.id}-${i}`}
                                                    className="bg-neo-green text-black border-2 border-black px-2 py-1 text-[10px] font-bold hover:bg-green-400 flex items-center gap-1"
                                                >
                                                    {processingVideo === `${msg.id}-${i}` ? <Loader2 size={12} className="animate-spin"/> : <Play size={12}/>}
                                                    RENDER
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {msg.agentPlan.type === 'remix' && (
                                    <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(msg.agentPlan.remixIdeas, null, 2)}</pre>
                                )}
                                {msg.agentPlan.type === 'soundtrack' && (
                                    <div className="bg-black text-white p-3 font-mono text-xs">
                                        <div className="mb-2 text-neo-pink">PROMPT GENERATED:</div>
                                        {msg.agentPlan.soundtrackPrompt?.prompt}
                                    </div>
                                )}
                             </div>
                         </div>
                     )}

                     {/* RAW TEXT FALLBACK */}
                     {!msg.analysisResult && !msg.musicResult && !msg.agentPlan && msg.content && (
                         <div className="bg-white border-4 border-black shadow-neo w-full md:w-[600px] p-4 font-mono text-sm whitespace-pre-wrap">{msg.content}</div>
                     )}

                     {/* LOADING */}
                     {isStreaming && !msg.content && <div className="p-4 border-2 border-black border-dashed bg-gray-50 font-mono animate-pulse w-[200px]">AGENT THINKING...</div>}
                 </div>
             )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-neo-bg border-t-4 border-black">
        {/* Attachments */}
        {attachments.length > 0 && (
            <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
                {attachments.map((att, i) => (
                    <div key={i} className="relative group bg-white border-2 border-black p-2 shadow-neo-sm min-w-[120px]">
                        <button onClick={() => removeAttachment(i)} className="absolute -top-3 -right-3 bg-red-500 text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:scale-110"><X size={12} /></button>
                        <div className="h-16 w-full bg-gray-100 flex items-center justify-center mb-1 overflow-hidden">
                            {att.type.startsWith('audio') ? <Music size={32}/> : att.type.startsWith('video') ? <FileVideo size={32}/> : <img src={att.data} className="h-full w-full object-cover"/>}
                        </div>
                        <p className="text-[10px] font-mono truncate">{att.name}</p>
                    </div>
                ))}
            </div>
        )}

        <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="bg-white p-3 border-2 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-hover transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"><Paperclip size={24} /></button>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept={appMode === 'music' ? "audio/*" : "image/*,video/*"} onChange={(e) => processFiles(e.target.files)}/>
            
            {/* MIC BUTTON */}
            <button 
                onMouseDown={startRecording} 
                onMouseUp={stopRecording} 
                onMouseLeave={stopRecording}
                className={clsx(
                    "p-3 border-2 border-black shadow-neo transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    isRecording ? "bg-red-500 text-white animate-pulse" : "bg-white hover:translate-x-[2px] hover:translate-y-[2px]"
                )}
            >
                <Mic size={24} />
            </button>

            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={isRecording ? "Listening..." : "Instructions..."} className="flex-1 bg-white border-2 border-black p-3 font-mono focus:outline-none shadow-neo focus:shadow-neo-hover transition-all placeholder:text-gray-400" disabled={isStreaming} />
            
            <button onClick={handleSend} disabled={isStreaming} className={clsx("bg-neo-green p-3 border-2 border-black shadow-neo transition-all", !isStreaming && "hover:translate-x-[2px] hover:translate-y-[2px]")}><Send size={24} /></button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
