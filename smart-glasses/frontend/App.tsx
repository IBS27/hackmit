import React, { useRef, useState } from "react";
import "./index.css";

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="app">
      <h1 className="title">🎵 Atmosphere 🎵</h1>
      <div className="cover-container" onClick={togglePlay}>
        <img
          src="/assets/demo.jpg" // TODO: REPLACE WITH BACKEND IMAGE URL
          alt="Generated cover"
          className="cover"
        />
        <div className="overlay">
          {isPlaying ? "❚❚ Pause" : "▶ Play"}
        </div>
      </div>
      <audio
        ref={audioRef}
        src="/assets/demo.mp3" // TODO: REPLACE WITH BACKEND AUDIO URL
      />
    </div>
  );
}
