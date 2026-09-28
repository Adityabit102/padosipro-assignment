/** Lower-case and drop everything except letters and digits: "Wi-Fi & internet" -> "wifiinternet". */
const compact = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * True if `query` appears in any of `fields`, ignoring case, spaces and punctuation,
 * so "wifi" finds "Wi-Fi" and "ac service" finds "AC servicing".
 */
export function matchesSearch(query: string, fields: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qc = compact(q);
  return fields.some((f) => {
    const text = f.toLowerCase();
    return text.includes(q) || (qc.length > 0 && compact(text).includes(qc));
  });
}
