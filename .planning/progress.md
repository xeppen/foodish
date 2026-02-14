# Progress

## Completed in current branch

- Canonical Swedish dish mapping with alias support and English labels.
- Multi-provider image search (`Pexels + Unsplash`) with fallback + dedupe.
- New generation pipeline:
  - `POST /api/dish-image`
  - server-side Gemini image generation wrapper
  - UploadThing storage adapter
  - DB-backed reuse table with concurrency-safe orchestration
- UI integration:
  - Generate image button in add-meal flow
  - Generate image in admin (new and existing meals)
  - URL preview before save

## Next priorities

1. Replace similarity placeholder with embedding-based cosine matching.
2. Add integration tests for `/api/dish-image` route edge cases (rate limit, pending, provider failure).
3. Add observability (generation latency, generation success rate, cache-hit ratio).

