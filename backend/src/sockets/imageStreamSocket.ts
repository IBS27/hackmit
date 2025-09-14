import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server } from 'http';
import { imageBufferService } from '../services/imageBufferService';
import { claudeService } from '../core/claude';
import { sunoAPI } from '../core/suno';

interface StreamingSession {
  deviceId: string;
  userId?: string;
  isActive: boolean;
  startTime: Date;
  frameCount: number;
  lastProcessed?: Date;
}

interface ImageStreamData {
  imageBase64: string;
  deviceId: string;
  timestamp: string;
  mimeType?: string;
  userId?: string;
}

export class ImageStreamSocketServer {
  private io: SocketIOServer;
  private sessions: Map<string, StreamingSession> = new Map();
  private processingQueue: Map<string, boolean> = new Map(); // Prevent concurrent processing

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*", // Configure appropriately for production
        methods: ["GET", "POST"]
      },
      maxHttpBufferSize: 10e6, // 10MB for large images
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);

      // Handle streaming session start
      socket.on('start-stream', (data: { deviceId: string; userId?: string }) => {
        this.handleStreamStart(socket, data);
      });

      // Handle incoming image frames
      socket.on('image-frame', (data: ImageStreamData) => {
        this.handleImageFrame(socket, data);
      });

      // Handle streaming session stop
      socket.on('stop-stream', (data: { deviceId: string }) => {
        this.handleStreamStop(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Send current buffer stats on request
      socket.on('get-stats', () => {
        const stats = imageBufferService.getStats();
        socket.emit('buffer-stats', stats);
      });

      // Get recent images for a device
      socket.on('get-recent-images', (data: { deviceId: string; limit?: number }) => {
        const images = imageBufferService.getRecentImages(data.deviceId, data.limit || 5);
        const response = images.map(img => ({
          ...img.metadata,
          hasBuffer: !!img.buffer,
          base64: img.base64?.substring(0, 100) + '...' // Send truncated for preview
        }));
        socket.emit('recent-images', { deviceId: data.deviceId, images: response });
      });
    });

    console.log('🌐 WebSocket server initialized for image streaming');
  }

  private handleStreamStart(socket: Socket, data: { deviceId: string; userId?: string }): void {
    const { deviceId, userId } = data;

    if (this.sessions.has(deviceId)) {
      socket.emit('stream-error', {
        error: 'Stream already active for this device',
        deviceId
      });
      return;
    }

    const session: StreamingSession = {
      deviceId,
      userId,
      isActive: true,
      startTime: new Date(),
      frameCount: 0
    };

    this.sessions.set(deviceId, session);
    socket.join(`device:${deviceId}`); // Join device-specific room

    console.log(`📹 Stream started for device: ${deviceId}`);
    socket.emit('stream-started', { deviceId, timestamp: new Date().toISOString() });

    // Broadcast to other clients
    socket.broadcast.to(`device:${deviceId}`).emit('device-stream-started', { deviceId });
  }

  private async handleImageFrame(socket: Socket, data: ImageStreamData): Promise<void> {
    const { imageBase64, deviceId, timestamp, mimeType = 'image/jpeg', userId } = data;

    const session = this.sessions.get(deviceId);
    if (!session || !session.isActive) {
      socket.emit('stream-error', {
        error: 'No active stream session for device',
        deviceId
      });
      return;
    }

    try {
      // Increment frame count
      session.frameCount++;

      // Add image to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const bufferedImage = await imageBufferService.addImage(
        imageBuffer,
        deviceId,
        mimeType,
        userId,
        {
          compress: true,
          quality: 80,
          resize: { width: 800, height: 600 } // Smaller for streaming
        }
      );

      // Emit frame received confirmation
      socket.emit('frame-received', {
        deviceId,
        frameCount: session.frameCount,
        imageId: bufferedImage.metadata.id,
        size: bufferedImage.metadata.size,
        timestamp: new Date().toISOString()
      });

      // Check if we should process this frame (avoid overwhelming the system)
      const shouldProcess = await this.shouldProcessFrame(deviceId, session);

      if (shouldProcess && !this.processingQueue.get(deviceId)) {
        this.processingQueue.set(deviceId, true);

        // Process in background without blocking
        this.processFrameAsync(socket, deviceId, bufferedImage.metadata.id, bufferedImage.base64!)
          .finally(() => {
            this.processingQueue.set(deviceId, false);
            session.lastProcessed = new Date();
          });
      }

      // Broadcast frame info to other clients monitoring this device
      socket.broadcast.to(`device:${deviceId}`).emit('new-frame', {
        deviceId,
        frameCount: session.frameCount,
        timestamp: bufferedImage.metadata.timestamp
      });

    } catch (error) {
      console.error(`❌ Error processing frame from ${deviceId}:`, error);
      socket.emit('frame-error', {
        deviceId,
        error: 'Failed to process image frame',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async shouldProcessFrame(deviceId: string, session: StreamingSession): Promise<boolean> {
    // Process every 10th frame or if 30 seconds have passed since last processing
    const frameThreshold = session.frameCount % 10 === 0;
    const timeThreshold = !session.lastProcessed ||
      (new Date().getTime() - session.lastProcessed.getTime()) > 30000;

    // Also check if scene has changed
    const sceneChanged = await imageBufferService.detectSceneChange(deviceId);

    return (frameThreshold || timeThreshold) && sceneChanged;
  }

  private async processFrameAsync(
    socket: Socket,
    deviceId: string,
    imageId: string,
    imageBase64: string
  ): Promise<void> {
    try {
      console.log(`🔄 Processing frame ${imageId} from device ${deviceId}`);

      socket.emit('processing-started', {
        deviceId,
        imageId,
        timestamp: new Date().toISOString()
      });

      // Step 1: Analyze with Claude
      const claudeResult = await claudeService.generateMusicFromImage(imageBase64);

      socket.emit('analysis-complete', {
        deviceId,
        imageId,
        prompt: claudeResult.prompt,
        sceneDescription: claudeResult.sceneDescription,
        processingTime: claudeResult.processingTime,
        timestamp: new Date().toISOString()
      });

      // Step 2: Generate music (async, don't wait)
      const sunoResult = await sunoAPI.generateMusicWithTopic(claudeResult.prompt, {
        tags: claudeResult.prompt,
        make_instrumental: false
      });

      socket.emit('music-generation-started', {
        deviceId,
        imageId,
        clipId: sunoResult.id,
        prompt: claudeResult.prompt,
        timestamp: new Date().toISOString()
      });

      // Step 3: Wait for completion and notify
      sunoAPI.waitForCompletion(sunoResult.id, 180000)
        .then((completedClip) => {
          socket.emit('music-ready', {
            deviceId,
            imageId,
            clipId: completedClip.id,
            title: completedClip.title,
            audioUrl: completedClip.audio_url,
            timestamp: new Date().toISOString()
          });

          // Broadcast to all clients monitoring this device
          this.io.to(`device:${deviceId}`).emit('new-music-generated', {
            deviceId,
            title: completedClip.title,
            audioUrl: completedClip.audio_url,
            prompt: claudeResult.prompt
          });
        })
        .catch((error) => {
          socket.emit('music-error', {
            deviceId,
            imageId,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        });

    } catch (error) {
      console.error(`❌ Frame processing failed for ${deviceId}:`, error);
      socket.emit('processing-error', {
        deviceId,
        imageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleStreamStop(socket: Socket, data: { deviceId: string }): void {
    const { deviceId } = data;
    const session = this.sessions.get(deviceId);

    if (!session) {
      socket.emit('stream-error', {
        error: 'No active stream session found',
        deviceId
      });
      return;
    }

    session.isActive = false;
    const duration = new Date().getTime() - session.startTime.getTime();

    console.log(`📹 Stream stopped for device: ${deviceId} (${session.frameCount} frames, ${Math.round(duration/1000)}s)`);

    socket.emit('stream-stopped', {
      deviceId,
      frameCount: session.frameCount,
      duration: Math.round(duration / 1000),
      timestamp: new Date().toISOString()
    });

    // Broadcast to other clients
    socket.broadcast.to(`device:${deviceId}`).emit('device-stream-stopped', { deviceId });

    // Clean up
    this.sessions.delete(deviceId);
    this.processingQueue.delete(deviceId);
    socket.leave(`device:${deviceId}`);
  }

  private handleDisconnect(socket: Socket): void {
    console.log(`🔌 Client disconnected: ${socket.id}`);

    // Find and clean up any sessions associated with this socket
    for (const [deviceId, session] of this.sessions.entries()) {
      if (session.isActive) {
        // Could implement socket ID tracking to clean up properly
        console.log(`🧹 Cleaning up potential orphaned session for device: ${deviceId}`);
      }
    }
  }

  // Get current streaming statistics
  public getStreamingStats(): {
    activeSessions: number;
    totalFramesProcessed: number;
    sessionsDetails: Array<{
      deviceId: string;
      frameCount: number;
      duration: number;
      isProcessing: boolean;
    }>;
  } {
    const now = new Date().getTime();
    const sessionsDetails = Array.from(this.sessions.entries()).map(([deviceId, session]) => ({
      deviceId,
      frameCount: session.frameCount,
      duration: Math.round((now - session.startTime.getTime()) / 1000),
      isProcessing: this.processingQueue.get(deviceId) || false
    }));

    return {
      activeSessions: this.sessions.size,
      totalFramesProcessed: sessionsDetails.reduce((sum, s) => sum + s.frameCount, 0),
      sessionsDetails
    };
  }
}

export default ImageStreamSocketServer;