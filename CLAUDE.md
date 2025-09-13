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

**Use Bun instead of Node.js/npm for all operations:**
- `bun run <script>` instead of `npm run <script>`
- `bun install` instead of `npm install`
- `bun test` instead of `jest`
- `bun <file>` instead of `node <file>`
- Use Bun APIs: `Bun.serve()`, `bun:sqlite`, `Bun.redis`, built-in WebSocket
- Bun automatically loads .env files

## Development Commands

### Root Level (Monorepo)
```bash
bun run dev                    # Start all services concurrently
bun run dev:backend           # Start backend only
bun run dev:glasses           # Start smart-glasses only
bun run dev:mobile            # Start mobile-app only
bun run build                 # Build all workspaces
bun run clean                 # Clean all workspaces
bun install --workspaces      # Install dependencies for all workspaces
```

### Smart Glasses App
```bash
bun run build                 # TypeScript compilation
bun run start                 # Run built application
bun run dev                   # Development with --watch
```

### Docker Services
```bash
bun run docker:up            # Start all services with Redis
bun run docker:down          # Stop Docker services
```

## Key Environment Variables

```bash
MENTRAOS_API_KEY=             # Required for MentraOS SDK
ANTHROPIC_API_KEY=            # Claude Vision & API access
SUNO_API_KEY=                 # Music generation API
PACKAGE_NAME=                 # MentraOS app package identifier
```

## Architecture Details

### Data Flow
1. Smart glasses capture images every ~3 seconds
2. Backend analyzes multiple images with Claude Vision every ~60 seconds
3. Claude generates Suno-optimized prompts based on scene analysis
4. Suno API generates contextual music
5. Audio streams back to smart glasses via WebSocket

### WebSocket Communication
- Smart glasses ↔ Backend: Image upload, music streaming, status updates
- Uses Socket.IO for WebSocket handling
- Ports: Backend (3001), WebSocket (3002), Smart Glasses (5173), Mobile (8080)

### AI Integration
- **Claude Vision API**: Multi-image scene analysis
- **Claude API**: Suno prompt optimization
- **Suno API**: Music generation
- Redis caching for analysis results and recent images

## MentraOS Integration

The smart glasses app extends `AppServer` from `@mentra/sdk`:
- Uses `AppSession` for user interactions
- `session.layouts.showTextWall()` for display
- Environment-based configuration with `MENTRAOS_API_KEY`
- Package name configuration via `PACKAGE_NAME`

## Testing & Quality

No specific test commands found in package.json files. Use `bun test` when implementing tests.

## Key Services Architecture

- **Image Processing**: Sharp for optimization, buffer management
- **Caching**: Redis for recent images and analysis results  
- **Database**: SQLite/PostgreSQL for user preferences and music history
- **Audio**: Web Audio API for music playback on glasses
- **Real-time Communication**: Socket.IO WebSocket connections