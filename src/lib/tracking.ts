import { supabase } from "@/integrations/supabase/client";
import { getAnonSessionId } from "./session";

export type InteractionEvent =
  | "view" // card appeared in feed
  | "tap" // opened detail drawer
  | "whatsapp" // clicked WhatsApp CTA (highest intent)
  | "save" // bookmarked
  | "search" // searched a term
  | "category"; // clicked a category chip

const LOCAL_KEY = "likeair.interests.v1";
const RECENT_KEY = "likeair.recently_viewed.v1";

export type RecentlyViewedItem = {
  id: string;
  type: "product" | "gig";
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  whatsapp?: string | null;
  viewedAt: number;
};

type LocalInterest = {
  categories: Record<string, number>; // category -> weight
  campuses: Record<string, number>;
  searches: string[]; // last few queries
  updatedAt: number;
};

function readLocal(): LocalInterest {
  if (typeof window === "undefined")
    return { categories: {}, campuses: {}, searches: [], updatedAt: 0 };
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) throw new Error("empty");
    return JSON.parse(raw);
  } catch {
    return { categories: {}, campuses: {}, searches: [], updatedAt: 0 };
  }
}

function writeLocal(v: LocalInterest) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
}

const EVENT_WEIGHT: Record<InteractionEvent, number> = {
  view: 0.3,
  tap: 1.5,
  whatsapp: 4,
  save: 3,
  search: 2,
  category: 1,
};

/**
 * Track a single interaction. Fires locally (drives the feed algorithm
 * immediately) and asynchronously logs to Supabase for future ML/aggregation.
 */
export async function track(opts: {
  event: InteractionEvent;
  itemType?: "product" | "gig" | "ad" | "search";
  itemId?: string;
  category?: string | null;
  campus?: string | null;
  search?: string;
}) {
  const w = EVENT_WEIGHT[opts.event] ?? 1;
  const local = readLocal();
  if (opts.category) {
    local.categories[opts.category] = (local.categories[opts.category] ?? 0) + w;
  }
  if (opts.campus) {
    local.campuses[opts.campus] = (local.campuses[opts.campus] ?? 0) + w;
  }
  if (opts.search) {
    local.searches = [opts.search, ...local.searches.filter((s) => s !== opts.search)].slice(0, 12);
  }
  local.updatedAt = Date.now();
  writeLocal(local);

  // Fire-and-forget to backend — never block UI.
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (opts.itemId && opts.itemType && opts.itemType !== "search") {
      await supabase.from("interactions").insert({
        user_id: userData.user?.id ?? null,
        session_id: getAnonSessionId(),
        item_type: opts.itemType,
        item_id: opts.itemId,
        event: opts.event,
        category: opts.category ?? null,
        weight: w,
      });
    }
  } catch {
    // Tracking is best-effort. Never surface errors.
  }
}

export function getInterests(): LocalInterest {
  return readLocal();
}

export function saveLocalPreferences(categories: string[], campus?: string | null) {
  const local = readLocal();
  categories.forEach((category) => {
    local.categories[category] = Math.max(local.categories[category] ?? 0, 2);
  });
  if (campus) local.campuses[campus] = Math.max(local.campuses[campus] ?? 0, 2);
  local.updatedAt = Date.now();
  writeLocal(local);
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? value.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  if (typeof window === "undefined") return;
  const next = [
    { ...item, viewedAt: Date.now() },
    ...getRecentlyViewed().filter(
      (current) => !(current.id === item.id && current.type === item.type),
    ),
  ].slice(0, 20);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function clearInterests() {
  if (typeof window !== "undefined") window.localStorage.removeItem(LOCAL_KEY);
}
