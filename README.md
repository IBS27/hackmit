# 🎵 Atmosphere

<img width="958" height="532" alt="project-pr-Y6YUvRdWucfUGcS" src="https://github.com/user-attachments/assets/d5d5f406-19b3-4f44-8ebb-291c8fab1c96" />

**Atmosphere automatically creates the perfect soundtrack for your life.** Put on smart glasses and walk around — the system sees what you see and generates music that matches your environment in real time.

Walk into a coffee shop and hear smooth jazz. Step outside into a busy street, and energetic beats kick in. Enter a quiet library, and ambient study music begins. Atmosphere can capture and create custom music for any moment.

## ✨ Features

- **🔍 Automatic Scene Detection**: AI-powered visual analysis of your environment every ~60 seconds
- **🎼 Contextual Music Generation**: Custom music tailored to your current scene and activity
- **🔄 Seamless Audio Streaming**: Continuous background music with smooth transitions
- **📱 Multi-device Sync**: Smart glasses and companion app stay perfectly synchronized
- **🎧 Hands-free Operation**: Fully automatic music generation with no manual intervention
- **📊 Real-time Monitoring**: Visual status indicators and companion app dashboard
- **🎵 Music History**: Track and replay all previously generated music

## 🏗️ Architecture

### System Components
- **Smart Glasses Client**: Captures images, plays audio, minimal UI
- **Backend Server**: Node.js/Express server handling image processing and AI orchestration
- **Companion App**: React webview application running on Mentra OS
- **AI Services**: Claude Vision API for scene analysis, Claude API for prompt generation, Suno API for music generation

### Data Flow
```
Smart Glasses → Images via WebSocket → Backend Server
Backend Server → Claude Vision (every ~60s) → Scene Analysis
Backend Server → Claude API → Suno-optimized prompt
Backend Server → Suno API → Generated music
Backend Server → Audio stream → Smart Glasses
Backend Server → Status updates → Companion App
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Redis server
- API keys for Claude (Anthropic) and Suno

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd atmosphere
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Start Redis**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine

   # Or using Docker Compose
   npm run docker:up
   ```

5. **Run the development servers**
   ```bash
   # Start all services
   npm run dev

   # Or start individually
   npm run dev:backend    # Backend server
   npm run dev:glasses    # Smart glasses client
   npm run dev:mobile     # Companion app
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# AI API Keys
ANTHROPIC_API_KEY=your_claude_api_key
SUNO_API_KEY=your_suno_api_key

# Application Settings
ANALYSIS_INTERVAL=60000          # ms between Claude Vision calls
IMAGE_CAPTURE_INTERVAL=3000      # ms between image captures
MAX_STORED_IMAGES=20             # number of recent images to keep
SCENE_CHANGE_THRESHOLD=0.7       # similarity threshold for scene changes

# Server Configuration
PORT=3000
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:./atmosphere.db

# Smart Glasses Settings
DEVICE_ID=atmosphere_glasses_001
AUDIO_QUALITY=high
WEBRTC_SERVERS=["stun:stun.l.google.com:19302"]
```

## 📁 Project Structure

```
atmosphere/
├── backend/                     # Node.js backend server
│   ├── src/
│   │   ├── app.ts              # Server entry point
│   │   ├── routes/             # REST API endpoints
│   │   ├── sockets/            # WebSocket handlers
│   │   ├── core/
│   │   │   ├── claude/         # Claude API integration
│   │   │   ├── suno/           # Suno API integration
│   │   │   └── cerebras/       # Cerebras API integration
│   │   └── middleware/         # Express middleware
│   └── package.json
├── smart-glasses/              # Smart glasses client app
│   ├── src/
│   │   ├── main.ts             # Glasses app entry point
│   │   ├── services/
│   │   │   ├── camera.ts       # Image capture service
│   │   │   ├── websocket.ts    # Backend communication
│   │   │   └── audio.ts        # Music playback service
│   │   └── components/         # UI components
│   ├── index.html
│   └── package.json
├── shared/                     # Shared TypeScript types
│   └── src/types.ts
├── docker-compose.yml          # Docker services configuration
└── package.json               # Root package with workspaces
```

## 📡 API Reference

### WebSocket Events (Smart Glasses ↔ Backend)

**Client to Server:**
```typescript
interface ImageData {
  image: Uint8Array;
  timestamp: string;
  deviceId: string;
}
```

**Server to Client:**
```typescript
interface MusicGenerated {
  audioUrl: string;
  title: string;
  prompt: string;
  sceneDescription: string;
  timestamp: string;
}

interface SceneAnalysis {
  description: string;
  mood: string;
  activity: string;
  location: string;
  confidence: number;
}
```

### REST API Endpoints

```
GET  /api/status              # System health and status
GET  /api/music/history       # Recent generated music
POST /api/settings            # Update user preferences
GET  /api/analysis/current    # Latest scene analysis
POST /api/analysis/manual     # Trigger manual analysis
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev              # Start all development servers
npm run dev:backend      # Backend server only
npm run dev:glasses      # Smart glasses client only
npm run dev:mobile       # Companion app only
npm run build            # Build all workspaces
npm run clean            # Clean all workspaces
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
```

### Tech Stack

**Backend:**
- Express.js with Socket.IO for WebSocket communication
- Claude Vision API for multi-image scene analysis
- Claude API for Suno prompt generation
- Suno API for music generation
- Redis for caching and session storage
- Sharp for image processing

**Smart Glasses Client:**
- HTML5/JavaScript web-based application
- WebRTC/MediaDevices for image capture
- Socket.IO client for real-time communication
- Web Audio API for music playback

**Companion App:**
- React application for Mentra OS webview
- Real-time WebSocket updates
- Music history and user preferences
- Status monitoring dashboard

## ⚡ Performance Requirements

- **Image capture**: < 500ms per image
- **Scene analysis**: < 5s for Claude Vision call
- **Music generation**: < 30s for Suno API call
- **Audio streaming**: < 200ms latency
- **Companion app**: < 100ms UI response time

## 🔐 Security

- Secure WebSocket connections (WSS)
- Input validation for all image data
- Sanitized user inputs in companion app
- Environment-based API key storage
- Proper CORS policies
- Security event logging

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run performance tests
npm run test:performance
```

## 🚀 Deployment

The project includes Docker configuration for easy deployment:

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Requirements
- Docker & Docker Compose
- SSL certificates for HTTPS/WSS
- Redis server
- Environment variables configured

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for HackMIT 2024
- Powered by Claude (Anthropic), Suno AI, and Mentra OS
- Special thanks to the smart glasses community

---

**🌟 Star this repo if you find it helpful!**