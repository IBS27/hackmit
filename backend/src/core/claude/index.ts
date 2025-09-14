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
  makeInstrumental: boolean;
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
        max_tokens: 250,
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

Your task:
1. Analyze the scene/environment in the image
2. Create appropriate music prompt for the context
3. Decide whether lyrics or instrumental music would be better

INSTRUMENTAL vs LYRICS DECISION:
- Use INSTRUMENTAL for: work/study environments, libraries, offices, meditation spaces, nature scenes, peaceful settings, background ambiance
- Use LYRICS for: social settings, cafes, restaurants, busy streets, entertainment venues, exercise/workout spaces, emotional/dramatic scenes

Format your response as JSON:
{
  "prompt": "[style/genre], [mood], [tempo], [key instruments]",
  "makeInstrumental": true/false,
  "sceneDescription": "brief description of what you see"
}

Examples:
- Coffee shop → {"prompt": "smooth jazz, cozy, medium tempo, piano and light drums", "makeInstrumental": false, "sceneDescription": "social coffee shop setting"}
- Library/study → {"prompt": "ambient classical, calm, slow tempo, soft piano and strings", "makeInstrumental": true, "sceneDescription": "quiet study environment"}
- Busy street → {"prompt": "upbeat pop, energetic, fast tempo, synths and bass", "makeInstrumental": false, "sceneDescription": "dynamic urban environment"}
- Park/nature → {"prompt": "acoustic folk, peaceful, medium tempo, guitar and birds", "makeInstrumental": true, "sceneDescription": "serene natural setting"}
- Office → {"prompt": "minimal electronic, focused, medium tempo, soft synths", "makeInstrumental": true, "sceneDescription": "work environment"}

Return ONLY the JSON, no extra text.`
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

      const rawResponse = response.data.content[0].text.trim();
      const parsedResult = this.parseClaudeResponse(rawResponse);
      const processingTime = Date.now() - startTime;

      console.log(`🎵 Generated music analysis (${processingTime}ms):`, parsedResult);

      return {
        prompt: parsedResult.prompt,
        sceneDescription: parsedResult.sceneDescription,
        makeInstrumental: parsedResult.makeInstrumental,
        confidence: 0.85,
        generatedAt: new Date().toISOString(),
        processingTime
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('Claude API error:', error.response?.data || error.message);
      
      // Return fallback prompt
      const fallback = this.getFallbackPrompt();
      return {
        prompt: fallback.prompt,
        sceneDescription: fallback.sceneDescription,
        makeInstrumental: fallback.makeInstrumental,
        confidence: 0.1,
        generatedAt: new Date().toISOString(),
        processingTime
      };
    }
  }

  private parseClaudeResponse(rawResponse: string): { prompt: string; makeInstrumental: boolean; sceneDescription: string } {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(rawResponse);

      if (parsed.prompt && typeof parsed.makeInstrumental === 'boolean' && parsed.sceneDescription) {
        return {
          prompt: this.cleanMusicPrompt(parsed.prompt),
          makeInstrumental: parsed.makeInstrumental,
          sceneDescription: parsed.sceneDescription
        };
      }
    } catch (error) {
      console.warn('Failed to parse Claude JSON response, falling back to text parsing');
    }

    // Fallback: try to extract info from non-JSON response
    const cleanPrompt = this.cleanMusicPrompt(rawResponse);
    const makeInstrumental = this.inferInstrumental(cleanPrompt);

    return {
      prompt: cleanPrompt,
      makeInstrumental,
      sceneDescription: 'Parsed from text response'
    };
  }

  private cleanMusicPrompt(rawPrompt: string): string {
    return rawPrompt
      .replace(/^["']|["']$/g, '')     // Remove surrounding quotes
      .replace(/\n/g, ' ')             // Remove newlines
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .replace(/,\s*15\s*seconds?/i, '') // Remove old "15 seconds" if present
      .trim()
      .toLowerCase();
  }

  private inferInstrumental(prompt: string): boolean {
    // Keywords that suggest instrumental music
    const instrumentalKeywords = ['ambient', 'classical', 'electronic', 'minimal', 'study', 'focus', 'meditation', 'calm', 'peaceful'];
    // Keywords that suggest vocal music
    const vocalKeywords = ['pop', 'rock', 'jazz', 'folk', 'energetic', 'upbeat', 'social'];

    const lowerPrompt = prompt.toLowerCase();
    const hasInstrumental = instrumentalKeywords.some(keyword => lowerPrompt.includes(keyword));
    const hasVocal = vocalKeywords.some(keyword => lowerPrompt.includes(keyword));

    // Default to instrumental if ambiguous, or if instrumental keywords are present
    return hasInstrumental || !hasVocal;
  }

  private getFallbackPrompt(): { prompt: string; makeInstrumental: boolean; sceneDescription: string } {
    const fallbacks = [
      {
        prompt: 'ambient instrumental, calm, medium tempo, soft piano',
        makeInstrumental: true,
        sceneDescription: 'Fallback - peaceful ambient setting'
      },
      {
        prompt: 'smooth jazz, relaxed, slow tempo, piano and light drums',
        makeInstrumental: false,
        sceneDescription: 'Fallback - social jazz setting'
      },
      {
        prompt: 'acoustic folk, peaceful, medium tempo, guitar and strings',
        makeInstrumental: true,
        sceneDescription: 'Fallback - natural peaceful setting'
      },
      {
        prompt: 'minimal electronic, focused, medium tempo, soft synths',
        makeInstrumental: true,
        sceneDescription: 'Fallback - work/focus environment'
      }
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