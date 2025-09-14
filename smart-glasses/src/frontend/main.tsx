import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import "@fontsource/libre-franklin/400.css"; 
import "@fontsource/arimo/400.css";  
import "@fontsource/arimo/700.css";  

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
