const MAX_LENGTH = 2048;

/** Only allow http(s) URLs. Empty/whitespace, javascript:, and other schemes become null. */
export function sanitizeMediaUrl(raw) {
  if (raw == null) return null;
  let trimmed = String(raw).trim();
  if (!trimmed || trimmed.length > MAX_LENGTH) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return trimmed;
}
