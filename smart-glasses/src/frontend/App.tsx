import React, { useRef, useState, useEffect } from "react";
import "./index.css";

interface MusicData {
  musicUrl: string;
  imageUrl?: string;
  sceneDescription: string;
  title: string;
  prompt: string;
  makeInstrumental: boolean;
  timestamp: string;
  processingTime: number;
}

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicData, setMusicData] = useState<MusicData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);

  // Fetch latest music data from smart glasses API
  const fetchMusicData = async () => {
    try {
      const response = await fetch('/api/latest-music');
      const result = await response.json();

      if (result.success && result.data) {
        // Check if this is new music (different timestamp)
        if (result.data.timestamp !== lastTimestamp) {
          setMusicData(result.data);
          setLastTimestamp(result.data.timestamp);

          // Auto-play new music
          if (audioRef.current) {
            audioRef.current.load(); // Reload the audio element
            audioRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              console.log('Auto-play blocked by browser');
            });
          }

          console.log('🎵 New music loaded:', result.data.title);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch music data:', error);
      setIsLoading(false);
    }
  };

  // Poll for new music every 5 seconds
  useEffect(() => {
    fetchMusicData(); // Initial fetch
    const interval = setInterval(fetchMusicData, 5000);
    return () => clearInterval(interval);
  }, [lastTimestamp]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="app">
      <h1 className="title">atmosphere</h1>

      {/* Status indicator */}
     <div className="status">
     {isLoading ? '🔄 Loading...' : musicData ? '🎵 Connected' : '⏸️ No music yet'}
      </div>

      <div className="cover-container" onClick={togglePlay} role="button" aria-label="Play/Pause">
        <img
          src={musicData?.imageUrl || "https://m.media-amazon.com/images/I/51a54dWdnBL._UF1000,1000_QL80_.jpg"}
          alt="Generated cover"
          className="cover"
        />
        <div className="overlay">
          {isLoading
            ? "⏳ Loading..."
            : !musicData
            ? "🎵 Waiting for music..."
            : isPlaying
            ? "❚❚ Pause"
            : "▶ Play"
          }
        </div>
      </div>

      <p className="desc">
        {isLoading
          ? "Loading music from smart glasses..."
          : musicData?.sceneDescription || "Waiting for scene analysis..."}
      </p>

      {/* Music info */}
      {musicData && (
        <div className="music-info">
          <div className="title">
            {musicData.title}
          </div>
          <div className="details">
            {musicData.makeInstrumental ? '🎼 Instrumental' : '🎤 With vocals'} •
            {Math.round(musicData.processingTime / 1000)}s to generate
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={musicData?.musicUrl || "https://cdn1.suno.ai/8fa7802b-a7a7-4345-83cc-7e4d202f9ff8.mp3"}
        preload="metadata"
      />
    </div>
  );
}
