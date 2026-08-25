/**
 * Posting & Engagement Utilities
 * Handles posting limits, ad display, and engagement features
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Get user's likes as a Map for quick lookup
 */
export async function getUserLikesMap(userId: string): Promise<Map<string, Set<string>>> {
  try {
    const { data } = await supabase
      .from("likes")
      .select("item_type, item_id")
      .eq("user_id", userId);

    const likesMap = new Map<string, Set<string>>();
    (data ?? []).forEach((like) => {
      if (!likesMap.has(like.item_type)) {
        likesMap.set(like.item_type, new Set());
      }
      likesMap.get(like.item_type)!.add(like.item_id);
    });

    return likesMap;
  } catch (error) {
    console.error("Error fetching user likes:", error);
    return new Map();
  }
}

export async function getUserSavesMap(userId: string): Promise<Map<string, Set<string>>> {
  try {
    const { data, error } = await supabase
      .from("saves")
      .select("item_type, item_id")
      .eq("user_id", userId);
    if (error) throw error;
    const saves = new Map<string, Set<string>>();
    (data ?? []).forEach((row) => {
      if (!saves.has(row.item_type)) saves.set(row.item_type, new Set());
      saves.get(row.item_type)!.add(row.item_id);
    });
    return saves;
  } catch (error) {
    console.error("Error fetching saves:", error);
    return new Map();
  }
}

export async function toggleItemSave(
  userId: string,
  itemType: "product" | "gig" | "ad",
  itemId: string,
): Promise<{ success: boolean; saved: boolean; error?: string }> {
  try {
    if (!userId) return { success: false, saved: false, error: "Sign in required" };

    const { data: existing, error: lookupError } = await supabase
      .from("saves")
      .select("user_id")
      .eq("user_id", userId)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing) {
      const { error } = await supabase
        .from("saves")
        .delete()
        .eq("user_id", userId)
        .eq("item_type", itemType)
        .eq("item_id", itemId);
      if (error) throw error;
      return { success: true, saved: false };
    }

    const { error } = await supabase.from("saves").insert({
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
    });
    if (error) throw error;
    return { success: true, saved: true };
  } catch (error) {
    console.error("Error toggling save:", error);
    return {
      success: false,
      saved: false,
      error: error instanceof Error ? error.message : "Failed to update save",
    };
  }
}

/**
 * Toggle like on an item
 */
export async function toggleItemLike(
  userId: string,
  itemType: "product" | "gig" | "ad",
  itemId: string,
): Promise<{ success: boolean; liked: boolean; error?: string }> {
  try {
    let existingQuery = supabase
      .from("likes")
      .select("*")
      .eq("item_type", itemType)
      .eq("item_id", itemId);
    existingQuery = existingQuery.eq("user_id", userId);

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      const deleteQuery = supabase
        .from("likes")
        .delete()
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .eq("user_id", userId);

      const { error } = await deleteQuery;

      if (error) throw error;
      await recordInteraction(userId, null, itemType, itemId, "click");
      return { success: true, liked: false };
    } else {
      const { error } = await supabase.from("likes").insert({
        user_id: userId,
        item_type: itemType,
        item_id: itemId,
      });

      if (error) throw error;
      await recordInteraction(userId, null, itemType, itemId, "click");
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return { success: false, liked: false, error: "Failed to update like" };
  }
}

/**
 * Track a user interaction (view, click, search)
 * This is used for the interest-based ads targeting
 */
export async function recordInteraction(
  userId: string | null,
  sessionId: string | null,
  itemType: "product" | "gig" | "ad",
  itemId: string,
  event: "view" | "click" | "search",
  category?: string,
): Promise<void> {
  try {
    // Assign weight based on event type
    const weights = {
      view: 1,
      click: 3,
      search: 2,
    };

    await supabase.from("interactions").insert({
      user_id: userId,
      session_id: sessionId,
      item_type: itemType,
      item_id: itemId,
      event,
      category,
      weight: weights[event],
    });
  } catch (error) {
    // Silent fail - don't interrupt user experience
    console.error("Failed to record interaction:", error);
  }
}

/**
 * Get user interests for ads targeting
 */
export async function getUserInterests(userId: string): Promise<Map<string, number>> {
  try {
    const { data } = await supabase
      .from("user_interests")
      .select("category, score")
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .limit(20); // Top 20 interests

    const interests = new Map<string, number>();
    (data ?? []).forEach((interest) => {
      interests.set(interest.category, interest.score);
    });

    return interests;
  } catch (error) {
    console.error("Error fetching user interests:", error);
    return new Map();
  }
}

/**
 * Update user interests based on their interaction history
 * Call this periodically or after significant interactions
 */
export async function updateUserInterests(_userId: string): Promise<void> {
  // Secure interest aggregation is handled by the database interaction trigger.
}

/**
 * Get targeted ads for user based on interests
 * Ads are sorted by relevance to user's interests
 */
export async function getTargetedAds(
  userId: string | null,
  sessionId: string | null,
  campusId?: string | null,
  limit: number = 3,
): Promise<Record<string, unknown>[]> {
  try {
    // Get user interests if logged in
    let userInterests: Map<string, number> | null = null;
    if (userId) {
      userInterests = await getUserInterests(userId);
    }

    // Fetch active ads
    let query = supabase
      .from("ads")
      .select("*")
      .eq("status", "active")
      .gt("impressions_left", 0)
      .order("created_at", { ascending: false });

    if (campusId) {
      query = query.eq("campus_id", campusId);
    }

    const { data: ads } = await query.range(0, Math.max(50, limit * 5));

    if (!ads || ads.length === 0) return [];

    // Score ads based on user interests
    let scoredAds = ads.map((ad) => {
      let score = Math.random() * 50; // Base random score

      if (userInterests && userInterests.size > 0) {
        const adText = `${ad.title} ${ad.body ?? ""}`.toLowerCase();
        userInterests.forEach((interestScore, category) => {
          if (adText.includes(category.toLowerCase())) {
            score += interestScore * 2; // Boost for matching category
          }
        });
      }

      return { ...ad, score };
    });

    // Sort by relevance and return top N
    scoredAds = scoredAds.sort((a, b) => b.score - a.score).slice(0, limit);

    // Track ad views (asynchronously, don't wait)
    if (userId || sessionId) {
      scoredAds.forEach((ad) => {
        void supabase
          .from("ads_views")
          .insert({
            ad_id: ad.id,
            user_id: userId,
            session_id: sessionId,
          })
          .then(({ error: viewErr }) => {
            if (viewErr) console.error("Failed to track ad view:", viewErr);
          });
      });
    }

    return scoredAds.map(({ score, ...ad }) => ad); // Remove score from returned data
  } catch (error) {
    console.error("Error fetching targeted ads:", error);
    return [];
  }
}

/**
 * Check if a product/gig is currently promoted
 */
export function isItemPromoted(item: { promoted_until?: string | null }): boolean {
  return Boolean(item.promoted_until && new Date(item.promoted_until) > new Date());
}

/**
 * Get boost information for an item
 */
export async function getItemBoosts(
  itemId: string,
  itemType: "product" | "gig",
): Promise<Record<string, unknown>[]> {
  try {
    const query =
      itemType === "product"
        ? supabase.from("product_boosts").select("*").eq("product_id", itemId)
        : supabase.from("gig_boosts").select("*").eq("gig_id", itemId);

    const { data } = await query
      .gt("expires_at", new Date().toISOString())
      .eq("payment_status", "paid");

    return data ?? [];
  } catch (error) {
    console.error("Error fetching item boosts:", error);
    return [];
  }
}

/**
 * Calculate boost visibility multiplier
 * Higher boosts = higher visibility in feed
 */
export function getBoostMultiplier(boostLevel: number): number {
  // Level 1: 1.5x visibility
  // Level 2: 2.5x visibility
  // Level 3: 4x visibility
  return 1 + boostLevel * 1.5;
}
