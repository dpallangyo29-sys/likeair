const REMINDERS_KEY = "likeair.campus-reminders.enabled.v1";
const VISIT_KEY_PREFIX = "likeair.campus-reminders.last-visit.v1";

export function getCampusRemindersEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(REMINDERS_KEY) === "1";
}

export function setCampusRemindersEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMINDERS_KEY, enabled ? "1" : "0");
}

function visitKey(location: string) {
  return `${VISIT_KEY_PREFIX}.${encodeURIComponent(location)}`;
}

export function getCampusLastVisit(location: string): number | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(visitKey(location));
  if (!value) return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function setCampusLastVisit(location: string, timestamp: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(visitKey(location), String(timestamp));
}
