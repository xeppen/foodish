import { describe, expect, it } from "vitest";
import { buildEnglishImageSearchQuery } from "@/lib/image-search/query";
import { mergeImageCandidates } from "@/lib/image-search/merge";

describe("image search query and merge helpers", () => {
  it("buildEnglishImageSearchQuery translates common swedish phrases and appends hints", () => {
    expect(buildEnglishImageSearchQuery("  Köttbullar med potatis och brunsås  ")).toBe(
      "swedish meatballs with potatoes and brown gravy plated food photography"
    );
    expect(buildEnglishImageSearchQuery("korvstroganoff")).toBe(
      "sausage stroganoff with rice plated food photography"
    );
  });

  it("mergeImageCandidates interleaves provider results and dedupes by URL", () => {
    const candidates = mergeImageCandidates(
      [
        {
          id: "p1",
          thumbUrl: "https://img.px/a-thumb.jpg",
          fullUrl: "https://img.px/a.jpg",
          pageUrl: "https://pexels.com/a",
          width: 1200,
          height: 800,
          source: "pexels",
        },
        {
          id: "p2",
          thumbUrl: "https://img.px/b-thumb.jpg",
          fullUrl: "https://img.px/b.jpg",
          pageUrl: "https://pexels.com/b",
          width: 1200,
          height: 800,
          source: "pexels",
        },
      ],
      [
        {
          id: "u1",
          thumbUrl: "https://img.us/a-thumb.jpg",
          fullUrl: "https://img.us/a.jpg",
          pageUrl: "https://unsplash.com/a",
          width: 1000,
          height: 700,
          source: "unsplash",
        },
        {
          id: "u2",
          thumbUrl: "https://img.us/b-thumb.jpg",
          fullUrl: "https://img.px/b.jpg",
          pageUrl: "https://unsplash.com/b",
          width: 1000,
          height: 700,
          source: "unsplash",
        },
      ],
      3
    );

    expect(candidates).toHaveLength(3);
    expect(candidates[0].source).toBe("pexels");
    expect(candidates[1].source).toBe("unsplash");
    expect(new Set(candidates.map((item) => item.fullUrl)).size).toBe(3);
  });
});
