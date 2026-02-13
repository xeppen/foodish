export type ImageGenerationModelProvider = "gemini";

export type ImageGenerationConfig = {
  provider: ImageGenerationModelProvider;
  model: string;
  timeoutMs: number;
  promptVersion: string;
};

export type GeneratedImage = {
  mimeType: string;
  data: Buffer;
};

