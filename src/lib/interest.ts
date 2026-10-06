import { getInterests } from "./tracking";

// Score an item for the personalized feed. Higher = more relevant.
// Combines: category affinity, campus affinity, freshness, boost signals.
export function scoreItem(
  item: {
    category?: string | null;
    campus_id?: string | null;
    featured?: boolean | null;
    hot?: boolean | null;
    urgent?: boolean | null;
    created_at?: string | null;
  },
  opts?: { activeCampus?: string | null },
): number {
  const interests = getInterests();
  let score = 0;

  if (item.category && interests.categories[item.category]) {
    score += Math.min(interests.categories[item.category], 30);
  }
  if (item.campus_id && interests.campuses[item.campus_id]) {
    score += Math.min(interests.campuses[item.campus_id], 20);
  }
  // Active campus match — proximity signal.
  if (opts?.activeCampus && item.campus_id === opts.activeCampus) score += 8;

  if (item.featured) score += 5;
  if (item.hot) score += 4;
  if (item.urgent) score += 6;

  // Freshness: newer wins, gentle decay over 14 days.
  if (item.created_at) {
    const ageDays = (Date.now() - new Date(item.created_at).getTime()) / 86400000;
    score += Math.max(0, 10 - ageDays * 0.7);
  }
  return score;
}

export function personalizedSort<
  T extends {
    category?: string | null;
    campus_id?: string | null;
    featured?: boolean | null;
    hot?: boolean | null;
    urgent?: boolean | null;
    created_at?: string | null;
  },
>(items: T[], opts?: { activeCampus?: string | null }): T[] {
  return [...items].sort((a, b) => {
    const scoreDiff = scoreItem(b, opts) - scoreItem(a, opts);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
}
