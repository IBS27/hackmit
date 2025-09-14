import { AppServer, AppSession } from "@mentra/sdk";

// Load configuration from environment variables
const PACKAGE_NAME =
  process.env.PACKAGE_NAME || "com.example.myfirstmentraosapp";
const PORT = parseInt(process.env.PORT || "3000");
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY;

if (!MENTRAOS_API_KEY) {
  console.error("MENTRAOS_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * MyMentraOSApp - A simple MentraOS application that displays "Hello, World!"
 * Extends AppServer to handle sessions and user interactions
 */
class MyMentraOSApp extends AppServer {
  /**
   * Handle new session connections
   * @param session - The app session instance
   * @param sessionId - Unique identifier for this session
   * @param userId - The user ID for this session
   */
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    session.logger.info(`New session: ${sessionId} for user ${userId}`);

    this.photoCaptureLoop(session, userId)

    // Log when the session is disconnected
    session.events.onDisconnected(() => {
      session.logger.info(`Session ${sessionId} disconnected.`);
    });
  }

  protected async photoCaptureLoop(session: AppSession, userId: string): Promise<void> {
    try {
      const photo = await session.camera.requestPhoto();
      await this.uploadPhotoToAPI(photo.buffer, photo.mimeType);
      session.logger.info('looped')
      setTimeout(() => this.photoCaptureLoop(session, userId), 5000);
    } catch (error) {
      console.error("Failed to capture photo:", error);
    }
  }

  private async uploadPhotoToAPI(buffer: Buffer, mimeType: string): Promise<void> {
    // TODO: Implement photo upload to API
  }
}

// Create and start the app server
const server = new MyMentraOSApp({
  packageName: PACKAGE_NAME,
  apiKey: MENTRAOS_API_KEY,
  port: PORT,
});

server.start().catch((err) => {
  console.error("Failed to start server:", err);
});
