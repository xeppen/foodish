import { describe, expect, it } from "vitest";
import { buildGenerationPrompt, sanitizeDishNameForPrompt } from "@/lib/image-generation/prompt";

describe("image generation prompt", () => {
  it("sanitizes unsafe characters and preserves swedish letters", () => {
    expect(sanitizeDishNameForPrompt("  Köttbullar <script>alert(1)</script> med sås  ")).toBe(
      "Köttbullar scriptalert1script med sås"
    );
  });

  it("builds stable v1 prompt shape", () => {
    const prompt = buildGenerationPrompt("Korv stroganoff");
    expect(prompt).toContain("Dish: Korv stroganoff.");
    expect(prompt).toContain("Realistic home-cooked Swedish family dinner.");
    expect(prompt).toContain("1:1 aspect ratio.");
  });
});

