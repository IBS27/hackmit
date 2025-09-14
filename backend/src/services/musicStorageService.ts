export interface StoredMusicData {
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
  deviceId: string;
  userId?: string;
}

export class MusicStorageService {
  private musicCache: Map<string, StoredMusicData> = new Map();
  private maxCacheSize: number;

  constructor(maxCacheSize: number = 100) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Store music data for a device
   */
  storeMusic(deviceId: string, musicData: Omit<StoredMusicData, 'deviceId'>): void {
    const dataWithDevice: StoredMusicData = {
      ...musicData,
      deviceId
    };

    this.musicCache.set(deviceId, dataWithDevice);
    this.maintainCacheSize();

    console.log(`🎵 Stored music data for device: ${deviceId} (title: "${musicData.title}")`);
  }

  /**
   * Get the latest music for a device
   */
  getLatestMusic(deviceId: string): StoredMusicData | null {
    const music = this.musicCache.get(deviceId);
    if (music) {
      console.log(`🎶 Retrieved music for device: ${deviceId} (title: "${music.title}")`);
      return music;
    } else {
      console.log(`📭 No music found for device: ${deviceId}`);
      return null;
    }
  }

  /**
   * Check if device has any stored music
   */
  hasMusic(deviceId: string): boolean {
    return this.musicCache.has(deviceId);
  }

  /**
   * Get all stored music (for debugging/admin)
   */
  getAllMusic(): StoredMusicData[] {
    return Array.from(this.musicCache.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Clear music for a specific device
   */
  clearDevice(deviceId: string): void {
    if (this.musicCache.has(deviceId)) {
      this.musicCache.delete(deviceId);
      console.log(`🗑️  Cleared music data for device: ${deviceId}`);
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    totalDevices: number;
    totalMusic: number;
    devices: string[];
    oldestMusic?: string;
    newestMusic?: string;
  } {
    const devices = Array.from(this.musicCache.keys());
    const music = Array.from(this.musicCache.values());

    const sortedByTime = music.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      totalDevices: devices.length,
      totalMusic: music.length,
      devices,
      oldestMusic: sortedByTime[0]?.timestamp,
      newestMusic: sortedByTime[sortedByTime.length - 1]?.timestamp
    };
  }

  /**
   * Maintain cache size by removing oldest entries
   */
  private maintainCacheSize(): void {
    if (this.musicCache.size <= this.maxCacheSize) {
      return;
    }

    const sortedEntries = Array.from(this.musicCache.entries())
      .sort(([, a], [, b]) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    // Remove oldest entries
    const toRemove = sortedEntries.slice(0, this.musicCache.size - this.maxCacheSize);
    for (const [deviceId] of toRemove) {
      this.musicCache.delete(deviceId);
      console.log(`🧹 Removed old music data for device: ${deviceId}`);
    }
  }
}

// Export singleton instance
export const musicStorageService = new MusicStorageService();