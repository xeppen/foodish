export type ImageSearchCandidate = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  pageUrl: string;
  width?: number;
  height?: number;
  source: "pexels" | "unsplash";
};

export type ImageSearchResponse = {
  query: string;
  candidates: ImageSearchCandidate[];
};
