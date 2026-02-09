# Feature Research

**Domain:** Meal planning/dinner decision tools
**Researched:** 2026-02-09
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Meal list management | Every meal planner stores meals somehow | LOW | Simple CRUD on text entries. V1: Pre-filled starter pack + user editing |
| Weekly plan view | Industry standard is 5-7 day planning window | LOW | Read-only display of generated plan. V1: 5 weekdays only |
| Plan generation | Users expect automation, not manual slot-filling | MEDIUM | Core value prop. V1: Simple algorithm with recency tracking |
| Plan persistence | Plans need to survive app close/refresh | LOW | Basic data storage. V1: Persist to database |
| Swap/regenerate capability | When plan doesn't fit, users need escape hatch | MEDIUM | Allows reaction without full re-plan. V1: One-click swap per day |
| User authentication | Multi-device access expected for any modern tool | LOW | Standard auth flow. V1: Google sign-in only |

### Differentiators (Competitive Advantage)

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

### Anti-Features (Commonly Requested, Often Problematic)

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

## Feature Dependencies

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

### Dependency Notes

- **User Authentication requires Plan Persistence:** Can't save plans without knowing whose plan it is
- **Meal List Management requires Plan Generation:** Generation algorithm needs meal source
- **Plan Generation requires Weekly Plan View:** Generated plans need display
- **Plan Generation requires Swap Capability:** Users need escape hatch when plan doesn't fit
- **Starter Pack enhances Meal List Management:** Reduces cold-start problem; user can edit/delete
- **Recipe Content conflicts with Single-Purpose Focus:** Becomes recipe manager, not decision tool
- **Grocery Lists conflicts with Minimal Complexity:** Requires ingredient parsing, portions, pantry state
- **Social Features conflicts with Privacy-First Design:** Private family tool, not community platform

## MVP Definition

### Launch With (v1) ✅ LOCKED SCOPE

Minimum viable product — what's needed to validate "boring, predictable, relieving" dinner decision removal.

- [x] **Google sign-in** — Table stakes auth (no password management)
- [x] **Starter pack of 15-20 common meals** — Immediate value without setup burden
- [x] **Personal meal list management** — Text-only CRUD (add, edit, delete meals)
- [x] **Auto-generated weekly plan** — 5 weekday meals, automatically assigned
- [x] **One-click swap per day** — Escape hatch when plan doesn't fit
- [x] **Basic variation** — Deprioritize recently used meals
- [x] **Plan persistence** — Survives refresh/logout

**Why this is minimal:** Tests core hypothesis ("Do people want dinner decisions removed?") without recipe content, nutrition, shopping, or discovery features that competitors offer but may not be essential.

### Add After Validation (v1.x)

Features to add once core is working and validated.

- [ ] **Email authentication** — Add after Google proves auth flow works (reduces provider lock-in)
- [ ] **Plan history** — "What did I eat last week?" (triggered by: user request for memory)
- [ ] **Multi-week view** — See next week's plan early (triggered by: users asking "what's coming")
- [ ] **Meal frequency hints** — "Haven't had X in a while" (triggered by: variety complaints)
- [ ] **Bulk meal import** — CSV/paste for faster initial setup (triggered by: setup abandonment data)
- [ ] **Meal tags/categories** — "Quick meals" or "Weekend cooking" (triggered by: swap patterns showing preference)
- [ ] **Seasonal meal toggling** — "Don't suggest soup in summer" (triggered by: seasonal swap patterns)

### Future Consideration (v2+)

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
- AI optimization/recommendations
- Shopping list generation
- Child/family member profiles
- Social features (sharing, following, community)
- Inspiration/discovery feeds

## Feature Prioritization Matrix

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

## Competitor Feature Analysis

Based on 2026 meal planning app landscape research:

| Feature Category | Top Apps (Mealime, Ollie, Plan to Eat, Paprika) | "What's for Dinner?" Approach | Strategic Rationale |
|---------|--------------|--------------|--------------|
| **Recipe discovery/inspiration** | AI-powered recommendations, curated collections, trending recipes | ❌ NONE — Users manage own meal list | Competitors solve "what exists to cook?" We solve "which of MY meals tonight?" |
| **Recipe content storage** | Full recipes with images, instructions, videos, nutrition facts | ❌ Text-only meal names | Not a recipe manager. User stores links/notes in meal name if desired. |
| **Grocery list generation** | Automatic from recipes, ingredient aggregation, aisle sorting, store integration | ❌ NONE | Massive complexity. Users know their meals = know what to buy. |
| **Nutrition tracking** | Calorie/macro logging, daily targets, progress charts | ❌ NONE | Manual logging kills retention. Trust users to curate healthy meal lists. |
| **Dietary filters** | Vegan, keto, gluten-free, allergen exclusions | ❌ NONE — User curates compatible meals | Filter at meal list level, not plan level. Users already solved their constraints. |
| **AI personalization** | Learning preferences, suggesting variations, smart recommendations | ❌ Simple recency algorithm | "Boring predictability" is the value prop. No discovery. |
| **Calendar integration** | Event-aware planning, schedule sync, occasion handling | ❌ Fixed 5 weekdays | V1 serves steady routine, not variable schedules. |
| **Family profiles** | Individual preferences, separate plans, kid-friendly filters | ❌ Single household meal list | V1 serves shared-meal households. Complexity defer to v2+ if needed. |
| **Social features** | Share plans, follow users, rate recipes | ❌ NONE | Private tool, not community. Explicitly out of scope. |
| **Plan generation** | ✅ Weekly plans, automated assignment | ✅ 5-day auto-generation with recency | Core table stakes — everyone does this. |
| **Plan persistence** | ✅ Save plans, access across devices | ✅ Database storage, auth-gated | Core table stakes — everyone does this. |
| **Plan modification** | Swap meals, regenerate days, drag-and-drop editing | ✅ One-click swap per day | Minimal escape hatch. Competitors offer heavy editing; we stay light. |
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
- Simplicity: 6 core features vs 20+ feature bloat
- Predictability: Boring rotation vs constant novelty
- Focus: Decision removal vs kitchen-sink tool

## Validation Against V1 Scope

### ✅ V1 Scope Validated as Minimal & Sufficient

The locked V1 scope contains ONLY table stakes features required to test the core hypothesis:

**Included (all justified):**
- Google sign-in → Table stakes auth
- Starter pack → Solves cold-start problem
- Meal list management → Required input for generation
- Auto-generated weekly plan → Core value proposition
- One-click swap → Necessary escape hatch
- Basic variation → Prevents boring repetition
- Plan persistence → Table stakes expectation

**Excluded (correctly):**
- Recipe libraries → Anti-feature (out of scope)
- Nutrition tracking → Anti-feature (kills retention)
- AI optimization → Anti-feature (contradicts "boring predictability")
- Shopping lists → Anti-feature (massive complexity, low value)
- Child profiles → Premature complexity
- Social features → Out of scope
- Inspiration/discovery → Anti-feature (contradicts decision removal)

### Research Findings Support V1 Design Choices

**✅ Decision fatigue is real:** 200+ daily food decisions per person. Automation is valued.
**✅ Manual logging kills retention:** Apps requiring heavy input have low engagement (mean 3.0-3.7/5.0).
**✅ Overly strict planning causes abandonment:** Flexibility (swap capability) is critical.
**✅ Simple meal rotation works:** Two-week rotations with theme nights are proven patterns.
**✅ Planning > Tracking:** 2026 shift away from calorie logging toward forward planning.
**✅ Recipe inspiration ≠ decision removal:** Discovery features serve different use case.

### Risks & Open Questions

**Risk: Starter pack may not match regional/cultural preferences**
- Mitigation: Make editing/deleting easy from day 1. Users customize immediately.

**Risk: 5 weekdays may be too rigid for some households**
- Mitigation: Validate with early users. Add custom length in v1.x if needed.

**Risk: Text-only meals may feel too minimal**
- Mitigation: Users can include emoji, links, or notes in meal text field if desired.

**Open question: How often do users want plan regeneration?**
- Need usage data. Daily? Weekly? On-demand only?

**Open question: What drives swap behavior?**
- Track swap reasons (if added) to inform future features like tags or timing hints.

## Sources

### Meal Planning App Landscape (2026)
- [Top Meal Planning Apps with Grocery Lists in the U.S. (2026)](https://fitia.app/learn/article/7-meal-planning-apps-smart-grocery-lists-us/)
- [The best meal-planning apps in 2026, tested by our editors | CNN Underscored](https://www.cnn.com/cnn-underscored/reviews/best-meal-planning-apps)
- [The Best Meal-Planning Apps in 2026 (Ranked): Why Ollie Is #1](https://ollie.ai/2025/10/21/best-meal-planning-apps-in-2025/)
- [Expert Reviewed: The Best Meal Planner Apps of 2025 | Fitia](https://fitia.app/learn/article/best-meal-planner-apps-2025-expert-review/)
- [12 Best Meal Planning Apps for 2025: A Detailed Guide](https://ai-mealplan.com/blog/best-meal-planning-apps)

### Minimal Planning & User Needs
- [How AI Helps Meal Planning (2026 Personalized Menus And Lists)](https://planeatai.com/blog/how-ai-helps-meal-planning-2026-personalized-menus-and-lists)
- [The Best Meal Planner in 2026](https://www.valtorian.com/blog/the-best-meal-planner-in-2026)
- [Flexible Meal Planning Without a Strict Plan (2026)](https://planeatai.com/blog/flexible-meal-planning-without-a-strict-plan-2026)

### User Frustrations & Abandonment
- [Why don't more people use meal planning apps?](https://ohapotato.app/potato-files/why-dont-more-people-use-meal-planning-apps)
- [The Flaws of Meal Planning - Plan to Eat](https://www.plantoeat.com/blog/2022/04/the-flaws-of-meal-planning/)
- [Are AI Meal Planning Apps Worth It in 2026? | Fitia](https://fitia.app/learn/article/ai-meal-planning-apps-worth-it-2026/)

### Simple Meal Rotation Strategies
- [Simple Monthly Meal Planning System for Families · a humble place](https://ahumbleplace.com/simple-monthly-meal-planning/)
- [Meal Plan Go-to Recipes – "Core Meals" - Simple Home Edit](https://simplehomeedit.com/recipe/at-home/core-meals/)
- [Budget-Friendly Meal Rotation - A Bountiful Love](https://www.abountifullove.com/2025/08/budget-friendly-meal-rotation.html)
- [Easy Two-Week Rotating Meal Plan for Busy Moms](https://www.notthathardtohomeschool.com/easy-two-week-menu-plan/)

### Decision Fatigue Research
- [Dinner Decision Fatigue - by Emily Zicherman](https://ovenwindow.substack.com/p/dinner-decision-fatigue)
- [How to End Food Decision Fatigue - Real Food Whole Life](https://realfoodwholelife.com/feelgoodeffect/end-food-decision-fatigue/)
- [3 Strategies to Beat Meal Decision Fatigue](https://joyfullyfednutrition.com/2025/03/24/3-strategies-to-beat-meal-decision-fatigue/)
- [Fight Decision Fatigue in the Kitchen - Casey Barber](https://www.caseybarber.com/decision-fatigue-cooking/)

### Competitive Product Analysis
- [Paprika App Review: Pros and Cons - Plan to Eat](https://www.plantoeat.com/blog/2023/07/paprika-app-review-pros-and-cons/)
- [Best Meal Planning Apps for Busy Families: Mealime vs Paprika](https://dumbbellsandsalads.com/best-meal-planning-apps-for-busy-families-mealime-vs-paprika/)
- [Top 10 Meal Planning Apps: Features, Pros, Cons & Comparison](https://www.scmgalaxy.com/tutorials/top-10-meal-planning-apps-features-pros-cons-comparison/)

### Market Context
- [AI-driven Meal Planning Apps Market Size | CAGR of 28.10%](https://market.us/report/ai-driven-meal-planning-apps-market/)

---
*Feature research for: "What's for Dinner?" — Meal planning decision removal tool*
*Researched: 2026-02-09*
