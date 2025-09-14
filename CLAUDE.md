# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Mentra, a smart glasses application that automatically generates contextual music based on the user's visual environment using AI. The system captures images from smart glasses, analyzes scenes using Claude Vision API, and generates appropriate background music in real-time using Suno API.

## Architecture

The project uses a monorepo with workspaces:
- **backend/**: Node.js/Express server with Socket.IO for WebSocket communication, AI orchestration
- **smart-glasses/**: MentraOS application using @mentra/sdk for glasses integration
- **mobile-app/**: Companion app (referenced but may not be implemented yet)
- **shared/**: Shared utilities and types

## Runtime & Tooling

**Use Bun instead of Node.js/npm for smart-glasses workspace:**
- `bun run <script>` instead of `npm run <script>`
- `bun install` instead of `npm install`
- `bun test` instead of `jest`
- `bun <file>` instead of `node <file>`
- Use Bun APIs: `Bun.serve()`, `bun:sqlite`, `Bun.redis`, built-in WebSocket
- Bun automatically loads .env files

**Backend workspace uses Bun (not Node.js/npm):**
- `bun run dev` for development with tsx watch
- `bun run build` for TypeScript compilation
- `bun run start` for production
- `bun install` instead of `npm install`
- Use Bun commands instead of npm commands

## Development Commands

### Root Level (Monorepo)
```bash
npm run dev                   # Start all services concurrently
npm run dev:backend          # Start backend only
npm run dev:glasses          # Start smart-glasses only
npm run dev:mobile           # Start mobile-app only
npm run build                # Build all workspaces
npm run clean                # Clean all workspaces
npm run install:all          # Install dependencies for all workspaces
```

### Backend (Uses Bun)
```bash
bun install                  # Install dependencies
bun run dev                  # Development with tsx watch
bun run build                # TypeScript compilation
bun run start                # Run built application
```

### Smart Glasses App (Uses Bun)
```bash
bun install                  # Install dependencies
bun run src/index.ts         # Run development
bun run dev                  # Development with --watch
```

### Backend (Uses Node.js/npm)
```bash
npm install                  # Install dependencies
npm run dev                  # Development with tsx watch
npm run build                # TypeScript compilation
npm run start                # Run built application
```

### Docker Services
```bash
npm run docker:up           # Start all services with Redis
npm run docker:down         # Stop Docker services
```

## Key Environment Variables

```bash
# Smart Glasses
MENTRAOS_API_KEY=            # Required for MentraOS SDK
PACKAGE_NAME=                # MentraOS app package identifier
BACKEND_URL=http://localhost:3001  # Backend server URL

# Backend
CLAUDE_API_KEY=              # Claude Vision & API access
SUNO_API_KEY=                # Music generation API
```

## Architecture Details

### Data Flow
1. Smart glasses capture images every ~5 seconds via MentraOS camera API
2. Backend receives images and analyzes multiple images with Claude Vision every ~60 seconds
3. Claude generates Suno-optimized prompts based on scene analysis
4. Suno API generates contextual music
5. Audio streams back to smart glasses via WebSocket

### WebSocket Communication
- Smart glasses ↔ Backend: Image upload, music streaming, status updates
- Uses Socket.IO for WebSocket handling
- Ports: Backend (3001), Smart Glasses (varies), Mobile (8080)

### AI Integration
- **Claude Vision API**: Multi-image scene analysis
- **Claude API**: Suno prompt optimization
- **Suno API**: Music generation using HackMIT-specific endpoints
- Redis caching for analysis results and recent images

## MentraOS Integration

The smart glasses app extends `AppServer` from `@mentra/sdk`:
- Uses `AppSession` for user interactions
- `session.layouts.showTextWall()` for display
- `session.camera.requestPhoto()` for image capture
- Environment-based configuration with `MENTRAOS_API_KEY`
- Package name configuration via `PACKAGE_NAME`

## Suno API Implementation

Backend includes complete Suno HackMIT API integration at `backend/src/core/suno/`:
- **Main API**: `index.ts` - Core Suno API methods
- **Generate Music**: `generateMusicWithTopic()`, `generateMusicWithTags()`
- **Track Status**: `getClip()`, `getClips()`, `waitForCompletion()`
- **HackMIT Endpoints**: Uses `https://studio-api.prod.suno.com/api/v2/external/hackmit`

### Suno API Usage
```typescript
import { sunoAPI } from './src/core/suno';

// Generate with topic
const clip = await sunoAPI.generateMusicWithTopic("peaceful morning", {
  tags: "acoustic, calm"
});

// Check completion
const completed = await sunoAPI.waitForCompletion(clip.id);
console.log(completed.audio_url);
```

## Testing & Quality

- Backend: Use `npm test` when implemented
- Smart glasses: Use `bun test` when implemented
- Suno API: Test files available in `backend/src/core/suno/test.ts`

## Smart Glasses Photo Capture

The smart glasses app implements automated photo capture:
- **Frequency**: Every 5 seconds
- **Format**: Medium size photos via `session.camera.requestPhoto({ size: "medium" })`
- **Backend Endpoint**: `POST /api/scene/analyze`
- **Controls**: Button press (short = toggle, long = single photo)
- **Error Handling**: Retry logic with exponential backoff

### Photo Upload Format
```typescript
{
  userId: string,
  timestamp: string,
  photo: {
    filename: string,
    size: number,
    mimeType: string,
    data: string  // base64 encoded
  },
  action: 'analyze_scene'
}
```

## Key Services Architecture

- **Image Processing**: MentraOS camera API for capture, base64 encoding for transmission
- **Caching**: Redis for recent images and analysis results
- **Database**: SQLite/PostgreSQL for user preferences and music history
- **Audio**: Suno API generates MP3 files, streaming to glasses
- **Real-time Communication**: Socket.IO WebSocket connections

## Important Implementation Notes

- **Bun vs Node.js**: Smart glasses uses Bun, backend uses Node.js
- **Environment Variables**: Different .env files for each workspace
- **Error Handling**: All async operations have proper try/catch and retry logic
- **Type Safety**: Full TypeScript support across all workspaces
- **API Keys**: Store securely in .env files, never commit to repository
- **MentraOS SDK**: Required for smart glasses functionality, handles low-level device integration