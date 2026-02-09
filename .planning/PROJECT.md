# What's for Dinner?

## What This Is

A minimal web-based tool that removes the dinner decision. Users maintain a personal list of everyday meals they already know work. The product automatically generates a weekly dinner plan from this list. Users can quickly swap individual days if needed. No recipes, no inspiration, no optimization — just a reasonable decision.

## Core Value

Weekly dinner planning takes less than 60 seconds and removes decision fatigue.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can sign in with Google
- [ ] First-time user sees pre-filled starter pack of 15-20 common everyday meals
- [ ] User can remove meals from starter pack during setup
- [ ] User can add their own meals to the list
- [ ] User can manage their personal meal list (simple text-based)
- [ ] User sees a weekly plan with 5 meals (one per weekday) automatically generated
- [ ] User can swap individual days with one click
- [ ] Recently used meals are deprioritized in generation
- [ ] Current week's plan is saved
- [ ] New plan is generated automatically for next week

### Out of Scope

- Recipe libraries — Not a food discovery tool
- Nutrition or health tracking — Not a health app
- AI optimization — Intentionally simple logic
- Shopping lists — Focused only on decision removal
- Child profiles or preferences — Household-level tool
- Social features — Personal tool, no sharing
- Inspiration feeds or recommendations — No browsing
- Weekend meals — Weekday dinners only
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

- **Tech stack**: Next.js, TypeScript — Existing blueprint repo with boilerplate setup
- **Scope**: V1 functionality is locked — do not expand beyond defined features
- **Audience**: Written for parents but does not exclude others
- **Simplicity**: No visible logic, no ratings, no feedback loops
- **Speed**: Weekly planning must complete in under 60 seconds

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google sign-in only | Simplicity over flexibility for v1 | — Pending |
| 5 weekday meals only | Weekends often different patterns, focus on recurring weekday friction | — Pending |
| Text-only meal list | No images/recipes keeps focus on decision removal | — Pending |
| Starter pack included | Removes setup friction, user can proceed immediately | — Pending |
| Deprioritize recent meals | Basic variation without complex logic | — Pending |

---
*Last updated: 2026-02-09 after initialization*
