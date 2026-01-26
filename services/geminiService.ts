import { GoogleGenAI, GenerateContentStreamResult } from "@google/genai";
import { Message, FileAttachment } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Updated system instruction for Analysis Dashboard
const SYSTEM_INSTRUCTION = `
You are an advanced Video & Image Analysis AI Agent.
Your task is to analyze the provided media files for content, context, and potential risks.

CRITICAL INSTRUCTION: You must provide a structured output containing a reasoning chain followed by a final JSON assessment.

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

PHASE 1: REASONING STEPS
Break down your analysis into logical steps using this format:
[[STEP: Identify Content]] Describe what you see in the image/video.
[[STEP: Risk Assessment]] Evaluate safety, violence, or sensitive content.
[[STEP: Conclusion]] Formulate the final summary.

PHASE 2: FINAL JSON OUTPUT
Provide the final result strictly as a JSON object inside a markdown code block.
The JSON must have this schema:
{
  "title": "A short, punchy title for the media content",
  "summary": "A concise executive summary of the analysis (max 2 sentences).",
  "risk_score": <number between 0 and 100 representing risk/severity>
}

Example Output:
[[STEP: Analysis]] Scanning pixels...
...
\`\`\`json
{
  "title": "Unsafe Work Environment",
  "summary": "Worker observed without PPE.",
  "risk_score": 85
}
\`\`\`
`;

export const streamGeminiResponse = async (
  history: Message[],
  currentPrompt: string,
  attachments: FileAttachment[],
  onChunk: (text: string) => void
): Promise<string> => {
  const ai = getClient();
  const modelId = 'gemini-3-flash-preview'; 

  const parts: any[] = [];

  // Add attachments first (multimodal)
  attachments.forEach(att => {
    // Remove data:image/png;base64, prefix if present for the API
    const base64Data = att.data.split(',')[1]; 
    parts.push({
      inlineData: {
        mimeType: att.type,
        data: base64Data
      }
    });
  });

  // Add text prompt
  parts.push({ text: currentPrompt || "Analyze this media." });

  try {
    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4, // Lower temperature for more consistent JSON
        responseMimeType: "text/plain" // We want text so we can parse the mixed Step/JSON format
      }
    });

    let fullText = "";

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }

    return fullText;

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
