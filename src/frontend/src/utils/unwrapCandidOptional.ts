/**
 * Unwraps a Candid optional value from its tuple-array encoding.
 * Candid optionals are represented as [] (none) or [value] (some).
 * 
 * @param value - The Candid optional value ([] | [T] | undefined | null)
 * @returns The unwrapped value or null if absent
 */
export function unwrapCandidOptional<T>(value: [] | [T] | undefined | null): T | null {
  if (!value) return null;
  if (Array.isArray(value) && value.length === 1) {
    return value[0];
  }
  return null;
}
