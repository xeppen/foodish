# Project Research Summary

**Project:** What's for Dinner? (Minimal Meal Planning Web App)
**Domain:** Meal planning and dinner decision removal tools
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

"What's for Dinner?" is a decision removal tool, not a recipe discovery app. Research reveals the meal planning space is dominated by feature-bloated kitchen management platforms that recreate the decision fatigue they claim to solve. The winning approach: intentionally boring predictability with minimal user input (under 60 seconds per planning session). Users want relief from 200+ daily food decisions, not more recipe browsing.

The recommended stack is Next.js 15.5+ with React 19, Auth.js v5 (Google OAuth only), Neon Postgres via Prisma ORM, and Tailwind CSS for styling. This combination delivers a minimal 7-dependency production app with excellent DX and zero-config deployment on Vercel. Critical architecture decision: use Server Actions and React Server Components throughout to minimize client JS and keep the app fast. The data model is deliberately simple: Users, Meals (text-only), and WeeklyPlans with 5-day rotation.

The primary risk is feature creep. 70% of meal planning apps lose users within 2 weeks due to complexity. Every feature must pass the "does this reduce or add decisions?" test. The secondary risk is "recipe app drift"—incremental additions (ratings, instructions, nutrition tracking) that destroy the core value proposition. Mitigation: maintain a public anti-feature list, impose the 60-second constraint from day one, and ruthlessly remove features before adding new ones.

## Key Findings

### Recommended Stack

Next.js 15.5 with App Router and React 19 is the foundation. This isn't just "use Next.js"—it's specifically the App Router with React Server Components, which eliminates 90% of client-side state management complexity. Auth.js v5 (NextAuth rebranded) handles Google OAuth with just 3 lines of config, though note the critical CVE-2025-29927 security issue: never use middleware for auth checks, always use the Data Access Layer pattern in Server Components.

**Core technologies:**
- **Next.js 15.5+ with App Router**: Industry standard for React SSR/SSG, zero config, built-in Turbopack for 2-5x faster builds, typed routes
- **Auth.js v5 (NextAuth)**: Google OAuth in 3 lines, but MUST use Data Access Layer pattern (not middleware) per CVE-2025-29927
- **Neon Postgres + Prisma 7**: Serverless Postgres with 500ms cold starts (vs Supabase's longer), free tier sufficient, Prisma 7 now pure TypeScript for better DX
- **Tailwind CSS 4.x**: Utility-first styling perfect for "intentionally boring" UI, zero config with Next.js, minimal dependencies
- **Zod 3.x**: Schema validation shared client/server, use with Server Actions to prevent over-engineering with heavy form libraries
- **pnpm**: 70% less disk space than npm, fastest installs, strict dependency resolution prevents phantom dependency bugs

**What NOT to use**: NextAuth v4 (deprecated, has security issues), Pages Router (no RSC benefits), Redux/Zustand (Server Components eliminate need), MongoDB with Prisma (incomplete support), middleware for auth (CVE-2025-29927).

### Expected Features

Research reveals a clear split between table stakes (users expect these to exist) and anti-features (commonly requested but problematic). The V1 scope correctly identifies 7 core features and explicitly excludes recipe content, nutrition tracking, AI recommendations, and shopping lists—all of which add massive complexity for minimal value.

**Must have (table stakes):**
- Meal list management (text-only CRUD) — every meal planner stores meals somehow
- Weekly plan view (5 weekdays read-only) — industry standard 5-7 day planning window
- Plan generation (auto-assigned meals) — users expect automation, not manual slot-filling
- Plan persistence (survives refresh) — basic data storage expectation
- Swap/regenerate per day — escape hatch when plan doesn't fit
- User authentication (Google only) — multi-device access expected

**Should have (differentiators):**
- Zero manual planning — removes ALL dinner decisions (core value prop)
- Boring predictability — intentionally limited variety from known meals (anti-competitor positioning)
- No recipe database — only YOUR meals, not discovery (single-purpose focus)
- Pre-filled starter pack (15-20 meals) — immediate value without setup burden
- One-click adjustments — react to plan without rebuilding

**Defer (v2+):**
- Plan history ("what did I eat last week?") — triggered by user requests for memory
- Multi-week view — add after validation shows users want to see future plans
- Meal tags/categories — wait for swap patterns to reveal actual categorization needs
- Household sharing — complexity explosion, defer until V1 proves single-user model

**Never build (anti-features):**
- Recipe content/instructions — becomes recipe app, not decision tool
- Nutrition tracking — manual logging kills retention (mean app rating 3.0-3.7/5.0)
- Grocery shopping lists — requires ingredient parsing, pantry state, serving sizes (massive complexity)
- AI recipe recommendations — contradicts "boring predictability" value prop
- Social features — privacy concerns, moderation, feature creep into social network

### Architecture Approach

Next.js App Router with Server Actions eliminates the need for REST API routes. The architecture is deliberately monolithic: presentation layer (pages), business logic layer (Server Actions), and data layer (Prisma models). No microservices, no GraphQL, no client-side state management libraries. Server Components handle data fetching with async/await directly in components, removing the need for useEffect + fetch patterns.

**Major components:**
1. **Authentication (Auth.js v5)** — Google OAuth sign-in/out with Data Access Layer pattern (NOT middleware auth checks per CVE-2025-29927)
2. **Meal List Manager** — Simple CRUD via Server Actions, text-only storage, no image uploads or recipe parsing
3. **Plan Generator** — Simple random selection with recency tracking (avoid last week's meals), runs in Server Action, no ML/AI
4. **Plan Persistence** — Save/load current week's plan via Prisma, one active plan per user, no history in V1
5. **Meal Swapper** — Server Action that replaces single day in existing plan, respects recency constraints

**Key patterns:**
- Server Actions for all mutations (no separate API routes needed)
- Session-based authorization via auth() function in every protected action
- Optimistic UI updates optional but probably overkill for this simple app
- Simple file structure: app/(auth)/ for route grouping, lib/actions/ for Server Actions by domain
- Avoid anti-pattern of complex meal selection algorithms (simple random + recency is sufficient)

**Data model (3 tables):**
```
User (from Auth.js) → has many → Meals (id, name, userId, lastUsed)
User → has many → WeeklyPlans (id, userId, weekStartDate, meals: {mon, tue, wed, thu, fri})
```

### Critical Pitfalls

**1. The Complexity Death Spiral** — 70% of users abandon meal planning apps within 2 weeks if too complex. Apps intended to reduce mental load end up creating more work than manual planning. Solution: impose 60-second time limit as design constraint from Phase 1. Every feature must pass "does this reduce or add decisions?" test. Track "time to first meal plan" metric obsessively.

**2. Recipe App Drift (Core Identity Crisis)** — Product slowly morphs into "yet another recipe app" through incremental additions (ratings, videos, substitutions). Each feature seems reasonable in isolation but collectively destroys the value proposition. Solution: write and publicly display anti-feature list. Before adding new features, remove something. If users spend >5 minutes per session, you've drifted.

**3. The Variety Paradox** — Users think they want variety, but increasing variety creates massive grocery lists and decision paralysis. Research shows rotating 12-20 meals provides sufficient variety without cognitive overhead. Solution: design for "boring, predictable, relieving" with 2-4 week meal rotation, not algorithmic novelty.

**4. The Grocery List Disconnect** — Treating grocery lists as nice-to-have rather than core infrastructure causes users to manually transfer ingredients, encounter disorganized lists, or find items missing. Solution: if you build grocery lists, design them unified with meal planning from day one (not as separate feature). However, V1 explicitly excludes this due to complexity.

**5. The AI Sophistication Trap** — Over-investing in ML/AI that requires constant user input (pantry scans, ratings, preference updates). Studies show AI-driven plans offer no retention advantage over simple rule-based systems beyond 6 months. Solution: start with simple rule-based logic. Only add ML if it measurably reduces user input while maintaining quality.

## Implications for Roadmap

Based on research, suggested phase structure aligns with technical dependencies and risk mitigation:

### Phase 1: Foundation (Auth + Database)
**Rationale:** Everything else requires authentication and data persistence. Can't test meal planning without ability to save meals and plans. Must establish the 60-second constraint from day one (retrofitting simplicity is nearly impossible per Pitfall 1).

**Delivers:** Working auth flow (Google sign-in), database schema (Users, Meals, WeeklyPlans), basic routing structure

**Addresses:** Table stakes authentication requirement, plan persistence expectation

**Avoids:** Complexity Death Spiral by establishing speed constraint as core architecture principle

**Research flag:** Standard patterns, no deep research needed. Next.js + Auth.js + Prisma are well-documented with official guides.

---

### Phase 2: Core Data (Meal CRUD + Starter Pack)
**Rationale:** Plan generation needs meals to work with. Without meals, there's nothing to plan. Starter pack (15-20 common meals) critical to avoid cold-start problem where user faces empty meal list.

**Delivers:** Meal list page with CRUD operations, pre-filled starter pack on first login, basic variation tracking (lastUsed field)

**Uses:** Server Actions for mutations, Prisma for database operations, Zod for form validation

**Addresses:** Meal list management (table stakes), pre-filled starter pack (differentiator), immediate value without setup burden

**Avoids:** Recipe App Drift by keeping meals text-only (no images, instructions, nutrition data)

**Research flag:** Standard CRUD patterns, no additional research needed.

---

### Phase 3: Planning Logic (Generation + Display)
**Rationale:** Core value proposition. This is what differentiates the app from manual planning. Simple random selection with recency tracking (don't repeat last week's meals) sufficient per research—no ML needed.

**Delivers:** Plan generation button, 5-day weekly plan view (Monday-Friday), simple algorithm (random selection avoiding recently used)

**Uses:** Server Actions for plan generation, WeeklyPlans model for persistence

**Implements:** Plan Generator and Plan Persistence components from architecture

**Addresses:** Auto-generated weekly plan (must-have), boring predictability (differentiator), zero manual planning (core value prop)

**Avoids:** AI Sophistication Trap and Variety Paradox by using simple rotation logic instead of complex ML

**Research flag:** Meal rotation algorithms are simple and well-documented (2-4 week cycles). Standard patterns, skip research.

---

### Phase 4: Plan Adjustment (Swap Capability)
**Rationale:** Research shows overly strict planning causes abandonment. Users need escape hatch when auto-generated plan doesn't fit (e.g., dinner plans change, already ate that meal elsewhere). One-click swap provides flexibility without recreating decision fatigue.

**Delivers:** "Swap" button per day in week view, replaces single day's meal with random alternative respecting recency

**Uses:** Server Action for meal swap, optimistic UI updates optional but probably overkill

**Implements:** Meal Swapper component from architecture

**Addresses:** Swap/regenerate capability (table stakes), one-click adjustments (differentiator)

**Avoids:** Variety Paradox by showing 1 swap at a time (not 20 alternatives causing decision paralysis)

**Research flag:** Simple feature, standard patterns. No additional research needed.

---

### Phase 5: Polish & Deployment
**Rationale:** Working features aren't production-ready without error handling, loading states, and deployment configuration. Vercel deployment is zero-config but environment variables (DATABASE_URL, NEXTAUTH_SECRET, Google OAuth credentials) must be set.

**Delivers:** Loading states during plan generation, error handling for failed operations, empty states for new users, Vercel deployment with environment config

**Uses:** Vercel for hosting (free tier sufficient per stack research), Neon Postgres connection string, Google Cloud Console for OAuth credentials

**Addresses:** Production readiness, user experience polish

**Research flag:** Standard deployment patterns. Vercel + Next.js documentation covers this comprehensively.

---

### Phase Ordering Rationale

- **Auth must come first** — every other feature depends on knowing which user's data to load
- **Meal CRUD before planning** — can't generate plans without meals in database
- **Starter pack in Phase 2** — reduces cold-start problem (empty meal list would require user to add meals before seeing any value)
- **Planning before swapping** — can't swap meals in a plan that doesn't exist yet
- **Polish last** — need working features to know what loading/error states are required

**Dependency chain:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (strictly sequential based on technical dependencies)

**Risk mitigation alignment:**
- Phase 1 establishes 60-second constraint (prevents Complexity Death Spiral)
- Phase 2 keeps meals text-only (prevents Recipe App Drift)
- Phase 3 uses simple rotation logic (prevents AI Sophistication Trap)
- Phase 4 provides escape hatch (prevents over-strict planning abandonment)

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1 (Auth):** Next.js + Auth.js + Prisma are battle-tested with comprehensive official docs
- **Phase 2 (CRUD):** Standard Server Actions CRUD patterns, well-documented
- **Phase 3 (Planning):** Meal rotation is simple (random selection + recency check), no complex algorithms
- **Phase 4 (Swap):** Single-mutation Server Action, straightforward implementation
- **Phase 5 (Deploy):** Vercel + Next.js deployment is zero-config, well-documented

**No phases require deep research during planning.** All patterns are established and well-documented. If complexity increases (e.g., adding grocery lists), that would trigger research-phase.

### Suggested V1.x Enhancements (Post-Launch)

After V1 validation, consider these additions based on user demand signals:

- **Plan history** — add only if users explicitly request "what did I eat last week?" (storage is cheap, feature is simple)
- **Multi-week view** — add if users want to see future plans early (requires minimal UI changes)
- **Meal frequency hints** — "Haven't had X in a while" alerts if rotation gets stale (requires tracking usage over time)
- **Email authentication** — add after Google proves auth flow works (reduces provider lock-in)

Do NOT add: recipe content, nutrition tracking, AI recommendations, shopping lists, social features. These violate the anti-feature list and recreate problems the app solves.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 15.5, React 19, Auth.js v5, Prisma 7, Tailwind 4 all have official docs and Context7 library coverage. Version compatibility verified. Critical CVE-2025-29927 auth pattern documented. |
| Features | HIGH | Extensive competitive analysis of meal planning apps (Mealime, Ollie, Plan to Eat, Paprika). Decision fatigue research from peer-reviewed sources. User abandonment patterns well-documented. V1 scope validated against table stakes. |
| Architecture | MEDIUM | Next.js App Router patterns well-documented. Server Actions + RSC approach is current best practice (2026). Meal rotation algorithms simple and proven. Lower confidence on specific database choice (Neon vs Supabase vs PlanetScale—all work equally well). |
| Pitfalls | MEDIUM | Strong evidence for complexity death spiral (70% abandonment rate), recipe app drift (user complaints documented), variety paradox (research on meal rotation). Lower confidence on specific thresholds (e.g., "60 seconds" vs "90 seconds" for planning time—60s is educated guess based on decision fatigue research). |

**Overall confidence:** HIGH

The core recommendation (Next.js + Auth.js + simple rotation logic) is well-supported by official docs and verified sources. The anti-feature list is backed by user abandonment research. The main uncertainty is calibration (exact thresholds for "too complex" or "too repetitive"), which can be validated during implementation with real usage data.

### Gaps to Address

**Starter pack meal selection:** Research doesn't specify which 15-20 meals to include. Need to choose culturally-appropriate, widely-known meals during Phase 2 implementation. Mitigation: make editing/deleting easy so users customize immediately.

**Rotation cadence:** Unclear whether 2-week or 4-week rotation is optimal. Research shows both work. Mitigation: start with 2-week (don't repeat meals from previous week), adjust in V1.x if users report repetition complaints.

**Swap UI placement:** Research doesn't specify optimal swap button placement (inline per day vs modal vs separate page). Mitigation: start with inline "Swap" button per day (simplest), iterate based on user testing.

**Plan regeneration frequency:** Open question whether users want full plan regeneration weekly, bi-weekly, or on-demand only. Mitigation: V1 implements on-demand generation, track usage patterns to inform automatic regeneration in V1.x.

**Hosting costs at scale:** Vercel free tier sufficient for minimal app, but research notes costs can scale to $500-2000/month for moderate traffic. Mitigation: V1 stays on free tier, monitor usage, consider Railway/Fly.io if costs become prohibitive.

## Sources

### Primary (HIGH confidence)
- **Next.js 15.5 Release Notes** (official) — App Router, React 19 support, Turbopack, typed routes
- **Auth.js Documentation** (official) — Google OAuth setup, CVE-2025-29927 security guidance, Data Access Layer pattern
- **Prisma Next.js Docs** (official) — Integration guide, Prisma 7 pure TypeScript migration
- **Neon Vercel Postgres Transition Guide** (official) — Vercel Postgres now uses Neon backend, free tier specs
- **TypeScript 5.8 Announcement** (official Microsoft) — Latest stable features
- **Tailwind CSS Next.js Guide** (official) — Setup and configuration
- **Context7 library IDs** — Next.js authentication patterns, React 19 best practices

### Secondary (MEDIUM confidence)
- **12 Best Meal Planning Apps for 2025** (AI Meal Plan) — Competitive feature analysis
- **Best Meal-Planning Apps 2026** (CNN Underscored) — User frustrations, retention data
- **Why Don't More People Use Meal Planning Apps?** (Oha Potato) — Abandonment reasons, complexity issues
- **Decision Fatigue Research** (Real Food Whole Life, Joyfully Fed Nutrition) — 200+ daily food decisions, automation value
- **Simple Monthly Meal Planning** (A Humble Place, Good Cheap Eats) — Two-week rotation patterns proven effective
- **Complete Next.js Security Guide 2025** (Turbostarter) — CVE-2025-29927 details, middleware risks
- **Prisma vs Drizzle 2026** (MakerKit) — ORM comparison for Next.js
- **Biome vs ESLint 2025** (Better Dev) — Tooling comparison, speed benchmarks
- **Mobile Apps to Support Healthy Family Food Provision** (NCBI PMC) — Systematic assessment of meal planning apps, retention issues
- **Barriers to Using Nutrition Apps** (NCBI PMC) — Manual logging kills retention, mean rating 3.0-3.7/5.0

### Tertiary (LOW confidence)
- **Vercel Alternatives 2025** (Snappify) — Deployment cost comparisons (needs validation with real usage)
- **AI-Driven Meal Planning Apps Market** (Market.us) — 28.10% CAGR market growth (context only, not product design guidance)

---
*Research completed: 2026-02-09*
*Ready for roadmap: YES*
