import { buildGenerationPrompt, sanitizeDishNameForPrompt } from "@/lib/image-generation/prompt";
import { type GeneratedImage, type ImageGenerationConfig } from "@/lib/image-generation/types";

type GeminiInlineData = {
  mimeType?: string;
  data?: string;
};

type GeminiPart = {
  inlineData?: GeminiInlineData;
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

function withTimeout(signal: AbortSignal, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  signal.addEventListener("abort", () => {
    clearTimeout(timeout);
    controller.abort();
  });

  return controller.signal;
}

function parseGeneratedImage(payload: GeminiResponse): GeneratedImage {
  const candidates = payload.candidates ?? [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts ?? []) {
      const base64 = part.inlineData?.data;
      const mimeType = part.inlineData?.mimeType;
      if (!base64 || !mimeType) {
        continue;
      }

      return {
        mimeType,
        data: Buffer.from(base64, "base64"),
      };
    }
  }

  throw new Error("No image content returned by generation provider");
}

export function getImageGenerationConfig(): ImageGenerationConfig {
  return {
    provider: "gemini",
    model: process.env.DISH_IMAGE_GENERATION_MODEL || "gemini-2.0-flash-preview-image-generation",
    timeoutMs: Number(process.env.DISH_IMAGE_GENERATION_TIMEOUT_MS || 20000),
    promptVersion: process.env.DISH_IMAGE_PROMPT_VERSION || "v1",
  };
}

export async function generateDishImage(rawDishName: string, signal?: AbortSignal): Promise<{
  image: GeneratedImage;
  prompt: string;
  model: string;
  promptVersion: string;
}> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  const config = getImageGenerationConfig();
  const safeDishName = sanitizeDishNameForPrompt(rawDishName);
  const prompt = buildGenerationPrompt(safeDishName);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    signal: signal ? withTimeout(signal, config.timeoutMs) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  return {
    image: parseGeneratedImage(payload),
    prompt,
    model: config.model,
    promptVersion: config.promptVersion,
  };
}

