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

1. "Marketplace" (Products, Eats, Deliveries, Electronics, etc)

2. "Gigs & Opportunities" (Work, Career & Talent Need Board, Urgent need)

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

## Production hardening

See `PRODUCTION_HARDENING.md` for the database/security changes included in this cleaned build.

## Release candidate

This package is the hardened LikeAir release candidate. It includes server-side protection for system-managed fields, safer engagement validation, paginated discovery, saved-content retrieval, recent-search UX, clearer location personalization, and resilient feed error states.

Before deployment, copy `.env.example` to your deployment environment and set the production Supabase URL/key. Apply all migrations in `supabase/migrations/` in order.
