/**
 * Deterministic per-attendee check-in code. Same input → same code.
 * Format: 4-4 hex (e.g. "A1B2-C3D4"). Stable so it doesn't need to be persisted,
 * and safe to call from both server and client.
 */
export function eventCheckInCode(eventId: string, userId: string): string {
  const raw = stableSegment(`${eventId}:checkin:${userId}`).toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

function stableSegment(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
