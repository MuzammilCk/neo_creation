export interface HistoryItem {
  id: string;
  title: string;
  timestamp: Date;
}

export interface DetectedEvent {
  timestamp: number; // Seconds
  description: string;
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  riskLevel: 'low' | 'medium' | 'critical';
}

export interface ReasoningStep {
  stepId: string;
  title: string;
  details: string;
  relatedTimestamp?: number;
  alternativesConsidered?: string[];
  // UI specific fields (mapped after API response)
  status?: 'pending' | 'active' | 'completed';
}

export interface AnalysisResult {
  summary: string;
  riskScore: number;
  detectedEvents: DetectedEvent[];
  reasoningChain: ReasoningStep[];
}

export interface SongAnalysis {
  technical: {
    bpm: number;
    key: string;
    timeSignature: string;
    genre: string;
  };
  mood: {
    primary: string;
    tags: string[];
    colorCode: string;
  };
  structure: {
    instrumentation: string[];
    vocals: 'Male' | 'Female' | 'Instrumental' | 'Choir';
  };
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: FileAttachment[];
  analysisResult?: AnalysisResult;
  musicResult?: SongAnalysis;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface FileAttachment {
  name: string;
  type: string;
  data: string; // Base64
}

export interface SessionData {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
  steps: ReasoningStep[];
  mode: AppMode;
  persona: Persona;
}

export type Persona = 'Safety' | 'Cinematography' | 'Copyright' | 'Feynman';
export type AppMode = 'video' | 'music';
