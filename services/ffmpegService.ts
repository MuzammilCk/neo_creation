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

    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    await ffmpeg.exec([
        '-i', inputName,
        '-ss', start.toString(),
        '-t', duration.toString(),
        '-c', 'copy',
        outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }

  async applyFilter(videoFile: File, filterType: 'grayscale' | 'high_contrast' | 'noise' | 'sepia'): Promise<string> {
    if (!this.ffmpeg || !this.loaded) await this.load();
    const ffmpeg = this.ffmpeg!;
    const inputName = 'input_filter.mp4';
    const outputName = 'output_filter.mp4';

    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    let filterCmd = '';
    switch (filterType) {
        case 'grayscale': filterCmd = 'hue=s=0'; break;
        case 'high_contrast': filterCmd = 'eq=contrast=1.5:brightness=-0.1'; break;
        case 'noise': filterCmd = 'noise=alls=20:allf=t+u'; break; // Brutalist grain
        case 'sepia': filterCmd = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'; break;
        default: filterCmd = 'null';
    }

    // Re-encoding required for video filters. Using ultrafast preset for browser performance.
    await ffmpeg.exec([
        '-i', inputName,
        '-vf', filterCmd,
        '-c:a', 'copy', // Copy audio to save processing time
        '-preset', 'ultrafast',
        outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }

  async mergeAudio(videoFile: File, audioFile: File): Promise<string> {
    if (!this.ffmpeg || !this.loaded) await this.load();
    const ffmpeg = this.ffmpeg!;
    const videoInput = 'video_in.mp4';
    const audioInput = 'audio_in.mp3';
    const outputName = 'merged_output.mp4';

    await ffmpeg.writeFile(videoInput, await fetchFile(videoFile));
    await ffmpeg.writeFile(audioInput, await fetchFile(audioFile));

    // Mix audio using filter_complex. 
    // [0:a] is video audio, [1:a] is new audio. amix mixes them.
    // duration=first ensures video length is preserved.
    await ffmpeg.exec([
        '-i', videoInput,
        '-i', audioInput,
        '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first[aout]',
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy', // Copy video stream (fast)
        '-c:a', 'aac', // Re-encode mixed audio
        '-preset', 'ultrafast',
        outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }
}

export const ffmpegService = new FFmpegService();
