import React, { useRef, useState } from "react";
import "./index.css";

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

      <div className="cover-container" onClick={togglePlay} role="button" aria-label="Play/Pause">
        <img
          src="/assets/demo.jpg"   /* TODO: REPLACE WITH BACKEND IMAGE URL OR /api/cover */
          alt="Generated cover"
          className="cover"
        />
        <div className="overlay">
          {isPlaying ? "❚❚ Pause" : "▶ Play"}
        </div>
      </div>

      <p className="desc">
        description
        { /* TODO: REPLACE WITH BACKEND-GENERATED DESCRIPTION (CERBERUS/CLAUDE PROMPT OUTPUT) */}
      </p>

      <audio
        ref={audioRef}
        src="/assets/demo.mp3"     /* TODO: REPLACE WITH BACKEND AUDIO URL OR BLOB FROM /api/generate */
        preload="metadata"
      />
    </div>
  );
}
