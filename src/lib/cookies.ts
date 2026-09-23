import { Response } from "express";

export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

/**
 * Set HttpOnly Refresh Token cookie on Express Response
 */
export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: maxAge,
  });
}

/**
 * Clear Refresh Token cookie on Express Response
 */
export function clearRefreshTokenCookie(res: Response) {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
}
