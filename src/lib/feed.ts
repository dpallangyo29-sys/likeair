import { supabase } from "@/integrations/supabase/client";

export type SellerLite = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  campus_id: string | null;
  verified: boolean;
  store_name: string | null;
  store_slug: string | null;
};

export type ProductRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  campus_id: string | null;
  campus_name: string | null;
  image_url: string | null;
  whatsapp: string | null;
  hot: boolean;
  featured: boolean;
  created_at: string;
  view_count?: number;
  like_count?: number;
  boost_count?: number;
  promoted_until?: string | null;
  seller?: SellerLite | null;
};

export type GigRow = {
  id: string;
  poster_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  budget: string | null;
  tags: string[];
  categories: string[];
  campus_id: string | null;
  campus_name: string | null;
  whatsapp: string | null;
  urgent: boolean;
  featured: boolean;
  deadline_at?: string | null;
  created_at: string;
  view_count?: number;
  like_count?: number;
  boost_count?: number;
  promoted_until?: string | null;
  poster?: SellerLite | null;
};

async function attachSellers<T extends { seller_id?: string; poster_id?: string }>(
  rows: T[],
  key: "seller_id" | "poster_id",
  outKey: "seller" | "poster",
): Promise<(T & Record<string, SellerLite | null>)[]> {
  const ids = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))) as string[];
  if (ids.length === 0) return rows.map((r) => ({ ...r, [outKey]: null })) as never;
  const { data } = await supabase
    .from("seller_profiles")
    .select("id, full_name, avatar_url, campus_id, verified, store_name, store_slug")
    .in("id", ids);
  const map = new Map<string, SellerLite>(
    (data ?? []).filter((s) => !!s.id).map((s) => [s.id as string, s as SellerLite]),
  );
  return rows.map((r) => ({ ...r, [outKey]: map.get(r[key] as string) ?? null })) as never;
}

export async function fetchProducts(
  opts: {
    campusId?: string | null;
    region?: string | null;
    category?: string | null;
    q?: string;
    offset?: number;
    limit?: number;
  } = {},
) {
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  const offset = Math.max(0, opts.offset ?? 0);
  const search = opts.q?.trim() ?? "";
  const customCampusName = opts.campusId?.startsWith("custom:")
    ? opts.campusId.slice("custom:".length)
    : null;
  const campusId = customCampusName ? null : (opts.campusId ?? null);

  if (search) {
    const { data, error } = await supabase.rpc("search_products", {
      search_query: search,
      p_campus_id: campusId ?? undefined,
      p_campus_name: customCampusName ?? undefined,
      p_region: opts.region ?? undefined,
      p_category: opts.category ?? undefined,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;

    return (await attachSellers(data ?? [], "seller_id", "seller")) as unknown as ProductRow[];
  }

  let query = supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (customCampusName) query = query.eq("campus_name", customCampusName);
  else if (campusId) query = query.eq("campus_id", campusId);
  if (opts.region) query = query.eq("region", opts.region);
  if (opts.category && opts.category !== "featured") query = query.eq("category", opts.category);

  const { data, error } = await query;
  if (error) throw error;

  return (await attachSellers(data ?? [], "seller_id", "seller")) as unknown as ProductRow[];
}

export async function fetchGigs(
  opts: {
    campusId?: string | null;
    region?: string | null;
    category?: string | null;
    q?: string;
    offset?: number;
    limit?: number;
  } = {},
) {
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  const offset = Math.max(0, opts.offset ?? 0);
  const search = opts.q?.trim() ?? "";
  const customCampusName = opts.campusId?.startsWith("custom:")
    ? opts.campusId.slice("custom:".length)
    : null;
  const campusId = customCampusName ? null : (opts.campusId ?? null);

  if (search) {
    const { data, error } = await supabase.rpc("search_gigs", {
      search_query: search,
      p_campus_id: campusId ?? undefined,
      p_campus_name: customCampusName ?? undefined,
      p_region: opts.region ?? undefined,
      p_category: opts.category ?? undefined,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;

    return (await attachSellers(data ?? [], "poster_id", "poster")) as unknown as GigRow[];
  }

  let query = supabase
    .from("gigs")
    .select("*")
    .eq("status", "active")
    .or(`deadline_at.is.null,deadline_at.gte.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (customCampusName) query = query.eq("campus_name", customCampusName);
  else if (campusId) query = query.eq("campus_id", campusId);
  if (opts.region) query = query.eq("region", opts.region);
  if (opts.category && opts.category !== "paid")
    query = query.contains("categories", [opts.category]);

  const { data, error } = await query;
  if (error) throw error;

  return (await attachSellers(data ?? [], "poster_id", "poster")) as unknown as GigRow[];
}

export async function fetchCampuses() {
  const [{ data: campuses, error }, { data: suggestions, error: suggestionsError }] =
    await Promise.all([
      supabase.from("campuses").select("*").order("name"),
      supabase
        .from("campus_suggestions")
        .select("id, name, normalized_name, use_count")
        .or("status.eq.approved,use_count.gte.3")
        .order("use_count", { ascending: false })
        .limit(20),
    ]);
  if (error) throw error;
  if (suggestionsError) throw suggestionsError;
  return [
    ...(campuses ?? []).map((campus) => ({
      id: campus.id,
      name: campus.name,
      short: campus.short,
    })),
    ...(suggestions ?? []).map((suggestion) => ({
      id: `custom:${suggestion.normalized_name}`,
      name: suggestion.name,
      short: "Community",
    })),
  ];
}

/* -------------------- STOREFRONTS -------------------- */

export type StoreOwner = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  campus_id: string | null;
  region: string | null;
  verified: boolean;
  store_name: string | null;
  store_slug: string | null;
  store_bio: string | null;
};

export async function fetchStoreBySlug(slug: string) {
  const { data, error } = await supabase
    .from("seller_profiles")
    .select(
      "id, full_name, avatar_url, campus_id, region, verified, store_name, store_slug, store_bio",
    )
    .ilike("store_slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as StoreOwner) ?? null;
}

export async function fetchStoreItems(ownerId: string) {
  const [{ data: products }, { data: gigs }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("seller_id", ownerId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("gigs")
      .select("*")
      .eq("poster_id", ownerId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);
  return {
    products: (products ?? []) as unknown as ProductRow[],
    gigs: (gigs ?? []) as unknown as GigRow[],
  };
}

/* -------------------- LIKES & ENGAGEMENT -------------------- */

export async function toggleLike(
  userId: string,
  itemType: "product" | "gig" | "ad",
  itemId: string,
) {
  // Check if like exists
  const { data: existingLike } = await supabase
    .from("likes")
    .select("*")
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", userId)
      .eq("item_type", itemType)
      .eq("item_id", itemId);
    if (error) throw error;
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase
      .from("likes")
      .insert({ user_id: userId, item_type: itemType, item_id: itemId });
    if (error) throw error;
    return { liked: true };
  }
}

export async function getUserLikes(userId: string) {
  const { data, error } = await supabase
    .from("likes")
    .select("item_type, item_id")
    .eq("user_id", userId);
  if (error) throw error;

  // Convert to a map for quick lookup
  const likesMap = new Map<string, Set<string>>();
  (data ?? []).forEach((like) => {
    if (!likesMap.has(like.item_type)) likesMap.set(like.item_type, new Set());
    likesMap.get(like.item_type)!.add(like.item_id);
  });
  return likesMap;
}

export async function trackInteraction(
  userId: string | null,
  sessionId: string | null,
  itemType: "product" | "gig" | "ad",
  itemId: string,
  event: "view" | "click" | "search",
  category?: string,
) {
  const { error } = await supabase.from("interactions").insert({
    user_id: userId,
    session_id: sessionId,
    item_type: itemType,
    item_id: itemId,
    event,
    category,
    weight: event === "view" ? 1 : event === "click" ? 3 : 2,
  });
  if (error) console.error("Failed to track interaction:", error);
}

/* -------------------- ADS & TARGETING -------------------- */

export type AdRow = {
  id: string;
  poster_id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_url: string | null;
  campus_id: string | null;
  budget_amount: number;
  impressions_left: number;
  status: string;
  like_count: number;
  view_count: number;
  created_at: string;
  poster?: SellerLite | null;
};

export async function fetchAdsWithTargeting(
  opts: {
    userId?: string | null;
    sessionId?: string | null;
    campusId?: string | null;
    limit?: number;
    userInterests?: Map<string, number>;
  } = {},
) {
  const limit = opts.limit ?? 3; // Show max 3 ads

  let query = supabase
    .from("ads")
    .select("*")
    .eq("status", "active")
    .gt("impressions_left", 0)
    .order("created_at", { ascending: false });

  if (opts.campusId) query = query.eq("campus_id", opts.campusId);

  // Load more to filter by interests
  const { data, error } = await query.range(0, 50);
  if (error) throw error;

  let ads = (await attachSellers(data ?? [], "poster_id", "poster")) as unknown as AdRow[];

  // Score ads based on user interests (if available)
  if (opts.userInterests && opts.userInterests.size > 0) {
    ads = ads
      .map((ad) => {
        // Simple scoring: check if ad matches user's interested categories
        // This is a basic implementation - can be enhanced
        let score = Math.random() * 100; // Base score

        // If we have category from interactions, boost relevant ads
        const adKeywords = `${ad.title} ${ad.body ?? ""}`.toLowerCase();
        opts.userInterests!.forEach((interest, category) => {
          if (adKeywords.includes(category.toLowerCase())) {
            score += interest * 10; // Boost score for matching category
          }
        });

        return { ad, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((m) => m.ad);
  } else {
    ads = ads.slice(0, limit);
  }

  // Track ad views (for impressions and analytics)
  if (opts.userId) {
    Promise.all(
      ads.map((ad) =>
        supabase.from("ads_views").insert({
          ad_id: ad.id,
          user_id: opts.userId,
          session_id: opts.sessionId,
        }),
      ),
    ).catch((err) => console.error("Failed to track ad views:", err));
  }

  return ads;
}

export async function updateUserInterests(_userId: string) {
  // Interest scores are maintained securely by the database interaction trigger.
  // This function is retained for API compatibility with older UI code.
  return;
}

/* -------------------- POSTING LIMITS & SUBSCRIPTIONS -------------------- */

export async function getUserPostingLimits(userId: string) {
  const [subscriptionResult, onboardingResult] = await Promise.all([
    supabase.from("user_subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("onboarding_queue").select("is_early_user").eq("user_id", userId).maybeSingle(),
  ]);

  const subscription = subscriptionResult.data;
  const onboarding = onboardingResult.data;

  // Early users (first 50) have unlimited posts
  if (onboarding?.is_early_user) {
    return {
      productLimit: 999,
      gigLimit: 999,
      adsLimit: 999,
      isEarlyUser: true,
    };
  }

  // Otherwise use subscription limits
  return {
    productLimit: subscription?.product_limit ?? 5,
    gigLimit: subscription?.gig_limit ?? 2,
    adsLimit: subscription?.ads_limit ?? 2,
    isEarlyUser: false,
  };
}

export async function getUserPostingCounts(userId: string) {
  const [products, gigs, ads] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact" })
      .eq("seller_id", userId)
      .eq("status", "active"),
    supabase
      .from("gigs")
      .select("id", { count: "exact" })
      .eq("poster_id", userId)
      .eq("status", "active"),
    supabase
      .from("ads")
      .select("id", { count: "exact" })
      .eq("poster_id", userId)
      .eq("status", "active"),
  ]);

  return {
    productCount: products.count ?? 0,
    gigCount: gigs.count ?? 0,
    adsCount: ads.count ?? 0,
  };
}

export async function canUserPost(
  userId: string,
  itemType: "product" | "gig" | "ad",
): Promise<{ can: boolean; reason?: string }> {
  const [limits, counts] = await Promise.all([
    getUserPostingLimits(userId),
    getUserPostingCounts(userId),
  ]);

  if (itemType === "product") {
    if (counts.productCount >= limits.productLimit) {
      return { can: false, reason: `Product limit reached (${limits.productLimit})` };
    }
  } else if (itemType === "gig") {
    if (counts.gigCount >= limits.gigLimit) {
      return { can: false, reason: `Gig limit reached (${limits.gigLimit})` };
    }
  } else if (itemType === "ad") {
    if (counts.adsCount >= limits.adsLimit) {
      return { can: false, reason: `Ad limit reached (${limits.adsLimit})` };
    }
  }

  return { can: true };
}

/* -------------------- BOOSTS & PROMOTION -------------------- */

export async function createProductBoost(
  productId: string,
  sellerId: string,
  boostLevel: number = 1,
  durationDays: number = 7,
) {
  if (!sellerId) throw new Error("Sign-in required");
  const { data, error } = await supabase.rpc("request_product_boost", {
    p_product_id: productId,
    p_boost_level: boostLevel,
    p_duration_days: durationDays,
  });
  if (error) throw error;
  return { id: data };
}

export async function createGigBoost(
  gigId: string,
  posterId: string,
  boostLevel: number = 1,
  durationDays: number = 7,
) {
  if (!posterId) throw new Error("Sign-in required");
  const { data, error } = await supabase.rpc("request_gig_boost", {
    p_gig_id: gigId,
    p_boost_level: boostLevel,
    p_duration_days: durationDays,
  });
  if (error) throw error;
  return { id: data };
}

export async function getActiveBoosts(itemId: string, itemType: "product" | "gig") {
  const query =
    itemType === "product"
      ? supabase.from("product_boosts").select("*").eq("product_id", itemId)
      : supabase.from("gig_boosts").select("*").eq("gig_id", itemId);

  const { data, error } = await query
    .gt("expires_at", new Date().toISOString())
    .eq("payment_status", "paid");

  if (error) throw error;

  // Calculate total boost multiplier
  const boostMultiplier = (data ?? []).reduce((sum, boost) => sum + boost.boost_level * 0.5, 1);
  return {
    hasBoost: data && data.length > 0,
    boostCount: data?.length ?? 0,
    boostMultiplier, // Use this to boost ranking
    boosts: data ?? [],
  };
}
