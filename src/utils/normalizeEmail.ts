/**
 * Normalizes an email so lookups do not depend on case or stray spaces.
 * @param email email as typed by the user
 * @returns the normalized email
 */
export default function normalizeEmail<T>(email: T): T {
  if (typeof email != "string") return email;
  return email.trim().toLowerCase() as T;
}
