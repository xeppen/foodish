type CanonicalDish = {
  canonicalSv: string;
  canonicalEn: string;
  aliases: string[];
};

const CANONICAL_DISHES: CanonicalDish[] = [
  {
    canonicalSv: "köttbullar med potatis och brunsås",
    canonicalEn: "swedish meatballs with potatoes and brown gravy",
    aliases: [
      "köttbullar med potatis",
      "köttbullar brunsås",
      "swedish meatballs",
      "meatballs with gravy",
    ],
  },
  {
    canonicalSv: "pasta med köttfärssås",
    canonicalEn: "spaghetti bolognese",
    aliases: ["spagetti och köttfärssås", "spaghetti bolognese", "bolognese pasta"],
  },
  {
    canonicalSv: "falukorv i ugn med potatismos",
    canonicalEn: "baked sausage casserole with mashed potatoes",
    aliases: ["falukorv i ugn", "falukorv med mos", "baked falukorv"],
  },
  {
    canonicalSv: "makaroner och köttbullar",
    canonicalEn: "macaroni and meatballs",
    aliases: ["makaroner med köttbullar"],
  },
  {
    canonicalSv: "korv stroganoff med ris",
    canonicalEn: "sausage stroganoff with rice",
    aliases: ["korvstroganoff", "korv stroganoff", "sausage stroganoff"],
  },
  {
    canonicalSv: "fiskpinnar med potatis och remouladsås",
    canonicalEn: "fish sticks with potatoes and remoulade sauce",
    aliases: ["fiskpinnar med potatis", "fish sticks with potatoes"],
  },
  {
    canonicalSv: "pannkakor med sylt",
    canonicalEn: "swedish pancakes with jam",
    aliases: ["pannkakor", "swedish pancakes"],
  },
  {
    canonicalSv: "ugnsstekt kyckling med ris",
    canonicalEn: "roast chicken with rice",
    aliases: ["ugnsstekt kyckling", "roast chicken and rice"],
  },
  {
    canonicalSv: "spaghetti med köttbullar",
    canonicalEn: "spaghetti and meatballs",
    aliases: ["spagetti med köttbullar"],
  },
  {
    canonicalSv: "hamburgare med bröd",
    canonicalEn: "hamburger with bun",
    aliases: ["hamburgare", "burger with bun"],
  },
  {
    canonicalSv: "kycklingnuggets med pommes",
    canonicalEn: "chicken nuggets with fries",
    aliases: ["kyckling nuggets med pommes", "chicken nuggets and fries"],
  },
  {
    canonicalSv: "lasagne",
    canonicalEn: "lasagna",
    aliases: ["lasagna"],
  },
  {
    canonicalSv: "köttfärslimpa med potatis",
    canonicalEn: "meatloaf with potatoes",
    aliases: ["köttfärslimpa", "meatloaf with potatoes"],
  },
  {
    canonicalSv: "pytt i panna med ägg",
    canonicalEn: "swedish hash with egg",
    aliases: ["pytt i panna", "pyttipanna", "swedish hash"],
  },
  {
    canonicalSv: "grillad korv med bröd",
    canonicalEn: "grilled hot dog with bun",
    aliases: ["grillkorv med bröd", "hot dog", "grilled hot dog"],
  },
  {
    canonicalSv: "pasta med skinksås",
    canonicalEn: "pasta with ham cream sauce",
    aliases: ["skinkpasta", "pasta med skinka", "ham pasta"],
  },
  {
    canonicalSv: "stekt lax med potatis",
    canonicalEn: "pan fried salmon with potatoes",
    aliases: ["lax med potatis", "fried salmon with potatoes"],
  },
  {
    canonicalSv: "köttfärssoppa",
    canonicalEn: "ground beef vegetable soup",
    aliases: ["köttfärs soppa", "ground beef soup"],
  },
  {
    canonicalSv: "hemmagjord pizza",
    canonicalEn: "homemade pizza",
    aliases: ["pizza", "homemade pizza"],
  },
  {
    canonicalSv: "tacos",
    canonicalEn: "tacos",
    aliases: ["taco", "tacos med köttfärs"],
  },
];

const TOKEN_MAP: Record<string, string> = {
  köttbullar: "meatballs",
  köttfärs: "ground beef",
  köttfärslimpa: "meatloaf",
  soppa: "soup",
  fiskpinnar: "fish sticks",
  lax: "salmon",
  kyckling: "chicken",
  korv: "sausage",
  stroganoff: "stroganoff",
  pasta: "pasta",
  spaghetti: "spaghetti",
  spagetti: "spaghetti",
  pannkakor: "pancakes",
  potatis: "potatoes",
  potatismos: "mashed potatoes",
  brunsås: "brown gravy",
  remouladsås: "remoulade sauce",
  sylt: "jam",
  ris: "rice",
  ägg: "egg",
  bröd: "bun",
  pommes: "fries",
  med: "with",
  och: "and",
  i: "in",
};

function normalizeWhitespace(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

const LOOKUP = (() => {
  const map = new Map<string, CanonicalDish>();
  for (const dish of CANONICAL_DISHES) {
    map.set(normalizeWhitespace(dish.canonicalSv), dish);
    for (const alias of dish.aliases) {
      map.set(normalizeWhitespace(alias), dish);
    }
  }
  return map;
})();

function tokenTranslateToEnglish(normalizedName: string): string {
  return normalizedName
    .split(" ")
    .map((token) => TOKEN_MAP[token] ?? token)
    .join(" ");
}

export type DishMappingResult = {
  normalizedName: string;
  canonicalSv: string;
  canonicalEn: string;
  slug: string;
};

export function mapDishName(rawDishName: string): DishMappingResult {
  const normalizedName = normalizeWhitespace(rawDishName);
  const mapped = LOOKUP.get(normalizedName);

  if (mapped) {
    const canonicalSv = normalizeWhitespace(mapped.canonicalSv);
    return {
      normalizedName,
      canonicalSv,
      canonicalEn: mapped.canonicalEn,
      slug: slugify(canonicalSv),
    };
  }

  const translated = tokenTranslateToEnglish(normalizedName);
  return {
    normalizedName,
    canonicalSv: normalizedName,
    canonicalEn: translated,
    slug: slugify(normalizedName),
  };
}

export function normalizeDishName(rawDishName: string): string {
  return normalizeWhitespace(rawDishName);
}

