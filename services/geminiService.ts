import { GoogleGenAI, Type, Schema } from "@google/genai";
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
  Copyright: 'Identify brand logos, watermarks, copyrighted characters, and potential IP infringements.'
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
  mode: AppMode
): Promise<AnalysisResult | SongAnalysis> => {
  const ai = getClient();
  const modelId = 'gemini-3-flash-preview'; 

  const parts: any[] = [];

  // Add attachments
  attachments.forEach(att => {
    const base64Data = att.data.split(',')[1]; 
    parts.push({
      inlineData: {
        mimeType: att.type,
        data: base64Data
      }
    });
  });

  // Add text prompt
  if (mode === 'music') {
     parts.push({ text: currentPrompt || "Analyze this audio track." });
  } else {
     parts.push({ text: currentPrompt || `Analyze this media using the ${persona} persona.` });
  }

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
      contents: {
        parts: parts
      },
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

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
