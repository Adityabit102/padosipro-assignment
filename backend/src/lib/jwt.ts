import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string;
}

export function signAccessToken(userId: string, secret: string, expiresIn: string): string {
  return jwt.sign({}, secret, {
    subject: userId,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/** Returns the user id, or null if the token is missing, malformed, tampered with or expired. */
export function verifyAccessToken(token: string, secret: string): string | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
