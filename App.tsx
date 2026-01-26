import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import ReasoningFlow from './components/ReasoningFlow';
import { Message, HistoryItem, ReasoningStep, FileAttachment, AnalysisData } from './types';
import { streamGeminiResponse } from './services/geminiService';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(generateId());

  // Handle new chat creation
  const handleNewChat = () => {
    setCurrentSessionId(generateId());
    setMessages([]);
    setSteps([]);
  };

  // Main interaction logic
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
      setHistory(prev => [{
        id: currentSessionId,
        title: text.substring(0, 30) || "Media Analysis",
        timestamp: new Date()
      }, ...prev]);
    }

    let accumulatedRawText = "";
    
    try {
      await streamGeminiResponse(messages, text, attachments, (chunk) => {
        accumulatedRawText += chunk;
        
        // --- 1. PARSE REASONING STEPS ---
        const stepRegex = /\[\[STEP:\s*(.*?)\]\]\s*(.*?)(?=\[\[STEP:|```json|$)/gs;
        
        const parsedSteps: ReasoningStep[] = [];
        let match;
        let stepCount = 1;
        
        while ((match = stepRegex.exec(accumulatedRawText)) !== null) {
          parsedSteps.push({
            id: `step-${stepCount}`,
            stepNumber: stepCount,
            title: match[1].trim(),
            description: match[2].trim(),
            status: 'completed' 
          });
          stepCount++;
        }

        // --- 2. PARSE JSON RESULT ---
        let analysisData: AnalysisData | undefined;
        const jsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/;
        const jsonMatch = jsonRegex.exec(accumulatedRawText);

        if (jsonMatch) {
            try {
                analysisData = JSON.parse(jsonMatch[1]);
                // If we found JSON, mark all steps as completed
                if (parsedSteps.length > 0) {
                     parsedSteps[parsedSteps.length - 1].status = 'completed';
                }
            } catch (e) {
                // Incomplete JSON, ignore until valid
            }
        } else {
             // If no JSON yet, the last step is active
             if (parsedSteps.length > 0) {
                parsedSteps[parsedSteps.length - 1].status = 'active';
            }
        }

        setSteps(parsedSteps);

        setMessages(prev => prev.map(m => 
            m.id === modelMsgId 
            ? { 
                ...m, 
                content: accumulatedRawText, // Keep raw text for debugging or fallback, component handles display
                analysisData: analysisData,
                isStreaming: true 
              } 
            : m
        ));

      });
    } catch (error) {
      setMessages(prev => prev.map(m => 
        m.id === modelMsgId 
        ? { ...m, content: "Error: Analysis failed.", isStreaming: false } 
        : m
      ));
    } finally {
        setIsStreaming(false);
        setMessages(prev => prev.map(m => 
            m.id === modelMsgId ? { ...m, isStreaming: false } : m
        ));
        setSteps(prev => prev.map(s => ({...s, status: 'completed'})));
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-black">
        
      {/* LEFT SIDEBAR: History */}
      <Sidebar 
        history={history} 
        onNewChat={handleNewChat} 
        onSelectChat={(id) => console.log("Load chat", id)} 
      />

      {/* CENTER: Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-[400px]">
        <div className="p-4 border-b-4 border-black bg-white flex justify-between items-center">
             <h2 className="text-xl font-bold font-mono">DASHBOARD // ANALYSIS</h2>
             <div className="flex gap-2">
                 <div className="bg-neo-blue text-white px-2 py-1 text-xs border-2 border-black font-bold shadow-neo-sm">
                    GEMINI 3
                 </div>
                 <div className="bg-neo-green px-2 py-1 text-xs border-2 border-black font-bold shadow-neo-sm">
                    ONLINE
                 </div>
             </div>
        </div>
        <ChatInterface 
            messages={messages} 
            isStreaming={isStreaming} 
            onSendMessage={handleSendMessage} 
        />
      </div>

      {/* RIGHT PANEL: Reasoning Visualization */}
      <div className="w-[400px] bg-neo-bg border-l-4 border-black flex flex-col">
        <div className="p-4 border-b-4 border-black bg-white">
            <h2 className="text-xl font-bold font-mono">REASONING_ENGINE</h2>
            <p className="text-xs text-gray-500 font-mono mt-1">LIVE COGNITION TRACE</p>
        </div>
        <div className="flex-1 overflow-hidden relative">
            <ReasoningFlow steps={steps} />
        </div>
        <div className="bg-black text-white p-2 font-mono text-xs flex justify-between">
            <span>MODE: ANALYTIC</span>
            <span>STEPS: {steps.length}</span>
        </div>
      </div>

    </div>
  );
};

export default App;
