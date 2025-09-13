# Mentra Smart Glasses Music Generation - Project Details

## Project Overview
Mentra is a smart glasses application that automatically generates contextual music based on the user's visual environment. The system captures images from smart glasses, analyzes scenes using AI, and generates appropriate background music in real-time.

## Core Workflow
1. **Image Capture**: Smart glasses capture images every few seconds
2. **Scene Analysis**: Claude Vision API analyzes multiple recent images every ~60 seconds
3. **Music Generation**: Claude generates optimized Suno API prompts based on scene analysis
4. **Audio Playback**: Generated music streams to smart glasses speakers
5. **User Interface**: React webview companion app on Mentra OS for monitoring and control

## Architecture

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

## Technical Stack

### Backend (Node.js)
- **Framework**: Express.js with Socket.IO for WebSocket communication
- **AI Integration**: 
  - Claude Vision API for multi-image scene analysis
  - Claude API for Suno prompt generation
  - Suno API for music generation
- **Image Processing**: Sharp for basic image optimization and buffering
- **Caching**: Redis for storing recent images and analysis results
- **Database**: SQLite/PostgreSQL for user preferences and music history

### Smart Glasses Client
- **Platform**: Web-based application (HTML5/JavaScript)
- **Camera API**: WebRTC/MediaDevices for image capture
- **Communication**: Socket.IO client for real-time backend communication
- **Audio**: Web Audio API for music playback
- **Storage**: LocalStorage for device settings and temporary data

### Companion App
- **Platform**: React application running as webview on Mentra OS
- **UI Framework**: React with modern hooks and context
- **State Management**: React Context or Zustand for state management
- **Communication**: WebSocket connection to backend server
- **Features**: 
  - Real-time status monitoring
  - Music playback history
  - User preferences and settings
  - Manual scene analysis triggers

## Key Features

### Core Functionality
- **Automatic Scene Detection**: Periodic analysis of visual environment
- **Contextual Music Generation**: AI-generated music matching current scene/activity
- **Seamless Audio Streaming**: Continuous background music with smooth transitions
- **Multi-device Synchronization**: Smart glasses and companion app stay in sync

### User Experience
- **Hands-free Operation**: Fully automatic music generation
- **Visual Feedback**: Status indicators on smart glasses display
- **Manual Controls**: Override and preference settings via companion app
- **Music History**: Track and replay previously generated music

## Configuration

### Environment Variables
```bash
# AI API Keys
ANTHROPIC_API_KEY=your_claude_api_key
SUNO_API_KEY=your_suno_api_key

# Application Settings
ANALYSIS_INTERVAL=60000  # ms between Claude Vision calls
IMAGE_CAPTURE_INTERVAL=3000  # ms between image captures
MAX_STORED_IMAGES=20  # number of recent images to keep
SCENE_CHANGE_THRESHOLD=0.7  # similarity threshold for scene changes

# Server Configuration
PORT=3000
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:./mentra.db

# Smart Glasses Settings
DEVICE_ID=mentra_glasses_001
AUDIO_QUALITY=high
WEBRTC_SERVERS=["stun:stun.l.google.com:19302"]
```

### File Structure
```
mentra-mvp/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── routes/               # REST API endpoints
│   │   ├── sockets/              # WebSocket handlers
│   │   ├── core/
│   │   │   ├── claude/           # Claude API integration
│   │   │   └── suno/             # Suno API integration
│   │   └── middleware/           # Express middleware
│   └── package.json
├── smart-glasses/
│   ├── src/
│   │   ├── main.ts               # Glasses app entry point
│   │   ├── services/
│   │   │   ├── camera.ts         # Image capture service
│   │   │   ├── websocket.ts      # Backend communication
│   │   │   └── audio.ts          # Music playback service
│   │   └── utils/
│   ├── index.html
│   └── package.json
└── companion-app/
    ├── src/
    │   ├── App.tsx               # Main React component
    │   ├── components/           # React components
    │   │   ├── Dashboard.tsx     # Main dashboard
    │   │   ├── MusicHistory.tsx  # Generated music list
    │   │   └── Settings.tsx      # User preferences
    │   └── services/
    │       └── websocket.ts      # Backend communication
    ├── public/
    └── package.json
```

## API Specifications

### WebSocket Events (Smart Glasses ↔ Backend)
```typescript
// Client to Server
interface ImageData {
  image: Uint8Array;
  timestamp: string;
  deviceId: string;
}

// Server to Client
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
```typescript
GET /api/status              # System health and status
GET /api/music/history       # Recent generated music
POST /api/settings          # Update user preferences
GET /api/analysis/current   # Latest scene analysis
POST /api/analysis/manual   # Trigger manual analysis
```

## Development Guidelines

### Smart Glasses Client
- Keep UI minimal and non-intrusive
- Optimize for battery life (efficient image capture)
- Handle network disconnections gracefully
- Cache audio for offline playback when possible

### Backend Server
- Use async/await for all AI API calls
- Implement proper error handling and retries
- Cache Claude Vision results to avoid redundant API calls
- Rate limit API calls to stay within service limits

### Companion App
- Design for Mentra OS webview constraints
- Implement real-time updates without overwhelming the UI
- Provide clear feedback for all user actions
- Support both portrait and landscape orientations

## Security Considerations
- Secure WebSocket connections (WSS)
- Validate all image data before processing
- Sanitize user inputs in companion app
- Store API keys securely (environment variables)
- Implement proper CORS policies
- Log security events for monitoring

## Performance Requirements
- Image capture: < 500ms per image
- Scene analysis: < 5s for Claude Vision call
- Music generation: < 30s for Suno API call
- Audio streaming: < 200ms latency
- Companion app: < 100ms UI response time

## Testing Strategy
- Unit tests for core business logic
- Integration tests for AI API calls
- WebSocket communication tests
- End-to-end tests for complete workflow
- Performance tests for image processing pipeline
- User acceptance tests with actual smart glasses

## Deployment
- Containerized backend with Docker
- Redis for caching and session storage
- SSL certificates for HTTPS/WSS connections
- Environment-based configuration
- Health checks and monitoring
- Automated backup for user data and music history
