import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

import { claudeService } from './core/claude';
import { sunoAPI } from './core/suno';
import { imageBufferService } from './services/imageBufferService';
import { ImageStreamSocketServer } from './sockets/imageStreamSocket';
import { musicStorageService } from './services/musicStorageService';

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

    let bufferedImage;
    try {
      bufferedImage = await imageBufferService.addImage(
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
    } catch (imageError: any) {
      console.warn(`⚠️ Failed to process image from device ${deviceId}:`, imageError?.message || imageError);
      // Return success but with warning - this allows the photo capture loop to continue
      return res.json({
        success: true,
        warning: 'Image processing failed but capture continues',
        error: imageError.message,
        deviceId,
        timestamp: new Date().toISOString()
      });
    }

    // Check if scene has changed significantly
    let sceneChanged;
    try {
      sceneChanged = await imageBufferService.detectSceneChange(deviceId);
    } catch (sceneError: any) {
      console.warn(`⚠️ Scene detection failed for device ${deviceId}:`, sceneError?.message || sceneError);
      // Continue with processing assuming scene changed
      sceneChanged = true;
    }

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
      make_instrumental: claudeResult.makeInstrumental
    });

    // Step 3: Wait for Suno audio URL to be available (faster response)
    console.log('⏳ Waiting for music to start streaming...');
    const completedClip = await sunoAPI.waitForAudioUrl(sunoResult.id, 60000); // 1 minute timeout

    console.log('Audio URL:', completedClip.audio_url)
    console.log('Image URL:', completedClip.image_url)

    // Store music data for retrieval by frontend
    musicStorageService.storeMusic(deviceId, {
      musicUrl: completedClip.audio_url!,
      imageUrl: completedClip.image_url,
      sceneDescription: claudeResult.sceneDescription,
      title: completedClip.title,
      prompt: claudeResult.prompt,
      makeInstrumental: claudeResult.makeInstrumental,
      clipId: completedClip.id,
      imageId: bufferedImage.metadata.id,
      processingTime: claudeResult.processingTime,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Full pipeline completed for device: ${deviceId}`);

    res.json({
      success: true,
      sceneChanged: true,
      musicUrl: completedClip.audio_url,
      imageUrl: completedClip.image_url,
      prompt: claudeResult.prompt,
      sceneDescription: claudeResult.sceneDescription,
      makeInstrumental: claudeResult.makeInstrumental,
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
  // Forward the request to the new endpoint
  const { imageBase64, deviceId, timestamp, mimeType, userId } = req.body;
  const forwardedReq = { ...req, body: { imageBase64, deviceId, timestamp, mimeType, userId } };
  forwardedReq.url = '/api/scene/analyze';
  return app._router.handle(forwardedReq, res);
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
    const { prompt, makeInstrumental } = req.body;
    const result = await sunoAPI.generateMusicWithTopic(prompt || 'test music, 1-2 minutes', {
      make_instrumental: makeInstrumental !== undefined ? makeInstrumental : true
    });
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

// Latest music endpoint for frontend
app.get('/api/latest-music', (req, res) => {
  try {
    // For now, get the latest music from any device
    // In a real app, you might filter by user or device
    const allMusic = musicStorageService.getAllMusic();
    const latestMusic = allMusic.length > 0 ? allMusic[0] : null;

    if (latestMusic) {
      res.json({
        success: true,
        data: {
          musicUrl: latestMusic.musicUrl,
          imageUrl: latestMusic.imageUrl,
          sceneDescription: latestMusic.sceneDescription,
          title: latestMusic.title,
          prompt: latestMusic.prompt,
          makeInstrumental: latestMusic.makeInstrumental,
          timestamp: latestMusic.timestamp,
          processingTime: latestMusic.processingTime
        }
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: 'No music available yet'
      });
    }
  } catch (error: any) {
    console.error('❌ Failed to get latest music:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve latest music',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Soundscape AI Backend running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Main endpoint: http://localhost:${PORT}/api/scene/analyze`);
});

export default app;