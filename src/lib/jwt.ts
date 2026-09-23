import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "fallback_access_secret_32_chars_long_key";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret_32_chars_long_key";
const RESET_SECRET = process.env.JWT_RESET_SECRET || "fallback_reset_secret_32_chars_long_key";

export interface TokenPayload {
  userId: string;
  email: string;
  type?: "access" | "refresh" | "reset";
}

/**
 * Sign a short-lived Access Token (default 15m)
 */
export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRES_IN || "15m") as SignOptions["expiresIn"],
    issuer: "globalshelfbd",
    audience: "globalshelfbd-client",
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign({ ...payload, type: "access" }, ACCESS_SECRET, options);
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET, {
      issuer: "globalshelfbd",
      audience: "globalshelfbd-client",
    }) as TokenPayload;
    if (decoded.type !== "access") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Sign a long-lived Refresh Token (default 7d) with unique JWT ID
 */
export function signRefreshToken(payload: TokenPayload, tokenId?: string): string {
  const options: SignOptions = {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
    issuer: "globalshelfbd",
    audience: "globalshelfbd-client",
    jwtid: tokenId || crypto.randomUUID(),
  };
  return jwt.sign({ ...payload, type: "refresh" }, REFRESH_SECRET, options);
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): (TokenPayload & { tokenId?: string }) | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      issuer: "globalshelfbd",
      audience: "globalshelfbd-client",
    }) as TokenPayload & { tokenId?: string };
    if (decoded.type !== "refresh") return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Sign a short-lived Password Reset Authorization Token (15m)
 */
export function signResetToken(email: string): string {
  return jwt.sign({ email, type: "reset" }, RESET_SECRET, {
    expiresIn: "15m",
    issuer: "globalshelfbd",
    audience: "globalshelfbd-client",
    jwtid: crypto.randomUUID(),
  });
}

/**
 * Verify Password Reset Authorization Token
 */
export function verifyResetToken(token: string): { email: string } | null {
  try {
    const decoded = jwt.verify(token, RESET_SECRET, {
      issuer: "globalshelfbd",
      audience: "globalshelfbd-client",
    }) as { email: string; type: string };
    if (decoded.type !== "reset") return null;
    return { email: decoded.email };
  } catch {
    return null;
  }
}
