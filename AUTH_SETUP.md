# LikeAir Authentication Setup Guide

Complete step-by-step guide to enable all authentication methods for your LikeAir app.

## Current Authentication Methods

### 1. ✅ Email/Password (Ready - No Setup Required)

- **Sign Up**: Create account with email + password (min 6 chars)
- **Sign In**: Login with email/password
- **Status**: Fully working, no configuration needed

Google sign-in is currently disabled. LikeAir uses email/password authentication while the
authentication roadmap is being finalized.

---

## Part 1: Verify Supabase Project is Connected ✅

### Step 1.1: Check Environment Variables

Your `.env` file is already filled in:

```
VITE_SUPABASE_URL="https://<ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
```

✅ **Status**: Connected to your Supabase project

### Step 1.2: Verify Database Schema

Run this command to push the database schema:

```bash
npx supabase link --project-ref peovekmbzshmhuqctxux
npx supabase db push
```

This creates:

- `profiles` table (user info, phone, name)
- `products` table (marketplace listings)
- `gigs` table (job postings)
- RLS policies (Row-Level Security)
- Storage buckets (avatars, listings, ads)

---

## Part 2: Email/Password Authentication ✅

### Step 2.1: Test Email/Password Signup

1. Open the app: `http://localhost:5173`
2. Click "CREATE ACCOUNT" tab
3. Fill in:
   - **Full Name**: Your name
   - **Phone**: Your Tanzania number (0712 000 000)
   - **Email**: Your email
   - **Password**: Min 6 characters
4. **Check the checkbox** for Terms & Privacy
5. Click **"Create account"**

### Expected Flow:

- ✅ Account created successfully
- ✅ Profile data saved to Supabase
- ✅ Redirects to home page (auto-login)

### Step 2.2: Test Email/Password Signin

1. Click "SIGN IN" tab
2. Enter email + password
3. Click "Sign in"

### Expected Flow:

- ✅ Signed in successfully
- ✅ Redirects to home page
- ✅ User icon shows in header

### Troubleshooting Email/Password:

| Issue                  | Solution                                      |
| ---------------------- | --------------------------------------------- |
| "User already exists"  | Use different email                           |
| "Invalid email format" | Check email is valid (e.g., user@example.com) |
| "Password too short"   | Min 6 characters required                     |
| Profile not created    | Check Supabase table `profiles` in dashboard  |

---

## Part 3: Google OAuth Setup ⚠️ (REQUIRED FOR GOOGLE SIGNIN)

### Step 3.1: Create Google OAuth Credentials

1. Go to **[Google Cloud Console](https://console.cloud.google.com)**
2. Create a new project (or select existing)
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Choose **Web application**
6. Under "Authorized redirect URIs", add:

   ```
   https://<ref>.supabase.co/auth/v1/callback
   ```

   (Replace `peovekmbzshmhuqctxux` with your project ref)

7. Click **Create**
8. Copy:
   - **Client ID**
   - **Client Secret**

### Step 3.2: Configure Google in Supabase

1. Go to **[Supabase Dashboard](https://app.supabase.com)**
2. Select your project
3. Go to **Authentication > Providers > Google**
4. Toggle **Enable** (turn it ON)
5. Paste:
   - **Google Client ID**: From Step 3.1
   - **Google Client Secret**: From Step 3.1
6. Click **Save**

### Step 3.3: Test Google OAuth

1. Refresh the app
2. Click **"Continue with Google"**
3. Sign in with your Google account
4. **Redirect back to app** automatically

### Expected Flow:

- ✅ Google OAuth window opens
- ✅ You sign in with Google
- ✅ Redirects back to app
- ✅ Account created automatically
- ✅ Profile shows in Supabase `profiles` table
- ✅ Redirects to home page

### Troubleshooting Google OAuth:

| Issue                           | Solution                                                         |
| ------------------------------- | ---------------------------------------------------------------- |
| "Google sign-in failed"         | Check Google OAuth not enabled in Supabase → Follow Step 3.2     |
| "Invalid redirect URI"          | Verify redirect URI matches exactly in Google Console            |
| "Consent screen not configured" | Go to Google Console → Consent screen → Configure for "External" |
| Blocked by CORS                 | Check Google provider is enabled in Supabase                     |

---

## Part 4: Storage Buckets (For Listing Images)

Run this OR do manually:

### Manual Setup:

1. Go to **Supabase > Storage**
2. Click **New Bucket** for each:
   - **listings** (product/gig images) - Public
   - **avatars** (profile pictures) - Public
   - **ads** (featured ads) - Public
3. These buckets are public because their media is displayed to anonymous visitors. Do not upload
   sensitive documents or private user content to them.

---

## Part 5: Complete Testing Checklist

### Email/Password Flow ✅

- [ ] Sign up with email/password
- [ ] Confirm profile appears in Supabase `profiles` table
- [ ] Sign in with same credentials
- [ ] Can access protected routes (`/post`, `/profile`)

### Google OAuth Flow (After Step 3)

- [ ] Click "Continue with Google"
- [ ] Google consent screen appears
- [ ] Redirects back to app after sign-in
- [ ] Account created in Supabase `profiles` table
- [ ] Can access protected routes

### Post Creation

- [ ] Sign in (any method)
- [ ] Click **+ Post** button
- [ ] Create a product listing
- [ ] Listing appears in feed
- [ ] Can see your name/avatar

### Protected Routes

- [ ] Try `/post` before signing in → Redirects to `/auth`
- [ ] Sign in → Can access `/post`
- [ ] Try `/profile` → Shows your profile

---

## Part 6: Environment Variables Summary

All authentication happens through these vars (stored locally in `.env` (use `.env.example` as the template)):

```env
# Supabase Project Reference
VITE_SUPABASE_URL="https://<ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
VITE_SUPABASE_PROJECT_ID="<ref>"

# Server-side (optional)
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
SUPABASE_PROJECT_ID="<ref>"

# Admin client (optional - for server operations)
SUPABASE_SERVICE_ROLE_KEY=""  # Leave empty unless needed

# Optional: AI image verification
GEMINI_API_KEY=""
```

---

## Part 7: Authentication Code Overview

### Sign Up Flow (`src/routes/auth.tsx`)

```typescript
1. User fills email, password, name, phone
2. Clicks "Create account"
3. supabase.auth.signUp() creates account
4. If session exists → Save profile to DB
5. Redirect to home / next page
```

### Sign In Flow (`src/routes/auth.tsx`)

```typescript
1. User fills email, password
2. Clicks "Sign in"
3. supabase.auth.signInWithPassword()
4. If success → Redirect to home / next page
```

### Google OAuth (`src/routes/auth.tsx`)

```typescript
1. User clicks "Continue with Google"
2. supabase.auth.signInWithOAuth({ provider: "google" })
3. Redirects to Google consent screen
4. User logs in with Google
5. Google redirects back to app with session token
6. Account created automatically
7. Redirect to home / next page
```

### Protected Routes (`src/routes/_authenticated/route.tsx`)

```typescript
beforeLoad: async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/auth" });
  }
};
```

Routes under `/_authenticated/` require active auth session.

---

## Part 8: Monitoring & Debugging

### Check Supabase Dashboard

1. Go to **Authentication > Users**
   - See all registered users
   - Check sign-up method (Google vs Email)
   - See last sign-in time

2. Go to **Table Editor > profiles**
   - Verify user data saved correctly
   - Check `full_name`, `phone`, `terms_accepted_at`

3. Go to **Authentication > Logs**
   - See auth events (sign-ups, sign-ins, errors)
   - Debug failed authentication attempts

### Browser Console

- `npm run dev` opens dev server
- DevTools (F12) → Console tab
- Auth errors print to console
- Check for network errors in Network tab

### Test Accounts

Create multiple test accounts to verify different flows:

1. Test with Gmail (for Google OAuth)
2. Test with Outlook (for email/password)
3. Test with multiple profiles

---

## Part 9: Next Steps (Optional Enhancements)

- [ ] Add phone number verification (Twilio integration)
- [ ] Add email verification UI
- [ ] Add password reset flow
- [ ] Add social login (GitHub, Discord, etc.)
- [ ] Add two-factor authentication
- [ ] Add profile picture upload
- [ ] Add email confirmation before account is active

---

## Quick Command Reference

```bash
# Start development server
npm run dev

# Push database schema to Supabase
npx supabase link --project-ref peovekmbzshmhuqctxux
npx supabase db push

# View database (replace <project_ref> with yours)
npx supabase link --project-ref peovekmbzshmhuqctxux

# Regenerate TypeScript types (if you change schema)
npx supabase gen types typescript --project-id peovekmbzshmhuqctxux > src/integrations/supabase/types.ts
```

---

## Troubleshooting

### "Cannot read properties of undefined"

- Check Supabase credentials in `.env`
- Verify project exists at https://app.supabase.com

### "User already exists"

- Use different email for signup
- Or sign in instead of sign up

### Google button doesn't work

- Google OAuth not enabled in Supabase
- Follow Step 3.2 above
- Check Client ID/Secret are correct

### Profile not appearing in database

- Verify email/password signup completed
- Check `profiles` table in Supabase dashboard
- Ensure RLS policies allow inserts

### Can't access protected routes after signin

- Refresh page (auth state may not be initialized)
- Check browser localStorage has auth session
- Verify `useAuth()` hook returns `signedIn: true`

---

## Support

For issues:

1. Check Supabase dashboard → Authentication > Logs
2. Open browser DevTools (F12) → Console
3. Check Network tab for failed requests
4. Verify env vars match Supabase project settings

---

**Status**: ✅ Email/Password Ready | ⚠️ Google OAuth Requires Setup (5-10 min)

Once you complete **Part 3 (Google OAuth Setup)**, both auth methods will be fully functional! 🚀
