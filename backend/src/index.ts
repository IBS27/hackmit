import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

import { claudeService } from './core/claude';
import { sunoAPI } from './core/suno';
import { imageBufferService } from './services/imageBufferService';
import { ImageStreamSocketServer } from './sockets/imageStreamSocket';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
const imageStreamSocket = new ImageStreamSocketServer(server);

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

// New scene analysis endpoint with image buffer integration
app.post('/api/scene/analyze', async (req, res) => {
  try {
    const { imageBase64, deviceId, timestamp, mimeType, userId } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID is required'
      });
    }

    console.log(`🔄 Processing image from device: ${deviceId}`);

    // Convert base64 to buffer and add to image buffer service
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const bufferedImage = await imageBufferService.addImage(
      imageBuffer,
      deviceId,
      mimeType || 'image/jpeg',
      userId,
      {
        compress: true,
        quality: 85,
        resize: { width: 1024, height: 768 } // Optimize for processing
      }
    );

    // Check if scene has changed significantly
    const sceneChanged = await imageBufferService.detectSceneChange(deviceId);

    if (!sceneChanged) {
      console.log('⏩ Scene unchanged, skipping analysis');
      return res.json({
        success: true,
        sceneChanged: false,
        message: 'Scene unchanged, no new music generated',
        imageId: bufferedImage.metadata.id,
        timestamp: new Date().toISOString()
      });
    }

    console.log('🎯 Scene changed, proceeding with analysis');

    // Step 1: Analyze image with Claude
    console.log('🤖 Analyzing scene with Claude...');
    const claudeResult = await claudeService.generateMusicFromImage(bufferedImage.base64!);

    // Step 2: Generate music with Suno
    console.log('🎵 Generating music with Suno...');
    const sunoResult = await sunoAPI.generateMusicWithTopic(claudeResult.prompt, {
      tags: claudeResult.prompt,
      make_instrumental: false // Allow vocals for more variety
    });

    // Step 3: Wait for Suno to complete (with extended timeout for music generation)
    console.log('⏳ Waiting for music generation...');
    const completedClip = await sunoAPI.waitForCompletion(sunoResult.id, 180000); // 3 minute timeout

    console.log('Audio URL:', completedClip.audio_url)
    console.log('Image URL:', completedClip.image_url)

    console.log(`✅ Full pipeline completed for device: ${deviceId}`);

    res.json({
      success: true,
      sceneChanged: true,
      musicUrl: completedClip.audio_url,
      prompt: claudeResult.prompt,
      sceneDescription: claudeResult.sceneDescription,
      clipId: completedClip.id,
      title: completedClip.title,
      imageId: bufferedImage.metadata.id,
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

// Legacy endpoint for backward compatibility
app.post('/api/analyze-scene', async (req, res) => {
  console.log('⚠️  Using legacy endpoint, redirecting to /api/scene/analyze');
  req.url = '/api/scene/analyze';
  return app._router.handle(req, res);
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

// Image buffer management endpoints
app.get('/api/buffer/stats', (req, res) => {
  try {
    const stats = imageBufferService.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/buffer/images/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const images = imageBufferService.getRecentImages(deviceId, limit);
    const response = images.map(img => ({
      ...img.metadata,
      hasBuffer: !!img.buffer,
      hasBase64: !!img.base64
    }));

    res.json({
      success: true,
      deviceId,
      images: response,
      count: response.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/buffer/clear/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    imageBufferService.clearDevice(deviceId);

    res.json({
      success: true,
      message: `Buffer cleared for device: ${deviceId}`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Soundscape AI Backend running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Main endpoint: http://localhost:${PORT}/api/scene/analyze`);
});

export default app;