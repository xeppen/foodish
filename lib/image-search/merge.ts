import { type ImageSearchCandidate } from "@/lib/image-search/types";

function score(candidate: ImageSearchCandidate): number {
  const width = candidate.width ?? 0;
  const height = candidate.height ?? 0;
  const isLandscape = width > 0 && height > 0 && width >= height;
  const area = width * height;

  let value = 0;
  if (isLandscape) {
    value += 1_000_000_000;
  }
  value += area;
  return value;
}

function dedupeKey(urlValue: string): string {
  try {
    const url = new URL(urlValue);
    return `${url.host}${url.pathname}`;
  } catch {
    return urlValue;
  }
}

export function mergeImageCandidates(
  pexels: ImageSearchCandidate[],
  unsplash: ImageSearchCandidate[],
  limit: number
): ImageSearchCandidate[] {
  const rankedPexels = [...pexels].sort((a, b) => score(b) - score(a));
  const rankedUnsplash = [...unsplash].sort((a, b) => score(b) - score(a));
  const byProvider = [rankedPexels, rankedUnsplash];
  const used = new Set<string>();
  const output: ImageSearchCandidate[] = [];
  let index = 0;

  while (output.length < limit) {
    let added = false;
    for (const list of byProvider) {
      const candidate = list[index];
      if (!candidate) {
        continue;
      }
      const key = dedupeKey(candidate.fullUrl);
      if (used.has(key)) {
        continue;
      }
      used.add(key);
      output.push(candidate);
      added = true;
      if (output.length >= limit) {
        return output;
      }
    }

    if (!added && byProvider.every((list) => index >= list.length)) {
      break;
    }
    index += 1;
  }

  return output;
}

