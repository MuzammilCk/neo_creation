export interface HistoryItem {
  id: string;
  title: string;
  timestamp: Date;
}

export interface ReasoningStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

export interface AnalysisData {
  title: string;
  summary: string;
  risk_score: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: FileAttachment[];
  analysisData?: AnalysisData;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface FileAttachment {
  name: string;
  type: string;
  data: string; // Base64
}

export interface ChatSession {
  id: string;
  messages: Message[];
  reasoningChain: ReasoningStep[];
}
