const ALIAS_MAP: Record<string, string> = {
  "gul lök": "lök",
  "rod lok": "lök",
  "röd lök": "lök",
  "vitlok": "vitlök",
  "vit lök": "vitlök",
  "potatisar": "potatis",
  "tomater": "tomat",
  "morötter": "morot",
  "krossade tomater": "tomat",
};

export function normalizeIngredientName(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return ALIAS_MAP[normalized] ?? normalized;
}

export function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) {
    return null;
  }

  const value = unit.toLowerCase().trim();
  if (!value) {
    return null;
  }

  const map: Record<string, string> = {
    gram: "g",
    grams: "g",
    g: "g",
    kg: "kg",
    kilo: "kg",
    ml: "ml",
    dl: "dl",
    cl: "cl",
    milliliter: "ml",
    milliliters: "ml",
    deciliter: "dl",
    deciliters: "dl",
    centiliter: "cl",
    centiliters: "cl",
    l: "l",
    liter: "l",
    liters: "l",
    st: "st",
    piece: "st",
    pieces: "st",
    pcs: "st",
    pc: "st",
    cup: "dl",
    cups: "dl",
    msk: "msk",
    tbsp: "msk",
    tsk: "tsk",
    tsp: "tsk",
    krm: "krm",
    pinch: "krm",
    clove: "klyfta",
    cloves: "klyfta",
    slice: "skiva",
    slices: "skiva",
    förp: "förp",
    forp: "förp",
    pkt: "pkt",
  };

  return map[value] ?? value;
}
