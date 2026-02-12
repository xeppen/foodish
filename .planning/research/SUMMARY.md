# Project Research Summary

**Project:** What's for Dinner? v1.1 (Ratings, Variety, Complexity)
**Domain:** Meal Planning App Enhancement
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

This research focused on adding smart variety features to an existing, validated meal planning application. The v1.0 app successfully delivers "boring, predictable, relieving" dinner planning for families who want to remove decision fatigue. v1.1 adds ratings, complexity levels, variety enforcement, and filtered swapping without compromising the core simplicity.

The recommended approach requires zero new npm packages. All features implement via Prisma schema extensions (2 new enums, usage tracking), enhanced Server Actions (filtered queries, rotation logic), and progressive disclosure UI patterns (Tailwind + useState). The existing stack (Next.js 15 + Prisma + Clerk + React Server Components) already provides all necessary capabilities.

Key risks center on maintaining v1.0's speed and simplicity while adding power user features. Progressive disclosure keeps the fast path unchanged while revealing advanced controls for those who want them. Graceful constraint degradation prevents "no meals available" errors when variety rules conflict with small meal libraries. Conservative rating weights ensure preferences enhance rather than limit variety.

## Key Findings

### Recommended Stack

**ZERO new dependencies required.** All v1.1 features implement using the existing validated stack with schema extensions and enhanced logic.

**Core technologies (unchanged from v1.0):**
- **Next.js 15.5.12**: Server Actions handle all new data mutations (ratings, swaps)
- **Prisma 5.22.0**: Schema extensions add rating/complexity enums, UsageHistory tracking
- **TypeScript**: Prisma generates types for new fields, maintaining end-to-end type safety
- **Tailwind CSS**: Progressive disclosure UI via hidden class + conditional rendering
- **Clerk 6.37.3**: User context for all preference data
- **lucide-react 0.563.0**: Already includes ThumbsUp, ThumbsDown, ChevronDown icons
- **Zod 4.3.6**: Extends to validate new rating/complexity fields

**Why no changes:** Next.js 15 Server Actions + Prisma's type generation + React Server Components already provide patterns for preference management, filtered queries, and optimistic updates. Adding UI libraries (Radix, Headless UI) would add 12KB+ for functionality achievable with 50 lines of Tailwind.

**Migration strategy:** Add enum fields with explicit defaults (rating: NEUTRAL, complexity: MEDIUM). Since the app is pre-launch, use clean schema evolution over nullable transitional fields. Indexes on (userId, rating) and (userId, complexity) optimize filtered queries.

### Expected Features

**Must have (table stakes for variety control):**
- **Binary rating system** - Users expect to influence what appears (thumbs up/down proven 200% more engaging than 5-star)
- **No duplicates in current week** - Hard rule; users notice immediately if Monday's meal repeats Wednesday
- **Complexity indication** - 58% cite "time constraints" as challenge; need to distinguish quick vs involved meals
- **Persistent preferences** - Ratings must survive sessions; re-rating = broken experience
- **Variety without configuration** - Rotation should "just work" without manual rules

**Should have (competitive differentiators):**
- **Progressive disclosure swap** - Fast random stays default; filters revealed for power users (NN/g pattern)
- **Automatic long-term rotation** - 2-3 week rotation prevents "favorites loop" without user thinking
- **Zero-config complexity defaults** - New meals auto-default to MEDIUM (70% of recipes)
- **Transparent variety algorithm** - Show WHY meal chosen ("Haven't had this in 2 weeks") vs black-box AI

**Defer (anti-features for v1.1):**
- 5-star ratings (adds ambiguity vs binary clarity)
- ML recommendation engine (over-engineering for 18-meal sets)
- Hard exclusions ("never show") - shrinks viable pool dangerously
- Extensive meal metadata (adds friction on add)
- Strict rotation schedules (reduces flexibility)

**Feature dependencies:**
- Rating system enhances swap filtering + variety algorithm
- No duplicates rule conflicts with hard exclusions (use soft deprioritization)
- Complexity levels enable filtered swapping
- Progressive disclosure builds on v1.0 one-click swap (preserves fast path)
- Long-term rotation prevents favorites loop automatically

### Architecture Approach

All enhancements integrate cleanly with existing Next.js 15 + Prisma + RSC architecture. Database adds Rating/Complexity enums with defaults, UsageHistory model tracks meal usage over time. Server Actions extend to support filtered queries (complexity, rating, recency). UI components use progressive disclosure in the single-view plan experience: fast swap stays primary, advanced filters revealed on demand.

**Major components:**
1. **Enhanced Meal Model** - Adds rating (THUMBS_UP/NEUTRAL/THUMBS_DOWN) and complexity (SIMPLE/MEDIUM/COMPLEX) enums with indexes for filtered queries
2. **UsageHistory Tracking** - New model records each meal usage with timestamp + week context, enabling 2-3 week rotation logic without WeeklyPlan schema changes
3. **Enhanced selectRandomMeals()** - Queries UsageHistory for last 2 weeks, filters by complexity/rating, prioritizes least-recent with graceful constraint degradation when pool insufficient
4. **Progressive Disclosure Swap UI** - SwapModal component shows filtered meal list (complexity chips + favorites toggle + recency auto-applied) with result counts and zero-state fallbacks
5. **RatingToggle Component** - Three-state control (thumbs up/neutral/down) with optimistic updates via useState + Server Action rollback on error

**Architectural patterns:**
- **Enum-based features** - Prisma enums with defaults enable type-safe, backward-compatible additions
- **Optimistic UI** - Update state immediately, rollback on error (instant feedback for ratings)
- **Progressive disclosure** - Simple action visible, filters revealed on demand (reduces cognitive load)
- **Usage history for rotation** - Track each usage with context vs just lastUsed (supports "not in last N weeks" rules)
- **Graceful degradation** - Constraint relaxation cascade when filters produce zero results

**Anti-patterns avoided:**
- Storing meal IDs in WeeklyPlan (breaks historical plans if meal deleted)
- Client-side filtering (sends unnecessary data, duplicates logic)
- Complex rating scales (1-5 stars = analysis paralysis vs binary clarity)
- Global complexity settings (prevents context-aware decisions)

### Critical Pitfalls

1. **Null rating migration breaking plan generation** - Existing meals have null ratings; algorithm must treat null as neutral, never filter by `rating != null`. Migration adds nullable field with default, queries use coalescing: `orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { lastUsed: "asc" }]`. Test with all-null ratings before deploy.

2. **Variety rules creating "no meals available" edge cases** - User with 8 meals can't generate 5-day plan after 2 weeks because constraints too strict. Implement constraint relaxation cascade: (1) Rating >0 + variety rules + complexity match, (2) Rating >-1 + relaxed variety, (3) Any rated meal, (4) ANY meal. Show user message: "We repeated a recent meal because your library is small."

3. **Complexity filtering causes empty swap results** - Filter by "Simple" + exclude current week + exclude recent = zero results. Always show result count in filter UI: "Simple (3 meals)" vs "Simple (0 meals)". When zero, show fallback section with unfiltered options. Keep "Random" option that ignores all filters.

4. **Progressive disclosure slowing down the fast path** - v1.0's value is "sub-60 second planning." New features must not clutter main UI. Keep plan page identical: 5 meals, one swap button per day (no filters shown). Filters revealed only after clicking swap (modal with progressive disclosure). Ratings = small star icon (optional). Complexity badges only on Meals page.

5. **Ratings encouraging meal library stagnation** - Users rate 5 favorites highly, algorithm only shows those 5 → repetitive plans despite variety features. Limit rating influence: 5-star meals 2x more likely than 3-star, but 3-star still appear regularly. Ratings adjust probability, don't override variety constraints. No "hide meals under X stars" option.

6. **Database migration without schema/code alignment** - Schema evolves without matching app logic and tests. For pre-launch, apply schema + app updates together and verify with integration tests before release.

7. **Complexity levels without clear definitions** - Users interpret "Quick" differently (time? technique? cleanup?). Provide explicit definitions: Quick = "30 min or less, minimal prep" (pasta, stir-fry), Medium = "30-60 min, standard" (roasted chicken), Advanced = "60+ min or special techniques" (braised dishes). Show examples in UI when adding complexity.

8. **Over-engineering variety rules** - Feature creep leads to "no same protein twice," "balance cuisines," complex constraint satisfaction. Start with ONE rule: "Avoid meals used in last N days." Make N configurable (default 7). Ship, measure, iterate. Performance requirement: plan generation <2 seconds.

## Implications for Roadmap

Based on research, v1.1 breaks into 5 sequential phases with clear dependencies:

### Phase 1: Database Foundation
**Rationale:** All features depend on schema changes; must come first with clean schema migration.
**Delivers:** Prisma schema with Rating/Complexity enums, UsageHistory model, indexes for filtered queries.
**Addresses:** Foundation for ratings (FEATURES.md), variety tracking (FEATURES.md), filtered swapping (FEATURES.md).
**Avoids:** Null rating migration pitfall (PITFALLS.md #1), backwards compatibility issues (PITFALLS.md #6).
**Components:**
- Add Rating enum (THUMBS_DOWN/NEUTRAL/THUMBS_UP) with default NEUTRAL
- Add Complexity enum (SIMPLE/MEDIUM/COMPLEX) with default MEDIUM
- Extend Meal model with rating/complexity fields (defaulted, indexed)
- Create UsageHistory model (mealId, usedDate, weekStartDate, userId)
- Run migration: `npx prisma migrate dev --name add_ratings_complexity_variety`

### Phase 2: Variety Rules & Rotation Logic
**Rationale:** Core value prop of v1.1; must implement before UI features that depend on smart selection.
**Delivers:** Enhanced selectRandomMeals() with 2-3 week rotation, no-duplicate enforcement, graceful degradation.
**Addresses:** Long-term rotation (FEATURES.md), no duplicates rule (FEATURES.md), variety without configuration (FEATURES.md).
**Avoids:** "No meals available" edge case (PITFALLS.md #2), over-engineering variety rules (PITFALLS.md #8).
**Components:**
- Extend selectRandomMeals() to query UsageHistory for last 2 weeks
- Implement constraint relaxation cascade (rating filters → variety rules → any meal)
- Hard rule: exclude current week meals (no duplicates)
- Soft rule: deprioritize meals used in last 14 days (configurable)
- Create UsageHistory entries on plan generation and swap
- Test with small meal libraries (6-8 meals) to verify degradation

### Phase 3: Rating System & UI
**Rationale:** User preference capture enables filtered swapping in next phase; independent of complexity.
**Delivers:** RatingToggle component, rateMeal Server Action, optimistic UI updates, rating display in meal list.
**Addresses:** Binary rating system (FEATURES.md), persistent preferences (FEATURES.md).
**Avoids:** Ratings causing stagnation (PITFALLS.md #5), null ratings breaking generation (PITFALLS.md #1).
**Components:**
- Create RatingToggle component (3 buttons: ThumbsUp/Neutral/ThumbsDown)
- Implement rateMeal() Server Action with optimistic updates
- Add rating toggle to meal-card.tsx and meal-drawer.tsx
- Update generateWeeklyPlan() to prioritize THUMBS_UP, deprioritize THUMBS_DOWN (but never exclude)
- Conservative rating weight: 2x probability boost for THUMBS_UP vs NEUTRAL

### Phase 4: Complexity Levels & Badges
**Rationale:** Enables filtered swapping in next phase; independent of ratings.
**Delivers:** Complexity selector in meal form, ComplexityBadge component, complexity-aware queries.
**Addresses:** Cook time/effort indication (FEATURES.md), zero-config defaults (FEATURES.md).
**Avoids:** Unclear definitions (PITFALLS.md #7), complexity filter empty results (PITFALLS.md #3 prevention).
**Components:**
- Create ComplexityBadge component with clear visual coding (green=Simple, yellow=Medium, orange=Advanced)
- Add complexity selector to AddMealForm (dropdown with definitions + examples)
- Display complexity badges in meal list (Meals page only, not Plan view)
- Show explicit definitions in UI: "Simple: 30 min or less, minimal prep (pasta, stir-fry)"
- Update selectRandomMeals() to accept optional complexity filter

### Phase 5: Progressive Disclosure Swap
**Rationale:** Brings all features together; requires ratings + complexity + variety logic from prior phases.
**Delivers:** SwapModal with filters (complexity chips, favorites toggle), filtered meal list with metadata, result counts.
**Addresses:** Progressive disclosure swap (FEATURES.md), filtered swapping (FEATURES.md), transparent algorithm (FEATURES.md).
**Avoids:** Slowing down fast path (PITFALLS.md #4), empty filter results (PITFALLS.md #3).
**Components:**
- Create SwapModal component with progressive disclosure pattern
- Implement getSwapOptions() Server Action (filters by complexity, rating, recency)
- Filter UI shows result counts: "Simple (3 meals)" vs "Simple (0 meals)"
- Zero-state fallback: "No meals match filters. Here are other options:"
- Keep main plan page unchanged: swap button opens modal (fast path preserved)
- Enhance swapDayMeal() to accept specific meal ID vs random selection

### Phase Ordering Rationale

1. **Database first** - Schema changes are prerequisite for all features; migration must be backward-compatible to avoid production issues.

2. **Variety rules second** - Core algorithm enhancement independent of UI; enables testing rotation logic before adding preference layers.

3. **Ratings and complexity in parallel** - Both capture preferences but don't depend on each other; can build simultaneously or sequentially without blocking.

4. **Swap UI last** - Brings all prior features together; progressive disclosure requires all filters to be functional before UI implementation.

**Dependency chain:**
```
Database Schema (Phase 1)
    ├─> Variety Rules (Phase 2) [uses UsageHistory]
    │       └─> Progressive Swap (Phase 5) [filters + fallbacks]
    ├─> Rating System (Phase 3) [uses Rating enum]
    │       └─> Progressive Swap (Phase 5) [favorites filter]
    └─> Complexity Levels (Phase 4) [uses Complexity enum]
            └─> Progressive Swap (Phase 5) [complexity filter]
```

**How this avoids pitfalls:**
- Phase 1 addresses migration pitfalls before any feature code written
- Phase 2 implements graceful degradation from start (not retrofitted)
- Phase 3 & 4 keep rating/complexity independent (reduces testing complexity)
- Phase 5 validates fast path preservation when all features integrated

### Research Flags

**Phases needing deeper research during planning:**
- **None** - All phases use well-documented patterns (Prisma enums, Server Actions, progressive disclosure). Research provided sufficient detail for implementation.

**Phases with standard patterns (skip research-phase):**
- **Phase 1** - Prisma migrations well-documented; follow multi-phase deployment pattern
- **Phase 2** - Variety algorithm extends existing selectRandomMeals() logic
- **Phase 3** - Rating UI uses proven optimistic update pattern (useState + rollback)
- **Phase 4** - Complexity badges = standard Tailwind component pattern
- **Phase 5** - Progressive disclosure documented by NN/g; modal pattern established in v1.0

**Implementation confidence:**
All phases have HIGH confidence. STACK.md confirms zero new dependencies needed, FEATURES.md provides clear requirements from user research, ARCHITECTURE.md details integration patterns with existing codebase, PITFALLS.md identifies specific edge cases to test. No gaps requiring additional research during planning.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies; existing stack (Next.js 15 + Prisma + RSC) proven sufficient. Version numbers confirmed current as of Feb 2026. |
| Features | HIGH | Binary ratings backed by Netflix engagement data (200% improvement). Variety rules validated by meal planning research (2-3 week rotation standard). Progressive disclosure from NN/g patterns. |
| Architecture | HIGH | All patterns extend existing v1.0 codebase (Server Actions, Prisma enums, optimistic UI). Integration points clear from codebase analysis. |
| Pitfalls | HIGH | Specific edge cases identified from combination of meal planning app research + database migration best practices + codebase analysis. Prevention strategies concrete. |

**Overall confidence:** HIGH

All research areas reached HIGH confidence through combination of official documentation (Prisma, Next.js), established UX patterns (progressive disclosure, optimistic updates), domain research (meal planning apps, variety algorithms), and existing codebase analysis. No areas of uncertainty remain that would block implementation.

### Gaps to Address

**None requiring pre-planning resolution.** All areas have sufficient detail for roadmap creation and phase planning.

**Validation during implementation:**
- **Rating weight tuning** - Exact multiplier (2x? 3x?) for THUMBS_UP priority determined through testing with realistic meal libraries. Conservative starting point: 2x probability boost.
- **Variety window configuration** - Default 14 days for "exclude recent" rule may need tuning based on user feedback. Make configurable per user if needed (defer to v1.2+).
- **Complexity definitions** - Refine definitions based on how users actually categorize their meals. Current definitions (time-based thresholds) may need adjustment after observing usage patterns.
- **Constraint degradation thresholds** - When to relax which constraints determined through testing edge cases. Framework established, exact triggers tuned during Phase 2 implementation.

These are tuning parameters, not architectural unknowns. Implementation can proceed with documented conservative defaults, iterate based on real usage data.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) - Enum types, model relations, migration patterns
- [Next.js Server Actions](https://nextjs.org/docs/app/getting-started/updating-data) - Server Action patterns, revalidation
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic) - Optimistic UI updates
- [Lucide Icons](https://lucide.dev/icons/thumbs-up) - Confirmed ThumbsUp, ThumbsDown, ChevronDown icons available

**Package Versions (verified Feb 2026):**
- lucide-react 0.563.0 (latest)
- Zod 4.3.6 (latest)
- Next.js 15.5.12 (latest stable)
- Prisma 5.22.0 (5.x sufficient; 7.x breaking changes without needed features)

**Codebase Analysis:**
- `/Users/seblju/Development/repos/foodish/lib/actions/plans.ts` - Existing planning algorithm structure
- `/Users/seblju/Development/repos/foodish/lib/actions/meals.ts` - Meal CRUD patterns
- `/Users/seblju/Development/repos/foodish/prisma/schema.prisma` - Current schema structure
- `/Users/seblju/Development/repos/foodish/.planning/v1.0-MILESTONE-AUDIT.md` - v1.0 performance baselines

### Secondary (MEDIUM-HIGH confidence)

**Technical Patterns:**
- [Prisma Enum with TypeScript](https://www.squash.io/tutorial-on-prisma-enum-with-typescript/) - Type-safe enum integration
- [Type-Safe Prisma Enum Integration](https://openillumi.com/en/en-prisma-enum-client-side-best-practice/) - Client-side enum usage
- [Next.js 15 Advanced Patterns 2026](https://johal.in/next-js-15-advanced-patterns-app-router-server-actions-and-caching-strategies-for-2026/) - Server Action best practices
- [PostgreSQL Tutorial 2026](https://thelinuxcode.com/postgresql-tutorial-2026-from-first-query-to-production-grade-patterns/) - Database patterns

**Database Migrations:**
- [PostgreSQL nullable columns and NOT NULL](https://www.sqlservercentral.com/articles/nullable-vs-non-nullable-columns-and-adding-not-null-without-downtime-in-postgresql)
- [Safely Adding NOT NULL Columns - Shopify](https://shopify.engineering/add-not-null-colums-to-database) - Production migration patterns
- [Database Migrations: The Silent Killer](https://toolshelf.tech/blog/database-migrations-disasters/) - Migration failure patterns

**UX Patterns:**
- [Progressive Disclosure - NN/g](https://www.nngroup.com/articles/progressive-disclosure/) - Established pattern documentation
- [Progressive Disclosure Examples](https://userpilot.com/blog/progressive-disclosure-examples/) - Implementation examples
- [Getting filters right - LogRocket](https://blog.logrocket.com/ux-design/filtering-ux-ui-design-patterns-best-practices/) - Filter UX best practices
- [useOptimistic Limitations](https://www.columkelly.com/blog/use-optimistic) - When NOT to use optimistic updates

**User Research:**
- [5 stars vs thumbs up/down - Appcues](https://www.appcues.com/blog/rating-system-ux-star-thumbs) - Rating system engagement data (200% improvement)
- [Which Rating System Is Best - Medium](https://medium.com/enjoyhq/which-rating-system-is-best-for-your-users-9fddeeb455b5) - User preference research
- [Understanding User Rating Systems - Nudge](https://www.nudgenow.com/blogs/understanding-different-user-rating-systems-impact) - Rating impact analysis

**Meal Planning Domain:**
- [Meal Planning 101: Two-Week Rotation](https://goodcheapeats.com/meal-planning-101-make-a-two-week-rotation/) - Rotation strategies
- [Rotating Meal Plan Tutorial](https://healthfullyrootedhome.com/rotating-meal-plan/) - Variety implementation
- [The Rules & Models of Meal Planning](https://www.heinens.com/stories/the-rules-models-of-meal-planning/) - Planning patterns
- [Recipe Difficulty Levels](https://cookwhatmatters.com/recipes/recipe-difficulty-levels/) - Complexity categorization
- [Recipe Level Of Effort Scale](https://mealplanningblueprints.com/recipe-level-of-effort-scale/) - Effort metrics

**Competitive Analysis:**
- [Expert Reviewed: Best Meal Planner Apps](https://fitia.app/learn/article/best-meal-planner-apps-2025-expert-review/) - Feature comparison
- [The Best Meal-Planning Apps in 2026](https://www.cnn.com/cnn-underscored/reviews/best-meal-planning-apps) - UX patterns
- [Best Meal Planning Apps (Ranked)](https://ollie.ai/2025/10/21/best-meal-planning-apps-in-2025/) - Competitive positioning
- [Why don't more people use meal planning apps?](https://ohapotato.app/potato-files/why-dont-more-people-use-meal-planning-apps) - Abandonment patterns

**Recommendation System Research:**
- [AI-based nutrition recommendation system - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12390980/) - Variety constraints, dietary diversity
- [Food Recommendation Framework](https://arxiv.org/pdf/1905.06269) - Constraint satisfaction patterns
- [Resolving cold start in recommender systems](https://www.sciencedirect.com/science/article/abs/pii/S0045790621003311) - Cold start with sparse ratings
- [Addressing sparse data challenges](https://www.sciencedirect.com/science/article/pii/S2667305324001480) - Sparse rating data handling

### Tertiary (Context Only)

**Prisma Version Research:**
- [Prisma 7.2.0 Release Notes](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0) - Confirmed no needed features in v7
- [Prisma 7.0.0 Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) - Breaking changes without value for v1.1

**Additional Context:**
- [Flexible Meal Planning 2026](https://planeatai.com/blog/flexible-meal-planning-without-a-strict-plan-2026) - User flexibility preferences
- [ADHD Meal Planning App](https://www.adhdweasel.com/p/we-built-an-adhd-meal-planner-for) - Decision fatigue patterns
- [Calculating Recipe Difficulty - ACM](https://dl.acm.org/doi/10.1145/3106668.3106673) - Complexity algorithms

---
*Research completed: 2026-02-12*
*Ready for roadmap: yes*
