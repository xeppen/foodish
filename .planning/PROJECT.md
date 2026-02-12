# What's for Dinner?

## What This Is

A minimal web-based tool that removes the dinner decision. Users maintain a personal list of everyday meals they already know work. The product automatically generates a weekly dinner plan from this list. Users can quickly swap individual days if needed. No recipes, no inspiration, no optimization — just a reasonable decision.

## Core Value

Weekly dinner planning takes less than 60 seconds and removes decision fatigue.

## Current Milestone: v1.1 Smart Variety & Preferences

**Goal:** Plans feel fresh and match household preferences while maintaining fast planning (sub-60 seconds)

**Target features:**
- Ratings system (thumbs up/down) influencing generation frequency
- Variety rules (no duplicates per week, long-term rotation, respect ratings)
- Meal complexity levels (simple/medium/complex) for filtering and generation
- Enhanced switching with progressive disclosure (fast random swap + filtered options)

## Requirements

### Validated

<!-- v1.0 - Phases 1-5 completed, deployed 2026-02-10 -->
- ✓ User can sign in with Google — v1.0
- ✓ First-time user sees pre-filled starter pack of 15-20 common everyday meals — v1.0
- ✓ User can remove meals from starter pack during setup — v1.0
- ✓ User can add their own meals to the list — v1.0
- ✓ User can manage their personal meal list (simple text-based) — v1.0
- ✓ User sees a weekly plan with 5 meals (one per weekday) automatically generated — v1.0
- ✓ User can swap individual days with one click — v1.0
- ✓ Recently used meals are deprioritized in generation — v1.0
- ✓ Current week's plan is saved — v1.0
- ✓ New plan is generated automatically for next week — v1.0

### Active

<!-- v1.1 - Smart Variety & Preferences -->
- [ ] User can rate meals with thumbs up/down
- [ ] Ratings influence meal generation frequency (thumbs-up more often, thumbs-down less)
- [ ] Generated plans never include duplicate meals within same week
- [ ] Meal rotation prevents favorites from appearing 3+ weeks in a row
- [ ] User can set meal complexity level (simple/medium/complex, defaults to medium)
- [ ] User can swap day with fast random option (existing behavior)
- [ ] User can swap day with filters (complexity, recency, rating)
- [ ] Filtered swap uses progressive disclosure (doesn't clutter primary action)

### Out of Scope

- Recipe libraries — Not a food discovery tool
- Nutrition or health tracking — Not a health app
- AI optimization — Intentionally simple logic
- Shopping lists (v1.1) — Deferred to future milestone, requires ingredient tracking
- Ingredients tracking (v1.1) — Deferred to future milestone (needed for shopping lists)
- Child profiles or per-person preferences — Household-level tool
- Social features — Personal tool, no sharing
- Inspiration feeds or recommendations — No browsing
- Weekend meals (v1.1) — Keep 5 weekdays, weekends have different patterns
- AI-generated meal images (v1.1) — Nice-to-have polish, defer for now
- Onboarding flows — Minimal setup only

## Context

- Targets decision fatigue, not lack of recipes or inspiration
- "What's for dinner?" is a recurring, mentally draining task for parents
- Problem happens under time pressure, low energy, emotional load
- Primary use case: Sunday evening, sub-1-minute planning
- Product principle: This is a decision removal tool, not a food app
- Intentionally boring, predictable, and relieving
- Success criteria: User opens once per week, planning takes <60 seconds, feels less mental strain
- Failure criteria: Meals feel repetitive too quickly, user has to think more than before, used for browsing instead of deciding

## Constraints

- **Tech stack**: Next.js, TypeScript, Clerk auth, Prisma + Neon PostgreSQL — Already deployed
- **Scope**: v1.1 functionality is defined — ratings, variety, complexity, enhanced swap
- **Audience**: Written for parents but does not exclude others
- **Simplicity**: Simple preference system (ratings), no complex AI or optimization
- **Speed**: Weekly planning must complete in under 60 seconds (including new logic)
- **UX principle**: Fast path stays fast — progressive disclosure for advanced options

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google sign-in only | Simplicity over flexibility for v1 | ✓ Good — Shipped v1.0 |
| 5 weekday meals only | Weekends often different patterns, focus on recurring weekday friction | ✓ Good — Maintained for v1.1 |
| Text-only meal list | No images/recipes keeps focus on decision removal | ✓ Good — AI images deferred |
| Starter pack included | Removes setup friction, user can proceed immediately | ✓ Good — Shipped v1.0 |
| Deprioritize recent meals | Basic variation without complex logic | ⚠️ Revisit — v1.1 adds smarter variety |
| Add ratings (v1.1) | Users want fresh plans and preference matching | — Pending |
| Thumbs up/down only (v1.1) | Simplest rating system, no complex scales | — Pending |
| Hard rule: no duplicates per week (v1.1) | Variety is core complaint, make it explicit | — Pending |
| Complexity defaults to medium (v1.1) | Optional metadata, don't force user classification | — Pending |
| Progressive disclosure for swap filters (v1.1) | Keep fast path fast, advanced options hidden | — Pending |

---
*Last updated: 2026-02-12 after v1.1 milestone start*
