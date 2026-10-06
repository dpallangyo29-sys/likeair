import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageBase64: z.string().min(100), // data:image/...;base64,....
});

export type VisionCheckResult = {
  authentic: boolean;
  confidence: number; // 0..1
  reason: string;
};

/**
 * Runs a quick AI vision pass to guess whether a photo looks like a genuine,
 * personally-taken image vs a stock/internet/screenshot image. Used on the
 * marketplace to nudge sellers toward real photos.
 */
export const checkImageAuthenticity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<VisionCheckResult> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Fail-open: don't block posting if AI isn't configured.
      return { authentic: true, confidence: 0.5, reason: "AI check unavailable" };
    }

    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(data.imageBase64);
    if (!match) {
      return { authentic: true, confidence: 0.5, reason: "Unrecognized image data, skipped" };
    }
    const [, mimeType, base64Data] = match;

    const systemPrompt =
      'You are an image authenticity classifier for a peer-to-peer student marketplace. Judge whether the photo looks like a real photo taken by a person (phone/camera) of an actual item they own, OR whether it looks like a stock photo, marketing render, e-commerce catalog image, screenshot, or image scraped from the internet. Return STRICT JSON only, no prose. Shape: {"authentic": boolean, "confidence": number between 0 and 1, "reason": short string < 120 chars}. authentic=true means it looks like a genuine user-taken photo. authentic=false means it looks like it was pulled from the internet or is a stock/catalog/render image.';

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\nClassify this photo.` },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    };

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (res.status === 429) {
        return { authentic: true, confidence: 0.5, reason: "AI rate-limited, skipped" };
      }
      if (!res.ok) {
        return { authentic: true, confidence: 0.5, reason: `AI check failed (${res.status})` };
      }

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const parsed = JSON.parse(raw) as Partial<VisionCheckResult>;

      return {
        authentic: typeof parsed.authentic === "boolean" ? parsed.authentic : true,
        confidence:
          typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "",
      };
    } catch (err) {
      console.error("[vision] check failed", err);
      return { authentic: true, confidence: 0.5, reason: "AI check errored, skipped" };
    }
  });
