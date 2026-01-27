import React, { useState } from 'react';
import { Music, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import ReasoningFlow from './components/ReasoningFlow';
import { Message, HistoryItem, ReasoningStep, FileAttachment, AnalysisResult, Persona, AppMode, SongAnalysis, SessionData } from './types';
import { generateAnalysis } from './services/geminiService';
import clsx from 'clsx';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [sessions, setSessions] = useState<Record<string, SessionData>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(generateId());
  const [persona, setPersona] = useState<Persona>('Safety');
  const [appMode, setAppMode] = useState<AppMode>('video');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isReasoningOpen, setIsReasoningOpen] = useState(true);

  // Helper to save the current state to the session store
  const saveCurrentSession = () => {
     if (messages.length === 0) return;
     
     const currentTitle = history.find(h => h.id === currentSessionId)?.title || (appMode === 'music' ? 'Sonic Analysis' : `${persona} Analysis`);
     const timestamp = history.find(h => h.id === currentSessionId)?.timestamp || new Date();

     const sessionData: SessionData = {
         id: currentSessionId,
         title: currentTitle,
         timestamp: timestamp,
         messages,
         steps,
         mode: appMode,
         persona
     };
     
     setSessions(prev => ({...prev, [currentSessionId]: sessionData}));
     
     setHistory(prev => {
         // Avoid duplicates in history
         if (prev.find(h => h.id === currentSessionId)) return prev;
         return [{ id: currentSessionId, title: currentTitle, timestamp }, ...prev];
     });
  };

  const handleNewChat = () => {
    saveCurrentSession();
    const newId = generateId();
    setCurrentSessionId(newId);
    setMessages([]);
    setSteps([]);
    // Optionally reset mode/persona, but keeping user preference is usually better
  };

  const handleSelectSession = (id: string) => {
    if (id === currentSessionId) return;
    saveCurrentSession();
    
    const targetSession = sessions[id];
    if (targetSession) {
        setCurrentSessionId(id);
        setMessages(targetSession.messages);
        setSteps(targetSession.steps);
        setAppMode(targetSession.mode);
        setPersona(targetSession.persona);
    } else {
        // Fallback for an empty session ID that exists in history but not in data store (edge case)
        setCurrentSessionId(id);
        setMessages([]);
        setSteps([]);
    }
  };

  const handleSendMessage = async (text: string, attachments: FileAttachment[]) => {
    // 1. Add User Message
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      attachments: attachments,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setSteps([]); 

    // 2. Add placeholder Model Message
    const modelMsgId = generateId();
    setMessages(prev => [...prev, {
        id: modelMsgId,
        role: 'model',
        content: '', 
        timestamp: new Date(),
        isStreaming: true
    }]);

    if (messages.length === 0) {
        // Create history item for new chat immediately
        const title = text.substring(0, 30) || (appMode === 'music' ? 'Sonic Analysis' : `${persona} Analysis`);
        setHistory(prev => [{
            id: currentSessionId,
            title: title,
            timestamp: new Date()
        }, ...prev]);
    }

    try {
      const result = await generateAnalysis(text, attachments, persona, appMode);
      
      if (appMode === 'music') {
          const musicResult = result as SongAnalysis;
          setMessages(prev => prev.map(m => 
            m.id === modelMsgId 
            ? { 
                ...m, 
                content: "Analysis Complete", 
                musicResult: musicResult,
                isStreaming: false 
              } 
            : m
          ));
          setSteps([]);
      } else {
          const videoResult = result as AnalysisResult;
          const reasoningSteps = videoResult.reasoningChain.map(s => ({
              ...s,
              status: 'completed' as const
          }));
          setSteps(reasoningSteps);

          setMessages(prev => prev.map(m => 
            m.id === modelMsgId 
            ? { 
                ...m, 
                content: "Analysis Complete", 
                analysisResult: videoResult,
                isStreaming: false 
              } 
            : m
          ));
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => 
        m.id === modelMsgId 
        ? { ...m, content: "Error: Analysis failed to generate valid JSON.", isStreaming: false } 
        : m
      ));
    } finally {
        setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-black">
        
      {/* LEFT SIDEBAR */}
      <Sidebar 
        history={history} 
        onNewChat={handleNewChat} 
        onSelectChat={handleSelectSession} 
        currentMode={appMode}
        onSwitchMode={(m) => {
            saveCurrentSession(); // Save before switching mode (which implies new context usually, but here just switches lens)
            setAppMode(m);
        }}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentSessionId={currentSessionId}
      />

      {/* CENTER: Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-[400px]">
        <div className="p-4 border-b-4 border-black bg-white flex justify-between items-center">
             <h2 className="text-xl font-bold font-mono">DASHBOARD // {appMode === 'music' ? 'SONIC_ANALYZER' : 'VISUAL_INTELLIGENCE'}</h2>
             <div className="flex gap-2">
                 <div className="bg-neo-blue text-white px-2 py-1 text-xs border-2 border-black font-bold shadow-neo-sm">
                    GEMINI 3 FLASH
                 </div>
                 <div className="bg-neo-green px-2 py-1 text-xs border-2 border-black font-bold shadow-neo-sm">
                    JSON MODE
                 </div>
             </div>
        </div>
        <ChatInterface 
            messages={messages} 
            isStreaming={isStreaming} 
            onSendMessage={handleSendMessage}
            selectedPersona={persona}
            onSelectPersona={setPersona}
            appMode={appMode}
        />
      </div>

      {/* RIGHT PANEL: Reasoning Visualization */}
      <div className={clsx(
          "bg-neo-bg border-l-4 border-black flex flex-col transition-all duration-300 ease-in-out relative",
          isReasoningOpen ? "w-[400px]" : "w-12"
      )}>
        {/* Toggle Button */}
        <button 
            onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            className="absolute -left-4 top-20 bg-black text-white p-1 border-2 border-white rounded-full z-50 hover:scale-110 transition-transform shadow-neo-sm"
        >
            {isReasoningOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {isReasoningOpen ? (
            <>
                <div className="p-4 border-b-4 border-black bg-white">
                    <h2 className="text-xl font-bold font-mono">REASONING_CHAIN</h2>
                    <p className="text-xs text-gray-500 font-mono mt-1">LOGIC GRAPH</p>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    {appMode === 'music' ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400 font-mono">
                            <Music size={48} className="mb-4 opacity-50" />
                            <div>AUDIO MODE ACTIVE</div>
                            <div className="text-xs mt-2">Cognitive Map Disabled for Sonic Analysis</div>
                        </div>
                    ) : (
                        <ReasoningFlow steps={steps} />
                    )}
                </div>
                <div className="bg-black text-white p-2 font-mono text-xs flex justify-between">
                    <span>{appMode === 'music' ? 'MODE: AUDIO' : `PERSONA: ${persona.toUpperCase()}`}</span>
                    <span>NODES: {steps.length}</span>
                </div>
            </>
        ) : (
            <div className="h-full flex items-center justify-center bg-neo-yellow">
                <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-mono font-bold tracking-widest whitespace-nowrap">
                    REASONING_CHAIN // LOGIC
                </span>
            </div>
        )}
      </div>

    </div>
  );
};

export default App;
