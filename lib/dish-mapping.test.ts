import { describe, expect, it } from "vitest";
import { mapDishName, normalizeDishName } from "@/lib/dish-mapping";

describe("dish mapping", () => {
  it("normalizes casing and duplicate spaces while preserving swedish characters", () => {
    expect(normalizeDishName("  KÖTTBULLAR   med   POTATIS  ")).toBe("köttbullar med potatis");
    expect(normalizeDishName("Pytt i panna med ägg")).toBe("pytt i panna med ägg");
  });

  it("maps known aliases to canonical dish and english label", () => {
    const mapped = mapDishName("korvstroganoff");
    expect(mapped.canonicalSv).toBe("korv stroganoff med ris");
    expect(mapped.canonicalEn).toBe("sausage stroganoff with rice");
    expect(mapped.slug).toBe("korv-stroganoff-med-ris");
  });

  it("falls back to token translation for unknown dishes", () => {
    const mapped = mapDishName("Stekt lax och ris");
    expect(mapped.canonicalSv).toBe("stekt lax och ris");
    expect(mapped.canonicalEn).toBe("stekt salmon and rice");
  });
});

