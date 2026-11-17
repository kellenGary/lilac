/** The most characters a first name can have. */
export const MAX_NAME = 40;

/** Tidies what someone typed: trims, squeezes inner spaces, and cuts it to a sensible length. */
export const cleanName = (raw: string): string => raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/**
 * A person's first name from their account data: the one they chose, or else the first word of the full name they gave
 * when signing up. Empty if they never gave one.
 */
export function firstNameOf(meta: Record<string, unknown> | null | undefined): string {
  const chosen = typeof meta?.first_name === 'string' ? cleanName(meta.first_name) : '';
  if (chosen) return chosen;
  const full = typeof meta?.full_name === 'string' ? cleanName(meta.full_name) : '';
  return full.split(' ')[0] ?? '';
}
