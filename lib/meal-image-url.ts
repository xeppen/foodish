const DEFAULT_STYLE = "warm-home-cooked-top-down";

export function buildFallbackMealImageUrl(mealName: string) {
  return `/api/meal-image?meal=${encodeURIComponent(mealName)}&style=${encodeURIComponent(DEFAULT_STYLE)}`;
}

export function resolveMealImageUrl(imageUrl: string | null | undefined, mealName: string) {
  const fallback = buildFallbackMealImageUrl(mealName);
  const value = imageUrl?.trim();

  if (!value) {
    return fallback;
  }

  if (value.startsWith("/")) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return `/api/image-proxy?src=${encodeURIComponent(value)}&meal=${encodeURIComponent(mealName)}`;
  }

  return fallback;
}
