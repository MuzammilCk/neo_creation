import { GoogleGenAI, Type, Schema, Content } from "@google/genai";
import { Message, FileAttachment, AnalysisResult, Persona, AppMode, SongAnalysis } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

const PERSONA_PROMPTS: Record<Persona, string> = {
  Safety: 'Focus on hazards, fire, structural risks, and unsafe human behaviors.',
  Cinematography: 'Analyze lighting, camera angles, color grading, composition, and visual style.',
  Copyright: 'Identify brand logos, watermarks, copyrighted characters, and potential IP infringements.',
  Feynman: 'You are a strict but helpful tutor. Watch the math/logic on paper. Identify INCORRECT steps. "Risk Score" is now "Error Probability" (0-100). "Detected Events" are specific mistakes or logic flaws.'
};

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    riskScore: { type: Type.NUMBER, description: "0-100 score indicating risk or intensity" },
    detectedEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.NUMBER, description: "Timestamp in seconds" },
          description: { type: Type.STRING },
          boundingBox: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "[ymin, xmin, ymax, xmax] normalized 0-1000"
          },
          riskLevel: { type: Type.STRING, enum: ['low', 'medium', 'critical'] }
        },
        required: ["timestamp", "description", "riskLevel"]
      }
    },
    reasoningChain: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepId: { type: Type.STRING },
          title: { type: Type.STRING },
          details: { type: Type.STRING },
          relatedTimestamp: { type: Type.NUMBER },
          alternativesConsidered: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["stepId", "title", "details"]
      }
    }
  },
  required: ["summary", "riskScore", "detectedEvents", "reasoningChain"]
};

const MUSIC_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    technical: {
      type: Type.OBJECT,
      properties: {
        bpm: { type: Type.NUMBER },
        key: { type: Type.STRING },
        timeSignature: { type: Type.STRING },
        genre: { type: Type.STRING },
      },
      required: ["bpm", "key", "timeSignature", "genre"]
    },
    mood: {
      type: Type.OBJECT,
      properties: {
        primary: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        colorCode: { type: Type.STRING, description: "Hex code e.g. #FF0055" },
      },
      required: ["primary", "tags", "colorCode"]
    },
    structure: {
      type: Type.OBJECT,
      properties: {
        instrumentation: { type: Type.ARRAY, items: { type: Type.STRING } },
        vocals: { type: Type.STRING, enum: ['Male', 'Female', 'Instrumental', 'Choir'] },
      },
      required: ["instrumentation", "vocals"]
    }
  },
  required: ["technical", "mood", "structure"]
};

export const generateAnalysis = async (
  currentPrompt: string,
  attachments: FileAttachment[],
  persona: Persona,
  mode: AppMode,
  history: Message[] = []
): Promise<AnalysisResult | SongAnalysis> => {
  const ai = getClient();
  const modelId = 'gemini-3-flash-preview'; 

  // 1. Construct History
  const contents: Content[] = history.filter(msg => !msg.isStreaming).map(msg => {
    const parts: any[] = [];
    
    // Attachments (for User messages)
    if (msg.role === 'user' && msg.attachments) {
        msg.attachments.forEach(att => {
            const base64Data = att.data.split(',')[1];
            parts.push({
                inlineData: {
                    mimeType: att.type,
                    data: base64Data
                }
            });
        });
    }

    // Text Content
    if (msg.role === 'user') {
        parts.push({ text: msg.content });
    } else {
        // For model, we need to serialize the previous result so the context is maintained
        // otherwise the model forgets what it analyzed.
        const contextText = msg.analysisResult 
            ? JSON.stringify(msg.analysisResult) 
            : msg.musicResult 
            ? JSON.stringify(msg.musicResult)
            : msg.content;
        parts.push({ text: contextText });
    }

    return {
        role: msg.role,
        parts: parts
    };
  });

  // 2. Add Current Request
  const currentParts: any[] = [];
  attachments.forEach(att => {
    const base64Data = att.data.split(',')[1]; 
    currentParts.push({
      inlineData: {
        mimeType: att.type,
        data: base64Data
      }
    });
  });
  
  const promptText = mode === 'music' 
    ? (currentPrompt || "Analyze this audio track.") 
    : (currentPrompt || `Analyze this media using the ${persona} persona.`);
    
  currentParts.push({ text: promptText });

  contents.push({
      role: 'user',
      parts: currentParts
  });

  let systemInstruction = "";
  let responseSchema: Schema;

  if (mode === 'music') {
    systemInstruction = `
      You are an expert music producer with perfect pitch. Listen to the audio file and extract technical and emotional metadata.
      Provide a comprehensive analysis of the BPM, Key, Genre, and Instrumentation.
      Determine the mood and assign a relevant hex color code.
    `;
    responseSchema = MUSIC_SCHEMA;
  } else {
    systemInstruction = `
      You are an advanced Video & Image Analysis Agent specializing in ${persona}.
      ${PERSONA_PROMPTS[persona]}
      
      Provide a detailed breakdown of your analysis including a reasoning chain and specific detected events with timestamps.
      For images, use timestamp 0.
      For bounding boxes, normalize coordinates to 0-1000 scale [ymin, xmin, ymax, xmax].
    `;
    responseSchema = ANALYSIS_SCHEMA;
  }

  try {
    const result = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, 
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (result.text) {
      return JSON.parse(result.text);
    } else {
      throw new Error("No response text received from Gemini.");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateAgentAction = async (
    actionType: 'shorts' | 'remix' | 'soundtrack',
    contextData: string
): Promise<string> => {
    const ai = getClient();
    const modelId = 'gemini-3-flash-preview'; 
    
    let prompt = "";
    if (actionType === 'shorts') {
        prompt = `
        Based on the following video analysis, identify 3 viral-worthy moments.
        Output a PLAN with:
        1. A catchy title for the short.
        2. The exact FFmpeg command to cut this clip (assume input file is 'input.mp4').
        
        IMPORTANT: Wrap the ffmpeg commands in code blocks.
        
        ANALYSIS CONTEXT:
        ${contextData}
        `;
    } else if (actionType === 'remix') {
        prompt = `
        Based on the following song analysis (BPM, Key, Mood), suggest 3 creative remix directions.
        For each, describe the new genre style and specific production elements to add (Drums, Synth, FX).
        
        ANALYSIS CONTEXT:
        ${contextData}
        `;
    } else if (actionType === 'soundtrack') {
        prompt = `
        Based on the following video analysis, act as a Musical Director.
        Generate a highly detailed text prompt for an AI Music Generator (like MusicLM/Suno) that perfectly matches the video's emotion, pacing, and events.
        
        Format as:
        **PROMPT:** [The prompt text]
        **BPM:** [Value]
        **MOOD:** [Descriptors]
        
        ANALYSIS CONTEXT:
        ${contextData}
        `;
    }

    try {
        const result = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });
        return result.text || "Could not generate action plan.";
    } catch (error) {
        console.error("Agent Action Error:", error);
        return "Agent failed to execute action.";
    }
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
