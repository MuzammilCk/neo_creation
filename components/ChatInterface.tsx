import React, { useRef, useState, useEffect } from 'react';
import { Send, Paperclip, FileVideo, X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { Message, FileAttachment } from '../types';
import clsx from 'clsx';

interface ChatInterfaceProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (text: string, files: FileAttachment[]) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isStreaming, onSendMessage }) => {
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
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
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
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-neo-yellow bg-opacity-95 z-50 flex flex-col items-center justify-center border-4 border-dashed border-black m-4 pointer-events-none">
          <FileVideo size={64} className="mb-4 animate-bounce" />
          <div className="text-4xl font-black font-mono">DROP MEDIA FOR ANALYSIS</div>
          <div className="mt-2 font-bold font-sans">SUPPORTED: IMAGES, VIDEO</div>
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
                {msg.role === 'user' ? 'Input' : 'Analysis Result'}
             </span>
             
             {/* Render User Message */}
             {msg.role === 'user' && (
                <div className="p-4 border-2 border-black shadow-neo-sm bg-neo-blue text-white w-full">
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {msg.attachments.map((att, idx) => (
                                <div key={idx} className="bg-black/20 p-2 rounded flex items-center gap-2">
                                    {att.type.startsWith('video') ? <FileVideo size={16} /> : <Paperclip size={16} />}
                                    <span className="text-xs font-mono truncate max-w-[150px]">{att.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {msg.content && <div className="whitespace-pre-wrap font-sans">{msg.content}</div>}
                </div>
             )}

             {/* Render Model Message (Analysis Card) */}
             {msg.role === 'model' && (
                 <div className="w-full">
                     {msg.analysisData ? (
                         <div className="bg-white border-4 border-black shadow-neo p-0 overflow-hidden w-full md:w-[500px]">
                             {/* Card Header */}
                             <div className="bg-black text-white p-3 flex justify-between items-center">
                                 <h3 className="font-mono font-bold text-lg">ANALYSIS_REPORT</h3>
                                 <span className="text-xs font-mono">{new Date().toLocaleTimeString()}</span>
                             </div>
                             
                             {/* Card Body */}
                             <div className="p-6">
                                 <h2 className="text-3xl font-black mb-4 leading-tight uppercase font-sans border-b-4 border-neo-yellow pb-2 inline-block">
                                     {msg.analysisData.title}
                                 </h2>
                                 
                                 <div className="flex items-center gap-6 mb-6">
                                     {/* Risk Score Meter */}
                                     <div className="flex flex-col items-center">
                                         <span className="font-mono text-xs font-bold mb-1">RISK_SCORE</span>
                                         <div className={clsx(
                                             "w-24 h-24 border-4 border-black flex items-center justify-center rounded-full text-3xl font-black shadow-neo-sm",
                                             msg.analysisData.risk_score > 75 ? "bg-red-500 text-white" :
                                             msg.analysisData.risk_score > 40 ? "bg-neo-yellow text-black" :
                                             "bg-neo-green text-black"
                                         )}>
                                             {msg.analysisData.risk_score}
                                         </div>
                                     </div>
                                     
                                     {/* Quick Status */}
                                     <div className="flex-1 space-y-2">
                                         <div className="flex items-center gap-2 font-bold font-mono">
                                             {msg.analysisData.risk_score > 75 ? <ShieldAlert size={20} className="text-red-600"/> : 
                                              msg.analysisData.risk_score > 40 ? <AlertTriangle size={20} className="text-orange-600"/> : 
                                              <CheckCircle size={20} className="text-green-600"/>}
                                             <span>
                                                 {msg.analysisData.risk_score > 75 ? "CRITICAL RISK DETECTED" :
                                                  msg.analysisData.risk_score > 40 ? "MODERATE CAUTION" :
                                                  "SAFE / LOW RISK"}
                                             </span>
                                         </div>
                                         <div className="h-4 w-full border-2 border-black bg-gray-200 rounded-full overflow-hidden">
                                             <div 
                                                className="h-full bg-black transition-all duration-1000"
                                                style={{ width: `${msg.analysisData.risk_score}%` }}
                                             />
                                         </div>
                                     </div>
                                 </div>

                                 <div className="bg-neo-bg border-2 border-black p-4 font-mono text-sm">
                                     <span className="bg-black text-white px-1 font-bold mr-2">SUMMARY:</span>
                                     {msg.analysisData.summary}
                                 </div>
                             </div>
                         </div>
                     ) : (
                         // Streaming State / Fallback
                         <div className="p-4 border-2 border-black border-dashed bg-gray-50 text-gray-500 font-mono animate-pulse w-full max-w-[400px]">
                            ANALYZING MEDIA CONTENT...
                            <div className="mt-2 text-xs opacity-50">
                                {msg.content.includes('[[STEP') ? "Generating Reasoning Steps..." : "Initializing..."}
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
                accept="image/*,video/*"
                onChange={(e) => processFiles(e.target.files)}
            />

            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Describe what to check for..."
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
