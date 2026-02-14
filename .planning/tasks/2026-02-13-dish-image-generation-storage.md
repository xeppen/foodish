## Goal
Implement a production-grade dish image generation pipeline that generates once per canonical dish, stores images in UploadThing, and reuses existing images for identical or similar requests.

## Tasks
1. Add canonical image-generation data model and migration (exact-reuse foundation) - files: `prisma/schema.prisma`, `prisma/migrations/*`, `lib/prisma.ts` (if regen needed), `types/*` (if needed)
   - Dependencies: none

2. Build normalization + canonical key service for generation reuse - files: `lib/dish-mapping.ts`, `lib/dish-mapping.test.ts`, `lib/image-search/query.ts`
   - Dependencies: Task 1 (canonical key must map to DB uniqueness)

3. Implement server-only generation provider wrapper (Gemini/Imagen) with prompt versioning, timeout, and safe input handling - files: `lib/image-generation/provider.ts`, `lib/image-generation/prompt.ts`, `lib/image-generation/types.ts`, `.env.local` (vars only)
   - Dependencies: Task 2

4. Implement UploadThing storage adapter for generated image bytes and stable URL return - files: `lib/image-generation/storage.ts`, `lib/actions/meals.ts` (shared upload helpers extraction if needed)
   - Dependencies: Task 3

5. Implement concurrency-safe generation orchestration (single-flight per canonical dish) - files: `lib/image-generation/orchestrator.ts`, `lib/image-generation/orchestrator.test.ts`
   - Dependencies: Tasks 1, 3, 4

6. Add `POST /api/dish-image` route with validation, rate limiting, exact reuse, and generation fallback - files: `app/api/dish-image/route.ts`, `lib/image-generation/orchestrator.ts`, `lib/dish-mapping.ts`
   - Dependencies: Task 5

7. Add optional semantic similarity reuse design hook (embeddings-ready, feature-flagged) - files: `lib/image-generation/similarity.ts`, `app/api/dish-image/route.ts`, `prisma/schema.prisma` (optional column), `prisma/migrations/*` (optional)
   - Dependencies: Tasks 1, 6

8. Integrate UI “Generate image” action into add/edit meal flows with pending state + preview update - files: `components/magic-meal-input.tsx`, `components/admin-common-meals-panel.tsx`, `lib/image-search/client.ts` (or new client), `components/meal-list.tsx` (if edit flow integration needed)
   - Dependencies: Task 6

9. Add robust tests (unit + integration) for reuse, lock behavior, and error/fallback paths - files: `lib/image-generation/*.test.ts`, `app/api/dish-image/route.test.ts`, `vitest.config.ts` (if needed)
   - Dependencies: Tasks 2-8

10. Final hardening + docs + roadmap/progress updates - files: `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/progress.md` (if exists), `.planning/verify-work.md` (if exists), `README.md` (env/config notes)
   - Dependencies: Task 9

## Verification
- [ ] `POST /api/dish-image` returns existing image with `wasGenerated=false` for repeated canonical dish
- [ ] Concurrent requests for same new dish trigger only one generation operation
- [ ] Generated image bytes are uploaded to UploadThing and returned via stable URL
- [ ] Input validation rejects invalid/oversized prompt text safely
- [ ] Rate limiting blocks abusive generation bursts
- [ ] Failure path returns fallback image/error contract without crashing
- [ ] UI can generate and apply image in add/edit flow with visible loading state
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes (existing known warnings acceptable if unchanged)

