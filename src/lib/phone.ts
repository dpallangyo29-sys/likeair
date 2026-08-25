// Normalize Tanzanian phone numbers.
// Accepts 07XXXXXXXX, 7XXXXXXXX, 255XXXXXXXXX, +2557XXXXXXXX and returns +2557XXXXXXXXX.
export function normalizePhoneTZ(input: string): string | null {
  if (!input) return null;
  const s = input.replace(/[\s\-()]/g, "");
  if (/^\+255\d{9}$/.test(s)) return s;
  if (/^255\d{9}$/.test(s)) return "+" + s;
  if (/^0\d{9}$/.test(s)) return "+255" + s.slice(1);
  if (/^\d{9}$/.test(s)) return "+255" + s;
  return null;
}
