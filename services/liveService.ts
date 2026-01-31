import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";

export interface LiveConfig {
    onOpen?: () => void;
    onClose?: () => void;
    onVolume?: (vol: number) => void;
    onTranscript?: (text: string, role: 'user' | 'model') => void;
}

export class LiveService {
    private client: GoogleGenAI;
    private session: any = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private nextStartTime: number = 0;
    private config: LiveConfig = {};
    private isConnected: boolean = false;

    constructor() {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY not found");
        this.client = new GoogleGenAI({ apiKey });
    }

    async connect(config: LiveConfig) {
        this.config = config;
        
        // Setup Audio Contexts
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        this.nextStartTime = this.outputAudioContext.currentTime;

        // Get Mic Access
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Connect to Gemini Live
        const sessionPromise = this.client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: () => {
                    console.log("Live Session Opened");
                    this.isConnected = true;
                    this.config.onOpen?.();
                    this.startAudioInput(sessionPromise);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    this.handleMessage(msg);
                },
                onclose: () => {
                    console.log("Live Session Closed");
                    this.disconnect();
                },
                onerror: (err) => {
                    console.error("Live Session Error", err);
                    this.disconnect();
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: "You are a witty, neo-brutalist AI assistant. Keep responses punchy and insightful.",
            }
        });

        this.session = sessionPromise;
    }

    private startAudioInput(sessionPromise: Promise<any>) {
        if (!this.inputAudioContext || !this.mediaStream) return;

        this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate Volume for Visualizer
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            this.config.onVolume?.(rms);

            // Create PCM Blob
            const pcmBlob = this.createPcmBlob(inputData);
            
            // Send
            sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        };

        this.source.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
    }

    private async handleMessage(message: LiveServerMessage) {
        // Handle Audio Output
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio && this.outputAudioContext) {
            const audioBuffer = await this.decodeAudioData(base64Audio);
            
            // Scheduling
            this.nextStartTime = Math.max(this.outputAudioContext.currentTime, this.nextStartTime);
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputAudioContext.destination);
            source.start(this.nextStartTime);
            
            this.nextStartTime += audioBuffer.duration;
        }

        // Handle Transcriptions
        if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
             // Sometimes text comes directly
        }
        
        // Note: The prompt example uses dedicated transcription fields, checking those:
        if (message.serverContent?.inputTranscription?.text) {
             this.config.onTranscript?.(message.serverContent.inputTranscription.text, 'user');
        }
        if (message.serverContent?.outputTranscription?.text) {
             // For output, we might get partials. For simplicity, just sending what we get.
             // In a real app, we might debounce or aggregate 'turnComplete'.
             this.config.onTranscript?.(message.serverContent.outputTranscription.text, 'model');
        }

        // Handle Interruption
        if (message.serverContent?.interrupted) {
            this.nextStartTime = this.outputAudioContext?.currentTime || 0;
            // Note: To fully stop audio, we'd need to track active sources and stop them.
        }
    }

    disconnect() {
        if (!this.isConnected) return;
        
        this.isConnected = false;
        
        if (this.session) {
            this.session.then((s: any) => s.close()); // Try to close nicely
            this.session = null;
        }

        this.source?.disconnect();
        this.processor?.disconnect();
        this.mediaStream?.getTracks().forEach(t => t.stop());
        this.inputAudioContext?.close();
        this.outputAudioContext?.close();

        this.config.onClose?.();
    }

    private createPcmBlob(data: Float32Array): Blob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: this.arrayBufferToBase64(int16.buffer),
            mimeType: 'audio/pcm;rate=16000'
        };
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    private async decodeAudioData(base64: string): Promise<AudioBuffer> {
        if (!this.outputAudioContext) throw new Error("No output context");
        const arrayBuffer = this.base64ToArrayBuffer(base64);
        
        // Manual decoding for raw PCM (16-bit, 24kHz usually from Gemini)
        // If the headerless PCM is 24kHz 1ch 16bit:
        const dataInt16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(dataInt16.length);
        for(let i=0; i<dataInt16.length; i++) {
            float32[i] = dataInt16[i] / 32768.0;
        }

        const buffer = this.outputAudioContext.createBuffer(1, float32.length, 24000);
        buffer.copyToChannel(float32, 0);
        return buffer;
    }
}

export const liveService = new LiveService();
