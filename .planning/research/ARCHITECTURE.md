# Architecture Research

**Domain:** Minimal meal planning web application
**Researched:** 2026-02-09
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Home    │  │  Meals   │  │  Planner │  │  Week    │    │
│  │  Page    │  │  CRUD    │  │  Page    │  │  View    │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │              │             │          │
├───────┴─────────────┴──────────────┴─────────────┴──────────┤
│                    Business Logic Layer                      │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Server Actions (Next.js App Router)              │      │
│  │  - Auth operations                                 │      │
│  │  - Meal CRUD operations                            │      │
│  │  - Plan generation (simple random selection)      │      │
│  │  - Plan persistence                                │      │
│  └──────────────────┬─────────────────────────────────┘      │
│                     │                                        │
├─────────────────────┴────────────────────────────────────────┤
│                      Data Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │   User   │  │   Meal   │  │  Weekly  │                   │
│  │  Store   │  │  Store   │  │   Plan   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  NextAuth Session Management                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Authentication | Google OAuth sign-in/out, session management | NextAuth.js with Google Provider |
| Meal List Manager | CRUD operations for user's meal list | Server Actions + form components |
| Plan Generator | Select 5 random meals with basic variation | Simple random selection in Server Action |
| Plan Persistence | Save/load current week's plan | Database writes via Server Actions |
| Meal Swapper | Replace single day in plan | Server Action that updates one day |

## Recommended Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Route group for authenticated pages
│   │   ├── meals/           # Meal list CRUD page
│   │   ├── planner/         # Plan generation page
│   │   └── week/            # Current week view page
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/ # NextAuth API route
│   ├── layout.tsx           # Root layout with auth provider
│   └── page.tsx             # Landing/home page
├── components/              # React components
│   ├── ui/                  # Reusable UI components (buttons, cards, forms)
│   ├── auth/                # Auth-related components (SignIn, SignOut)
│   ├── meals/               # Meal list components (MealCard, MealForm)
│   └── planner/             # Planner components (WeekView, DaySlot)
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── db.ts                # Database client/connection
│   └── actions/             # Server Actions
│       ├── meals.ts         # Meal CRUD actions
│       ├── planner.ts       # Plan generation/swap actions
│       └── week.ts          # Week persistence actions
├── types/
│   ├── meal.ts              # Meal type definitions
│   └── plan.ts              # WeeklyPlan type definitions
└── middleware.ts            # Auth middleware for protected routes
```

### Structure Rationale

- **app/(auth)/:** Route group keeps authenticated pages together without affecting URL structure
- **lib/actions/:** Server Actions co-located by feature domain (meals, planner, week)
- **components/:** Organized by feature domain, not by component type
- **types/:** Centralized TypeScript definitions for data models
- **middleware.ts:** Single place to protect authenticated routes

## Architectural Patterns

### Pattern 1: Server Actions for Mutations

**What:** Use Next.js Server Actions for all data mutations (create, update, delete)
**When to use:** Every form submission and data modification
**Trade-offs:**
- Pro: No need to create separate API routes, better DX
- Pro: Automatic request deduplication and revalidation
- Con: Less familiar than REST APIs for some developers

**Example:**
```typescript
// lib/actions/meals.ts
'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createMeal(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const name = formData.get('name') as string

  // Save to database
  await db.meal.create({
    data: { name, userId: session.user.id }
  })

  revalidatePath('/meals')
  return { success: true }
}
```

### Pattern 2: Optimistic UI Updates (Optional)

**What:** Update UI immediately before server confirmation
**When to use:** For better perceived performance on meal swaps
**Trade-offs:**
- Pro: Feels instant and responsive
- Con: Adds complexity, must handle rollback on errors
- Con: May be overkill for this simple app

**Example:**
```typescript
// components/planner/DaySlot.tsx
'use client'

import { useOptimistic } from 'react'
import { swapMeal } from '@/lib/actions/planner'

export function DaySlot({ day, meal }) {
  const [optimisticMeal, setOptimisticMeal] = useOptimistic(meal)

  async function handleSwap() {
    setOptimisticMeal(getRandomMeal()) // Immediate UI update
    await swapMeal(day) // Actual server update
  }

  return <button onClick={handleSwap}>{optimisticMeal}</button>
}
```

### Pattern 3: Session-Based Authorization

**What:** Use NextAuth session to protect routes and actions
**When to use:** Every protected route and server action
**Trade-offs:**
- Pro: Simple, well-tested pattern
- Pro: Built-in CSRF protection
- Con: Session stored in JWT or database (choose based on needs)

**Example:**
```typescript
// middleware.ts
export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

## Data Flow

### Request Flow

```
[User clicks "Generate Plan"]
    ↓
[Form submission] → [Server Action: generatePlan()]
    ↓                      ↓
[Loading state]     [1. Check auth session]
    ↓                      ↓
                     [2. Fetch user's meals]
                           ↓
                     [3. Select 5 random meals]
                           ↓
                     [4. Check for recent duplicates]
                           ↓
                     [5. Save to database]
                           ↓
                     [6. Revalidate path]
                           ↓
[Display new plan] ← [Return plan data]
```

### Authentication Flow

```
[User clicks "Sign in with Google"]
    ↓
[NextAuth] → [Google OAuth] → [Consent screen]
    ↓                              ↓
[Wait]                       [User approves]
    ↓                              ↓
[Session created] ← [Google returns profile]
    ↓
[Redirect to /meals]
```

### Data Mutation Flow

```
[User action (create/update/delete)]
    ↓
[Server Action called]
    ↓
[Validate auth session]
    ↓
[Validate input data]
    ↓
[Perform database operation]
    ↓
[Revalidate affected pages]
    ↓
[Return result/redirect]
```

### Key Data Flows

1. **Meal CRUD:** User submits form → Server Action validates + saves → Revalidates /meals page → UI updates
2. **Plan generation:** User clicks generate → Server Action fetches meals + randomizes + saves → Redirects to /week → UI shows plan
3. **Meal swap:** User clicks swap on day → Server Action replaces meal for that day → Revalidates /week → UI updates
4. **Session check:** Every protected route/action → Middleware checks session → Allow or redirect to login

## Data Model

### Core Entities

```typescript
// types/meal.ts
export type Meal = {
  id: string
  name: string
  userId: string
  createdAt: Date
  lastUsed?: Date  // For basic variation tracking
}

// types/plan.ts
export type WeeklyPlan = {
  id: string
  userId: string
  weekStartDate: Date  // Monday of the week
  meals: {
    monday: string     // Meal ID
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
  }
  createdAt: Date
}

// types/auth.ts (from NextAuth)
export type User = {
  id: string
  email: string
  name: string
  image?: string
}
```

### Entity Relationships

```
User (1) ──< (many) Meals
User (1) ──< (many) WeeklyPlans
WeeklyPlan (1) ──< (5) Meal references
```

### Database Choice Considerations

**For MVP, monolithic approach works:**
- **Vercel Postgres / Supabase:** Simple setup, good free tier
- **Prisma ORM:** Type-safe queries, good DX with Next.js
- **Alternative:** Local JSON file for prototyping (not recommended for production)

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolithic Next.js app with basic database, no caching needed |
| 1k-10k users | Add database connection pooling, consider Redis for session store |
| 10k+ users | Add CDN for static assets, database read replicas, consider rate limiting |

### Scaling Priorities

1. **First bottleneck:** Database connections (solution: connection pooling, Vercel Postgres handles this)
2. **Second bottleneck:** Session lookups (solution: JWT strategy or Redis session store)
3. **Not a concern for this app:** Meal generation is trivial (random selection), no complex algorithms to optimize

## Build Order

Based on dependencies between components, suggested build order:

### Phase 1: Foundation
1. **Auth setup** - Everything else requires authentication
   - Install NextAuth, configure Google provider
   - Create auth API route
   - Add middleware for protected routes

### Phase 2: Core Data
2. **Database + Meal CRUD** - Plan generation needs meals to work with
   - Set up database (Prisma + Postgres)
   - Create Meal model
   - Build meal list page with CRUD operations
   - Server Actions for create/update/delete

### Phase 3: Planning Logic
3. **Plan generation** - Core feature
   - Create WeeklyPlan model
   - Build planner page with "Generate" button
   - Server Action: fetch meals, random selection, save plan
   - Redirect to week view

4. **Week view** - Display generated plan
   - Create week view page
   - Display 5 days with assigned meals
   - Show current week or "no plan yet" state

### Phase 4: Enhancement
5. **Meal swapping** - Quality of life feature
   - Add "Swap" button to each day in week view
   - Server Action: replace one day's meal
   - Basic variation: avoid recently used meals

### Phase 5: Polish
6. **UI/UX improvements** - Make it pleasant to use
   - Loading states
   - Error handling
   - Confirmation modals
   - Empty states

### Dependencies
- Phase 2 requires Phase 1 (auth protects meal operations)
- Phase 3 requires Phase 2 (needs meals to generate from)
- Phase 4 requires Phase 3 (needs plan to swap within)

## Anti-Patterns

### Anti-Pattern 1: Over-Engineering Meal Selection

**What people do:** Build complex algorithms to optimize meal variety, nutrition balance, or user preferences
**Why it's wrong:** Adds significant complexity for minimal benefit; user can manually swap if they don't like the selection
**Do this instead:** Simple random selection with basic "avoid last used" check. If a meal was used in last plan, skip it if possible. That's it.

**Bad example:**
```typescript
// DON'T: Complex scoring algorithm
function selectMeals(meals: Meal[]) {
  return meals
    .map(meal => ({
      meal,
      score: calculateVarietyScore(meal)
           + calculateNutritionScore(meal)
           + calculateUserPreferenceScore(meal)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}
```

**Good example:**
```typescript
// DO: Simple random with basic variety
function selectMeals(meals: Meal[], lastPlan?: WeeklyPlan) {
  const lastUsedIds = lastPlan ? Object.values(lastPlan.meals) : []
  const available = meals.filter(m => !lastUsedIds.includes(m.id))

  // Use available meals, fall back to all if not enough
  const pool = available.length >= 5 ? available : meals
  return shuffleArray(pool).slice(0, 5)
}
```

### Anti-Pattern 2: Premature Database Optimization

**What people do:** Add caching layers, read replicas, or complex indexing from day one
**Why it's wrong:** Adds operational complexity before knowing if it's needed; Next.js and Vercel Postgres already handle basics well
**Do this instead:** Start with simple Prisma queries and Next.js built-in caching. Add optimization only when measurements show it's needed.

### Anti-Pattern 3: Creating API Routes Unnecessarily

**What people do:** Build REST API endpoints for every operation out of habit
**Why it's wrong:** Server Actions provide the same functionality with better DX and automatic optimizations
**Do this instead:** Use Server Actions for mutations, React Server Components for data fetching. Only create API routes if you need webhooks or third-party integrations.

### Anti-Pattern 4: Client-Side State Management Overkill

**What people do:** Install Redux, Zustand, or Jotai for simple form states
**Why it's wrong:** Next.js App Router + Server Actions + React's built-in state is sufficient for this app's needs
**Do this instead:** Use React's useState for UI state, Server Actions for data mutations, and let Next.js handle caching/revalidation.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google OAuth | NextAuth Google Provider | Only auth provider needed, handles tokens automatically |
| Database | Prisma Client | Connection pooling handled by Vercel Postgres |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Page ↔ Server Action | Direct function call | Type-safe, no REST needed |
| Component ↔ Database | Via Server Components or Actions | Never direct client-to-DB |
| Auth ↔ Everything | Session check via auth() | Middleware handles route protection |

## Confidence Notes

**HIGH confidence areas:**
- Next.js App Router structure (official docs + multiple current sources)
- NextAuth Google setup (official docs + verified tutorials)
- Server Actions pattern (official Next.js best practices 2026)

**MEDIUM confidence areas:**
- Specific database choice (multiple options work equally well: Postgres, Supabase, Planetscale)
- Meal selection algorithm details (no standard, but simplicity is well-established principle)

**LOW confidence areas:**
- Long-term scaling needs (depends on actual usage patterns)
- Specific UI component library (shadcn/ui, Radix, MUI all work - user preference)

## Sources

**Next.js Architecture:**
- [Next.js App Router Project Structure Best Practices 2026](https://www.codebydeep.com/blog/next-js-folder-structure-best-practices-for-scalable-applications-2026-guide)
- [Mastering Next.js App Router: Best Practices for Structuring Your Application](https://thiraphat-ps-dev.medium.com/mastering-next-js-app-router-best-practices-for-structuring-your-application-3f8cf0c76580)
- [Next.js Architecture in 2026 — Server-First, Client-Islands](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router)
- [Official Next.js Project Structure Documentation](https://nextjs.org/docs/app/getting-started/project-structure)

**Meal Planning App Patterns:**
- [Building a Full-Stack Meal Planner with Next.js, OpenAI API, Auth0 and MongoDB](https://medium.com/@sbsyme/building-an-ai-meal-planner-with-next-js-openai-api-auth0-and-mongodb-ce87a257b2d2)
- [Comprehensive Next.js Full Stack App Architecture Guide](https://arno.surfacew.com/posts/nextjs-architecture)
- [Meal Planning App Development: How to Build in 2025](https://theninehertz.com/blog/how-to/meal-planning-app-development)

**Authentication:**
- [NextAuth.js Google Provider Official Documentation](https://next-auth.js.org/providers/google)
- [Adding Google Authentication in Next.js 14 with App Router](https://dev.to/souravvmishra/adding-google-authentication-in-nextjs-14-with-app-router-a-beginner-friendly-guide-3ag)
- [Setting Up Google Authentication in Next.js: A Developer's Guide](https://medium.com/@gaetandelsaux/setting-up-google-authentication-in-next-js-a-developers-guide-6a6e0f16b18f)

**Meal Rotation/Selection:**
- [The Meal Plan Rotation Hack that will Save You Time](https://kalynbrooke.com/personal-growth/habits-routines/monthly-meal-planner-template/)
- [Rotating Meal Plan Tutorial](https://healthfullyrootedhome.com/rotating-meal-plan/)
- [Easy Meal Planning Hack Using a Rotating Meal Plan](https://www.frugalandthriving.com.au/using-a-meal-rotation-to-make-menu-planning-easier/)

---
*Architecture research for: What's for Dinner? meal planning tool*
*Researched: 2026-02-09*
