# Launch Checklist

Use this checklist when deploying "What's for Dinner?" to production.

## Pre-Deployment

### 1. Code Review
- [x] All 5 phases completed
- [x] All 19 v1 requirements met
- [x] No console.log statements in production code
- [x] No TODO comments in critical paths
- [x] TypeScript builds without errors
- [x] ESLint passes without errors

### 2. Environment Setup
- [ ] Neon PostgreSQL database created
- [ ] Database connection string obtained
- [ ] Google OAuth credentials created
- [ ] OAuth redirect URIs configured
- [ ] NextAuth secret generated (32+ characters)
- [ ] All environment variables documented

### 3. Repository
- [ ] Code pushed to GitHub
- [ ] .env files not committed
- [ ] .gitignore configured correctly
- [ ] README.md complete
- [ ] DEPLOYMENT.md reviewed

## Deployment to Vercel

### 4. Vercel Setup
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Framework preset set to Next.js
- [ ] Root directory set to ./
- [ ] Build command: default (uses package.json)
- [ ] Install command: default (pnpm install)

### 5. Environment Variables
Configure these in Vercel Dashboard > Settings > Environment Variables:

- [ ] `DATABASE_URL` - Neon connection string
- [ ] `NEXTAUTH_URL` - Production URL (e.g., https://yourapp.vercel.app)
- [ ] `NEXTAUTH_SECRET` - Generated secret (openssl rand -base64 32)
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

### 6. Initial Deploy
- [ ] Click "Deploy" in Vercel
- [ ] Wait for build to complete
- [ ] Check build logs for errors
- [ ] Note deployment URL

### 7. Database Initialization
Run this command with your production DATABASE_URL:

```bash
DATABASE_URL="your-production-url" npx prisma db push
```

- [ ] Database schema pushed successfully
- [ ] Tables created (User, Account, Session, Meal, WeeklyPlan)
- [ ] VerificationToken table created

## Post-Deployment Testing

### 8. Authentication Flow
- [ ] Visit production URL
- [ ] Click "Get Started"
- [ ] Click "Sign in with Google"
- [ ] Google OAuth consent screen appears
- [ ] Successfully sign in
- [ ] Redirected to dashboard
- [ ] User name displayed correctly
- [ ] Sign out button works
- [ ] Redirected to home after sign out

### 9. Meal Management
- [ ] Sign in again
- [ ] Navigate to "My Meals"
- [ ] Starter pack meals displayed (18 meals)
- [ ] Add new meal
- [ ] Meal appears in list
- [ ] Edit meal name
- [ ] Changes saved
- [ ] Delete meal
- [ ] Meal removed from list

### 10. Weekly Planning
- [ ] Navigate to "Weekly Plan"
- [ ] Click "Generate This Week's Plan"
- [ ] Plan generated with 5 meals (Mon-Fri)
- [ ] Each day shows a meal
- [ ] Dates are correct
- [ ] Refresh page - plan persists
- [ ] Close and reopen browser - plan persists

### 11. Plan Adjustment
- [ ] On weekly plan page
- [ ] Click "Swap" on any day
- [ ] Meal changes to different meal
- [ ] Other days remain unchanged
- [ ] Try swapping another day
- [ ] Verify new meal is different

### 12. Error Handling
- [ ] Try adding meal with empty name - error shown
- [ ] Try generating plan with <5 meals - error shown
- [ ] Disconnect internet and try action - error handled
- [ ] Check browser console for errors - none critical

### 13. Mobile Testing
- [ ] Open on mobile browser
- [ ] Navigation works
- [ ] Buttons are tap-friendly
- [ ] Text is readable
- [ ] Forms are usable
- [ ] No horizontal scrolling

## Monitoring Setup

### 14. Vercel Dashboard
- [ ] Analytics enabled
- [ ] Deployment alerts configured
- [ ] Error tracking active
- [ ] Performance monitoring on

### 15. Neon Dashboard
- [ ] Connection pool configured
- [ ] Query monitoring enabled
- [ ] Storage alerts set up
- [ ] Backup verified

### 16. Google Cloud Console
- [ ] OAuth usage monitored
- [ ] Quota alerts configured
- [ ] Error reporting enabled

## Security Verification

### 17. Security Checklist
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] OAuth redirect URIs match production URL exactly
- [ ] NEXTAUTH_SECRET is strong (32+ characters)
- [ ] Database connection uses SSL
- [ ] No sensitive data in logs
- [ ] No .env files in repository
- [ ] All API routes protected
- [ ] User data isolated per user

### 18. Performance Check
- [ ] Lighthouse score >90 (Performance)
- [ ] Lighthouse score >90 (Accessibility)
- [ ] Lighthouse score >90 (Best Practices)
- [ ] Lighthouse score >90 (SEO)
- [ ] Page loads in <3 seconds
- [ ] Time to Interactive <3 seconds

## Documentation

### 19. User Documentation
- [ ] README.md accessible
- [ ] DEPLOYMENT.md complete
- [ ] Environment variables documented
- [ ] Troubleshooting section complete

### 20. Operational Docs
- [ ] Backup strategy documented
- [ ] Rollback procedure documented
- [ ] Scaling considerations documented
- [ ] Cost estimates documented

## Launch

### 21. Go Live
- [ ] All checklist items above completed
- [ ] Production URL confirmed working
- [ ] Custom domain configured (optional)
- [ ] DNS propagation complete (if custom domain)
- [ ] SSL certificate active
- [ ] Redirects working correctly

### 22. Announce
- [ ] Share URL with initial users
- [ ] Provide quick start guide
- [ ] Set up feedback channel
- [ ] Monitor for issues

## Post-Launch

### 23. Week 1 Monitoring
- [ ] Check error logs daily
- [ ] Monitor sign-up rate
- [ ] Track plan generation success rate
- [ ] Review user feedback
- [ ] Fix critical bugs immediately

### 24. Week 1 Metrics
- [ ] Users signed up: _____
- [ ] Plans generated: _____
- [ ] Average time to first plan: _____ seconds
- [ ] Swap operations: _____
- [ ] Error rate: _____%

### 25. Ongoing Maintenance
- [ ] Schedule weekly check-ins
- [ ] Monitor database growth
- [ ] Review Vercel costs
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly

## Rollback Plan

### If Critical Issues Arise:

1. **Immediate Actions**:
   - [ ] Identify the issue
   - [ ] Check Vercel deployment logs
   - [ ] Check database status
   - [ ] Check Google OAuth status

2. **Rollback Steps**:
   - [ ] Go to Vercel Dashboard
   - [ ] Find previous working deployment
   - [ ] Click "Redeploy"
   - [ ] Verify rollback successful
   - [ ] Notify users of temporary issue

3. **Post-Rollback**:
   - [ ] Investigate root cause
   - [ ] Fix in development
   - [ ] Test thoroughly
   - [ ] Redeploy with fix

## Success Criteria

### Must Pass Before Declaring Success:
- ✅ All authentication flows work
- ✅ Starter meals initialize correctly
- ✅ Meal CRUD operations work
- ✅ Plan generation succeeds
- ✅ Plan swap works
- ✅ Plans persist across sessions
- ✅ Mobile experience is good
- ✅ No console errors
- ✅ Lighthouse scores >90
- ✅ Users can complete flow in <60 seconds

## Support Contacts

**Technical Issues**:
- Vercel Support: https://vercel.com/support
- Neon Support: https://neon.tech/docs
- Google OAuth: https://console.cloud.google.com/

**Documentation**:
- Next.js: https://nextjs.org/docs
- Auth.js: https://authjs.dev
- Prisma: https://prisma.io/docs

## Notes

Use this space for deployment-specific notes:

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Production URL**: _____________
**Database**: _____________
**Issues Found**: _____________
**Resolution**: _____________

---

## Quick Reference

### Vercel CLI Commands
```bash
vercel                    # Deploy to preview
vercel --prod            # Deploy to production
vercel env pull          # Pull environment variables
vercel logs              # View logs
vercel rollback          # Rollback to previous deployment
```

### Database Commands
```bash
npx prisma db push       # Push schema changes
npx prisma studio        # Open database GUI
npx prisma generate      # Generate Prisma client
```

### Useful URLs
- Vercel Dashboard: https://vercel.com/dashboard
- Neon Console: https://console.neon.tech
- Google Cloud Console: https://console.cloud.google.com
- Repository: [Your GitHub URL]

---

**Status**: Ready for deployment!
**Last Updated**: 2026-02-10
