export interface SunoGenerateRequest {
  topic?: string;
  tags?: string;
  prompt?: string;
  negative_tags?: string;
  make_instrumental?: boolean;
  cover_clip_id?: string;
}

export interface SunoClip {
  id: string;
  request_id: string;
  created_at: string;
  status: 'submitted' | 'queued' | 'generating' | 'complete' | 'error';
  title: string;
  metadata: {
    tags: string;
    prompt: string;
    gpt_description_prompt: string;
    type: string;
  };
  audio_url?: string;
  video_url?: string;
  image_url?: string;
  error_message?: string;
}


class SunoHackMITAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = 'https://studio-api.prod.suno.com/api/v2/external/hackmit';
    this.apiKey = process.env.SUNO_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('SUNO_API_KEY environment variable is required');
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json() as T;
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Suno API request failed: ${error.message}`);
      }
      throw new Error('Suno API request failed: Unknown error');
    }
  }

  async generateMusic(request: SunoGenerateRequest): Promise<SunoClip> {
    if (request.topic && request.topic.length > 500) {
      throw new Error('Topic must be 500 characters or less');
    }
    if (request.tags && request.tags.length > 100) {
      throw new Error('Tags must be 100 characters or less');
    }

    return this.makeRequest<SunoClip>('/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateMusicWithTopic(topic: string, options?: Omit<SunoGenerateRequest, 'topic'>): Promise<SunoClip> {
    return this.generateMusic({
      topic,
      ...options,
    });
  }

  async generateMusicWithTags(tags: string | string[], topic?: string, options?: Omit<SunoGenerateRequest, 'tags' | 'topic'>): Promise<SunoClip> {
    const tagsString = Array.isArray(tags) ? tags.join(', ') : tags;

    return this.generateMusic({
      tags: tagsString,
      topic,
      ...options,
    });
  }

  async getClips(clipIds: string[]): Promise<SunoClip[]> {
    if (!clipIds || clipIds.length === 0) {
      throw new Error('Clip IDs are required for /clips endpoint');
    }

    const idsParam = clipIds.join(',');
    const endpoint = `/clips?ids=${encodeURIComponent(idsParam)}`;

    return this.makeRequest<SunoClip[]>(endpoint, {
      method: 'GET',
    });
  }

  async getClip(clipId: string): Promise<SunoClip> {
    const clips = await this.getClips([clipId]);
    const clip = clips.find(c => c.id === clipId);

    if (!clip) {
      throw new Error(`Clip with ID ${clipId} not found`);
    }

    return clip;
  }

  async waitForCompletion(clipId: string, timeoutMs: number = 120000, pollIntervalMs: number = 2000): Promise<SunoClip> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const clip = await this.getClip(clipId);

      if (clip.status === 'complete') {
        return clip;
      } else if (clip.status === 'error') {
        throw new Error(`Generation failed: ${clip.error_message || 'Unknown error'}`);
      }

      console.log(`Clip ${clipId} status: ${clip.status}`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timeout waiting for clip ${clipId} to complete`);
  }

  async generateAndWait(request: SunoGenerateRequest, timeoutMs?: number): Promise<SunoClip> {
    const clip = await this.generateMusic(request);
    return this.waitForCompletion(clip.id, timeoutMs);
  }
}

// Export lazy-loaded instance
let _sunoAPI: SunoHackMITAPI | null = null;
export const sunoAPI = {
  get instance() {
    if (!_sunoAPI) {
      _sunoAPI = new SunoHackMITAPI();
    }
    return _sunoAPI;
  },
  generateMusic: (request: SunoGenerateRequest) => sunoAPI.instance.generateMusic(request),
  generateMusicWithTopic: (topic: string, options?: Omit<SunoGenerateRequest, 'topic'>) => sunoAPI.instance.generateMusicWithTopic(topic, options),
  generateMusicWithTags: (tags: string | string[], topic?: string, options?: Omit<SunoGenerateRequest, 'tags' | 'topic'>) => sunoAPI.instance.generateMusicWithTags(tags, topic, options),
  generateAndWait: (request: SunoGenerateRequest, timeoutMs?: number) => sunoAPI.instance.generateAndWait(request, timeoutMs)
};
export { SunoHackMITAPI };
export default SunoHackMITAPI;