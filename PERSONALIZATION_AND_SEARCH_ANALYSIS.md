# LikeAir Personalization & Search Analysis

**Date:** August 16, 2026  
**Status:** ⚠️ PARTIAL - Personalization ✅ YES | Smart Search ❌ NO

---

## 1. PERSONALIZATION ALGORITHM ✅ (IMPLEMENTED)

### What's Working

The app **DOES have a behavior-tracking & personalization system** that learns what users want:

#### A. User Behavior Tracking System

**Location:** `src/lib/tracking.ts`

The app tracks **6 types of interactions**:

| Event      | Weight | Meaning                                             |
| ---------- | ------ | --------------------------------------------------- |
| `view`     | 0.3    | User saw the card in feed                           |
| `tap`      | 1.5    | User opened detail drawer                           |
| `whatsapp` | 4.0    | User clicked "Message on WhatsApp" (highest intent) |
| `save`     | 3.0    | User bookmarked the item                            |
| `search`   | 2.0    | User searched for something                         |
| `category` | 1.0    | User clicked category filter                        |

**Example:** If user clicks WhatsApp on a "Phone" product = 4x weight. If they just view it = 0.3x weight.

#### B. Interest Tracking (Stored Locally)

```typescript
{
  categories: {
    "phones": 12.5,      // User interested in phones
    "laptops": 8.2,      // Less interested in laptops
    "food": 22.1,        // VERY interested in food
  },
  campuses: {
    "udsm": 45,          // Most interactions at UDSM
    "uoa": 15,           // Fewer at University of Arusha
  },
  searches: ["iphone", "airpods", "macbook"],  // Last 12 searches
  updatedAt: 1692547200
}
```

#### C. Personalized Feed Ranking

**Location:** `src/lib/interest.ts` → `scoreItem()` function

**How it ranks items for you:**

```
Score = Category Match (max +30)
      + Campus Match (max +20)
      + Active Campus (bonus +8)
      + Featured Badge (bonus +5)
      + Hot Badge (bonus +4)
      + Urgent Badge (bonus +6)
      + Freshness (newer = higher, decay over 14 days)
      + Random Jitter (+0.5 for variety)
```

**Example Scenario:**

- User has tapped 5 phone listings → Category weight = 7.5
- User is at UDSM campus → Gets +20 for UDSM items
- Item is 2 hours old → Gets +9.86 freshness bonus
- **Total:** Score = 37.36 (shows higher in feed than generic items)

---

### How It Feels to Users

✅ **The app DOES understand what you want:**

- Scroll through food items → More food appears
- Message sellers on WhatsApp → That category ranks higher
- Switch to your campus → Campus-specific items float up
- Search for "iphone" → Future iPhone listings rank higher
- The algorithm re-ranks as you interact

✅ **Live Personalization:** Every tap, every view, every WhatsApp click updates your profile instantly.

✅ **Progressive Learning:** App gets smarter the more you use it (based on your last 12 searches and category/campus weights).

---

## 2. SMART SEARCH CAPABILITY ❌ (NOT IMPLEMENTED)

### Current Search Limitations

**What's implemented:** Basic keyword search

```typescript
// Current: Only searches titles with case-insensitive match
if (opts.q) query = query.ilike("title", `%${opts.q}%`);
```

**Example Problems:**

```
User searches: "coding"
Returns: ❌ Gigs with tags ["python", "javascript", "web-dev"]
         ✅ Only gigs with "coding" in title

User searches: "photo"
Returns: ❌ Products tagged with "photography" or "camera"
         ✅ Only products with exact "photo" in title

User searches: "JS"
Returns: ❌ Gigs tagged with "JavaScript"
         ✅ Nothing (because tag says "javascript" not "JS")
```

### What's Missing

| Feature                | Status | Impact                                       |
| ---------------------- | ------ | -------------------------------------------- |
| **Tag-based search**   | ❌     | Can't find gigs by their tags at all         |
| **Fuzzy matching**     | ❌     | Can't find "photo" when tag is "photography" |
| **Typo tolerance**     | ❌     | "iphone" won't find "i-phone"                |
| **Synonym matching**   | ❌     | "phone" won't find "mobile" tags             |
| **Multi-word tags**    | ❌     | Hard to find items tagged with phrases       |
| **Description search** | ❌     | Only searches title, not description         |

---

## 3. DATABASE SCHEMA STATUS

### What Data Exists

**Products Table:**

```sql
- id, title, description, category, price
- image_url, seller_id, campus_id
- status, created_at
❌ NO tags field (only categories have tags in gigs)
```

**Gigs Table:**

```sql
- id, title, description, tags (ARRAY), categories (ARRAY)
- budget, poster_id, campus_id
- status, created_at
✅ HAS tags (e.g., ["python", "web-dev", "react"])
```

---

## 4. RECOMMENDATIONS

### Priority 1: Implement Fuzzy Tag Search (Medium effort, High impact)

```typescript
// src/lib/search.ts - NEW FILE
export function fuzzyMatch(query: string, text: string): number {
  // Returns 0-100 match score
  // "photo" matches "photography" = 92
  // "js" matches "javascript" = 88
  // "coding" matches "coder" = 75
}

export async function searchSmartGigs(q: string, opts?: { campusId?: string }) {
  // Search title + description + tags
  // Rank by fuzzy match score
  // Example: "photo" finds gigs with tag "photography"
}
```

### Priority 2: Add Search History Suggestions

```typescript
// Already tracking searches! Just need to show suggestions
// When user types in search, show: previous searches + trending searches
```

### Priority 3: Add Related Search (Cross-Category Discovery)

```typescript
// Find "related" searches based on category weights
// User searches "iphone" → suggest "airpods", "macbook" (common together)
```

### Priority 4: Save/Bookmark System

```typescript
// Already tracking "save" events
// Add a "Saved" tab to show bookmarked items
// Filter by category/campus
```

---

## 5. IMPLEMENTATION ROADMAP

### ✅ Already Done

- [x] Behavior tracking (view, tap, whatsapp, save, search, category)
- [x] Interest scoring by category & campus
- [x] Personalized feed ranking
- [x] Search term tracking (last 12 searches)
- [x] Fresh-item boost (items decay over 14 days)

### ⏳ Ready to Implement

- [ ] Fuzzy tag search (allow "photo" → "photography")
- [ ] Multi-field search (title + description + tags)
- [ ] Search suggestion dropdown (recent + trending)
- [ ] Saved items tab
- [ ] Related search recommendations
- [ ] Search analytics dashboard (for admins)

### 🎯 Future (Post-Mobile)

- [ ] ML ranking (on Supabase with Python edge functions)
- [ ] Trending algorithm (global community favorites)
- [ ] "Explore similar" carousels
- [ ] Smart notifications ("New phones posted in your area")
- [ ] Browse history timeline

---

## 6. USER EXPERIENCE IMPACT

### Today (Current State)

```
User: "I'm looking for a coding gig"
Search: "coding"
Results: Only gigs with "coding" in title
Problem: Misses gigs tagged with "#python #web-dev"
```

### After Smart Search

```
User: "I'm looking for a coding gig"
Search: "coding"
Results:
  - Gigs tagged with "programming", "web-dev", "python"
  - Ranked by fuzzy match + personalization score
  - Suggestions: "javascript", "web design", "app dev"
Solution: User finds 5x more relevant opportunities ✨
```

---

## Summary

| Aspect                        | Status     | Score |
| ----------------------------- | ---------- | ----- |
| **Understands user behavior** | ✅ Full    | 9/10  |
| **Personalizes feed**         | ✅ Full    | 8/10  |
| **Smart search**              | ❌ Missing | 3/10  |
| **Tag discovery**             | ❌ Missing | 0/10  |
| **Fuzzy matching**            | ❌ Missing | 0/10  |

**Overall:** The app is **HALF SMART** — great at personalizing content but weak at helping users find what they want via search.
