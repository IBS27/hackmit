import sharp from 'sharp';
import { createHash } from 'crypto';

export interface ImageMetadata {
  id: string;
  deviceId: string;
  userId?: string;
  timestamp: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  hash: string;
}

export interface BufferedImage {
  metadata: ImageMetadata;
  buffer: Buffer;
  base64?: string;
}

export interface ProcessingOptions {
  resize?: { width: number; height: number };
  compress?: boolean;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export class ImageBufferService {
  private buffer: Map<string, BufferedImage> = new Map();
  private maxBufferSize: number;
  private compressionQuality: number;

  constructor(
    maxBufferSize: number = parseInt(process.env.MAX_IMAGE_BUFFER_SIZE || '20'),
    compressionQuality: number = parseInt(process.env.IMAGE_COMPRESSION_QUALITY || '80')
  ) {
    this.maxBufferSize = maxBufferSize;
    this.compressionQuality = compressionQuality;
  }

  /**
   * Add image to buffer with automatic cleanup
   */
  async addImage(
    imageBuffer: Buffer,
    deviceId: string,
    mimeType: string,
    userId?: string,
    options?: ProcessingOptions
  ): Promise<BufferedImage> {
    try {
      // Generate unique ID and hash
      const timestamp = new Date().toISOString();
      const hash = this.generateImageHash(imageBuffer);
      const id = `${deviceId}_${timestamp}_${hash.substring(0, 8)}`;

      // Process image if options provided
      let processedBuffer = imageBuffer;
      let processedMimeType = mimeType;

      if (options) {
        const result = await this.processImage(imageBuffer, options);
        processedBuffer = result.buffer;
        processedMimeType = result.mimeType;
      }

      // Get image dimensions
      const metadata = await sharp(processedBuffer).metadata();

      const bufferedImage: BufferedImage = {
        metadata: {
          id,
          deviceId,
          userId,
          timestamp,
          mimeType: processedMimeType,
          size: processedBuffer.length,
          width: metadata.width,
          height: metadata.height,
          hash
        },
        buffer: processedBuffer,
        base64: processedBuffer.toString('base64')
      };

      // Add to buffer and manage size
      this.buffer.set(id, bufferedImage);
      this.maintainBufferSize();

      console.log(`📸 Added image to buffer: ${id} (${processedBuffer.length} bytes)`);
      return bufferedImage;

    } catch (error) {
      console.error('Failed to add image to buffer:', error);
      throw new Error(`Image buffer processing failed: ${error}`);
    }
  }

  /**
   * Get image by ID
   */
  getImage(id: string): BufferedImage | undefined {
    return this.buffer.get(id);
  }

  /**
   * Get recent images for a device
   */
  getRecentImages(deviceId: string, limit: number = 5): BufferedImage[] {
    return Array.from(this.buffer.values())
      .filter(img => img.metadata.deviceId === deviceId)
      .sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get all images for processing
   */
  getAllImages(): BufferedImage[] {
    return Array.from(this.buffer.values())
      .sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime());
  }

  /**
   * Check if scene has changed significantly
   */
  async detectSceneChange(deviceId: string, threshold: number = 0.3): Promise<boolean> {
    const recent = this.getRecentImages(deviceId, 2);

    if (recent.length < 2) {
      return true; // First image or not enough history
    }

    try {
      // Simple comparison using image histograms
      const [current, previous] = recent;
      const currentHist = await this.getImageHistogram(current.buffer);
      const previousHist = await this.getImageHistogram(previous.buffer);

      const similarity = this.compareHistograms(currentHist, previousHist);
      const changed = similarity < (1 - threshold);

      console.log(`🔍 Scene change detection: ${similarity.toFixed(3)} similarity, changed: ${changed}`);
      return changed;

    } catch (error) {
      console.error('Scene change detection failed:', error);
      return true; // Assume changed if detection fails
    }
  }

  /**
   * Process image with given options
   */
  private async processImage(buffer: Buffer, options: ProcessingOptions): Promise<{ buffer: Buffer; mimeType: string }> {
    let pipeline = sharp(buffer);

    // Resize if requested
    if (options.resize) {
      pipeline = pipeline.resize(options.resize.width, options.resize.height, {
        fit: 'cover',
        position: 'center'
      });
    }

    // Format conversion and compression
    const format = options.format || 'jpeg';
    const quality = options.quality || this.compressionQuality;

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: Math.round(quality / 10) });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
    }

    const processedBuffer = await pipeline.toBuffer();
    const mimeType = `image/${format}`;

    return { buffer: processedBuffer, mimeType };
  }

  /**
   * Generate hash for image deduplication
   */
  private generateImageHash(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Get image histogram for comparison
   */
  private async getImageHistogram(buffer: Buffer): Promise<number[]> {
    const { data } = await sharp(buffer)
      .resize(64, 64) // Small size for fast comparison
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Simple histogram - could be enhanced with more sophisticated methods
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i++) {
      histogram[data[i]]++;
    }

    return histogram;
  }

  /**
   * Compare two histograms for similarity
   */
  private compareHistograms(hist1: number[], hist2: number[]): number {
    let intersection = 0;
    let union = 0;

    for (let i = 0; i < hist1.length; i++) {
      intersection += Math.min(hist1[i], hist2[i]);
      union += Math.max(hist1[i], hist2[i]);
    }

    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Maintain buffer size by removing oldest images
   */
  private maintainBufferSize(): void {
    if (this.buffer.size <= this.maxBufferSize) {
      return;
    }

    const sortedImages = Array.from(this.buffer.entries())
      .sort(([, a], [, b]) =>
        new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
      );

    // Remove oldest images
    const toRemove = sortedImages.slice(0, this.buffer.size - this.maxBufferSize);
    for (const [id] of toRemove) {
      this.buffer.delete(id);
      console.log(`🗑️  Removed old image from buffer: ${id}`);
    }
  }

  /**
   * Clear buffer for a specific device
   */
  clearDevice(deviceId: string): void {
    const toDelete = Array.from(this.buffer.keys())
      .filter(id => this.buffer.get(id)?.metadata.deviceId === deviceId);

    toDelete.forEach(id => this.buffer.delete(id));
    console.log(`🧹 Cleared ${toDelete.length} images for device: ${deviceId}`);
  }

  /**
   * Get buffer statistics
   */
  getStats(): {
    totalImages: number;
    totalSize: number;
    deviceCounts: Record<string, number>;
    oldestImage?: string;
    newestImage?: string;
  } {
    const images = Array.from(this.buffer.values());
    const totalSize = images.reduce((sum, img) => sum + img.metadata.size, 0);

    const deviceCounts: Record<string, number> = {};
    images.forEach(img => {
      deviceCounts[img.metadata.deviceId] = (deviceCounts[img.metadata.deviceId] || 0) + 1;
    });

    const sortedByTime = images.sort((a, b) =>
      new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
    );

    return {
      totalImages: images.length,
      totalSize,
      deviceCounts,
      oldestImage: sortedByTime[0]?.metadata.timestamp,
      newestImage: sortedByTime[sortedByTime.length - 1]?.metadata.timestamp
    };
  }
}

// Export singleton instance
export const imageBufferService = new ImageBufferService();