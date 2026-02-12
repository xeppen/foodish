# Architecture Research: Smart Variety & Preferences Integration

**Domain:** Meal Planning App Enhancement (Ratings, Complexity, Variety, Filtered Swapping)
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

This research focuses on integrating ratings, complexity levels, variety enforcement, and filtered swapping into an existing Next.js + Prisma meal planning app. The architecture maintains the established patterns (Server Actions, RSC, optimistic UI) while adding intelligent meal selection and user preference controls.

**Key Integration Points:**
- Database: Add `rating` and `complexity` enums + usage tracking to Meal model
- Server Actions: Enhance `generateWeeklyPlan` and `swapDayMeal` with filtering logic
- UI Components: Add rating controls, complexity badges, progressive disclosure swap modal
- Algorithm: No-duplicate enforcement, rotation tracking, rating-aware selection

## Current Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                     Client Layer (RSC + Client Components)      │
├────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │ page.tsx       │  │ meal-card.tsx  │  │ meal-drawer.tsx  │ │
│  │ (RSC)          │  │ (Client)       │  │ (Client)         │ │
│  └───────┬────────┘  └───────┬────────┘  └────────┬─────────┘ │
│          │                   │                     │            │
│          │ Server Actions    │ useOptimistic       │            │
│          ↓                   ↓                     ↓            │
├────────────────────────────────────────────────────────────────┤
│                     Server Actions Layer                        │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ lib/actions/plans.ts  │  lib/actions/meals.ts          │   │
│  │ - generateWeeklyPlan   │  - addMeal                     │   │
│  │ - getCurrentWeekPlan   │  - updateMeal                  │   │
│  │ - swapDayMeal          │  - deleteMeal                  │   │
│  │ - getWeekInfo          │  - getMeals                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
├────────────────────────────────────────────────────────────────┤
│                     Data Layer (Prisma)                         │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐     │
│  │   User   │  │     Meal     │  │    WeeklyPlan        │     │
│  │ (Clerk)  │  │ - name       │  │ - weekStartDate      │     │
│  │          │  │ - lastUsed   │  │ - monday...friday    │     │
│  └──────────┘  └──────────────┘  └──────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

## New Architecture: v1.1 Enhancements

```
┌────────────────────────────────────────────────────────────────┐
│               Client Layer (NEW: Rating + Filter UI)            │
├────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌───────────────────┐  ┌──────────────┐  │
│  │ meal-card.tsx  │  │ swap-modal.tsx    │  │ rating-      │  │
│  │ (Enhanced)     │  │ (NEW)             │  │ toggle.tsx   │  │
│  │ - rating btn   │  │ - complexity      │  │ (NEW)        │  │
│  │ - complexity   │  │   filter          │  │              │  │
│  │   badge        │  │ - recency filter  │  │              │  │
│  │ - swap btn →   │  │ - rating filter   │  │              │  │
│  │   modal        │  │ - meal list       │  │              │  │
│  └────────┬───────┘  └─────────┬─────────┘  └──────┬───────┘  │
│           │                    │                    │           │
│           ↓                    ↓                    ↓           │
├────────────────────────────────────────────────────────────────┤
│               Server Actions (ENHANCED)                         │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NEW: rateMeal(mealId, rating)                            │  │
│  │   → Update Meal.rating enum                              │  │
│  │                                                           │  │
│  │ ENHANCED: generateWeeklyPlan()                           │  │
│  │   → Enforce no duplicates in week                        │  │
│  │   → Deprioritize lastUsed (last week)                    │  │
│  │   → Consider ratings (avoid THUMBS_DOWN)                 │  │
│  │   → Track usage in UsageHistory                          │  │
│  │                                                           │  │
│  │ ENHANCED: swapDayMeal(day, filters?)                     │  │
│  │   → Filter by complexity (optional)                      │  │
│  │   → Filter by rating (optional)                          │  │
│  │   → Avoid current week meals                             │  │
│  │   → Avoid recent meals (last 2 weeks)                    │  │
│  │                                                           │  │
│  │ NEW: getSwapOptions(day, filters)                        │  │
│  │   → Return filtered meal list with metadata              │  │
│  │   → Used by progressive disclosure modal                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
├────────────────────────────────────────────────────────────────┤
│               Data Layer (ENHANCED SCHEMA)                      │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Meal (ENHANCED)                                       │      │
│  │ - name: String                                        │      │
│  │ - rating: RatingEnum (NEUTRAL | THUMBS_UP | THUMBS_  │      │
│  │   DOWN) DEFAULT: NEUTRAL                              │      │
│  │ - complexity: ComplexityEnum (SIMPLE | MEDIUM |       │      │
│  │   COMPLEX) DEFAULT: MEDIUM                            │      │
│  │ - lastUsed: DateTime?                                 │      │
│  │ - usageHistory: UsageHistory[]                        │      │
│  └──────────────────────────────────────────────────────┘      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ UsageHistory (NEW)                                    │      │
│  │ - id: String @id @default(cuid())                     │      │
│  │ - mealId: String                                      │      │
│  │ - meal: Meal @relation                                │      │
│  │ - usedDate: DateTime                                  │      │
│  │ - weekStartDate: DateTime                             │      │
│  │ - userId: String                                      │      │
│  └──────────────────────────────────────────────────────┘      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ WeeklyPlan (UNCHANGED)                                │      │
│  │ - weekStartDate: DateTime                             │      │
│  │ - monday...friday: String?                            │      │
│  └──────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

## Database Schema Changes

### New Enums

```prisma
enum Rating {
  THUMBS_DOWN
  NEUTRAL
  THUMBS_UP
}

enum Complexity {
  SIMPLE    // Quick meals, minimal prep
  MEDIUM    // Standard cooking time
  COMPLEX   // Longer prep, multiple steps
}
```

### Enhanced Meal Model

```prisma
model Meal {
  id            String          @id @default(cuid())
  name          String
  userId        String          // Clerk user ID

  // NEW FIELDS
  rating        Rating          @default(NEUTRAL)
  complexity    Complexity      @default(MEDIUM)
  usageHistory  UsageHistory[]

  // EXISTING FIELDS
  lastUsed      DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([userId])
  @@index([userId, rating])         // NEW: For filtering by rating
  @@index([userId, complexity])     // NEW: For filtering by complexity
}
```

### New Usage Tracking Model

```prisma
model UsageHistory {
  id            String   @id @default(cuid())
  mealId        String
  meal          Meal     @relation(fields: [mealId], references: [id], onDelete: Cascade)
  usedDate      DateTime @default(now())
  weekStartDate DateTime // When this meal was used in weekly plan
  userId        String   // Clerk user ID

  @@index([userId, usedDate])
  @@index([mealId])
}
```

### Migration Strategy

1. Add enums + defaulted fields to schema
2. Add UsageHistory model and relation indexes
3. Run migration: `npx prisma migrate dev --name add_rating_complexity_variety`
4. Existing meals get `NEUTRAL` rating and `MEDIUM` complexity
5. `usageHistory` starts empty and becomes primary recency source in plan logic

## Data Flow Changes

### Rating Flow

```
User clicks rating button (meal-card or meal-list)
    ↓
rateMeal(mealId, rating) Server Action
    ↓
UPDATE Meal SET rating = ? WHERE id = ?
    ↓
revalidatePath("/") and revalidatePath("/meals")
    ↓
RSC refetches with new rating
    ↓
UI shows updated rating (optimistic update via useOptimistic)
```

**Implementation:**
```typescript
// lib/actions/meals.ts
export async function rateMeal(id: string, rating: 'THUMBS_UP' | 'NEUTRAL' | 'THUMBS_DOWN') {
  const user = await getCurrentUser();
  if (!user) return { error: "Ej behörig" };

  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  await prisma.meal.update({
    where: { id },
    data: { rating },
  });

  revalidatePath("/");
  revalidatePath("/meals");
  return { success: true, rating };
}
```

### Enhanced Plan Generation Flow

```
generateWeeklyPlan() invoked
    ↓
Get user meals (exclude THUMBS_DOWN unless insufficient meals)
    ↓
Get last 2 weeks' usage from UsageHistory
    ↓
Filter: exclude meals used in last 2 weeks (unless insufficient)
    ↓
Prioritize: THUMBS_UP > NEUTRAL > THUMBS_DOWN
    ↓
Sort by lastUsed ASC (least recently used first)
    ↓
Randomly select 5 meals (no duplicates)
    ↓
Create WeeklyPlan + UsageHistory entries for each day
    ↓
Update Meal.lastUsed for selected meals
    ↓
Return plan
```

**Enhanced Algorithm:**
```typescript
// lib/actions/plans.ts (ENHANCED)
async function selectRandomMeals(
  userId: string,
  count: number,
  filters?: { complexity?: Complexity[], excludeRating?: Rating[] }
): Promise<Meal[]> {
  // Get usage history from last 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentUsage = await prisma.usageHistory.findMany({
    where: {
      userId,
      usedDate: { gte: twoWeeksAgo },
    },
    select: { mealId: true },
  });
  const recentMealIds = new Set(recentUsage.map(u => u.mealId));

  // Build query with filters
  const where: Prisma.MealWhereInput = {
    userId,
    id: { notIn: Array.from(recentMealIds) }, // Avoid recent
  };

  // Apply optional filters
  if (filters?.complexity?.length) {
    where.complexity = { in: filters.complexity };
  }
  if (filters?.excludeRating?.length) {
    where.rating = { notIn: filters.excludeRating };
  } else {
    // Default: avoid THUMBS_DOWN
    where.rating = { not: 'THUMBS_DOWN' };
  }

  const meals = await prisma.meal.findMany({
    where,
    orderBy: { lastUsed: 'asc' }, // Prioritize least recent
  });

  // If insufficient, relax constraints
  if (meals.length < count) {
    // Include THUMBS_DOWN or recent meals
    const allMeals = await prisma.meal.findMany({
      where: { userId },
      orderBy: { lastUsed: 'asc' },
    });
    return shuffleAndSelect(allMeals, count);
  }

  // Prioritize by rating
  const thumbsUp = meals.filter(m => m.rating === 'THUMBS_UP');
  const neutral = meals.filter(m => m.rating === 'NEUTRAL');
  const thumbsDown = meals.filter(m => m.rating === 'THUMBS_DOWN');

  const prioritized = [...thumbsUp, ...neutral, ...thumbsDown];
  return shuffleAndSelect(prioritized, count);
}

function shuffleAndSelect(meals: Meal[], count: number): Meal[] {
  const shuffled = [...meals].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

### Filtered Swap Flow (Progressive Disclosure)

```
User clicks "Byt" on meal card
    ↓
Opens SwapModal (progressive disclosure)
    ↓
Shows filter chips:
  - Complexity: [Simple] [Medium] [Complex]
  - Rating: [Favorites only] [Include all]
  - Recency: Auto-filtered (exclude current week + last week)
    ↓
User adjusts filters (optional)
    ↓
getSwapOptions(day, filters) Server Action
    ↓
Returns filtered meal list with metadata:
  - name, rating, complexity, lastUsed
    ↓
User selects meal from list
    ↓
swapDayMeal(day, selectedMealId) Server Action
    ↓
Update WeeklyPlan + UsageHistory + Meal.lastUsed
    ↓
revalidatePath + optimistic UI update
    ↓
Modal closes, card shows new meal
```

## Component Architecture

### New Components

#### 1. RatingToggle Component
**Location:** `components/rating-toggle.tsx`
**Type:** Client Component
**Purpose:** Three-state toggle for meal ratings

```typescript
'use client'

import { useState } from 'react'
import { rateMeal } from '@/lib/actions/meals'
import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react'

type Rating = 'THUMBS_UP' | 'NEUTRAL' | 'THUMBS_DOWN'

export function RatingToggle({
  mealId,
  initialRating
}: {
  mealId: string
  initialRating: Rating
}) {
  const [rating, setRating] = useState(initialRating)
  const [loading, setLoading] = useState(false)

  async function handleRate(newRating: Rating) {
    setLoading(true)
    setRating(newRating) // Optimistic update

    const result = await rateMeal(mealId, newRating)
    if (result.error) {
      setRating(initialRating) // Rollback on error
    }
    setLoading(false)
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={() => handleRate('THUMBS_UP')}
        disabled={loading}
        className={rating === 'THUMBS_UP' ? 'text-green-600' : 'text-gray-400'}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleRate('NEUTRAL')}
        disabled={loading}
        className={rating === 'NEUTRAL' ? 'text-gray-600' : 'text-gray-300'}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleRate('THUMBS_DOWN')}
        disabled={loading}
        className={rating === 'THUMBS_DOWN' ? 'text-red-600' : 'text-gray-400'}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  )
}
```

#### 2. ComplexityBadge Component
**Location:** `components/complexity-badge.tsx`
**Type:** Client Component
**Purpose:** Visual indicator of meal complexity

```typescript
'use client'

import { Clock } from 'lucide-react'

type Complexity = 'SIMPLE' | 'MEDIUM' | 'COMPLEX'

const COMPLEXITY_STYLES = {
  SIMPLE: {
    label: 'Snabb',
    color: 'bg-green-100 text-green-700',
    dots: 1
  },
  MEDIUM: {
    label: 'Normal',
    color: 'bg-yellow-100 text-yellow-700',
    dots: 2
  },
  COMPLEX: {
    label: 'Avancerad',
    color: 'bg-orange-100 text-orange-700',
    dots: 3
  },
}

export function ComplexityBadge({
  complexity
}: {
  complexity: Complexity
}) {
  const style = COMPLEXITY_STYLES[complexity]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.color}`}>
      <Clock className="h-3 w-3" />
      {style.label}
    </span>
  )
}
```

#### 3. SwapModal Component (Progressive Disclosure)
**Location:** `components/swap-modal.tsx`
**Type:** Client Component
**Purpose:** Filtered meal selection with progressive disclosure

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getSwapOptions, swapDayMeal } from '@/lib/actions/plans'
import { ComplexityBadge } from './complexity-badge'
import { RatingToggle } from './rating-toggle'

type Complexity = 'SIMPLE' | 'MEDIUM' | 'COMPLEX'
type Rating = 'THUMBS_UP' | 'NEUTRAL' | 'THUMBS_DOWN'

type SwapOption = {
  id: string
  name: string
  rating: Rating
  complexity: Complexity
  lastUsed: Date | null
}

type Filters = {
  complexity: Complexity[]
  favoritesOnly: boolean
}

export function SwapModal({
  isOpen,
  onClose,
  day,
  dayLabel,
}: {
  isOpen: boolean
  onClose: () => void
  day: string
  dayLabel: string
}) {
  const [filters, setFilters] = useState<Filters>({
    complexity: [],
    favoritesOnly: false,
  })
  const [options, setOptions] = useState<SwapOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadOptions()
    }
  }, [isOpen, filters])

  async function loadOptions() {
    setLoading(true)
    const result = await getSwapOptions(day, filters)
    if (result.success) {
      setOptions(result.options)
    }
    setLoading(false)
  }

  async function handleSelect(mealId: string) {
    await swapDayMeal(day, mealId)
    onClose()
  }

  function toggleComplexity(complexity: Complexity) {
    setFilters(prev => ({
      ...prev,
      complexity: prev.complexity.includes(complexity)
        ? prev.complexity.filter(c => c !== complexity)
        : [...prev.complexity, complexity],
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Byt måltid för {dayLabel}</DialogTitle>
        </DialogHeader>

        {/* Filter Chips */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Komplexitet</p>
            <div className="flex gap-2">
              {(['SIMPLE', 'MEDIUM', 'COMPLEX'] as Complexity[]).map(c => (
                <button
                  key={c}
                  onClick={() => toggleComplexity(c)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filters.complexity.includes(c)
                      ? 'bg-terracotta text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {c === 'SIMPLE' ? 'Snabb' : c === 'MEDIUM' ? 'Normal' : 'Avancerad'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.favoritesOnly}
                onChange={e => setFilters(prev => ({ ...prev, favoritesOnly: e.target.checked }))}
              />
              <span className="text-sm">Endast favoriter</span>
            </label>
          </div>
        </div>

        {/* Meal Options List */}
        <div className="space-y-2 mt-4">
          {loading ? (
            <p className="text-center text-gray-500">Laddar...</p>
          ) : options.length === 0 ? (
            <p className="text-center text-gray-500">Inga måltider matchar filtren</p>
          ) : (
            options.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">{option.name}</span>
                  <ComplexityBadge complexity={option.complexity} />
                </div>
                <RatingToggle mealId={option.id} initialRating={option.rating} />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Modified Components

#### Enhanced MealCard
**File:** `components/meal-card.tsx`
**Changes:**
- Replace inline swap button with modal trigger
- Add complexity badge display
- Add rating toggle (small, bottom corner)

```typescript
// Add to existing MealCard component
import { useState } from 'react'
import { ComplexityBadge } from './complexity-badge'
import { SwapModal } from './swap-modal'

// Inside component:
const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)

// Replace current swap button section with:
<div className="mt-auto pt-4 flex items-center justify-between">
  <ComplexityBadge complexity={complexity} />
  <button
    onClick={() => setIsSwapModalOpen(true)}
    className="flex items-center gap-2 rounded-lg bg-[var(--cream)] px-3 py-1.5 text-sm font-semibold text-[var(--terracotta)] transition-colors hover:bg-[var(--terracotta)]/10"
  >
    Byt
  </button>
</div>

// Add modal:
<SwapModal
  isOpen={isSwapModalOpen}
  onClose={() => setIsSwapModalOpen(false)}
  day={day}
  dayLabel={dayLabel}
/>
```

#### Enhanced MealList (in meal-drawer.tsx)
**File:** `components/meal-list.tsx` or inline in `meal-drawer.tsx`
**Changes:**
- Add complexity selector when adding/editing meals
- Add rating toggle for each meal
- Display complexity badge

```typescript
// Add complexity selector to add/edit form
<select
  name="complexity"
  defaultValue="MEDIUM"
  className="..."
>
  <option value="SIMPLE">Snabb</option>
  <option value="MEDIUM">Normal</option>
  <option value="COMPLEX">Avancerad</option>
</select>

// Add to meal list items
{meals.map(meal => (
  <div key={meal.id} className="flex items-center justify-between p-3 border-b">
    <div className="flex flex-col gap-1">
      <span className="font-medium">{meal.name}</span>
      <ComplexityBadge complexity={meal.complexity} />
    </div>
    <div className="flex items-center gap-3">
      <RatingToggle mealId={meal.id} initialRating={meal.rating} />
      {/* Existing edit/delete buttons */}
    </div>
  </div>
))}
```

## New Server Actions

### rateMeal
**File:** `lib/actions/meals.ts`
**Purpose:** Update meal rating
**Returns:** `{ success: true, rating } | { error: string }`

### getSwapOptions
**File:** `lib/actions/plans.ts`
**Purpose:** Fetch filtered meals for swap modal
**Parameters:** `day: string, filters: { complexity?: Complexity[], favoritesOnly?: boolean }`
**Returns:** `{ success: true, options: SwapOption[] } | { error: string }`

```typescript
export async function getSwapOptions(
  day: string,
  filters: { complexity?: Complexity[], favoritesOnly?: boolean }
) {
  const user = await getCurrentUser()
  if (!user) return { error: "Ej behörig" }

  const weekStart = getWeekStart()
  const plan = await prisma.weeklyPlan.findUnique({
    where: { userId_weekStartDate: { userId: user.id, weekStartDate: weekStart } },
  })

  if (!plan) return { error: "Ingen plan hittades" }

  // Get current week meals to exclude
  const currentMeals = new Set([
    plan.monday, plan.tuesday, plan.wednesday, plan.thursday, plan.friday
  ].filter(Boolean))

  // Build query
  const where: Prisma.MealWhereInput = {
    userId: user.id,
    name: { notIn: Array.from(currentMeals) },
  }

  if (filters.complexity?.length) {
    where.complexity = { in: filters.complexity }
  }

  if (filters.favoritesOnly) {
    where.rating = 'THUMBS_UP'
  } else {
    where.rating = { not: 'THUMBS_DOWN' }
  }

  // Get recent usage (last 2 weeks)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const recentUsage = await prisma.usageHistory.findMany({
    where: { userId: user.id, usedDate: { gte: twoWeeksAgo } },
    select: { mealId: true },
  })
  const recentIds = new Set(recentUsage.map(u => u.mealId))
  where.id = { notIn: Array.from(recentIds) }

  const options = await prisma.meal.findMany({
    where,
    orderBy: { lastUsed: 'asc' },
  })

  return { success: true, options }
}
```

### Enhanced swapDayMeal
**File:** `lib/actions/plans.ts`
**Changes:** Accept specific meal ID instead of random selection

```typescript
export async function swapDayMeal(
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday",
  targetMealId: string // NEW: specific meal selection
) {
  const user = await getCurrentUser()
  if (!user) return { error: "Ej behörig" }

  const weekStart = getWeekStart()
  const plan = await prisma.weeklyPlan.findUnique({
    where: { userId_weekStartDate: { userId: user.id, weekStartDate: weekStart } },
  })

  if (!plan) return { error: "Ingen plan hittades" }

  // Verify meal exists and belongs to user
  const targetMeal = await prisma.meal.findUnique({ where: { id: targetMealId } })
  if (!targetMeal || targetMeal.userId !== user.id) {
    return { error: "Måltiden hittades inte" }
  }

  // Update plan
  await prisma.weeklyPlan.update({
    where: { userId_weekStartDate: { userId: user.id, weekStartDate: weekStart } },
    data: { [day]: targetMeal.name },
  })

  // Create usage history entry
  await prisma.usageHistory.create({
    data: {
      mealId: targetMeal.id,
      userId: user.id,
      weekStartDate: weekStart,
    },
  })

  // Update lastUsed
  await prisma.meal.update({
    where: { id: targetMeal.id },
    data: { lastUsed: new Date() },
  })

  revalidatePath("/")
  revalidatePath("/plan")
  return { success: true, newMeal: targetMeal.name }
}
```

## Build Order (Dependencies)

### Phase 1: Database Foundation (Build First)
**Why:** All features depend on schema changes

1. **Add enums to schema** (`prisma/schema.prisma`)
   - `Rating` enum
   - `Complexity` enum

2. **Add fields to Meal model**
   - `rating: Rating @default(NEUTRAL)`
   - `complexity: Complexity @default(MEDIUM)`

3. **Create UsageHistory model**
   - Track meal usage over time

4. **Run migration**
   ```bash
   npx prisma migrate dev --name add_rating_complexity_tracking
   npx prisma generate
   ```

### Phase 2: Core Server Actions (Build Second)
**Why:** UI depends on these actions

5. **Implement `rateMeal` action** (`lib/actions/meals.ts`)
   - Update meal rating
   - Revalidate paths

6. **Enhance `selectRandomMeals` helper** (`lib/actions/plans.ts`)
   - Add complexity filtering
   - Add rating filtering
   - Query UsageHistory for rotation logic

7. **Enhance `generateWeeklyPlan`** (`lib/actions/plans.ts`)
   - Create UsageHistory entries
   - Use enhanced selection logic

8. **Implement `getSwapOptions` action** (`lib/actions/plans.ts`)
   - Filter by complexity, rating, recency
   - Return sorted options

9. **Enhance `swapDayMeal` action** (`lib/actions/plans.ts`)
   - Accept target meal ID parameter
   - Create UsageHistory entry

### Phase 3: UI Components (Build Third)
**Why:** Now that data layer + actions exist, wire up UI

10. **Create `ComplexityBadge` component** (`components/complexity-badge.tsx`)
    - Display only, no interactions

11. **Create `RatingToggle` component** (`components/rating-toggle.tsx`)
    - Calls `rateMeal` action
    - Optimistic updates with `useState`

12. **Update `AddMealForm`** (in `components/meal-drawer.tsx`)
    - Add complexity selector
    - Default to MEDIUM

13. **Update `MealList`** (in `components/meal-drawer.tsx`)
    - Display complexity badge
    - Add rating toggle

14. **Create `SwapModal` component** (`components/swap-modal.tsx`)
    - Progressive disclosure filters
    - Calls `getSwapOptions` and `swapDayMeal`

15. **Enhance `MealCard` component** (`components/meal-card.tsx`)
    - Display complexity badge
    - Replace swap button with modal trigger

### Phase 4: Testing & Refinement (Build Fourth)
16. **Test rating flow**
    - Verify optimistic updates
    - Verify rating affects plan generation

17. **Test variety enforcement**
    - Generate multiple weeks
    - Verify no duplicates within week
    - Verify rotation over weeks

18. **Test filtered swapping**
    - Verify complexity filters work
    - Verify rating filters work
    - Verify recent meals excluded

## Architectural Patterns

### Pattern 1: Enum-Based Feature Flags
**What:** Use Prisma enums with defaults for backward compatibility
**When to use:** Adding categorical data to existing models
**Trade-offs:**
- **Pro:** Type-safe, database-enforced, no null checks needed
- **Pro:** Defaults allow gradual rollout (existing data gets sensible values)
- **Con:** Migrations required to add/remove enum values

**Example:**
```prisma
enum Rating {
  THUMBS_DOWN
  NEUTRAL
  THUMBS_UP
}

model Meal {
  rating Rating @default(NEUTRAL) // Existing meals get NEUTRAL
}
```

### Pattern 2: Optimistic UI with Server Actions
**What:** Update UI immediately, rollback on error
**When to use:** User interactions that modify data (rating, swapping)
**Trade-offs:**
- **Pro:** Instant feedback, no loading spinners for fast actions
- **Pro:** Better perceived performance
- **Con:** Must handle rollback for errors (rare but possible)

**Example:**
```typescript
const [rating, setRating] = useState(initialRating)
async function handleRate(newRating: Rating) {
  setRating(newRating) // Optimistic
  const result = await rateMeal(mealId, newRating)
  if (result.error) {
    setRating(initialRating) // Rollback
  }
}
```

Sources:
- [Getting Started: Updating Data | Next.js](https://nextjs.org/docs/app/getting-started/updating-data)
- [useOptimistic – React](https://react.dev/reference/react/useOptimistic)

### Pattern 3: Progressive Disclosure for Filters
**What:** Show basic action first, reveal filters on demand
**When to use:** Complex filtering that most users won't need every time
**Trade-offs:**
- **Pro:** Reduces cognitive load for basic use cases
- **Pro:** Keeps UI clean for 80% of interactions
- **Con:** Power users need extra click to access filters

**Example:**
```typescript
// Simple swap button → opens modal → reveals filters
<button onClick={() => setModalOpen(true)}>Byt</button>

<SwapModal>
  {/* Filters collapsed by default */}
  <FilterChips />
  {/* Main meal list visible */}
  <MealList />
</SwapModal>
```

Sources:
- [Progressive Disclosure - NN/G](https://www.nngroup.com/articles/progressive-disclosure/)
- [Progressive Disclosure design pattern](https://ui-patterns.com/patterns/ProgressiveDisclosure)

### Pattern 4: Usage History for Rotation
**What:** Track each meal usage with timestamp + week context
**When to use:** Need historical rotation logic beyond `lastUsed`
**Trade-offs:**
- **Pro:** Accurate rotation over time (can analyze patterns)
- **Pro:** Supports "no duplicates in X weeks" rules
- **Con:** More database writes (one per meal per plan)
- **Con:** Requires periodic cleanup (archive old entries)

**Example:**
```prisma
model UsageHistory {
  mealId        String
  weekStartDate DateTime
  usedDate      DateTime
}

// Query: Meals not used in last 2 weeks
const recentUsage = await prisma.usageHistory.findMany({
  where: { usedDate: { gte: twoWeeksAgo } },
})
```

## Anti-Patterns

### Anti-Pattern 1: Storing Meal ID in WeeklyPlan
**What people might do:** Change `WeeklyPlan.monday` from `String` (name) to `String` (meal ID)
**Why it's wrong:**
- Breaks existing data (migration complexity)
- If meal deleted, plan has dangling reference
- Requires JOIN on every plan fetch
- Name changes don't propagate to old plans

**Do this instead:** Keep storing meal name (current approach)
- Plans are snapshots in time
- Meal edits/deletes don't break historical plans
- No JOINs needed for display

### Anti-Pattern 2: Client-Side Filtering for Swap Options
**What people might do:** Fetch all meals, filter in React component
**Why it's wrong:**
- Sends unnecessary data to client (all meals including unavailable ones)
- Filter logic duplicated between plan generation and swap
- No database-level optimization (indexes unused)

**Do this instead:** Server Action with filters (`getSwapOptions`)
- Query database with WHERE clause (uses indexes)
- Return only eligible meals
- Single source of truth for availability logic

### Anti-Pattern 3: Complex Rating Scale (1-5 stars)
**What people might do:** Use numeric rating (1-5) instead of thumbs up/down/neutral
**Why it's wrong:**
- Users rarely distinguish between 3 and 4 stars (analysis paralysis)
- More complex UI (star picker vs. three buttons)
- Harder to filter (what's the cutoff? >= 3?)

**Do this instead:** Three-state rating (current approach)
- Clear semantics: avoid, neutral, prefer
- Simple UI: three buttons
- Easy filtering: exclude THUMBS_DOWN, prioritize THUMBS_UP

### Anti-Pattern 4: Global Complexity Setting
**What people might do:** User setting "only show simple meals"
**Why it's wrong:**
- Users want variety (sometimes simple, sometimes complex)
- Creates rigid plans (all simple all week = boring)
- Ignores context (simple on busy Monday, complex on relaxed Saturday)

**Do this instead:** Per-swap filtering (current approach)
- User chooses complexity when swapping specific day
- Plans can mix complexities naturally
- Context-aware decisions

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1k users** | Current architecture sufficient. UsageHistory grows ~5 rows per user per week (260/year). Monitor database size after 6 months. |
| **1k-10k users** | Add database index on `UsageHistory.usedDate` for faster recent queries. Consider archiving history older than 6 months (retain for analytics, exclude from queries). |
| **10k+ users** | Implement pagination for `getSwapOptions` (currently returns all eligible meals). Cache commonly used filters with Redis. Consider denormalizing rating counts to Meal model for sorting. |

### Scaling Priorities

1. **First bottleneck:** UsageHistory table size
   - **When:** ~50k users or ~13M rows (260/user/year × 50k users)
   - **Fix:** Partition table by `usedDate` (PostgreSQL native partitioning). Archive entries older than 1 year to cold storage.

2. **Second bottleneck:** `getSwapOptions` query time
   - **When:** Users with 500+ meals (rare but possible for power users)
   - **Fix:** Add pagination (show first 50 matches, load more on scroll). Precompute "popular swaps" for cache warming.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Clerk Auth | Existing integration via `getCurrentUser()` | No changes needed. `userId` remains Clerk ID. |
| Neon PostgreSQL | Prisma ORM via DATABASE_URL | Migration adds enums + UsageHistory table. |
| Vercel (Deployment) | Next.js App Router (existing) | No changes to deployment pipeline. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **page.tsx ↔ Server Actions** | Direct function import | RSC imports Server Actions directly. No API routes needed. |
| **Client Component ↔ Server Actions** | Async function calls | `"use server"` enables client-to-server calls. Optimistic updates via `useState`. |
| **Server Actions ↔ Prisma** | Direct Prisma Client calls | Server Actions own all database mutations. No intermediate service layer. |
| **Components ↔ Components** | Props + callbacks | Parent passes `onAuthRequired` callback. Modal receives `day` and `filters` props. |

## Sources

**Official Documentation:**
- [Getting Started: Updating Data | Next.js](https://nextjs.org/docs/app/getting-started/updating-data)
- [useOptimistic – React](https://react.dev/reference/react/useOptimistic)
- [Models | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/models)
- [Prisma Schema API | Prisma Documentation](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)

**UI Patterns:**
- [Progressive Disclosure - NN/G](https://www.nngroup.com/articles/progressive-disclosure/)
- [Progressive Disclosure design pattern](https://ui-patterns.com/patterns/ProgressiveDisclosure)
- [What is Progressive Disclosure? | IxDF](https://www.interaction-design.org/literature/topics/progressive-disclosure)

**Prisma Enum Best Practices:**
- [Prisma Enum with TypeScript: A Comprehensive Guide](https://www.xjavascript.com/blog/prisma-enum-typescript/)
- [Tutorial on Prisma Enum with TypeScript](https://www.squash.io/tutorial-on-prisma-enum-with-typescript/)

**Meal Planning Patterns:**
- [Meal Planning Apps That You Will Actually Use (2026)](https://planeatai.com/blog/meal-planning-apps-that-you-will-actually-use-2026)
- [The Best Meal-Planning Apps in 2026 (Ranked): Why Ollie Is #1](https://ollie.ai/2025/10/21/best-meal-planning-apps-in-2025/)

---
*Architecture research for: What's for Dinner? v1.1 — Smart Variety & Preferences*
*Researched: 2026-02-12*
