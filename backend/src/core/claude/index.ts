import axios from 'axios';

interface ClaudeVisionResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface MusicPromptResult {
  prompt: string;
  sceneDescription: string;
  confidence: number;
  generatedAt: string;
  processingTime: number;
}

export class ClaudeService {
  private apiKey: string;
  private baseURL: string = 'https://api.anthropic.com/v1/messages';

  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }
  }

  async generateMusicFromImage(imageBase64: string): Promise<MusicPromptResult> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Analyzing image with Claude Vision...');
      
      const response = await axios.post<ClaudeVisionResponse>(this.baseURL, {
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `Analyze this image and create a music prompt for Suno AI music generation.

Look at the environment and create a 15-second music prompt:

Format: "[style/genre], [mood], [tempo], [key instruments]"

Examples:
- Coffee shop → "smooth jazz, cozy, medium tempo, piano and light drums"
- Busy street → "upbeat pop, energetic, fast tempo, synths and bass"
- Library/study → "ambient classical, calm, slow tempo, soft piano and strings"
- Park/nature → "acoustic folk, peaceful, medium tempo, guitar and birds"
- Office → "minimal electronic, focused, medium tempo, soft synths"

Return ONLY the music prompt, no extra text.`
            }
          ]
        }]
      }, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });

      const rawPrompt = response.data.content[0].text.trim();
      const cleanPrompt = this.cleanMusicPrompt(rawPrompt);
      const processingTime = Date.now() - startTime;
      
      console.log(`🎵 Generated music prompt (${processingTime}ms):`, cleanPrompt);
      
      return {
        prompt: cleanPrompt,
        sceneDescription: 'Generated from image analysis',
        confidence: 0.85,
        generatedAt: new Date().toISOString(),
        processingTime
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('Claude API error:', error.response?.data || error.message);
      
      // Return fallback prompt
      return {
        prompt: this.getFallbackPrompt(),
        sceneDescription: 'Fallback - Claude analysis failed',
        confidence: 0.1,
        generatedAt: new Date().toISOString(),
        processingTime
      };
    }
  }

  private cleanMusicPrompt(rawPrompt: string): string {
    return rawPrompt
      .replace(/^["']|["']$/g, '')    // Remove surrounding quotes
      .replace(/\n/g, ' ')            // Remove newlines
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/,\s*15\s*seconds?/i, '') // Remove "15 seconds" if Claude added it
      .trim()
      .toLowerCase();
  }

  private getFallbackPrompt(): string {
    const fallbacks = [
      'ambient instrumental, calm, medium tempo, soft piano',
      'smooth jazz, relaxed, slow tempo, piano and light drums',
      'acoustic folk, peaceful, medium tempo, guitar and strings',
      'minimal electronic, focused, medium tempo, soft synths'
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Test method for development
  //async testWithSampleImage(): Promise<MusicPromptResult> {
    // This is a tiny 1x1 pixel base64 image for testing
   // const testImage = '/Users/zayyanzafaressani/Desktop/hackmit/hackmit/0ED18EC0-384D-463C-BF02-3EA0555CA274_1_105_c.jpeg';
    
   // return this.generateMusicFromImage(testImage);
 // }
}

// Export lazy-loaded instance
let _claudeService: ClaudeService | null = null;
export const claudeService = {
  get instance() {
    if (!_claudeService) {
      _claudeService = new ClaudeService();
    }
    return _claudeService;
  },
  generateMusicFromImage: (imageBase64: string) => claudeService.instance.generateMusicFromImage(imageBase64)
};