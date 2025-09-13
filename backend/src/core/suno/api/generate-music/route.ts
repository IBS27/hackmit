import { Request, Response, Router } from "express";

const router = Router();

// Generate music endpoint
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, tags, make_instrumental } = req.body;

    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const response = await fetch(
      "https://studio-api.prod.suno.com/api/v2/external/hackmit/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: prompt,
          tags: tags,
          make_instrumental: make_instrumental || false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: "Generation failed", details: errorText });
    }

    const clip = await response.json();
    return res.json({ success: true, clip_id: clip.id, status: clip.status });
  } catch (error) {
    console.error("Generate music error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Check clip status endpoint
router.post('/status', async (req: Request, res: Response) => {
  try {
    const { clipIds } = req.body;

    if (!clipIds || !Array.isArray(clipIds) || clipIds.length === 0) {
      return res.status(400).json({ error: "Clip IDs are required" });
    }

    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const statusResponse = await fetch(
      `https://studio-api.prod.suno.com/api/v2/external/hackmit/clips?ids=${clipIds.join(",")}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error("Suno API status check error:", errorText);
      return res.status(statusResponse.status).json({
        error: "Failed to check generation status",
        details: errorText
      });
    }

    const clips = await statusResponse.json();

    return res.json({
      success: true,
      clips: clips.map((clip: any) => ({
        id: clip.id,
        status: clip.status,
        title: clip.title,
        audio_url: clip.audio_url,
        video_url: clip.video_url,
        image_url: clip.image_url,
        created_at: clip.created_at,
        metadata: {
          duration: clip.metadata?.duration,
          tags: clip.metadata?.tags,
          prompt: clip.metadata?.prompt,
          error_type: clip.metadata?.error_type,
          error_message: clip.metadata?.error_message,
        },
      })),
    });
  } catch (error) {
    console.error("Check status error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get single clip endpoint
router.get('/clips/:clip_id', async (req: Request, res: Response) => {
  try {
    const { clip_id } = req.params;
    const apiKey = process.env.SUNO_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const response = await fetch(
      `https://studio-api.prod.suno.com/api/v2/external/hackmit/clips/${clip_id}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: "Failed to fetch clip", details: errorText });
    }

    const clip = await response.json();
    return res.json(clip);
  } catch (error) {
    console.error("Get clip error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
