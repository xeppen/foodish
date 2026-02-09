# What's for Dinner?

A minimal dinner planning tool that removes decision fatigue. Weekly dinner planning in under 60 seconds.

## Features

- **Google Sign-In**: Secure authentication with Google OAuth
- **Starter Pack**: 18 pre-filled common meals to get started immediately
- **Meal Management**: Add, edit, and delete your personal meal list
- **Auto-Generated Plans**: Get a 5-day dinner plan with one click
- **Smart Rotation**: Automatically avoids meals from the previous week
- **Quick Adjustments**: Swap individual days without regenerating the entire plan
- **Persistent Plans**: Your weekly plan is automatically saved

## Tech Stack

- **Framework**: Next.js 15.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Auth.js v5 (NextAuth)
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20.9 or higher
- pnpm (recommended) or npm
- PostgreSQL database (Neon recommended)
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd foodish
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:

Copy `.env.local` and fill in the required values:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="your-postgres-connection-string"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

4. Set up the database:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-domain.com/api/auth/callback/google` (production)
5. Copy the Client ID and Client Secret to your `.env.local` file

## Deployment to Vercel

1. Push your code to GitHub

2. Import your repository in [Vercel](https://vercel.com)

3. Configure environment variables in Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (your production URL)
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

4. Deploy! Vercel will automatically build and deploy your application.

5. Run database migrations:
```bash
npx prisma migrate deploy
```

## Project Structure

```
/app                    # Next.js App Router pages
  /api/auth            # NextAuth API routes
  /auth/signin         # Sign-in page
  /dashboard           # Main dashboard
  /meals               # Meal management
  /plan                # Weekly plan view
/components            # Reusable React components
/lib                   # Utility functions and configurations
  /actions             # Server Actions for data mutations
  auth.ts              # Authentication utilities
  prisma.ts            # Prisma client
/prisma                # Database schema and migrations
/types                 # TypeScript type definitions
```

## Core Value Proposition

This tool is intentionally minimal. It's designed to:
- ✅ Remove the "what's for dinner?" decision
- ✅ Take less than 60 seconds per week
- ✅ Provide boring, predictable relief

It intentionally does NOT:
- ❌ Provide recipes or cooking instructions
- ❌ Track nutrition or health metrics
- ❌ Generate shopping lists
- ❌ Use AI for recommendations
- ❌ Include social features

## License

MIT

## Credits

Built with Claude Code.
