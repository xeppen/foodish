# Deployment Guide

This guide walks through deploying "What's for Dinner?" to production on Vercel with Neon PostgreSQL.

## Prerequisites

- GitHub account
- Vercel account (free tier is sufficient)
- Neon account (free tier is sufficient)
- Google Cloud Console access for OAuth

## Step 1: Set Up Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project (e.g., "foodish-prod")
3. Copy the connection string (it will look like: `postgresql://username:password@host.neon.tech/database?sslmode=require`)
4. Save this for later use

## Step 2: Set Up Google OAuth for Production

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to "APIs & Services" > "Credentials"
4. Edit your OAuth 2.0 Client ID or create a new one
5. Add authorized redirect URIs:
   - `https://your-domain.vercel.app/api/auth/callback/google`
   - If using a custom domain: `https://yourdomain.com/api/auth/callback/google`
6. Save your Client ID and Client Secret

## Step 3: Generate NextAuth Secret

Run this command locally to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output for use in Vercel environment variables.

## Step 4: Deploy to Vercel

### Option A: Deploy from Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: Leave default (uses package.json script)
   - **Install Command**: Leave default

5. Add Environment Variables:
   ```
   DATABASE_URL=your-neon-connection-string
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=your-generated-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

6. Click "Deploy"

### Option B: Deploy from CLI

1. Install Vercel CLI:
   ```bash
   pnpm add -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow prompts and add environment variables when prompted

## Step 5: Initialize Database

After deployment, you need to push the database schema:

1. Add your production `DATABASE_URL` to `.env` temporarily (or use Vercel CLI):
   ```bash
   DATABASE_URL="your-neon-connection-string" npx prisma db push
   ```

2. Or use Vercel CLI to run commands in the production environment:
   ```bash
   vercel env pull .env.production
   npx prisma db push
   ```

## Step 6: Verify Deployment

1. Visit your deployed URL: `https://your-domain.vercel.app`
2. Test Google sign-in
3. Create a meal
4. Generate a weekly plan
5. Test meal swapping

## Step 7: Custom Domain (Optional)

1. In Vercel Dashboard, go to your project
2. Click "Settings" > "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Update `NEXTAUTH_URL` environment variable to use custom domain
6. Update Google OAuth authorized redirect URIs

## Environment Variables Reference

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host.neon.tech/db?sslmode=require` | Neon PostgreSQL connection string |
| `NEXTAUTH_URL` | `https://yourdomain.com` | Your production URL |
| `NEXTAUTH_SECRET` | `random-32-char-string` | Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | `123456789-abc.apps.googleusercontent.com` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-abcd1234` | From Google Cloud Console |

## Troubleshooting

### Build Fails with Prisma Errors

If the build fails due to Prisma:
1. Ensure `DATABASE_URL` is set in Vercel environment variables
2. Check that the build command includes `prisma generate`
3. Verify your database is accessible from Vercel's network

### Authentication Fails

If Google sign-in doesn't work:
1. Verify `NEXTAUTH_URL` matches your deployment URL exactly
2. Check Google OAuth redirect URIs include your production URL
3. Ensure `NEXTAUTH_SECRET` is set
4. Check browser console for errors

### Database Connection Errors

If you see database connection errors:
1. Verify `DATABASE_URL` is correct and includes `?sslmode=require`
2. Ensure Neon database is active (free tier may sleep after inactivity)
3. Check Neon dashboard for connection issues

### No Meals Showing

If starter meals don't appear:
1. Ensure database schema is pushed (`prisma db push`)
2. Check that the user was created properly in the database
3. Try signing out and back in

## Monitoring

- **Vercel Dashboard**: Monitor deployments, logs, and analytics
- **Neon Dashboard**: Monitor database usage, connection pool, and queries
- **Google Cloud Console**: Monitor OAuth usage and quotas

## Costs

With the current architecture on free tiers:

- **Vercel Free Tier**: 100GB bandwidth, unlimited requests (sufficient for personal use)
- **Neon Free Tier**: 512MB storage, ~192 compute hours/month (sufficient for personal use)
- **Google OAuth**: Free up to 1M requests/month

For moderate traffic (100-500 users), costs remain within free tiers.

## Scaling Considerations

If you need to scale beyond free tiers:

1. **Vercel Pro** ($20/month): Increased bandwidth and performance
2. **Neon Scale** ($19/month): Increased storage and compute
3. **Alternative Hosts**: Consider Railway, Fly.io, or Render for predictable costs

## Security Best Practices

- ✅ Never commit `.env` files
- ✅ Use strong `NEXTAUTH_SECRET` (32+ characters)
- ✅ Rotate secrets periodically
- ✅ Enable 2FA on Vercel, Neon, and Google accounts
- ✅ Monitor access logs regularly
- ✅ Keep dependencies updated

## Backup Strategy

**Database Backups (Neon):**
- Neon automatically backs up your database
- Free tier: 7-day point-in-time restore
- Paid tiers: 30-day point-in-time restore

**Code Backups:**
- Git repository serves as code backup
- Vercel maintains deployment history

## Updates and Maintenance

To deploy updates:

1. Push code to your GitHub repository
2. Vercel automatically deploys the main branch
3. Monitor the deployment in Vercel dashboard
4. If database schema changes, run `prisma db push` in production

## Support

- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Neon**: [neon.tech/docs](https://neon.tech/docs)
- **Auth.js**: [authjs.dev](https://authjs.dev)
- **Prisma**: [prisma.io/docs](https://prisma.io/docs)
