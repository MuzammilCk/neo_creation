import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded: boolean = false;

  async load() {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    // Handle potential CORS/SAB issues by catching load errors
    try {
        await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        this.loaded = true;
    } catch (e) {
        console.error("Failed to load FFmpeg Wasm", e);
        throw new Error("Browser security settings prevent Client-Side FFmpeg. Please use a compatible browser/server configuration (COOP/COEP headers required).");
    }
  }

  async cutVideo(videoFile: File, start: number, end: number): Promise<string> {
    if (!this.ffmpeg || !this.loaded) {
        await this.load();
    }
    const ffmpeg = this.ffmpeg!;
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    const duration = end - start;

    // Write file to memory
    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // Execute cut command
    // -ss: start time, -t: duration, -c copy (fast stream copy, no re-encoding)
    await ffmpeg.exec([
        '-i', inputName,
        '-ss', start.toString(),
        '-t', duration.toString(),
        '-c', 'copy',
        outputName
    ]);

    // Read result
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }
}

export const ffmpegService = new FFmpegService();
