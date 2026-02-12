# Phase 6: Database Foundation - Research

**Researched:** 2026-02-12
**Domain:** Prisma Schema Evolution + PostgreSQL Enum Migration
**Confidence:** HIGH

## Summary

Phase 6 adds rating and complexity enums plus usage history tracking to the existing Prisma schema. The primary technical challenges are backward-compatible enum migrations in PostgreSQL and multi-field index optimization for filtered queries. All work uses existing stack (Prisma 5.22.0 + PostgreSQL/Neon + Next.js 15) with zero new dependencies.

The critical constraint is production safety: the app is live with real users, so migrations must not break existing functionality during deployment rollout. PostgreSQL's enum safety restrictions require multi-step migrations when adding enum values with defaults. The expand-and-contract pattern ensures zero downtime by adding nullable fields first, then deploying compatible code before applying constraints.

**Primary recommendation:** Use two-migration approach for enums (add type, then apply default) + composite indexes on (userId, rating) and (userId, complexity) for filtered queries.

## Standard Stack

### Core (No Changes)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | 5.22.0 | Schema management, migrations | Already in use; v7.x has breaking changes without needed features |
| PostgreSQL | (Neon) | Database with native enum support | Existing production database |
| TypeScript | 5.x | Type generation from schema | Prisma Client generates types automatically from schema changes |

### Supporting (No Changes)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @prisma/client | 5.22.0 | Generated query client | Auto-updated via `prisma generate` |
| prisma (CLI) | 5.22.0 | Migration tooling | `npx prisma migrate dev` for development migrations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native PG enums | String literals + validation | Enums provide DB-level type safety + Prisma generates TypeScript types |
| UsageHistory table | JSON column in WeeklyPlan | Relational table enables efficient querying/filtering by date ranges |
| Separate rating/complexity tables | Inline enum fields | Normalization overkill for fixed enum sets (3-4 values each) |

**Installation:**
No new packages required. Existing dependencies sufficient.

## Architecture Patterns

### Recommended Schema Structure
```prisma
// Enums defined at top level
enum Rating {
  THUMBS_DOWN
  NEUTRAL
  THUMBS_UP
}

enum Complexity {
  SIMPLE
  MEDIUM
  COMPLEX
}

// Existing Meal model extended
model Meal {
  id         String          @id @default(cuid())
  name       String
  userId     String
  lastUsed   DateTime?
  rating     Rating?         // Nullable for backward compat
  complexity Complexity?     // Nullable for backward compat
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  usageHistory UsageHistory[]

  @@index([userId])
  @@index([userId, rating])        // Composite for filtered queries
  @@index([userId, complexity])    // Composite for filtered queries
}

// New model for usage tracking
model UsageHistory {
  id            String   @id @default(cuid())
  meal          Meal     @relation(fields: [mealId], references: [id], onDelete: Cascade)
  mealId        String
  userId        String
  usedDate      DateTime @default(now())
  weekStartDate DateTime
  createdAt     DateTime @default(now())

  @@index([userId, usedDate])
  @@index([mealId])
}
```

### Pattern 1: Backward-Compatible Enum Addition
**What:** Add enum fields as nullable first, deploy code that handles null gracefully, then optionally add defaults later.

**When to use:** Production databases where old code may run against new schema during deployment.

**Example:**
```prisma
// Step 1: Add nullable enum (this migration)
model Meal {
  rating Rating?  // No default, nullable
}

// Step 2: Application code handles null as "NEUTRAL"
const effectiveRating = meal.rating ?? 'NEUTRAL';

// Step 3 (future): Can add @default(NEUTRAL) after backfill if desired
```

**Why this works:** Existing queries return null for new fields, application code provides default behavior, no breaking changes during deployment window.

### Pattern 2: Composite Index for Filtered Queries
**What:** Multi-column indexes where userId comes first, followed by filter fields (rating, complexity, timestamp).

**When to use:** Queries that filter by user AND additional criteria (ratings, complexity levels).

**Example:**
```prisma
@@index([userId, rating])
@@index([userId, complexity])
@@index([userId, usedDate])  // For UsageHistory
```

**Why userId first:** PostgreSQL composite indexes are left-to-right. Since ALL queries filter by userId (multi-tenant pattern via Clerk), userId must be the leftmost column. Queries filtering only by userId can still use these indexes efficiently.

### Pattern 3: Cascading Deletes for Usage History
**What:** When a Meal is deleted, automatically delete related UsageHistory entries via `onDelete: Cascade`.

**When to use:** Dependent data that has no meaning without parent record.

**Example:**
```prisma
model UsageHistory {
  meal   Meal   @relation(fields: [mealId], references: [id], onDelete: Cascade)
  mealId String
}
```

**Why:** UsageHistory tracks when specific meals were used. If meal deleted, history entries are orphaned and meaningless. Cascade cleanup prevents database bloat.

### Pattern 4: Two-Step Enum Migration (PostgreSQL Requirement)
**What:** PostgreSQL requires enum values to be committed before using them as defaults. Split into two migrations.

**When to use:** Always, when adding NEW enum type with default value in same change.

**Example:**
```bash
# Migration 1: Define enum types, add nullable fields
enum Rating {
  THUMBS_DOWN
  NEUTRAL
  THUMBS_UP
}

model Meal {
  rating Rating?  // Nullable, no default yet
}

# Migration 2 (if defaults needed later): Add defaults
model Meal {
  rating Rating? @default(NEUTRAL)
}
```

**Why:** PostgreSQL error P3018 "New enum values must be committed before they can be used" prevents single-migration approach. This is a database-level safety restriction.

### Anti-Patterns to Avoid

- **Adding NOT NULL constraint immediately:** Existing meals have no ratings/complexity. NOT NULL would fail migration or require complex backfill. Keep nullable, handle in application code.

- **Single index per field:** `@@index([rating])` without userId is useless since ALL queries filter by userId first. Always include userId in composite indexes.

- **Storing meal names in UsageHistory:** Current WeeklyPlan stores meal names (strings). Don't copy this pattern for UsageHistory. Use proper foreign key (mealId) so changes to meal names don't orphan history records.

- **Adding enums as strings with validation:** Enum types provide type safety in Prisma Client (TypeScript) and database-level constraints. String fields with Zod validation are inferior for fixed value sets.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enum value validation | Custom Zod schemas or string checks | Prisma enum types | DB-level constraint + auto-generated TS types + better error messages |
| Migration scripts | SQL files executed manually | `prisma migrate dev` workflow | Tracks migration history, generates rollback-safe files, syncs Prisma Client |
| Foreign key constraints | Manual SQL ALTER TABLE ADD CONSTRAINT | Prisma @relation with onDelete | Declarative, generates correct SQL, documents intent in schema |
| Composite indexes | CREATE INDEX commands | @@index([field1, field2]) | Schema-as-code, version controlled, auto-applied in migrations |

**Key insight:** Prisma's migration tooling handles edge cases (concurrent index creation, enum ordering, FK constraint naming) that manual SQL often gets wrong. The schema file is the source of truth.

## Common Pitfalls

### Pitfall 1: Null Ratings Breaking Plan Generation
**What goes wrong:** After migration, all existing meals have `rating: null`. If new selection algorithm filters by `rating != null` or doesn't handle nulls, plan generation fails with "not enough meals."

**Why it happens:** Developer adds rating field, updates query to `orderBy: { rating: 'desc' }`, tests with newly-created meals (which have ratings), doesn't test with legacy data.

**How to avoid:**
- Treat null as NEUTRAL in all queries: `orderBy: [{ rating: { sort: 'desc', nulls: 'last' } }, { lastUsed: 'asc' }]`
- Never filter with `rating: { not: null }` — always include unrated meals in pool
- Test migration against production data copy with actual meal volumes
- Application code provides default: `const effectiveRating = meal.rating ?? Rating.NEUTRAL`

**Warning signs:**
- Tests pass with fresh test database but fail when run against production data copy
- User with 15 meals suddenly can't generate plan post-migration
- New users work fine but existing users see errors

### Pitfall 2: Enum Migration Order Causing P3018 Error
**What goes wrong:** Adding enum type with default value in single migration fails with PostgreSQL error: "New enum values must be committed before they can be used."

**Why it happens:** PostgreSQL safety restriction prevents using newly-created enum values until transaction commits. Prisma generates migration that tries to: (1) CREATE TYPE Rating, (2) ALTER TABLE ADD COLUMN with DEFAULT, causing deadlock.

**How to avoid:**
- Split into two migrations:
  ```bash
  # Migration 1: add_rating_complexity_enums
  CREATE TYPE "Rating" AS ENUM ('THUMBS_DOWN', 'NEUTRAL', 'THUMBS_UP');
  ALTER TABLE "Meal" ADD COLUMN "rating" "Rating";

  # Migration 2 (only if needed): add_rating_defaults
  ALTER TABLE "Meal" ALTER COLUMN "rating" SET DEFAULT 'NEUTRAL';
  ```
- For Phase 6: Keep fields nullable without defaults (application provides default behavior)
- Review generated migration SQL before applying: `npx prisma migrate dev --create-only`

**Warning signs:**
- Migration file contains both `CREATE TYPE` and `DEFAULT` in same ALTER TABLE
- Error message mentions "must be committed before"
- Works in SQLite test environment but fails in PostgreSQL staging

### Pitfall 3: Missing Composite Indexes Causing Slow Queries
**What goes wrong:** After adding rating/complexity fields, queries like "get all SIMPLE complexity meals for userId X" become slow (500ms+) as dataset grows.

**Why it happens:** Single-column index on rating or complexity can't be used efficiently when query filters by userId first (which ALL queries do in multi-tenant app).

**How to avoid:**
- Always include userId in composite indexes: `@@index([userId, rating])` not `@@index([rating])`
- Column order matters: userId first (most selective filter), then additional criteria
- Add indexes for ALL filter combinations used in queries:
  - Filtered swap by complexity: needs `[userId, complexity]`
  - Plan generation with rating priority: needs `[userId, rating]`
  - Usage history lookups: needs `[userId, usedDate]` and `[mealId]`

**Warning signs:**
- Query times increase as user's meal library grows
- `EXPLAIN ANALYZE` shows sequential scan instead of index scan
- New queries introduced in Phase 3/4 perform poorly despite "working"

### Pitfall 4: Forgetting Cascade Delete for UsageHistory
**What goes wrong:** User deletes a meal. UsageHistory entries remain, referencing non-existent mealId. Database fills with orphaned records. Future queries return confusing results or errors.

**Why it happens:** Default Prisma relation behavior is `onDelete: Restrict` (prevent deletion if references exist). Developer either forgets onDelete entirely or uses wrong value.

**How to avoid:**
- Add `onDelete: Cascade` to UsageHistory.meal relation:
  ```prisma
  meal Meal @relation(fields: [mealId], references: [id], onDelete: Cascade)
  ```
- This generates proper `ON DELETE CASCADE` constraint in PostgreSQL
- Test: Create meal, generate plan (creates history), delete meal, verify history entries also deleted

**Warning signs:**
- UsageHistory table grows indefinitely
- COUNT(*) on UsageHistory doesn't decrease when meals deleted
- Foreign key constraint violations when querying history

### Pitfall 5: Not Testing Migration Rollout Scenario
**What goes wrong:** New schema deployed to database, but old application code still running on some servers during 5-10 minute deployment window. Old code tries to INSERT without new fields, or doesn't expect new fields in SELECT results.

**Why it happens:** Developer tests locally where schema + code update atomically. Production has phased rollout (database first, then rolling app server updates).

**How to avoid:**
- Nullable fields allow old code to omit them in INSERTs
- Old code ignores unknown fields in SELECT results (Prisma Client behavior)
- Test explicitly: Run current production code against new schema in staging
- Document in migration commit: "Backward compatible - old code can run against this schema"

**Warning signs:**
- Deployment logs show database errors during rollout window
- Some users see errors while others don't (hitting different app server versions)
- Rollback impossible because database schema already changed

## Code Examples

Verified patterns for Phase 6 implementation:

### Complete Schema Changes
```prisma
// Source: Prisma Documentation - Enums + Relations + Indexes

// Enum definitions (top of schema file)
enum Rating {
  THUMBS_DOWN
  NEUTRAL
  THUMBS_UP
}

enum Complexity {
  SIMPLE
  MEDIUM
  COMPLEX
}

// Extended Meal model
model Meal {
  id         String          @id @default(cuid())
  name       String
  userId     String          // Clerk user ID
  lastUsed   DateTime?
  rating     Rating?         // Nullable for backward compatibility
  complexity Complexity?     // Nullable for backward compatibility
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  usageHistory UsageHistory[]

  @@index([userId])
  @@index([userId, rating])
  @@index([userId, complexity])
}

// New UsageHistory model
model UsageHistory {
  id            String   @id @default(cuid())
  meal          Meal     @relation(fields: [mealId], references: [id], onDelete: Cascade)
  mealId        String
  userId        String
  usedDate      DateTime @default(now())
  weekStartDate DateTime
  createdAt     DateTime @default(now())

  @@index([userId, usedDate])
  @@index([mealId])
}
```

### Migration Command Sequence
```bash
# Source: Prisma Migrate Documentation

# 1. Update schema.prisma with changes above
# 2. Create migration (review before applying)
npx prisma migrate dev --create-only --name add_ratings_complexity_variety

# 3. Review generated SQL in prisma/migrations/[timestamp]_add_ratings_complexity_variety/migration.sql
# Verify:
# - CREATE TYPE statements for enums
# - ALTER TABLE for nullable columns (no NOT NULL)
# - CREATE INDEX statements for composite indexes
# - ON DELETE CASCADE in foreign key constraint

# 4. Apply migration
npx prisma migrate dev

# 5. Generate updated Prisma Client with new types
npx prisma generate

# 6. Verify migration success
npx prisma db push --accept-data-loss=false  # Dry run check
```

### Handling Null Ratings in Queries
```typescript
// Source: Prisma orderBy nulls handling + Application-level defaults

// BAD: Filters out unrated meals
const meals = await prisma.meal.findMany({
  where: {
    userId,
    rating: { not: null }  // ❌ Excludes all existing meals!
  }
});

// GOOD: Includes unrated, sorts them last
const meals = await prisma.meal.findMany({
  where: { userId },
  orderBy: [
    { rating: { sort: 'desc', nulls: 'last' } },  // Unrated go to end
    { lastUsed: 'asc' }  // Then by recency
  ]
});

// GOOD: Application provides default interpretation
const effectiveRating = meal.rating ?? Rating.NEUTRAL;
const ratingWeight = effectiveRating === Rating.THUMBS_UP ? 2 :
                     effectiveRating === Rating.THUMBS_DOWN ? 0.5 : 1;
```

### Creating UsageHistory Entries
```typescript
// Source: Prisma relation creation pattern

// When generating plan or swapping meal
await prisma.usageHistory.create({
  data: {
    mealId: selectedMeal.id,
    userId: user.id,
    usedDate: new Date(),
    weekStartDate: getWeekStart()  // Monday of current week
  }
});

// Or create multiple at once when generating full plan
await prisma.usageHistory.createMany({
  data: selectedMeals.map(meal => ({
    mealId: meal.id,
    userId: user.id,
    usedDate: new Date(),
    weekStartDate: getWeekStart()
  }))
});
```

### Querying with Composite Indexes
```typescript
// Source: PostgreSQL composite index documentation + Prisma patterns

// ✅ Uses composite index [userId, complexity] efficiently
const simpleMeals = await prisma.meal.findMany({
  where: {
    userId: user.id,
    complexity: Complexity.SIMPLE
  }
});

// ✅ Uses composite index [userId, rating] efficiently
const favorited = await prisma.meal.findMany({
  where: {
    userId: user.id,
    rating: Rating.THUMBS_UP
  }
});

// ✅ Uses composite index [userId, usedDate] efficiently
const recentUsage = await prisma.usageHistory.findMany({
  where: {
    userId: user.id,
    usedDate: { gte: twoWeeksAgo }
  },
  include: { meal: true }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SQL migrations | Prisma Migrate | Prisma 2.0+ (2020) | Schema-as-code, version control, auto-rollback |
| String enums validated in app | Native Prisma enums | Prisma 2.12+ (2021) | DB constraints + TypeScript types |
| Single-field indexes | Composite indexes for filtering | PostgreSQL standard practice | Multi-column filters use single index |
| @db.Timestamp(3) | @db.Timestamptz(6) for timestamps | PostgreSQL best practice (2024+) | Timezone awareness (not critical for Phase 6) |

**Deprecated/outdated:**
- `prisma migrate save` / `prisma migrate up`: Replaced by `prisma migrate dev` in Prisma 2.13+
- `@@index([field], name: "custom")`: The `name` argument optional, Prisma auto-generates names now
- Manual `prisma generate` after migrations: `prisma migrate dev` runs it automatically

## Open Questions

1. **Should we add @default values to enums after nullable migration?**
   - What we know: PostgreSQL P3018 error prevents adding enum with default in same migration
   - What's unclear: Whether adding defaults in second migration provides value
   - Recommendation: Skip defaults. Application code provides default behavior (null = NEUTRAL). Adding DB defaults later requires second migration for minimal benefit. Keep nullable permanently.

2. **Should UsageHistory track meal name as snapshot for historical accuracy?**
   - What we know: WeeklyPlan stores meal names (strings), Meal model has updatable name field
   - What's unclear: If user renames "Spaghetti" to "Pasta Bolognese", should history show old or new name?
   - Recommendation: Store only mealId (foreign key). Join to Meal table for current name. Historical name changes are low-value feature, not worth denormalization complexity. Can add `mealNameSnapshot` field later if users request it.

3. **Is @db.Timestamptz(6) needed for usedDate and weekStartDate?**
   - What we know: Best practice for PostgreSQL is timezone-aware timestamps
   - What's unclear: All users currently in same timezone (Swedish app), does timezone matter?
   - Recommendation: Use plain DateTime (maps to TIMESTAMP(3)). Timezone awareness not needed for relative date math ("2 weeks ago"). Can add @db.Timestamptz later if app goes multi-timezone. Don't over-engineer for Phase 6.

## Sources

### Primary (HIGH confidence)

**Official Prisma Documentation:**
- [Prisma Schema - Models](https://www.prisma.io/docs/orm/prisma-schema/data-model/models) - Enum fields, nullable types, defaults
- [Prisma Data Migration - Expand and Contract Pattern](https://www.prisma.io/docs/guides/data-migration) - Backward-compatible migration strategy
- [Prisma Schema - Indexes](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes) - Composite index configuration
- [Prisma Schema - Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations) - Foreign key patterns, @relation syntax

**Known Issues:**
- [Prisma Issue #8424](https://github.com/prisma/prisma/issues/8424) - P3018 enum default value error, two-migration workaround
- [Working with Composite IDs and Constraints](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints) - Composite unique constraints

### Secondary (MEDIUM-HIGH confidence)

**PostgreSQL Best Practices:**
- [PostgreSQL Index Best Practices for Faster Queries](https://www.mydbops.com/blog/postgresql-indexing-best-practices-guide) - Composite index column ordering
- [Unleashing the Power of Composite Indexes in PostgreSQL](https://medium.com/threadsafe/unleashing-the-power-of-composite-indexes-in-postgresql-909ac95fc476) - Multi-column index performance
- [How to Use Composite Indexes in SQL to Speed Up Queries](https://blog.timescale.com/use-composite-indexes-to-speed-up-time-series-queries-sql-8ca2df6b3aaa/) - Time-series + userId patterns

**Migration Safety:**
- [How to Fix Prisma DateTime and Timezone Issues with PostgreSQL](https://medium.com/@basem.deiaa/how-to-fix-prisma-datetime-and-timezone-issues-with-postgresql-1c778aa2d122) - Timestamp type considerations
- [How to configure indexes in Prisma - LogRocket](https://blog.logrocket.com/how-configure-indexes-prisma/) - Index configuration patterns

**Codebase Context:**
- `/Users/seblju/Development/repos/foodish/prisma/schema.prisma` - Current schema structure
- `/Users/seblju/Development/repos/foodish/lib/actions/plans.ts` - Existing query patterns (lastUsed ordering, meal selection)
- `/Users/seblju/Development/repos/foodish/package.json` - Confirmed Prisma 5.22.0

**Milestone Research:**
- `.planning/research/SUMMARY.md` - Phase 1 implementation details, zero-dependency constraint
- `.planning/research/PITFALLS.md` - Pitfalls #1 (null ratings) and #6 (backward compatibility)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No changes to existing validated stack, Prisma 5.22.0 sufficient for enums + relations
- Architecture: HIGH - Official Prisma docs + PostgreSQL best practices + existing codebase patterns
- Pitfalls: HIGH - Known GitHub issues (P3018) + milestone research + production migration experience patterns

**Research date:** 2026-02-12
**Valid until:** 60 days (stable technology - Prisma ORM patterns, PostgreSQL enums)

**Note for planner:** This research is Phase 6-specific (database schema only). Phases 2-5 will implement queries/UI that consume this schema. All patterns verified against Prisma 5.22.0 documentation and PostgreSQL compatibility.
