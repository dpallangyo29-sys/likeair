/**
 * Minimal client pagination helpers used when appending Supabase pages.
 */

export function deduplicateItems<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const ids = new Set(existing.map((item) => item.id));
  return existing.concat(incoming.filter((item) => !ids.has(item.id)));
}
