# Feature Research

**Domain:** Meal planning/dinner decision tools
**Researched:** 2026-02-09 (v1.0), 2026-02-12 (v1.1 supplement)
**Confidence:** HIGH (v1.0), MEDIUM (v1.1 - web search validated)

---

## V1.0 FEATURES (SHIPPED) ✅

[Previous v1.0 research retained below for reference]

---

## V1.1 FEATURES: SMART VARIETY & PREFERENCES

**Focus:** Ratings, variety rules, complexity levels, enhanced swapping
**Research date:** 2026-02-12

### Table Stakes (Users Expect These)

Features users assume exist in meal planning with variety control. Missing these = product feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Binary rating system (thumbs up/down) | Simple feedback mechanism. Netflix saw 200% more engagement than 5-star. Users expect to influence what appears. | LOW | Store as boolean per user-meal. Up = prioritize, Down = deprioritize (not exclude). No rating = neutral. |
| No duplicate meals in current week | Hard rule. Users notice immediately if same meal appears Mon + Wed. Table stakes for credibility. | LOW | Filter out current week meals from generation/swap pool. Trivial with existing plan data. |
| Cook time/effort indication | 58% cite "time constraints" as primary challenge. Expect to know if meal is quick or involved. | LOW | 3-level system: simple/medium/complex. Proxy for time + effort + cleanup. |
| Persistent preferences | Ratings must carry forward. Re-rating same meal = broken. Sessions don't reset opinions. | LOW | Already have user-meal model. Add `rating` boolean and `complexity` enum. Standard DB persistence. |
| Variety without setup | Expect variety to "just work". Don't want to configure rotation schedules or exclusion rules. | MEDIUM | Combination of hard rules (no dupe in week) + soft rules (recency, ratings). Transparent algorithm. |

### Differentiators (Competitive Advantage)

Features that set us apart in the variety/preference space.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Progressive disclosure swap | Fast path stays fast (random), advanced users get control. Aligns with "decision removal" while serving power users. | MEDIUM | Layer 1: One-click random (current). Layer 2: Expand → filtered by complexity/rating/recency. NN/g pattern. |
| Automatic long-term rotation | 2-5 week rotation standard. Prevents "favorites loop" without user thinking about it. | MEDIUM | Track last-used, boost meals unused 2+ weeks. Show passive feedback: "14/18 used this month". |
| Zero-config complexity defaults | New meals = medium complexity by default. Avoids cold-start setup. Research shows 70% recipes are medium. | LOW | Auto-default on add. Show in meal list, allow change. Optional, not mandatory. |
| Context-aware swap filters | If swapping Monday 5pm = show simple/medium first. Planning Sunday = show all. Time-of-action as signal. | MEDIUM | Implicit intelligence without explicit "what do you want?" prompts. Reduces decision load. |
| Transparent variety algorithm | Users see WHY meal chosen: "Haven't had this in 2 weeks" / "You rated this up". No black box AI confusion. | LOW | Tooltips/badges explaining selection. Trust through transparency. Competitors hide algorithm. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good in variety control but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Complex preference profiles | Feels comprehensive. "Tell us dietary restrictions, cuisines, allergies". | Creates massive setup burden. Research: users weigh effort vs benefit → abandonment. Constraints reduce variety. | Implicit via ratings. Thumbs down = "don't show often". Zero setup. Learn from usage. |
| 5-star rating system | Feels nuanced. "I want to express degree of preference". | Research: binary gets 200% more engagement. 3-star ratings = ambiguous noise. Adds decision fatigue. | Binary thumbs. Clear semantics: up = "show this", down = "don't". Force opinion or skip. |
| ML recommendation engine | Sounds sophisticated. Competitors tout AI. | Requires massive data. Black box = confusion. Over-engineering for 18-meal set. "Why THIS?" becomes support burden. | Explicit rules users understand: no dupes, prioritize rated-up, rotate 2-3 weeks. Transparent. |
| Hard exclusions ("never show") | Users frustrated by meal appearing. "I hate this, remove it". | Shrinks viable pool. 18 meals, exclude 3 = 15 for 5 days. Low variety. Users forget what they excluded. | Soft deprioritization. Thumbs down = rarely show, but still viable. Algorithm can resurrect if pool shrinks. |
| Meal categorization | "Pasta = dinner, pancakes = breakfast". Feels organized. | Adds taxonomy burden. Most users plan dinners only. Category enforcement = artificial limits. | Category-free. Meal is meal. User thumbs-down if wrong context. Self-correcting. |
| Extensive meal metadata | "Store ingredients, prep time, equipment, servings". Feels database-complete. | Every field = friction on add. Users won't fill 8 fields. Data rot. Analysis paralysis. | Minimal: name, complexity, rating, last-used. Fast add = more meals = better variety. |
| Strict rotation schedules | "Show X every 2 weeks exactly". Feels controllable. | Creates artificial frequency rules. Reduces flexibility. Users forget their own rules. | Automatic rotation with soft prioritization. Meals emerge naturally from recency + ratings. |

### V1.0 Features (Already Shipped)

Retained from previous research for context.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Meal list management | Every meal planner stores meals somehow | LOW | Simple CRUD on text entries. V1: Pre-filled starter pack + user editing |
| Weekly plan view | Industry standard is 5-7 day planning window | LOW | Read-only display of generated plan. V1: 5 weekdays only |
| Plan generation | Users expect automation, not manual slot-filling | MEDIUM | Core value prop. V1: Simple algorithm with recency tracking |
| Plan persistence | Plans need to survive app close/refresh | LOW | Basic data storage. V1: Persist to database |
| Swap/regenerate capability | When plan doesn't fit, users need escape hatch | MEDIUM | Allows reaction without full re-plan. V1: One-click swap per day |
| User authentication | Multi-device access expected for any modern tool | LOW | Standard auth flow. V1: Google sign-in only |

## Feature Dependencies

### V1.1 Dependencies

```
[Binary rating system]
    └──enhances──> [Smart swap filtering]
    └──enhances──> [Variety algorithm]
    └──enhances──> [Long-term rotation]

[No duplicates in week] (hard rule)
    └──requires──> [Current week meal tracking]
    └──conflicts──> [Hard exclusions] (anti-feature)

[Complexity levels]
    └──enhances──> [Smart swap filtering]
    └──enhances──> [Context-aware defaults]
    └──requires──> [Zero-config defaults]

[Progressive disclosure swap]
    └──requires──> [Smart swap filtering]
    └──requires──> [Binary rating system]
    └──requires──> [Complexity levels]
    └──builds-on──> [V1.0 one-click swap]

[Long-term rotation tracking]
    └──requires──> [Last-used date per meal]
    └──enhances──> [Variety algorithm]
    └──enhances──> [Transparent selection]
```

### Dependency Notes (V1.1)

- **Binary ratings enhance variety algorithm:** Up-rated meals get priority boost (but not consecutive days). Down-rated get deprioritized 70-80% but remain in pool.
- **No duplicates requires week tracking:** Before generation/swap, query current Mon-Fri plan. Filter these IDs from candidate pool. Hard constraint.
- **No duplicates conflicts with hard exclusions:** If users can permanently exclude + no-dupe rule, viable pool shrinks fast. Use soft deprioritization instead.
- **Complexity enables smart filtering:** Swap UI shows options grouped: Simple (3), Medium (8), Complex (2). Reduces scroll + cognitive load vs flat 18-item list.
- **Progressive disclosure builds on V1.0:** Layer 1 keeps existing one-click random. Layer 2 adds expand-for-filters. Preserves fast path, adds power user path.
- **Long-term rotation prevents favorites loop:** Track last_used date. Meals unused 14+ days get 2x priority. Meals used 2+ times in 7 days get 0.5x priority. Automatic variety.

### V1.0 Dependencies (Retained)

```
[User Authentication]
    └──requires──> [Plan Persistence]
                       └──requires──> [Weekly Plan View]

[Meal List Management]
    └──requires──> [Plan Generation]
                       └──requires──> [Weekly Plan View]
                       └──requires──> [Swap Capability]

[Starter Pack] ──enhances──> [Meal List Management]
[Swap Capability] ──enhances──> [Plan Generation]

[Recipe Content] ──conflicts──> [Single-Purpose Focus]
[Grocery Lists] ──conflicts──> [Minimal Complexity]
[Social Features] ──conflicts──> [Privacy-First Design]
```

## MVP Definition

### Launch With (v1.1) — THIS MILESTONE

Smart variety features to add to existing v1.0 base.

- [x] **Binary rating system** — Thumbs up/down per meal. Stored per user-meal. Influences generation.
- [x] **No duplicates in current week** — Hard constraint: filter out Mon-Fri meals from generation/swap pool.
- [x] **Complexity levels (3-tier)** — Simple/Medium/Complex. Auto-default Medium on new meals. Shown in meal list.
- [x] **Enhanced swap with progressive disclosure** — Keep one-click random. Add expand → filtered view (by complexity, by rating, by recency).
- [x] **Long-term rotation tracking** — Track last_used per meal. Auto-boost meals unused 14+ days. Auto-deprioritize overused favorites.

**Why this is minimal for v1.1:** Adds smart variety without setup burden. Ratings = implicit preferences. Complexity = minimal metadata. No complicated forms. Builds naturally on v1.0.

### Add After V1.1 Validation

Features to add once smart variety is working and validated.

- [ ] **Variety dashboard** — "14/18 meals used this month" passive visibility. Gamification without pressure. (Trigger: users ask about variety)
- [ ] **Time-context swap defaults** — If swapping Mon 5pm → default to simple/medium filter. (Trigger: usage patterns show timing correlation)
- [ ] **Bulk rating wizard** — "Rate your starter pack meals" one-time flow. (Trigger: cold-start complaints, users don't rate organically)
- [ ] **Transparent selection reasons** — Tooltip on each planned meal: "Last had 12 days ago" or "You rated this up". (Trigger: "why THIS meal?" questions)
- [ ] **Complexity auto-inference** — When user edits meal name: "Slow Cooker Pot Roast" → suggest Complex. Optional accept/reject. (Trigger: complexity assignment friction)

### Future Consideration (v2+)

Features to defer until smart variety proven.

- [ ] **Custom complexity definitions** — Let user define "simple = <30min" vs defaults. (Trigger: complaints about complexity accuracy)
- [ ] **Seasonal meal toggling** — "Don't show soup in summer". Binary on/off per meal. (Trigger: seasonal swap patterns)
- [ ] **Meal tags/categories** — User-defined tags, filterable. "Quick", "Kid-friendly", "Fancy". (Trigger: repeated filtering patterns in swap usage)
- [ ] **Collaborative ratings** — Household members vote on meals. (Trigger: multi-user accounts in v2+)
- [ ] **Advanced rotation rules** — "Show X every 2 weeks minimum". Custom frequency hints. (Trigger: power users wanting control)

**Explicitly WON'T BUILD:**
- 5-star or scale ratings (binary proven better)
- ML recommendation / AI optimization (over-engineering)
- Hard exclusions / "never show" (shrinks pool dangerously)
- Extensive meal metadata (setup burden)
- Complex preference profiles (anti-feature)

## Feature Prioritization Matrix (V1.1)

| Feature | User Value | Implementation Cost | Priority | Notes |
|---------|------------|---------------------|----------|-------|
| Binary rating (thumbs) | HIGH | LOW | P1 | Core preference signal. UI: icon buttons. DB: boolean field. |
| No duplicates in week | HIGH | LOW | P1 | Hard constraint. Trivial filter on generation/swap. |
| Complexity levels | MEDIUM | LOW | P1 | Enum field + UI badges. Auto-default medium. |
| Progressive swap UI | HIGH | MEDIUM | P1 | Keep current random. Add expand → filtered list. Frontend mainly. |
| Long-term rotation | HIGH | MEDIUM | P1 | Track last_used. Modify generation scoring. Algorithm tweak. |
| Variety dashboard | MEDIUM | LOW | P2 | Simple counter. "X/Y used this month". Nice-to-have visibility. |
| Time-context defaults | MEDIUM | MEDIUM | P2 | Requires usage analytics. Smart but not essential initially. |
| Bulk rating wizard | MEDIUM | LOW | P2 | One-time onboarding flow. Wait for cold-start complaints. |
| Selection reason tooltips | MEDIUM | LOW | P2 | Transparency feature. Wait for "why this?" questions. |
| Complexity auto-inference | LOW | MEDIUM | P2 | NLP on meal names. Nice but can add manually. |
| Custom complexity | LOW | LOW | P3 | Power user feature. Defer until proven need. |
| Seasonal toggling | LOW | MEDIUM | P3 | Binary on/off per meal. Wait for seasonal patterns. |
| Meal tags | MEDIUM | MEDIUM | P3 | Flexible but complex UX. Wait for filtering patterns. |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add in v1.2 after validation
- P3: Nice to have, future or never

## Competitor Feature Analysis (V1.1 Focus)

Based on 2026 meal planning app research (ratings, variety, filtering).

| Feature | Meal Apps (Mealime, Eat This Much, Ollie) | Recipe Apps (Yummly, Epicurious) | "What's for Dinner?" v1.1 |
|---------|--------------|--------------|--------------|
| **Ratings** | 5-star + written reviews. Community ratings. High friction. | 5-star + photos. Social proof focus. | Binary thumbs up/down. 200% more engagement (Netflix data). No reviews. Personal preference only. |
| **Variety rules** | Complex preference profiles during onboarding: dietary restrictions, cuisines, allergies, household size. High abandonment. | N/A - discovery focus, not planning. | Zero setup. Hard rule: no dupes in week. Soft rules: recency, ratings. Automatic rotation. Transparent. |
| **Complexity** | Recipe metadata: prep time, cook time, skill level, equipment, servings. Required input per recipe. | 10+ metadata fields. Filter by any. Overwhelming. | 3 levels: simple/medium/complex. Auto-default medium. Optional adjust. Minimal friction. |
| **Swap/filtering** | Replace entire plan or nothing. Or: heavy filter UI (15+ checkboxes). All-or-nothing UX. | Filter-heavy search (cuisine, diet, time, difficulty, ingredients). Decision paralysis. | Progressive disclosure: Layer 1 = fast random. Layer 2 = expand for filtered options (complexity, rating, recency). Best of both. |
| **Rotation** | Automated plans with limited control. Black box algorithm. Or: manual slot-filling. | N/A - no planning. | Automatic 2-3 week rotation. Visible last-used dates. User understands why meal chosen. Transparent algorithm. |
| **Setup burden** | 5-10 min onboarding: preferences, restrictions, goals, household. | Account + quiz. Skippable but nagged. | Zero setup for v1.1 features. Rate meals during usage. Complexity auto-defaults. Learn by doing. |
| **Exclusions** | Hard "never show" lists. Permanent exclusions. Pool shrinks. | Block ingredients/cuisines. Shrinks discovery pool. | Soft deprioritization via thumbs down. No permanent exclusions. Pool stays viable. |

**Key Differentiation (v1.1):**
- **Competitors:** Heavy setup → complex preference management → rigid constraints
- **"What's for Dinner?":** Zero setup → implicit preferences via ratings → flexible soft rules

**What we don't compete on (v1.1):**
- Social ratings / community (private tool)
- Extensive meal metadata (minimal friction)
- Discovery / inspiration (decision removal)

**What we DO compete on (v1.1):**
- Speed: Instant feedback via binary ratings
- Simplicity: 3 complexity levels vs 10 metadata fields
- Flexibility: Soft rules vs hard exclusions
- Transparency: Users understand algorithm

## V1.0 Content (Retained)

[Previous comprehensive v1.0 research follows...]

### V1.0 Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Zero manual planning | Removes ALL dinner decisions | MEDIUM | V1 delivers this via auto-generation |
| Boring predictability | Intentionally limited variety from known meals | LOW | Anti-feature to competitors' "inspiration" focus |
| No recipe database | Only YOUR meals, not discovery | LOW | V1 scope: User manages their own list |
| Single-purpose focus | Does one thing well vs kitchen-sink apps | LOW | Architecture philosophy, not a feature |
| No social/sharing | Private family tool, not community | LOW | Explicitly excluded from V1 |
| Pre-filled starter pack | Immediate value without setup burden | LOW | V1: 15-20 common meals. Reduces cold-start problem |
| One-click adjustments | React to plan without rebuilding | MEDIUM | V1: Swap button per day |

### V1.0 Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Recipe content/instructions | "I want to see HOW to cook" | Becomes recipe app, not decision tool. Scope creep. | Users store recipe links/info in meal text |
| Nutrition tracking | "I want to eat healthy" | Adds logging burden. Studies show manual tracking kills retention. | Trust users to manage their own meal quality |
| Grocery shopping lists | "I need to know what to buy" | Requires ingredient parsing, pantry state, serving sizes. Massive complexity. | Users know their meals, can shop themselves |
| AI recipe recommendations | "Suggest new things to try" | Contradicts "boring predictability" value prop. Discovery ≠ decision removal. | User curates their own meal list |
| Dietary filters/macro goals | "Filter by keto/vegan/etc" | Users already know their constraints when managing meal list. Adds UI complexity for solved problem. | User only adds meals they're willing to eat |
| Family member profiles | "Different meals for kids/adults" | V1 serves households with shared meals. Complexity explosion for edge case. | Defer to v2+ if validated need emerges |
| Calendar integration | "Plan around my schedule" | Adds external dependency and complexity. V1 is same 5 weekdays every week. | Manual planning for special occasions |
| Leftover tracking | "Avoid waste" | Requires portion tracking, storage dates, consumption logging. | Simple recency deprioritization handles rotation naturally |
| Social features | "Share plans with friends" | Privacy concerns, moderation, feature creep into social network. | Private tool. Users can screenshot/message if desired. |

### V1.0 Launch Scope ✅ LOCKED SCOPE

Minimum viable product — what's needed to validate "boring, predictable, relieving" dinner decision removal.

- [x] **Google sign-in** — Table stakes auth (no password management)
- [x] **Starter pack of 15-20 common meals** — Immediate value without setup burden
- [x] **Personal meal list management** — Text-only CRUD (add, edit, delete meals)
- [x] **Auto-generated weekly plan** — 5 weekday meals, automatically assigned
- [x] **One-click swap per day** — Escape hatch when plan doesn't fit
- [x] **Basic variation** — Deprioritize recently used meals
- [x] **Plan persistence** — Survives refresh/logout

**Why this is minimal:** Tests core hypothesis ("Do people want dinner decisions removed?") without recipe content, nutrition, shopping, or discovery features that competitors offer but may not be essential.

### V1.0 Add After Validation (v1.x)

Features to add once core is working and validated.

- [ ] **Email authentication** — Add after Google proves auth flow works (reduces provider lock-in)
- [ ] **Plan history** — "What did I eat last week?" (triggered by: user request for memory)
- [ ] **Multi-week view** — See next week's plan early (triggered by: users asking "what's coming")
- [ ] **Meal frequency hints** — "Haven't had X in a while" (triggered by: variety complaints)
- [ ] **Bulk meal import** — CSV/paste for faster initial setup (triggered by: setup abandonment data)
- [ ] **Meal tags/categories** — "Quick meals" or "Weekend cooking" (triggered by: swap patterns showing preference)
- [ ] **Seasonal meal toggling** — "Don't suggest soup in summer" (triggered by: seasonal swap patterns)

### V1.0 Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Household sharing** — Multiple users, one meal list (triggered by: explicit multi-user requests)
- [ ] **Custom plan length** — 3-day or 7-day plans (triggered by: fixed 5-day complaints)
- [ ] **Manual plan editing** — Drag-and-drop meal assignment (triggered by: frequent swapping behavior)
- [ ] **Meal preparation notes** — "Needs 2hr marinating" timing hints (triggered by: swap reasons data)
- [ ] **Recipe link storage** — Optional URL field per meal (triggered by: "where's the recipe?" requests)
- [ ] **Export/print plans** — PDF or calendar export (triggered by: screenshot behavior)
- [ ] **Theme nights** — "Taco Tuesday" slot locking (triggered by: users manually recreating patterns)

**Explicitly WON'T BUILD (per project context):**
- Recipe libraries/databases
- Nutrition tracking or macro goals
- AI optimization/recommendations beyond simple rules
- Shopping list generation
- Child/family member profiles
- Social features (sharing, following, community)
- Inspiration/discovery feeds

### V1.0 Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Notes |
|---------|------------|---------------------|----------|-------|
| Plan generation | HIGH | MEDIUM | P1 | Core value proposition |
| Meal list management | HIGH | LOW | P1 | Required for plan input |
| Weekly plan view | HIGH | LOW | P1 | Required to see output |
| Plan persistence | HIGH | LOW | P1 | Table stakes expectation |
| Google sign-in | HIGH | LOW | P1 | Auth prerequisite |
| Starter pack | HIGH | LOW | P1 | Solves cold-start problem |
| One-click swap | MEDIUM | MEDIUM | P1 | Escape hatch for fit issues |
| Recency variation | MEDIUM | LOW | P1 | Prevents boring repetition |
| Plan history | MEDIUM | LOW | P2 | Nice-to-have, not essential |
| Multi-week view | MEDIUM | LOW | P2 | Wait for user demand signal |
| Meal tags/categories | MEDIUM | MEDIUM | P2 | Complex UX, unclear value until usage patterns emerge |
| Email authentication | LOW | LOW | P2 | Redundant with Google initially |
| Recipe content/instructions | LOW | HIGH | P3 | Out of scope (anti-feature) |
| Grocery shopping lists | LOW | HIGH | P3 | Out of scope (anti-feature) |
| Nutrition tracking | LOW | HIGH | P3 | Out of scope (anti-feature) |
| Social features | LOW | HIGH | P3 | Out of scope (anti-feature) |

**Priority key:**
- P1: Must have for launch — validates core hypothesis
- P2: Should have, add when possible — improves experience without changing core value
- P3: Nice to have, future consideration OR explicitly avoided — defer or never build

### V1.0 Competitor Comparison

Based on 2026 meal planning app landscape research:

| Feature Category | Top Apps (Mealime, Ollie, Plan to Eat, Paprika) | "What's for Dinner?" Approach | Strategic Rationale |
|---------|--------------|--------------|--------------|
| **Recipe discovery/inspiration** | AI-powered recommendations, curated collections, trending recipes | ❌ NONE — Users manage own meal list | Competitors solve "what exists to cook?" We solve "which of MY meals tonight?" |
| **Recipe content storage** | Full recipes with images, instructions, videos, nutrition facts | ❌ Text-only meal names | Not a recipe manager. User stores links/notes in meal name if desired. |
| **Grocery list generation** | Automatic from recipes, ingredient aggregation, aisle sorting, store integration | ❌ NONE | Massive complexity. Users know their meals = know what to buy. |
| **Nutrition tracking** | Calorie/macro logging, daily targets, progress charts | ❌ NONE | Manual logging kills retention. Trust users to curate healthy meal lists. |
| **Dietary filters** | Vegan, keto, gluten-free, allergen exclusions | ❌ NONE — User curates compatible meals | Filter at meal list level, not plan level. Users already solved their constraints. |
| **AI personalization** | Learning preferences, suggesting variations, smart recommendations | ❌ Simple recency algorithm (v1.0), Transparent rules (v1.1) | "Boring predictability" is the value prop. No discovery. |
| **Calendar integration** | Event-aware planning, schedule sync, occasion handling | ❌ Fixed 5 weekdays | V1 serves steady routine, not variable schedules. |
| **Family profiles** | Individual preferences, separate plans, kid-friendly filters | ❌ Single household meal list | V1 serves shared-meal households. Complexity defer to v2+ if needed. |
| **Social features** | Share plans, follow users, rate recipes | ❌ NONE | Private tool, not community. Explicitly out of scope. |
| **Plan generation** | ✅ Weekly plans, automated assignment | ✅ 5-day auto-generation with recency (v1.0) + smart variety (v1.1) | Core table stakes — everyone does this. |
| **Plan persistence** | ✅ Save plans, access across devices | ✅ Database storage, auth-gated | Core table stakes — everyone does this. |
| **Plan modification** | Swap meals, regenerate days, drag-and-drop editing | ✅ One-click swap (v1.0) + progressive disclosure (v1.1) | Minimal escape hatch. Competitors offer heavy editing; we stay light. |
| **Meal list management** | Recipe import, web clipper, manual entry | ✅ Text CRUD + starter pack | Simpler than competitors. No import/scraping complexity. |

**Key Differentiation:**
- **Competitors:** Feature-rich kitchen management platforms (recipes + nutrition + shopping + discovery)
- **"What's for Dinner?":** Single-purpose decision removal tool (just planning from your known meals)

**What we DON'T compete on:**
- Recipe quality (no recipes)
- Nutrition accuracy (no tracking)
- Shopping convenience (no lists)
- Discovery/inspiration (no recommendations)

**What we DO compete on:**
- Speed: 1-click plan generation vs manual slot-filling
- Simplicity: Core features vs 20+ feature bloat
- Predictability: Managed rotation vs constant novelty
- Focus: Decision removal vs kitchen-sink tool

## Sources

### V1.1 Research (Smart Variety & Preferences)

**Rating Systems:**
- [5 stars vs. thumbs up/down—which rating system is right for your app? | Appcues](https://www.appcues.com/blog/rating-system-ux-star-thumbs)
- [Which Rating System Is Best for Your Users? | Medium](https://medium.com/enjoyhq/which-rating-system-is-best-for-your-users-9fddeeb455b5)
- [Understanding Different User Rating Systems and Their Impact | Nudge](https://www.nudgenow.com/blogs/understanding-different-user-rating-systems-impact)

**Variety & Rotation:**
- [Meal Planning 101: Make a Two-Week Rotation | Good Cheap Eats](https://goodcheapeats.com/meal-planning-101-make-a-two-week-rotation/)
- [Rotating Meal Plan Tutorial | Healthfully Rooted Home](https://healthfullyrootedhome.com/rotating-meal-plan/)
- [The Rules & Models of Meal Planning | Heinen's](https://www.heinens.com/stories/the-rules-models-of-meal-planning/)

**Complexity Levels:**
- [Recipe Difficulty Levels | Cook What Matters](https://cookwhatmatters.com/recipes/recipe-difficulty-levels/)
- [Recipe Level Of Effort Scale For Easy Meal Planning | Meal Planning Blueprints](https://mealplanningblueprints.com/recipe-level-of-effort-scale/)
- [Calculating Cooking Recipe's Difficulty | ACM](https://dl.acm.org/doi/10.1145/3106668.3106673)

**Progressive Disclosure & Filtering:**
- [Progressive Disclosure | Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/)
- [Progressive disclosure in UX design: Types and use cases | LogRocket](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/)
- [Getting filters right: UX/UI design patterns and best practices | LogRocket](https://blog.logrocket.com/ux-design/filtering-ux-ui-design-patterns-best-practices/)

**Decision Fatigue & Anti-Patterns:**
- [Expert Reviewed: The Best Meal Planner Apps | Fitia](https://fitia.app/learn/article/best-meal-planner-apps-2025-expert-review/)
- [ADHD Meal Planning App That Simplifies Food Choices](https://www.adhdweasel.com/p/we-built-an-adhd-meal-planner-for)
- [Personalized Flexible Meal Planning | PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10436119/)
- [Understanding Food Planning Strategies | ACM](https://dl.acm.org/doi/fullHtml/10.1145/3544548.3581568)

**User Experience Research:**
- [The best meal-planning apps in 2026 | CNN](https://www.cnn.com/cnn-underscored/reviews/best-meal-planning-apps)
- [Commercially Available Apps to Support Healthy Family Meals | PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8140382/)
- [Recipe Filtering Apps | Escoffier](https://www.escoffieronline.com/top-apps-for-finding-recipes-for-ingredients-you-already-have/)

### V1.0 Research (Original Launch)

**Meal Planning App Landscape (2026):**
- [Top Meal Planning Apps with Grocery Lists in the U.S. (2026)](https://fitia.app/learn/article/7-meal-planning-apps-smart-grocery-lists-us/)
- [The best meal-planning apps in 2026, tested by our editors | CNN Underscored](https://www.cnn.com/cnn-underscored/reviews/best-meal-planning-apps)
- [The Best Meal-Planning Apps in 2026 (Ranked): Why Ollie Is #1](https://ollie.ai/2025/10/21/best-meal-planning-apps-in-2025/)
- [Expert Reviewed: The Best Meal Planner Apps of 2025 | Fitia](https://fitia.app/learn/article/best-meal-planner-apps-2025-expert-review/)
- [12 Best Meal Planning Apps for 2025: A Detailed Guide](https://ai-mealplan.com/blog/best-meal-planning-apps)

**Minimal Planning & User Needs:**
- [How AI Helps Meal Planning (2026 Personalized Menus And Lists)](https://planeatai.com/blog/how-ai-helps-meal-planning-2026-personalized-menus-and-lists)
- [The Best Meal Planner in 2026](https://www.valtorian.com/blog/the-best-meal-planner-in-2026)
- [Flexible Meal Planning Without a Strict Plan (2026)](https://planeatai.com/blog/flexible-meal-planning-without-a-strict-plan-2026)

**User Frustrations & Abandonment:**
- [Why don't more people use meal planning apps?](https://ohapotato.app/potato-files/why-dont-more-people-use-meal-planning-apps)
- [The Flaws of Meal Planning - Plan to Eat](https://www.plantoeat.com/blog/2022/04/the-flaws-of-meal-planning/)
- [Are AI Meal Planning Apps Worth It in 2026? | Fitia](https://fitia.app/learn/article/ai-meal-planning-apps-worth-it-2026/)

**Simple Meal Rotation Strategies:**
- [Simple Monthly Meal Planning System for Families · a humble place](https://ahumbleplace.com/simple-monthly-meal-planning/)
- [Meal Plan Go-to Recipes – "Core Meals" - Simple Home Edit](https://simplehomeedit.com/recipe/at-home/core-meals/)
- [Budget-Friendly Meal Rotation - A Bountiful Love](https://www.abountifullove.com/2025/08/budget-friendly-meal-rotation.html)
- [Easy Two-Week Rotating Meal Plan for Busy Moms](https://www.notthathardtohomeschool.com/easy-two-week-menu-plan/)

**Decision Fatigue Research:**
- [Dinner Decision Fatigue - by Emily Zicherman](https://ovenwindow.substack.com/p/dinner-decision-fatigue)
- [How to End Food Decision Fatigue - Real Food Whole Life](https://realfoodwholelife.com/feelgoodeffect/end-food-decision-fatigue/)
- [3 Strategies to Beat Meal Decision Fatigue](https://joyfullyfednutrition.com/2025/03/24/3-strategies-to-beat-meal-decision-fatigue/)
- [Fight Decision Fatigue in the Kitchen - Casey Barber](https://www.caseybarber.com/decision-fatigue-cooking/)

**Competitive Product Analysis:**
- [Paprika App Review: Pros and Cons - Plan to Eat](https://www.plantoeat.com/blog/2023/07/paprika-app-review-pros-and-cons/)
- [Best Meal Planning Apps for Busy Families: Mealime vs Paprika](https://dumbbellsandsalads.com/best-meal-planning-apps-for-busy-families-mealime-vs-paprika/)
- [Top 10 Meal Planning Apps: Features, Pros, Cons & Comparison](https://www.scmgalaxy.com/tutorials/top-10-meal-planning-apps-features-pros-cons-comparison/)

**Market Context:**
- [AI-driven Meal Planning Apps Market Size | CAGR of 28.10%](https://market.us/report/ai-driven-meal-planning-apps-market/)

---
*Feature research for: "What's for Dinner?" — Meal planning decision removal tool*
*V1.0 researched: 2026-02-09*
*V1.1 supplement researched: 2026-02-12*
*Confidence: HIGH (v1.0 comprehensive), MEDIUM (v1.1 web-validated)*
