import {AppServer, AppSession, ManagedStreamOptions, ManagedStreamResult} from "@mentra/sdk"
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.example.myfirstmentraosapp"
const PORT = parseInt(process.env.PORT || "3000")
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY

if (!MENTRAOS_API_KEY) {
  console.error("MENTRAOS_API_KEY environment variable is required")
  process.exit(1)
}

// Configuration for RTMP streaming
const STREAM_LOGS_DIR = join(process.cwd(), 'stream-logs') // Local stream logs directory

// Create stream logs directory if it doesn't exist
try {
  mkdirSync(STREAM_LOGS_DIR, { recursive: true })
} catch (error) {
  console.log("Stream logs directory already exists or created")
}

/**
 * MyMentraOSApp - Smart glasses app with RTMP streaming
 * Extends AppServer to handle sessions and managed RTMP streaming
 */
class MyMentraOSApp extends AppServer {
  private isStreamActive: Map<string, boolean> = new Map() // Track active streams
  private streamResults: Map<string, ManagedStreamResult> = new Map() // Store stream info
  private streamStartTime: Map<string, Date> = new Map() // Track stream start times
  private frameExtractionIntervals: Map<string, NodeJS.Timeout> = new Map() // Frame extraction timers
  /**
   * Handle new session connections
   * @param session - The app session instance
   * @param sessionId - Unique identifier for this session
   * @param userId - The user ID for this session
   */
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    session.logger.info(`New session: ${sessionId} for user ${userId}`)

    // Display startup message
    session.layouts.showTextWall("Press button to start/stop RTMP stream")

    // Initialize user state
    this.isStreamActive.set(userId, false)

    // Set up stream status monitoring
    session.camera.onManagedStreamStatus((status) => {
      session.logger.info(`Stream status: ${status.status}`)
      this.handleStreamStatus(session, userId, status)
    })

    // Set up button press handler for stream control
    session.events.onButtonPress(async (button) => {
      session.logger.info(`Button pressed: ${button.buttonId}, type: ${button.pressType}`)
      
      if (button.pressType === 'short') {
        // Short press toggles stream
        await this.toggleStream(session, userId)
      } else if (button.pressType === 'long') {
        // Long press shows stream info
        await this.showStreamInfo(session, userId)
      }
    })

    // Log when the session is disconnected
    session.events.onDisconnected(() => {
      session.logger.info(`Session ${sessionId} disconnected.`)
      this.cleanupUserState(userId)
    })
  }

  /**
   * Toggle RTMP stream on/off
   */
  private async toggleStream(session: AppSession, userId: string): Promise<void> {
    const isActive = this.isStreamActive.get(userId)

    if (isActive) {
      await this.stopStream(session, userId)
    } else {
      await this.startStream(session, userId)
    }
  }

  /**
   * Start managed RTMP stream
   */
  private async startStream(session: AppSession, userId: string): Promise<void> {
    try {
      session.logger.info("Starting managed RTMP stream...")
      session.layouts.showTextWall("Starting stream...", { durationMs: 3000 })

      const streamOptions: ManagedStreamOptions = {
        quality: "1080p",
        enableWebRTC: true,
        restreamDestinations: [] // Can add custom endpoints here
      }

      const streamResult = await session.camera.startManagedStream(streamOptions)
      
      this.isStreamActive.set(userId, true)
      this.streamResults.set(userId, streamResult)
      this.streamStartTime.set(userId, new Date())

      session.logger.info(`Stream started: ${streamResult.streamId}`)
      session.layouts.showTextWall("Stream started!", { durationMs: 3000 })

      // Log stream URLs to file
      this.logStreamInfo(userId, streamResult)

      console.log("Stream URLs:")
      console.log(`HLS: ${streamResult.hlsUrl}`)
      console.log(`DASH: ${streamResult.dashUrl}`)
      if (streamResult.webrtcUrl) {
        console.log(`WebRTC: ${streamResult.webrtcUrl}`)
      }
      console.log(`Preview: ${streamResult.previewUrl}`)

      // Start frame extraction for backend processing
      this.startFrameExtraction(session, userId, streamResult)

    } catch (error) {
      session.logger.error(`Failed to start stream: ${error}`)
      session.layouts.showTextWall("Stream start failed", { durationMs: 3000 })
    }
  }

  /**
   * Stop managed RTMP stream
   */
  private async stopStream(session: AppSession, userId: string): Promise<void> {
    try {
      session.logger.info("Stopping managed RTMP stream...")
      session.layouts.showTextWall("Stopping stream...", { durationMs: 3000 })

      await session.camera.stopManagedStream()
      
      this.isStreamActive.set(userId, false)
      
      // Stop frame extraction
      this.stopFrameExtraction(userId)
      
      const startTime = this.streamStartTime.get(userId)
      const duration = startTime ? new Date().getTime() - startTime.getTime() : 0
      const durationMinutes = Math.round(duration / 60000)

      session.logger.info(`Stream stopped after ${durationMinutes} minutes`)
      session.layouts.showTextWall(`Stream stopped (${durationMinutes}m)`, { durationMs: 3000 })

      console.log(`Stream stopped after ${durationMinutes} minutes`)

    } catch (error) {
      session.logger.error(`Failed to stop stream: ${error}`)
      session.layouts.showTextWall("Stream stop failed", { durationMs: 3000 })
    }
  }

  /**
   * Show current stream information
   */
  private async showStreamInfo(session: AppSession, userId: string): Promise<void> {
    const isActive = this.isStreamActive.get(userId)
    const streamResult = this.streamResults.get(userId)

    if (!isActive || !streamResult) {
      session.layouts.showTextWall("No active stream", { durationMs: 3000 })
      return
    }

    const startTime = this.streamStartTime.get(userId)
    const duration = startTime ? new Date().getTime() - startTime.getTime() : 0
    const durationMinutes = Math.round(duration / 60000)

    session.layouts.showTextWall(`Stream: ${durationMinutes}m active`, { durationMs: 4000 })
    
    console.log("Current stream info:")
    console.log(`Stream ID: ${streamResult.streamId}`)
    console.log(`Duration: ${durationMinutes} minutes`)
    console.log(`HLS URL: ${streamResult.hlsUrl}`)
  }

  /**
   * Handle stream status updates
   */
  private handleStreamStatus(session: AppSession, userId: string, status: any): void {
    session.logger.info(`Stream status update: ${status.status}`)
    
    switch (status.status) {
      case 'starting':
        session.layouts.showTextWall("Stream starting...", { durationMs: 2000 })
        break
      case 'active':
        session.layouts.showTextWall("Stream is live!", { durationMs: 3000 })
        break
      case 'stopping':
        session.layouts.showTextWall("Stream stopping...", { durationMs: 2000 })
        break
      case 'stopped':
        session.layouts.showTextWall("Stream stopped", { durationMs: 2000 })
        this.isStreamActive.set(userId, false)
        break
      case 'error':
        session.layouts.showTextWall("Stream error!", { durationMs: 3000 })
        session.logger.error(`Stream error: ${status.error}`)
        break
    }
  }

  /**
   * Log stream information to file
   */
  private logStreamInfo(userId: string, streamResult: ManagedStreamResult): void {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      userId,
      streamId: streamResult.streamId,
      hlsUrl: streamResult.hlsUrl,
      dashUrl: streamResult.dashUrl,
      webrtcUrl: streamResult.webrtcUrl,
      previewUrl: streamResult.previewUrl,
      thumbnailUrl: streamResult.thumbnailUrl
    }

    const filename = `stream_${userId}_${timestamp.replace(/[:.]/g, '-')}.json`
    const filepath = join(STREAM_LOGS_DIR, filename)
    
    writeFileSync(filepath, JSON.stringify(logData, null, 2))
    console.log(`Stream info logged to: ${filepath}`)
  }

  /**
   * Start frame extraction from the stream for backend processing
   */
  private startFrameExtraction(session: AppSession, userId: string, streamResult: ManagedStreamResult): void {
    session.logger.info("Starting frame extraction for backend processing")
    
    // Wait for stream to be active before extracting frames
    setTimeout(() => {
      const extractFrame = async () => {
        try {
          // Send stream URL to backend for frame extraction
          await this.sendStreamInfoToBackend(userId, streamResult)
          
          // Note: The backend will handle actual frame extraction using ffmpeg
          session.logger.info("Sent stream info to backend for frame extraction")
          
        } catch (error) {
          session.logger.error(`Frame extraction failed: ${error}`)
        }
      }

      // Extract frames every 60 seconds (as per DETAILS.md for scene analysis)
      extractFrame() // First extraction immediately
      const interval = setInterval(extractFrame, 60000)
      this.frameExtractionIntervals.set(userId, interval)
      
    }, 10000) // Wait 10 seconds for stream to stabilize
  }

  /**
   * Stop frame extraction
   */
  private stopFrameExtraction(userId: string): void {
    const interval = this.frameExtractionIntervals.get(userId)
    if (interval) {
      clearInterval(interval)
      this.frameExtractionIntervals.delete(userId)
      console.log(`Stopped frame extraction for user ${userId}`)
    }
  }

  /**
   * Send stream information to backend for frame extraction and analysis
   */
  private async sendStreamInfoToBackend(userId: string, streamResult: ManagedStreamResult): Promise<void> {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    
    const payload = {
      userId,
      streamId: streamResult.streamId,
      hlsUrl: streamResult.hlsUrl,
      dashUrl: streamResult.dashUrl,
      webrtcUrl: streamResult.webrtcUrl,
      previewUrl: streamResult.previewUrl,
      timestamp: new Date().toISOString(),
      action: 'extract_frame_for_analysis'
    }

    try {
      const response = await fetch(`${backendUrl}/api/stream/frame-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Backend frame extraction response:', result)
      
    } catch (error) {
      console.error('Failed to send stream info to backend:', error)
      // Could fallback to local frame extraction here
    }
  }

  /**
   * Clean up user state on disconnect
   */
  private cleanupUserState(userId: string): void {
    this.stopFrameExtraction(userId)
    this.isStreamActive.delete(userId)
    this.streamResults.delete(userId)
    this.streamStartTime.delete(userId)
  }
}

// Create and start the app server
const server = new MyMentraOSApp({
  packageName: PACKAGE_NAME,
  apiKey: MENTRAOS_API_KEY,
  port: PORT,
})

server.start().catch(err => {
  console.error("Failed to start server:", err)
})