const ALLOWED_CHARS = /[^a-zA-Z0-9\såäöÅÄÖ.,'-]/g;
const MAX_DISH_NAME_LENGTH = 120;

export function sanitizeDishNameForPrompt(rawDishName: string): string {
  const normalized = rawDishName.replace(/\s+/g, " ").trim();
  const truncated = normalized.slice(0, MAX_DISH_NAME_LENGTH);
  return truncated.replace(ALLOWED_CHARS, "");
}

export function buildGenerationPrompt(dishName: string): string {
  return [
    "Realistic home-cooked Swedish family dinner.",
    `Dish: ${dishName}.`,
    "Simple plating on a normal white plate.",
    "Vertical food photography.",
    "Dark moody lighting.",
    "Slightly imperfect presentation.",
    "Not restaurant quality.",
    "Not artistic.",
    "Looks like an ordinary weekday dinner.",
    "4:5 aspect ratio.",
  ].join(" ");
}
