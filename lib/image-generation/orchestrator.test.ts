import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaMock,
  generateDishImageMock,
  uploadGeneratedDishImageMock,
  findSimilarDishImageMock,
} = vi.hoisted(() => ({
  prismaMock: {
    generatedDishImage: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  generateDishImageMock: vi.fn(),
  uploadGeneratedDishImageMock: vi.fn(),
  findSimilarDishImageMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/image-generation/provider", () => ({
  generateDishImage: generateDishImageMock,
}));

vi.mock("@/lib/image-generation/storage", () => ({
  uploadGeneratedDishImage: uploadGeneratedDishImageMock,
}));

vi.mock("@/lib/image-generation/similarity", () => ({
  findSimilarDishImage: findSimilarDishImageMock,
}));

import { getOrGenerateDishImage } from "@/lib/image-generation/orchestrator";

describe("dish image orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSimilarDishImageMock.mockResolvedValue(null);
  });

  it("returns exact ready match without generation", async () => {
    prismaMock.generatedDishImage.findUnique.mockResolvedValueOnce({
      normalizedName: "tacos",
      status: "READY",
      imageUrl: "https://cdn.example.com/tacos.jpg",
    });

    const result = await getOrGenerateDishImage("Tacos");

    expect(result).toEqual({
      status: "ready",
      imageUrl: "https://cdn.example.com/tacos.jpg",
      wasGenerated: false,
    });
    expect(generateDishImageMock).not.toHaveBeenCalled();
  });

  it("generates and stores when no record exists", async () => {
    prismaMock.generatedDishImage.findUnique.mockResolvedValueOnce(null);
    prismaMock.generatedDishImage.create.mockResolvedValueOnce({ id: "g1" });
    generateDishImageMock.mockResolvedValueOnce({
      image: { mimeType: "image/png", data: Buffer.from("abc") },
      prompt: "prompt",
      model: "gemini-test",
      promptVersion: "v1",
    });
    uploadGeneratedDishImageMock.mockResolvedValueOnce("https://cdn.example.com/generated.png");
    prismaMock.generatedDishImage.update.mockResolvedValueOnce({ id: "g1" });

    const result = await getOrGenerateDishImage("Korv stroganoff");

    expect(result).toEqual({
      status: "ready",
      imageUrl: "https://cdn.example.com/generated.png",
      wasGenerated: true,
    });
    expect(generateDishImageMock).toHaveBeenCalledTimes(1);
    expect(uploadGeneratedDishImageMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.generatedDishImage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "READY",
        }),
      })
    );
  });
});

