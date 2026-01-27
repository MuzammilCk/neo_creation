import { GoogleGenAI, Type, Schema, Content } from "@google/genai";
import { Message, FileAttachment, AnalysisResult, Persona, AppMode, SongAnalysis, AgentPlan } from '../types';

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

// ... existing music schema ...
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

const ACTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['shorts', 'remix', 'soundtrack', 'visual_filter', 'music_overlay'] },
    cuts: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                start: { type: Type.NUMBER },
                end: { type: Type.NUMBER },
                title: { type: Type.STRING }
            },
            required: ['start', 'end', 'title']
        }
    },
    remixIdeas: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                genre: { type: Type.STRING },
                elements: { type: Type.STRING }
            }
        }
    },
    soundtrackPrompt: {
        type: Type.OBJECT,
        properties: {
            prompt: { type: Type.STRING },
            bpm: { type: Type.NUMBER },
            mood: { type: Type.STRING }
        }
    },
    // Visual Filter properties
    filterType: { type: Type.STRING, enum: ['grayscale', 'high_contrast', 'noise', 'sepia'] },
    filterReasoning: { type: Type.STRING },
    // Audio Merge properties
    audioTrackName: { type: Type.STRING }
  }
};

const getHistoryContent = (history: Message[]): Content[] => {
    return history.filter(msg => !msg.isStreaming).map(msg => {
    const parts: any[] = [];
    if (msg.role === 'user' && msg.attachments) {
        msg.attachments.forEach(att => {
            const base64Data = att.data.split(',')[1];
            parts.push({ inlineData: { mimeType: att.type, data: base64Data }});
        });
    }
    if (msg.role === 'user') {
        parts.push({ text: msg.content });
    } else {
        const contextText = msg.analysisResult 
            ? JSON.stringify(msg.analysisResult) 
            : msg.musicResult 
            ? JSON.stringify(msg.musicResult)
            : msg.content;
        parts.push({ text: contextText });
    }
    return { role: msg.role, parts: parts };
  });
}

// Internal helper for raw calls
const callGemini = async (contents: Content[], systemInstruction: string, schema: Schema) => {
    const ai = getClient();
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, 
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    if (result.text) return JSON.parse(result.text);
    throw new Error("No response text");
}

export const generateAnalysis = async (
  currentPrompt: string,
  attachments: FileAttachment[],
  persona: Persona,
  mode: AppMode,
  history: Message[] = []
): Promise<AnalysisResult | SongAnalysis> => {
  
  // 1. Construct History
  const contents = getHistoryContent(history);

  // 2. Add Current Request
  const currentParts: any[] = [];
  attachments.forEach(att => {
    const base64Data = att.data.split(',')[1]; 
    currentParts.push({
      inlineData: { mimeType: att.type, data: base64Data }
    });
  });
  
  const promptText = mode === 'music' 
    ? (currentPrompt || "Analyze this audio track.") 
    : (currentPrompt || `Analyze this media using the ${persona} persona.`);
    
  currentParts.push({ text: promptText });
  contents.push({ role: 'user', parts: currentParts });

  let systemInstruction = "";
  let responseSchema: Schema;

  if (mode === 'music') {
    systemInstruction = "You are an expert music producer. Analyze BPM, Key, Mood.";
    responseSchema = MUSIC_SCHEMA;
  } else {
    systemInstruction = `
      You are an advanced Video & Image Analysis Agent specializing in ${persona}.
      ${PERSONA_PROMPTS[persona]}
      Provide timestamps and reasoning.
    `;
    responseSchema = ANALYSIS_SCHEMA;
  }

  // FIRST PASS ANALYSIS
  let result = await callGemini(contents, systemInstruction, responseSchema);

  // THOUGHT-LOOP: SELF-CORRECTION
  if (mode === 'video') {
      const riskThreshold = persona === 'Feynman' ? 50 : 75;
      
      if (result.riskScore > riskThreshold) {
          console.log("Deep Thought Loop Triggered");
          
          const reflectionPrompt = "CRITICAL: High risk/error detected. Re-evaluate the specific timestamps. Are these false positives? Update reasoning chain with a 'Deep Review' step.";
          
          contents.push({ role: 'model', parts: [{ text: JSON.stringify(result) }] });
          contents.push({ role: 'user', parts: [{ text: reflectionPrompt }] });

          const secondPass = await callGemini(contents, systemInstruction, responseSchema);

          const combinedSteps = [
              ...result.reasoningChain.map((s: any) => ({ ...s, status: 'completed' })),
              { stepId: 'loop-trigger', title: 'SYSTEM 2 TRIGGER', details: 'High risk triggered deep review loop.', status: 'completed' },
              ...secondPass.reasoningChain.map((s: any) => ({ ...s, status: 'active', title: `REVIEW: ${s.title}` }))
          ];
          
          result = secondPass;
          result.reasoningChain = combinedSteps;
      }
  }

  return result;
};

export const generateAgentAction = async (
    actionType: 'shorts' | 'remix' | 'soundtrack' | 'visual_filter' | 'music_overlay',
    contextData: string
): Promise<AgentPlan> => {
    const ai = getClient();
    const modelId = 'gemini-3-flash-preview'; 
    
    let prompt = "";
    if (actionType === 'shorts') {
        prompt = `
        Based on the video analysis, identify 3 viral-worthy moments (3-5 seconds each).
        Return JSON with start/end timestamps and catchy titles.
        ANALYSIS CONTEXT: ${contextData}
        `;
    } else if (actionType === 'remix') {
        prompt = `
        Suggest 3 remix ideas. Return JSON.
        ANALYSIS CONTEXT: ${contextData}
        `;
    } else if (actionType === 'soundtrack') {
        prompt = `
        Generate a MusicLM prompt. Return JSON.
        ANALYSIS CONTEXT: ${contextData}
        `;
    } else if (actionType === 'visual_filter') {
        prompt = `
        Analyze the mood from the context. Select ONE visual filter to apply:
        - 'grayscale': For noir, serious, or timeless vibes.
        - 'high_contrast': For dramatic, intense, or action-packed vibes.
        - 'noise': For raw, brutalist, chaotic, or horror vibes.
        - 'sepia': For vintage, nostalgic, or warm vibes.
        
        Provide the 'filterType' and a short 'filterReasoning'.
        ANALYSIS CONTEXT: ${contextData}
        `;
    } else if (actionType === 'music_overlay') {
        prompt = `
        Confirm the action to overlay music. Return JSON with type 'music_overlay'.
        `;
    }

    try {
        const result = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: ACTION_SCHEMA
            }
        });
        
        if (result.text) {
            return JSON.parse(result.text);
        }
        throw new Error("Empty plan");
    } catch (error) {
        console.error("Agent Action Error:", error);
        return { type: actionType, rawText: "Failed to generate plan." };
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
