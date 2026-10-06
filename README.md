# LikeAir

Build a modern, high-energy P2P campus marketplace and career/gig discovery app called "LikeAir". The design must feel like a modern social media feed crossed with an active opportunity network, styled specifically for Gen-Z university students. Not like a social media exactly, just something unique.

### DESIGN SYSTEM & COLOR PALETTE

- Background: Deep Charcoal/Obsidian (`#0D0F12`) with sleek dark card backgrounds (`#161920`).

- Accent Color 1: Cyber Teal (`#00F2FE`) for high-priority CTA buttons and active tags.

- Accent Color 2: Electric Coral/Amber (`#FF6B35`) for featured gigs, hot deals, urgent and price tags.

- Success/Action Accent: WhatsApp Emerald Green (`#25D366`) specifically for direct-contact actions.

- Typography: Clean, bold sans-serif with high contrast headlines and modern badges.

- Visuals: Glassmorphism headers, rounded card layouts (rounded-2xl), and smooth tab transitions.

### NAVIGATION STRUCTURE

Top Sticky Header with Campus Dropdown (e.g., "University of Arusha", "UDSM Main Campus", "MUST" ).

Main View Toggle at the bottom navigation bar:

1. "Today" (Campus-aware highlights, quick actions, and approved local providers)

2. "Market" (Products, Eats, Deliveries, Electronics, etc)

3. "Gigs" (Work, career, service needs, and urgent opportunities)

---

### TAB 1: CAMPUS MARKETPLACE (Products, Eats, Electronics, etc)

- A vertical visual feed of items (Square/4:5 aspect ratio images or video placeholders).

- Category Filter Bubbles at top: "🔥 Featured", "🍔 Food & Bites", "👗 Thrift & Style", "📱 Tech & Gear".

- Each Product Card displays:

  - Product Image & Title.

  - Price in TZS.

  - Seller Mini-Profile: Photo, Name (e.g., "MoMA Babuu Samosas"), and verified trust score (e.g., "★ 4.9 • 85 Sales").

  - Primary Action Button: "Chat on WhatsApp" (styled with WhatsApp green `#25D366` + WhatsApp icon). Clicking this simulates redirecting to WhatsApp with a pre-filled message like "Hi, I saw your listing for [Product Name] on LikeAir".

---

### TAB 2: GIGS & OPPORTUNITIES BOARD (Jobs, Side-Hustles & Services)

- A dynamic board where individuals or small businesses post short-term gigs, skill needs, or service advertisements.

- Category Filters: "💼 Paid Gigs", "🎨 Design & Media", "📚 Tutoring & Writing", "🛠️ General Help".

- Each Gig Card displays:

  - Gig Title (e.g., "Need Event Photographer for Hostel Party", "Looking for Photoshop Designer for Logo").

  - Budget/Pay (e.g., "30,000 TZS / project" or "Negotiable").

  - Poster Name & Badge (e.g., "Posted by Aura Prime Studios").

  - Skill Tags (e.g., `#Photography`, `#AdobePhotoshop`).

  - Brief description of what is needed.

  - Primary Action Button: "Apply / Direct Chat" (Opens WhatsApp or direct messaging with pre-filled context).

- Include a floating "+ Post a Gig / Need" button so users can quickly post an opportunity or advertise their service.

---

### FOOTER BRANDING

- Sleek bottom credit: "Powered by Aura Prime Co."

Make the interface fully interactive using Tailwind CSS, Lucide icons, Framer Motion for tab switches, and realistic sample mock data for food listings, student hustles, and campus gig postings. Note that when designing the web app, design it in a way that it will be simpler to add other features later and expandable later. That's it

## Development

You need Node.js (18+) and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

Copy `.env` and fill in your own Supabase project values (see `.env` for the
required keys). To enable AI photo-authenticity checks on new listings, set
`GEMINI_API_KEY` — the app runs fine without it, the check just no-ops.

To enable "Continue with Google" sign-in, configure the Google provider in
your Supabase project's Authentication settings — it uses Supabase's own
OAuth flow directly, no external service required.

```sh
npm run build    # production build
npm run preview  # preview the production build locally
```

## Campus Today MVP

The home screen opens on **Market**. The **Today** tab surfaces marketplace
listings and gigs posted within the last seven days, shortcuts to post a need or
offer a skill, and a directory of LikeAir-approved businesses. Business entries
show their submitted location and offer; contact is opened through WhatsApp.

Sellers can group their listings under the optional public storefront configured
from their profile. After publishing a product, they can start another listing
without re-entering category, campus, region, or WhatsApp details. The server
currently enforces a default limit of five active products per account unless a
higher limit is configured for that user.

Campus reminders are optional and stored on the current device. When enabled,
the Today view checks for new listings and gigs while open and highlights
recent posts since the last visit. This MVP does not send push notifications
and does not yet include a separate campus-announcements or lost-and-found
publishing system.

## AI innovation roadmap

LikeAir already has a strong base for AI because the app is already data-rich and user-generated: listings, gigs, search, campus/region personalization, likes, saves, and the start of vision-based authenticity checks. The best AI opportunities are the ones that make the marketplace more trusted, more discoverable, and more relevant for students.

### Recommended AI features

#### 1) AI listing assistant for marketplace posts
- Auto-generate better titles, descriptions, and tags from the listing image and a few inputs.
- Suggest the best category and price range based on similar listings in the same campus or region.
- Help sellers write cleaner product copy that converts better.
- Add a lightweight "AI polish" action to the post flow before publishing.

#### 2) AI photo authenticity and quality scoring
- Extend the existing Gemini-backed image check in `src/lib/vision.functions.ts` to score image quality, duplicates, and stock-photo risk.
- Encourage sellers to upload real photos by showing a confidence score or a gentle nudge.
- Flag suspicious listings for manual review before they become public.

#### 3) Personalized recommendation engine
- Use existing signals like searches, likes, saves, campus, and interests to rank items more intelligently.
- Surface items such as "You may like this" or "Popular near you" based on user behavior.
- Make the feed smarter over time instead of relying only on static categories and raw query matching.

#### 4) Gig-to-student matching
- Extract skills, tags, and urgency from gig descriptions automatically.
- Match gigs to students with relevant interests, past behavior, or local context.
- Recommend a more appropriate gig category or highlight missing details such as budget, deadline, or deliverables.
- Help gig posters find the right applicants faster.

#### 5) Smart messaging and outreach assistant
- Generate WhatsApp-ready messages for buyers and sellers using listing and gig context.
- Help users write clearer follow-up messages after initial contact.
- Offer bilingual drafting support for English/Swahili conversation flows.

#### 6) Trust, safety, and moderation support
- Detect spammy, duplicate, or suspicious listings before they are published.
- Score listings for reliability based on image quality, description clarity, and repeat behavior.
- Support moderators with AI summaries of reports, suspicious activity, and potentially risky posts.

#### 7) Local demand and trend intelligence
- Identify what categories are trending on a specific campus or region.
- Surface timely opportunities such as exam-season demand, seasonal products, or spikes in service requests.
- Help campus-specific discovery feel more alive and relevant.

### Best feature order to ship

1. AI listing assistant
2. Photo authenticity and quality checks
3. Personalized recommendations
4. Gig matching and skill extraction
5. Trust/safety moderation support
6. Advanced local demand insights

### Best fit with the current codebase

The best places to extend this project are already obvious:
- `src/lib/vision.functions.ts` for AI image and authenticity logic
- `src/routes/_authenticated/post.tsx` for AI-assisted listing creation
- `src/lib/feed.ts` for smarter retrieval and ranking
- `src/components/likeair/LikeAirApp.tsx` for personalized feed surfacing
- `src/lib/tracking.ts` for behavior-based recommendations
- `src/lib/content-reports.ts` and `src/lib/account-moderation.ts` for moderation intelligence

### Strategic recommendation

For LikeAir, the most valuable AI direction is not just adding a chatbot. The biggest upside comes from three layers working together:
- trust: better listing quality and authenticity checks
- discovery: smarter recommendations and search
- matching: improved gig-to-user alignment

That combination would make LikeAir feel like a genuinely intelligent campus marketplace, not just a basic listing app.

## Production hardening

See `PRODUCTION_HARDENING.md` for the database/security changes included in this cleaned build.
The latest security-review migration narrows anonymous promotion discovery and removes the
client-callable mock checkout. Promotion payments must remain pending until a trusted provider
confirms them; apply `supabase/migrations/20261006000000_security_review_fixes.sql` before deploying
the corresponding app changes.

## Release candidate

This package is the hardened LikeAir release candidate. It includes server-side protection for system-managed fields, safer engagement validation, paginated discovery, saved-content retrieval, recent-search UX, clearer location personalization, and resilient feed error states.

Before deployment, copy `.env.example` to your deployment environment and set the production Supabase URL/key. Apply all migrations in `supabase/migrations/` in order.
