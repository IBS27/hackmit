import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { claudeService } from './core/claude';
import { sunoAPI } from './core/suno';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      claude: !!process.env.CLAUDE_API_KEY,
      suno: !!process.env.SUNO_API_KEY
    }
  });
});

// Main endpoint: Image → Claude → Suno → Music
app.post('/api/analyze-scene', async (req, res) => {
  try {
    const { imageBase64, deviceId } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }

    console.log(`🔄 Processing image from device: ${deviceId || 'unknown'}`);
    
    // Step 1: Analyze image with Claude
    console.log('🤖 Analyzing scene with Claude...');
    const claudeResult = await claudeService.generateMusicFromImage(imageBase64);
    
    // Step 2: Generate music with Suno
    console.log('🎵 Generating music with Suno...');
    const sunoResult = await sunoAPI.generateMusicWithTopic(claudeResult.prompt, {
      tags: claudeResult.prompt,
      make_instrumental: true
    });
    
    // Step 3: Wait for Suno to complete (with timeout)
    console.log('⏳ Waiting for music generation...');
    const completedClip = await sunoAPI.waitForCompletion(sunoResult.id, 30000); // 30 second timeout
    
    console.log(`✅ Full pipeline completed!`);
    
    res.json({
      success: true,
      musicUrl: completedClip.audio_url,
      prompt: claudeResult.prompt,
      sceneDescription: claudeResult.sceneDescription,
      clipId: completedClip.id,
      title: completedClip.title,
      processingTime: claudeResult.processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Pipeline failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process scene',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for quick testing
app.post('/api/test-claude', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    const result = await claudeService.generateMusicFromImage(imageBase64);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test-suno', async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await sunoAPI.generateMusicWithTopic(prompt || 'test music');
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Soundscape AI Backend running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Main endpoint: http://localhost:${PORT}/api/analyze-scene`);
});

export default app;