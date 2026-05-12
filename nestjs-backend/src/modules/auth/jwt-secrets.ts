import * as jwt from 'jsonwebtoken';

/**
 * Dual-secret JWT support for zero-downtime JWT_SECRET rotation.
 *
 * - Signing always uses JWT_SECRET (the current key).
 * - Verification accepts JWT_SECRET, then falls back to JWT_SECRET_PREVIOUS
 *   (if set) so tokens issued before a rotation keep working until they expire.
 *
 * See docs/SECRETS_ROTATION.md §4.
 */

/** The active signing key. Throws at boot if missing. */
export function getJwtSigningSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET ortam değişkeni tanımlanmamış');
  return secret;
}

/** Current key first, then the previous key during a rotation window. */
export function getJwtVerifySecrets(): string[] {
  return [process.env.JWT_SECRET, process.env.JWT_SECRET_PREVIOUS].filter(
    (s): s is string => !!s,
  );
}

/**
 * passport-jwt secretOrKeyProvider: pick the first candidate secret that
 * verifies the raw token. passport-jwt then re-verifies with that secret.
 * If none verify, hand back the current secret so passport produces the
 * normal "invalid signature" failure.
 */
export function jwtSecretOrKeyProvider(
  _request: unknown,
  rawJwtToken: string,
  done: (err: Error | null, secret?: string) => void,
): void {
  const secrets = getJwtVerifySecrets();
  if (secrets.length === 0) {
    done(new Error('JWT_SECRET ortam değişkeni tanımlanmamış'));
    return;
  }
  for (const secret of secrets) {
    try {
      jwt.verify(rawJwtToken, secret);
      done(null, secret);
      return;
    } catch {
      // try next candidate
    }
  }
  done(null, secrets[0]);
}

/**
 * Verify a token against all candidate secrets, returning the decoded payload.
 * Throws (like jwt.verify) if none accept it. Used for manual verify calls.
 */
export function verifyJwtWithRotation<T = jwt.JwtPayload>(token: string): T {
  const secrets = getJwtVerifySecrets();
  let lastErr: unknown = new Error('JWT_SECRET ortam değişkeni tanımlanmamış');
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret) as T;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
