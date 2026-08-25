# LikeAir Monetization, Engagement & Boosts - Migration Guide

This guide explains how to deploy the new database schema and features to your Supabase project.

## ✅ What's Been Added

### Database Tables

1. **likes** - Track user likes on products, gigs, and ads
2. **ads_views** - Track ad views for targeting and analytics
3. **user_interests** - Store user interests (derived from interactions)
4. **user_subscriptions** - Track subscription levels and posting limits
5. **onboarding_queue** - Track early users (first 50) for unlimited posts
6. **product_boosts** - Track product promotion/boost campaigns
7. **gig_boosts** - Track gig promotion/boost campaigns
8. **gig_interests** - Private applicant responses and gig-owner workflow status
9. **content_reports** - User scam/abuse reports and staff resolution workflow
10. **Account moderation** - Manual verification, bans, and automatic suspension of active posts
11. **Campus management** - Staff campus directory management and suggestion approval

### New Columns

- `like_count` on products, gigs, ads
- `view_count` on ads
- `boost_count` on products and gigs
- `promoted_until` on products and gigs (TIMESTAMPTZ for boost expiry)
- `deadline_at` on gigs (optional deadline used to hide expired opportunities)
- `gig_interests` and Realtime/view-protection migrations must be applied in filename order

### New Files

- `src/lib/payments.ts` - Payment system utilities (background, not enforced)
- `src/lib/engagement.ts` - Posting limits, likes, interests, ads targeting
- Updated `src/lib/feed.ts` - New functions for likes, boosts, ads, interests
- Updated components for like buttons and engagement stats

## 🚀 Deployment Steps

### Step 1: Prepare Your Environment

Ensure you have the Supabase CLI installed:

```bash
npm install -g supabase
# or
npm install -D supabase
```

### Step 2: Link Your Supabase Project

```bash
cd e:\likeairMY
supabase login
```

This will open your browser to authenticate. You only need to do this once.

```bash
supabase link --project-ref <your-project-ref>
```

Find your project ref in the Supabase dashboard:

- Go to **Project Settings > General**
- Look for "Project Ref" (e.g., `abcdefghijklmnop`)

### Step 3: Push the Migration

This will run all migrations in `supabase/migrations/` in order against your database:

```bash
supabase db push
```

The command will show you which migrations are about to run. Type `y` to confirm.

**What happens:**

- Creates the 7 new tables with proper RLS policies
- Adds columns to existing tables (products, gigs, ads)
- Sets up triggers for auto-creating subscriptions and tracking onboarding
- Configures permissions for authenticated users

### Step 4: Verify the Migration

After running `supabase db push`, verify in the Supabase dashboard:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Run these queries to verify:

```sql
-- Check likes table exists
SELECT * FROM public.likes LIMIT 1;

-- Check user_subscriptions was created
SELECT COUNT(*) FROM public.user_subscriptions;

-- Check new columns on products
SELECT like_count, view_count, boost_count FROM public.products LIMIT 1;

-- Check early users (should be empty until users sign up)
SELECT COUNT(*) FROM public.onboarding_queue WHERE is_early_user = true;
```

### Step 5: Update Local Development (Optional)

If you're also running Supabase locally for development:

```bash
supabase start
supabase db push
```

## 📋 Feature Activation Status

### Currently ACTIVE (No Configuration Needed)

✅ **Likes & Views** - Users can like products/gigs, view counts tracked  
✅ **Interaction Tracking** - All views, clicks, searches tracked for interests  
✅ **User Interests** - Automatically calculated from interactions  
✅ **Posting Limits** - Enforced: 5 products, 2 gigs, 2 ads (free)  
✅ **Early User Unlimited Access** - First 50 users get unlimited posts  
⏸️ **Ads Targeting** - Infrastructure exists, but sponsored ads remain disabled until monetization is activated
✅ **Boost Infrastructure** - Ready for promotion/boost creation

### In BACKGROUND (Will Be Activated Later)

🔄 **Payment Processing** - Structure in place, not enforced  
🔄 **Subscription Upgrades** - Limits enforced but payment not required  
🔄 **Premium Plans** - Defined in `src/lib/payments.ts` (ready when payment system activates)

## 💳 When You're Ready to Enable Payments

When you want to activate the payment system, follow these steps:

### 1. Choose a Payment Provider

Options:

- **M-Pesa** (Tanzania) - Use Safaricom's API
- **Airtel Money** (Tanzania) - Use Airtel's API
- **Stripe** (International) - Global payments
- **PayPal** (International)

### 2. Update `src/lib/payments.ts`

- Change `isPaymentSystemEnabled()` to return `true`
- Update `SUPPORTED_PAYMENT_METHODS` to enable your chosen provider
- Add API integration for your payment provider

### 3. Add Payment Endpoints

Create API routes in your backend to:

- Create payment intents
- Verify payments
- Unlock features after payment

### 4. Update Subscription Logic

Modify `src/lib/engagement.ts` to:

- Check if payment system is enabled before blocking upgrades
- Call payment functions when limits are reached

Example:

```typescript
// In src/lib/engagement.ts
export async function canPostItem(userId: string, itemType: "product" | "gig" | "ad") {
  // ... existing code ...

  // Only enforce limits if payment system is enabled
  if (isPaymentSystemEnabled() && currentCount >= limit) {
    return { allowed: false, message: "Upgrade to post more" };
  }

  // Otherwise, just warn but allow (background mode)
  return { allowed: true, message: "..." };
}
```

## 📊 Database Schema Overview

### likes

```sql
CREATE TABLE public.likes (
  user_id UUID -- Who liked it
  item_type TEXT -- 'product', 'gig', 'ad'
  item_id UUID -- ID of the item
  created_at TIMESTAMPTZ
  PRIMARY KEY (user_id, item_type, item_id)
)
```

### user_subscriptions

```sql
CREATE TABLE public.user_subscriptions (
  user_id UUID PRIMARY KEY
  plan_type TEXT -- 'free', 'starter', 'business', 'enterprise'
  is_active BOOLEAN
  product_limit INT
  gig_limit INT
  ads_limit INT
  renews_at TIMESTAMPTZ
)
```

### onboarding_queue

```sql
CREATE TABLE public.onboarding_queue (
  user_id UUID PRIMARY KEY
  onboarded_at TIMESTAMPTZ
  is_early_user BOOLEAN -- true if user #1-50
)
```

### product_boosts / gig_boosts

```sql
CREATE TABLE public.product_boosts (
  id UUID PRIMARY KEY
  product_id UUID
  seller_id UUID
  boost_level INT -- 1, 2, 3
  duration_days INT
  started_at TIMESTAMPTZ
  expires_at TIMESTAMPTZ
  cost NUMERIC
  payment_status TEXT -- 'pending', 'paid', 'cancelled'
)
```

## 🔍 Testing the Features

### Test Likes

1. Sign in to the app
2. Navigate to marketplace/gigs
3. Click heart icon on any card
4. Like should show in red with count increment

### Test Posting Limits

1. Sign in with a non-early user
2. Go to profile
3. Try to post more than 5 products
4. Should see limit message
5. (For early users, limits won't apply)

### Test Ads Targeting

1. Sign in and interact with several products
2. System calculates interests
3. Ads should be targeted to your interests
4. Check `/src/lib/engagement.ts` - `getTargetedAds()`

### Test Boosts (Future)

1. Once payment is enabled
2. User can boost a product/gig
3. Boosted items get promoted visibility
4. `promoted_until` timestamp determines visibility

## ⚙️ Troubleshooting

### Migration Fails

Check for:

1. Network connectivity to Supabase
2. Project ref is correct: `supabase link --project-ref <your-ref>`
3. Service role key has admin permissions

### Column Not Added

If columns aren't added:

```sql
-- Manually check
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'products';
```

### Permissions Error

If you get "permission denied":

- Ensure your API keys are correct in `.env`
- Check RLS policies in Supabase dashboard
- The migration includes all necessary GRANT statements

## 📞 Support

For issues:

1. Check [Supabase Documentation](https://supabase.com/docs)
2. Review migration file: `supabase/migrations/20260820000000_add_monetization_and_engagement.sql`
3. Check Supabase logs: Project Dashboard > Logs
4. Try local Supabase first: `supabase start` (easier debugging)

## 🎉 You're Ready!

Your LikeAir app now has:

- ✅ Engagement features (likes, views)
- ✅ Posting limits (enforced with early user exception)
- ✅ Interest-based ads targeting
- ✅ Boost/promotion infrastructure
- ✅ Payment system ready (background, not forced)

The app remains fast and lightweight - all new features use efficient queries and indexes.

Next steps:

1. Test the features locally
2. Deploy to production
3. Monitor usage and engagement metrics
4. When ready, activate payment system

Happy selling! 🚀
