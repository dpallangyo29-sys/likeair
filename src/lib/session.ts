// Anonymous session id — lets us track interactions for signed-out users
// so the interest algorithm still personalizes the feed.
const KEY = "likeair.session_id";

export function getAnonSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
