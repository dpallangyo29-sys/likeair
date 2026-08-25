# Connecting LikeAir to your own Supabase project

This project no longer depends on the original hosted builder setup. Configure your own production Supabase project through environment variables.
is a blank template. Follow these steps to stand up a Supabase project you
fully control and wire the app to it.

## 1. Create your Supabase project

Go to https://supabase.com/dashboard, sign in with your own account, and
click **New project**. Pick a region close-ish to Tanzania (Supabase has no
African region yet — London/eu-west-1 or Frankfurt/eu-central-1 are usually
the lowest-latency options). Save the database password somewhere safe.

## 2. Get your API keys

In the new project: **Project Settings > API**. You need:

- **Project URL** (`https://<ref>.supabase.co`)
- **Project ID** (the `<ref>` part of the URL)
- **anon / publishable key**
- **service_role key** (only if you plan to use the admin client — keep this one secret)

## 3. Create `.env` from `.env.example`

```
SUPABASE_PROJECT_ID="<ref>"
SUPABASE_PUBLISHABLE_KEY="<anon/publishable key>"
SUPABASE_URL="https://<ref>.supabase.co"
VITE_SUPABASE_PROJECT_ID="<ref>"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon/publishable key>"
VITE_SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service_role key>"   # optional
```

## 4. Push the schema (tables, RLS, roles) to your new project

The full schema already lives in `supabase/migrations/` as plain SQL — no
previous hosted-builder dependency. Easiest path is the Supabase CLI:

```sh
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

`db push` runs every file in `supabase/migrations/` in order against your new
database. No CLI installed system-wide needed — `npx` pulls it on demand.

If you'd rather not use the CLI: open **SQL Editor** in the dashboard and run
each file in `supabase/migrations/` in filename order (they're timestamped,
so alphabetical = chronological). Two of the files are currently empty and
can be skipped.

## 5. Create the storage buckets

The migrations set up RLS policies for three buckets, but bucket _creation_
was done via the old dashboard, not SQL, so you need to create them by hand:
**Storage > New bucket**, for each of:

- `listings`
- `avatars`
- `ads`

Make all three **public** — their media is displayed to anonymous visitors in
the feed. The RLS policies still restrict writes to each user's own folder.
Never upload identity documents or other sensitive content to these buckets.

## 6. (Optional) Enable Google sign-in

**Authentication > Providers > Google** in the dashboard, then add your
Google OAuth client ID/secret. If you skip this, email/password sign-up still
works fine — the Google button will just error until configured.

## 7. Regenerate types if you ever change the schema

`src/integrations/supabase/types.ts` matches the schema in
`supabase/migrations/` as-is, so you don't need to regenerate anything for
this migration. If you add/change tables later:

```sh
npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
```

## 8. Run it

```sh
npm install
npm run dev
```

Sign up a test account and confirm a row appears in `profiles` in your new
project's **Table Editor** — that confirms the app is talking to your
Supabase, not the old one.
