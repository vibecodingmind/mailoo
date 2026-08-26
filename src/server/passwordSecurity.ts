import crypto from 'crypto';

/**
 * Enterprise Password Security Engine
 * Uses RFC 7914 scrypt memory-hard key derivation function
 * Salt: 16 cryptographically random bytes (32 hex chars)
 * Parameters: N=16384 (CPU/memory cost), r=8 (block size), p=1 (parallelization)
 * Key length: 64 bytes (512 bits)
 * Storage format: scrypt:16384:8:1:<salt_hex>:<derived_key_hex>
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  // Modern scrypt format: scrypt:N:r:p:salt:derivedKey
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 6) return false;

    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = parts[4];
    const originalHashHex = parts[5];

    if (!salt || !originalHashHex || isNaN(N) || isNaN(r) || isNaN(p)) return false;

    try {
      const derivedKey = crypto.scryptSync(password, salt, KEY_LEN, { N, r, p });
      const originalKeyBuffer = Buffer.from(originalHashHex, 'hex');
      return crypto.timingSafeEqual(derivedKey, originalKeyBuffer);
    } catch {
      return false;
    }
  }

  // Legacy SHA-256 fallback with timing-safe comparison for migration
  try {
    const legacyHash = crypto.createHash('sha256').update(`salt_monogram_${password}_sovereign`).digest('hex');
    const legacyBuffer = Buffer.from(legacyHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (legacyBuffer.length === storedBuffer.length) {
      return crypto.timingSafeEqual(legacyBuffer, storedBuffer);
    }
  } catch {
    // Ignore legacy comparison errors
  }

  return false;
}

export function needsRehash(storedHash: string): boolean {
  if (!storedHash) return true;
  return !storedHash.startsWith(`scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:`);
}
