import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack } from 'lucide-react';
import clsx from 'clsx';

interface NeoVideoPlayerProps {
  src: string;
  id?: string;
  poster?: string;
}

const NeoVideoPlayer: React.FC<NeoVideoPlayerProps> = ({ src, id, poster }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const current = video.currentTime;
      const dur = video.duration;
      if (dur > 0) {
        setProgress((current / dur) * 100);
        setCurrentTime(current);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = (val / 100) * duration;
      setProgress(val);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (videoRef.current) {
      setVolume(val);
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const toggleFullscreen = () => {
      if (videoRef.current) {
          if (videoRef.current.requestFullscreen) {
              videoRef.current.requestFullscreen();
          }
      }
  }

  return (
    <div 
        className="w-full border-2 border-black bg-black relative group select-none shadow-neo-sm"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={videoRef}
        id={id}
        src={src}
        poster={poster}
        className="w-full h-auto block cursor-pointer"
        onClick={togglePlay}
      />
      
      {/* Big Play Overlay (Visible when paused) */}
      {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-neo-green border-4 border-black p-4 shadow-neo hover:translate-x-1 hover:translate-y-1 transition-transform">
                  <Play size={32} className="fill-black text-black" />
              </div>
          </div>
      )}

      {/* Controls Bar */}
      <div className={clsx(
          "absolute bottom-0 left-0 right-0 bg-white border-t-4 border-black p-2 flex flex-col gap-2 transition-opacity duration-200",
           isPlaying && !isHovering ? "opacity-0" : "opacity-100"
      )}>
        {/* Custom Scrubber Bar */}
        <div className="relative w-full h-4 bg-gray-300 border-2 border-black group/seek">
            <div 
                className="absolute top-0 left-0 h-full bg-neo-green border-r-2 border-black" 
                style={{ width: `${progress}%` }}
            />
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={progress} 
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </div>

        <div className="flex justify-between items-center font-mono text-xs font-bold">
            <div className="flex items-center gap-2">
                <button 
                    onClick={togglePlay} 
                    className="p-1.5 border-2 border-transparent hover:border-black hover:bg-neo-yellow transition-all"
                    title={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button 
                    onClick={() => { if(videoRef.current) videoRef.current.currentTime -= 5; }} 
                    className="p-1.5 border-2 border-transparent hover:border-black hover:bg-neo-yellow transition-all" 
                    title="-5s"
                >
                    <SkipBack size={16} />
                </button>
                
                <span className="ml-1 bg-black text-white px-2 py-0.5">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>
            </div>

            <div className="flex items-center gap-2">
                 <button onClick={toggleMute} className="p-1 hover:bg-gray-200">
                    {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                 </button>
                 
                 {/* Custom Volume Slider */}
                 <div className="w-20 h-3 bg-gray-300 border-2 border-black relative">
                     <div 
                        className="absolute top-0 left-0 h-full bg-black"
                        style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                     />
                     <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                 </div>
                 
                 <button onClick={toggleFullscreen} className="p-1 hover:bg-gray-200 ml-2">
                     <Maximize size={14} />
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default NeoVideoPlayer;
