# Stack Research

**Domain:** Minimal Meal Planning Web Application
**Researched:** 2026-02-09
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.5+ | Full-stack React framework | Industry standard for React SSR/SSG. Built-in App Router with React Server Components (RSC) enables server-first architecture perfect for minimal apps. Excellent DX with zero config. TypeScript and Tailwind built-in. Latest 15.5 (Aug 2025) brings stable Turbopack, typed routes, and Node.js middleware support. **CONFIDENCE: HIGH** |
| React | 19.2+ | UI library | React 19 (stable Dec 2024) is required for Next.js 15. Brings 40% improvement in Core Web Vitals. Server Components reduce JS bundle size dramatically—perfect for minimal apps. **CONFIDENCE: HIGH** |
| TypeScript | 5.8+ | Type safety | TypeScript 5.8 (Feb 2025) latest stable. Next.js 15.5 has excellent TS DX with auto-generated route types (`PageProps`, `LayoutProps`), `next typegen` command, and typed routes. Zero config needed. **CONFIDENCE: HIGH** |

### Authentication & Authorization

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Auth.js (NextAuth v5) | 5.0.0-beta | Authentication library | Auth.js v5 (rebranded NextAuth) is the standard for Next.js auth. Built-in Google OAuth provider requires only `clientId` and `clientSecret`. While still in beta, it's stable enough for production (widely used in 2025). **Critical 2025 update:** Middleware is NO LONGER safe for auth after CVE-2025-29927. Must use Data Access Layer (DAL) pattern with auth checks in Server Components/Actions. **CONFIDENCE: MEDIUM** (beta status, but production-ready) |

### Database & ORM

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| PostgreSQL (via Neon) | Latest | Relational database | Neon is serverless Postgres with pay-per-use pricing. **Key: Vercel Postgres now uses Neon as backend** (Q4 2024 transition). Free tier: 512MB storage, ~192 compute hours/month, branching, scale-to-zero. Perfect for minimal apps. Better cold start performance than Supabase (500ms-100ms vs longer). **CONFIDENCE: HIGH** |
| Prisma ORM | 7.x | Type-safe database client | Prisma 7 (late 2025) removed Rust engine—now pure TypeScript. Schema-first approach with excellent DX: `prisma generate` creates fully-typed client. Best for rapid development and beginners. Auto-generated types integrate perfectly with TypeScript/Next.js. **Alternative: Drizzle ORM (7.4kb, fastest)—but Prisma wins on DX for minimal projects.** **CONFIDENCE: HIGH** |

### Styling & UI

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tailwind CSS | 4.x | Utility-first CSS framework | Tailwind v4 (2025) simplifies setup with minimal dependencies. Next.js has first-class Tailwind support (auto-configured with `create-next-app`). Perfect for minimal, intentionally boring UI—utility classes keep components simple without CSS files. **CONFIDENCE: HIGH** |
| shadcn/ui | Latest | Component collection (optional) | NOT a library—copy/paste components built on Radix UI + Tailwind. Fully owned code, WCAG-compliant, zero bloat. Great for minimal apps that need a few polished components (forms, buttons, dialogs) without heavy frameworks. **Use sparingly—only add components you need.** **CONFIDENCE: HIGH** |

### Validation & Forms

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zod | 3.x | Schema validation | Industry standard for TypeScript validation. Share schemas between client/server to avoid duplication. Use with Server Actions: `schema.safeParse(formData)` for input validation. Integrates with forms via `useActionState` hook. Prevents over-engineering—no need for heavy form libraries. **CONFIDENCE: HIGH** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | **Recommended over npm/yarn for 2025.** 70% less disk space, fastest installs, strict dependency resolution prevents phantom dependency bugs. Monorepo-ready. Next.js plays well with pnpm. **CONFIDENCE: HIGH** |
| Biome | Linter + Formatter | **Alternative to ESLint + Prettier.** 10-25x faster, single binary (Rust-based), one config file vs four. Next.js 15.5 deprecated `next lint`—can now choose Biome during setup. Perfect for minimal projects avoiding tooling bloat. **Use if starting fresh; ESLint+Prettier fine for existing projects.** **CONFIDENCE: MEDIUM** (newer, but battle-tested) |
| Turbopack | Bundler | Built into Next.js 15.5 for production builds (`next build --turbopack`). 2-5x faster builds. Zero config. **Beta but stable on large codebases (1.2B+ requests on Vercel).** **CONFIDENCE: MEDIUM** (beta, but production-ready) |

## Installation

```bash
# Initialize Next.js project with TypeScript + Tailwind
npx create-next-app@latest my-meal-planner --typescript --tailwind --app --use-pnpm

# Core dependencies
pnpm add next-auth@beta zod @prisma/client
pnpm add -D prisma

# Optional: shadcn/ui (install selectively)
npx shadcn@latest init
npx shadcn@latest add button form input

# Initialize Prisma with Neon
npx prisma init --datasource-provider postgresql
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Auth.js (NextAuth v5)** | Clerk, Lucia Auth | Clerk if you need drop-in auth UI (but paid beyond free tier). Lucia for full control over auth flow (more manual). NextAuth is sweet spot for Google-only OAuth. |
| **Prisma ORM** | Drizzle ORM | Drizzle if performance is critical (10x faster, 7.4kb bundle) or serverless/edge deployment. Prisma better for DX and rapid development. |
| **Neon Postgres** | Supabase, PlanetScale | Supabase if you need realtime subscriptions or built-in auth/storage. PlanetScale if MySQL preferred. Neon best for pure Postgres with Vercel integration. |
| **Vercel** | Netlify, Railway, Fly.io | Vercel perfect for Next.js (made by same team), but expensive at scale ($500-2000/month for moderate traffic). Railway/Fly.io for predictable costs. Netlify for multi-framework. **For minimal personal app, Vercel free tier sufficient.** |
| **Biome** | ESLint + Prettier | ESLint+Prettier if you need extensive plugin ecosystem (security, a11y). Biome for speed and simplicity. |
| **pnpm** | npm, yarn | npm if you want "default" experience (most compatible). Yarn for mature workspaces. pnpm for modern projects. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **NextAuth v4** | v4 uses deprecated patterns. CVE-2025-29927 security issue affects middleware-based auth. v5 enforces safer Data Access Layer pattern. | Auth.js v5 (next-auth@beta) |
| **Pages Router** | Next.js App Router is the future. Pages Router only supports React 18 (missing RSC benefits). All new projects should use App Router. | App Router (`/app` directory) |
| **Client-side data fetching** | React Server Components eliminate need for `useEffect` + fetch. Server Components fetch data directly with async/await—less JS, better performance. | Server Components with async functions |
| **Heavy component libraries** | Material-UI, Ant Design add 300kb+ to bundle. Overkill for minimal app. | Tailwind CSS + shadcn/ui (copy only what you need) |
| **Redux, Zustand for all state** | Most state should be server state (via RSC). Only use client state management for truly interactive UI. Over-engineering for minimal apps. | React Server Components + minimal `useState` for interactivity |
| **MongoDB with Prisma** | Prisma's MongoDB support is incomplete. Better Postgres support. | PostgreSQL (Neon) with Prisma |
| **Middleware for authentication** | **CRITICAL: CVE-2025-29927.** Middleware doesn't protect static routes, runs on Edge (no DB access). | Data Access Layer (DAL) with auth checks in Server Components/Actions |

## Stack Rationale for "What's for Dinner?"

### Why This Stack Fits Your Constraints:

1. **Next.js + TypeScript (locked in)** ✅
   - Blueprint repo already has Next.js/TypeScript—stack complements existing choice

2. **Google sign-in only** ✅
   - Auth.js GoogleProvider is literally 3 lines of config
   - No complex auth UI needed—minimal setup

3. **Simple text-based meal list (no images, recipes)** ✅
   - Postgres with Prisma perfect for simple relational data (users, meals, plans)
   - No need for S3/image hosting—keeps stack minimal

4. **Minimal UI, intentionally boring** ✅
   - Tailwind + shadcn/ui = boring, predictable components
   - No flashy animations or heavy UI frameworks

5. **Weekly plan generation with basic variation logic** ✅
   - Server Actions ideal for plan generation logic
   - Prisma makes database queries simple
   - React Server Components reduce client JS (fast load)

6. **Must work fast (<60 second planning sessions)** ✅
   - Neon scales to zero (no cold start delays for active users)
   - Turbopack (2-5x faster builds)
   - RSC reduces hydration time

### Avoid Over-Engineering:

- ❌ No recipe APIs (Spoonacular, Edamam)—not needed
- ❌ No image storage (Cloudinary, S3)—not needed
- ❌ No real-time features (WebSockets, Pusher)—not needed
- ❌ No complex state management (Redux)—RSC handles it
- ❌ No microservices/GraphQL—monolithic Next.js app sufficient

### Stack Stays Minimal:

This stack has **7 production dependencies** (excluding Next.js built-ins):
1. `next-auth` (auth)
2. `@prisma/client` (database)
3. `zod` (validation)
4. `tailwindcss` (styling - auto-installed)
5. Optional: 2-3 shadcn/ui components (copied, not installed)

Compare to typical React app: 20-40 dependencies. **This is intentionally lean.**

## Deployment & Infrastructure

| Technology | Purpose | Why Recommended |
|------------|---------|-----------------|
| **Vercel** | Hosting | Free tier perfect for personal/minimal apps (100GB bandwidth, unlimited requests). Made by Next.js creators—zero config deployment. Git push = live site. Integrated with Neon Postgres. **Costs scale with traffic—for minimal app, likely stays free.** **CONFIDENCE: HIGH** |
| **Neon Postgres** | Database hosting | Free tier: 512MB storage, ~192 compute hours/month. Auto-scales to zero. Vercel integration built-in. **CONFIDENCE: HIGH** |
| **GitHub** | Version control + CI/CD | Vercel auto-deploys from GitHub. Built-in CI via GitHub Actions. **CONFIDENCE: HIGH** |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15.5+ | React 19.2+, Node.js 20.9+ | React 19 required for Next.js 15 App Router. Node.js 20.9 minimum. |
| Auth.js v5 (beta) | Next.js 14+, React 19+ | Requires App Router. v5 beta stable enough for production. |
| Prisma 7.x | PostgreSQL 12+, Node.js 18+ | Works with Neon's Postgres 15+. Prisma 7 dropped Rust engine (pure TS now). |
| Tailwind CSS 4.x | Next.js 13.4+, PostCSS 8+ | Auto-configured with `create-next-app`. |
| TypeScript 5.8+ | Next.js 15+, React 19+ | Next.js 15.5 has best TS support (typed routes, auto-generated props). |

## Sources

### High Confidence Sources (Context7, Official Docs):
- [Next.js 15.5 Release](https://nextjs.org/blog/next-15-5) — Official release notes, features, and recommendations
- [Next.js 15 Release](https://nextjs.org/blog/next-15) — React 19 support, App Router updates
- [Next.js Authentication Docs](https://nextjs.org/docs/app/guides/authentication) — Official auth patterns
- [Auth.js Google Provider](https://next-auth.js.org/providers/google) — Official Google OAuth setup
- [Prisma Next.js Docs](https://www.prisma.io/nextjs) — Official integration guide
- [Tailwind CSS Next.js Guide](https://tailwindcss.com/docs/guides/nextjs) — Official setup
- [TypeScript 5.8 Announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/) — Official Microsoft release
- [Neon Vercel Postgres Transition](https://neon.com/docs/guides/vercel-postgres-transition-guide) — Official migration guide

### Medium Confidence Sources (Verified Web Search):
- [Complete Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) — CVE-2025-29927, auth best practices
- [Next.js Authentication Best Practices 2025](https://www.franciscomoretti.com/blog/modern-nextjs-authentication-best-practices) — Data Access Layer pattern
- [Prisma vs Drizzle 2026 Comparison](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — ORM comparison
- [Best Databases for Next.js 2026](https://nextjstemplates.com/blog/best-database-for-nextjs) — Database options
- [Biome vs ESLint 2025 Showdown](https://medium.com/better-dev-nextjs-react/biome-vs-eslint-prettier-the-2025-linting-revolution-you-need-to-know-about-ec01c5d5b6c8) — Tooling comparison
- [pnpm vs npm vs yarn 2025](https://dev.to/hamzakhan/npm-vs-yarn-vs-pnpm-which-package-manager-should-you-use-in-2025-2f1g) — Package manager comparison
- [shadcn/ui Modern React Components](https://thecodebeast.com/shadcn-ui-the-component-library-that-finally-puts-developers-in-control/) — Component library overview
- [Next.js App Router Best Practices 2025](https://www.anshgupta.in/blog/nextjs-app-router-best-practices-2025) — Server Actions patterns

### Low Confidence / Additional Context:
- [Vercel Alternatives 2025](https://snappify.com/blog/vercel-alternatives) — Deployment options
- [React 19 + Next.js 15 Guide](https://medium.com/@genildocs/next-js-15-react-19-full-stack-implementation-guide-4ba0978fa0e5) — Compatibility notes

---
*Stack research for: What's for Dinner? (Minimal Meal Planning Web App)*
*Researched: 2026-02-09*
*Researcher: GSD Project Researcher Agent*
