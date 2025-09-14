import { useState, useEffect, useRef } from 'react';

interface MusicData {
  musicUrl: string;
  imageUrl?: string;
  sceneDescription: string;
  prompt: string;
  title: string;
  makeInstrumental: boolean;
  clipId: string;
  imageId: string;
  processingTime: number;
  timestamp: string;
}

interface MusicGenerationState {
  currentMusic: MusicData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  sceneChanged: boolean;
}

interface UseMusicGenerationOptions {
  deviceId?: string;
  pollInterval?: number; // milliseconds
  backendUrl?: string;
  autoStart?: boolean;
}

// Helper function to get/create persistent deviceId
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('mentra-device-id');
  if (!deviceId) {
    deviceId = `frontend-${Date.now()}`;
    localStorage.setItem('mentra-device-id', deviceId);
    console.log('🆔 Created new device ID:', deviceId);
  } else {
    console.log('🆔 Using existing device ID:', deviceId);
  }
  return deviceId;
};

export const useMusicGeneration = (options: UseMusicGenerationOptions = {}) => {
  const {
    deviceId = getDeviceId(),
    pollInterval = 30000, // 30 seconds
    backendUrl = 'http://localhost:3001',
    autoStart = true
  } = options;

  const [state, setState] = useState<MusicGenerationState>({
    currentMusic: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    sceneChanged: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const isActiveRef = useRef(true);

  // Fetch latest music generation data
  const fetchMusicData = async (): Promise<void> => {
    if (!isActiveRef.current) return;

    try {
      setState(prev => ({ ...prev, error: null }));

      const response = await fetch(`${backendUrl}/api/music/latest/${deviceId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch music data: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.hasMusic) {
        // Check if this is new music (different timestamp)
        if (data.timestamp !== lastTimestampRef.current) {
          lastTimestampRef.current = data.timestamp;

          setState(prev => ({
            ...prev,
            currentMusic: {
              musicUrl: data.musicUrl,
              imageUrl: data.imageUrl,
              sceneDescription: data.sceneDescription,
              prompt: data.prompt,
              title: data.title,
              makeInstrumental: data.makeInstrumental,
              clipId: data.clipId,
              imageId: data.imageId,
              processingTime: data.processingTime,
              timestamp: data.timestamp
            },
            isLoading: false,
            lastUpdated: data.retrievedAt,
            sceneChanged: true
          }));

          console.log('🎵 Retrieved new music:', data.title);
        } else {
          // Same music, just update loading state
          setState(prev => ({
            ...prev,
            isLoading: false
          }));
        }
      } else {
        // No music found for this device
        setState(prev => ({
          ...prev,
          isLoading: false,
          sceneChanged: false
        }));
      }

    } catch (error) {
      console.error('Failed to fetch music data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch music data'
      }));
    }
  };

  // Trigger music generation (simulate smart glasses photo)
  const triggerMusicGeneration = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Use a test image for demo purposes (100x100 solid color JPEG)
      const testImageBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD//gA+Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBkZWZhdWx0IHF1YWxpdHkK/9sAQwAIBgYHBgUIBwcHCQkICgwUDQwLCwwZEhMPFB0aHx4dGhwcICQuJyAiLCMcHCg3KSwwMTQ0NB8nOT04MjwuMzQy/9sAQwEJCQkMCwwYDQ0YMiEcITIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8AAEQgAZABkAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBkQgUobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9k=';

      const response = await fetch(`${backendUrl}/api/scene/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: testImageBase64,
          deviceId,
          timestamp: new Date().toISOString(),
          mimeType: 'image/jpeg',
          userId: 'frontend-user'
        }),
      });

      if (!response.ok) {
        throw new Error(`Music generation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.sceneChanged && result.musicUrl) {
        // We got new music!
        setState(prev => ({
          ...prev,
          currentMusic: {
            musicUrl: result.musicUrl,
            imageUrl: result.imageUrl,
            sceneDescription: result.sceneDescription || 'AI-generated music',
            prompt: result.prompt || '',
            title: result.title || 'Generated Music',
            makeInstrumental: result.makeInstrumental || false,
            clipId: result.clipId || '',
            imageId: result.imageId || '',
            processingTime: result.processingTime || 0,
            timestamp: result.timestamp
          },
          isLoading: false,
          lastUpdated: new Date().toISOString(),
          sceneChanged: true,
          error: null
        }));
      } else if (result.success && !result.sceneChanged) {
        // Scene unchanged, no new music
        setState(prev => ({
          ...prev,
          isLoading: false,
          sceneChanged: false,
          error: null
        }));
      } else {
        throw new Error(result.error || 'Music generation failed');
      }

    } catch (error) {
      console.error('Music generation failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Music generation failed'
      }));
    }
  };

  // Start polling
  const startPolling = () => {
    if (intervalRef.current) return; // Already polling

    console.log(`🎵 Starting music generation polling every ${pollInterval}ms for device: ${deviceId}`);

    // Initial fetch
    fetchMusicData();

    // Set up interval
    intervalRef.current = setInterval(fetchMusicData, pollInterval);
    isActiveRef.current = true;
  };

  // Stop polling
  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = false;
    console.log('⏹️ Stopped music generation polling');
  };

  // Manual refresh
  const refresh = () => {
    console.log('🔄 Manual refresh triggered');
    return triggerMusicGeneration();
  };

  // Set up auto-start and cleanup
  useEffect(() => {
    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, pollInterval, deviceId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    // State
    currentMusic: state.currentMusic,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    sceneChanged: state.sceneChanged,

    // Actions
    startPolling,
    stopPolling,
    refresh,
    triggerMusicGeneration,

    // Info
    deviceId,
    isPolling: !!intervalRef.current
  };
};