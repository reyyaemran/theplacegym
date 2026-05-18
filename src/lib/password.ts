/**
 * Password hashing using Node's built-in scrypt (no external deps).
 *
 * Stored format: `scrypt$<saltHex>$<hashHex>`
 * Legacy plaintext rows (no prefix) are still accepted on login and
 * automatically upgraded — see `isHashed` + the login route.
 */
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const KEYLEN = 64;
const PREFIX = "scrypt$";

/** Hash a plaintext password. Always returns the `scrypt$salt$hash` form. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEYLEN).toString("hex");
  return `${PREFIX}${salt}$${hash}`;
}

/** Returns true iff `stored` is in our scrypt format (vs. legacy plaintext). */
export function isHashed(stored: string | undefined | null): boolean {
  return !!stored && stored.startsWith(PREFIX);
}

/**
 * Constant-time verify. Returns true on match.
 * Caller is responsible for plaintext-fallback logic for legacy rows.
 */
export function verifyHashed(plain: string, stored: string): boolean {
  if (!isHashed(stored)) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [, salt, hashHex] = parts;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(plain, salt, KEYLEN);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * One-call password check that handles legacy plaintext rows safely.
 * Returns `{ ok, needsUpgrade }`. If `needsUpgrade` is true the caller
 * should re-hash and persist on this login.
 */
export function checkPassword(
  plain: string,
  stored: string | undefined | null
): { ok: boolean; needsUpgrade: boolean } {
  if (!stored) return { ok: false, needsUpgrade: false };
  if (isHashed(stored)) {
    return { ok: verifyHashed(plain, stored), needsUpgrade: false };
  }
  // Legacy plaintext — compare directly, flag for upgrade.
  return { ok: plain === stored, needsUpgrade: plain === stored };
}
