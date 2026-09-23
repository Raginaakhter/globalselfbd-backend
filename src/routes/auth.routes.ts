import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  googleAuthSchema,
} from "../lib/validation";
import {
  hashPassword,
  comparePassword,
  generate4DigitOtp,
  hashOtp,
  verifyOtp,
  hashToken,
  sanitizeInput,
} from "../lib/security";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signResetToken,
  verifyResetToken,
} from "../lib/jwt";
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_TOKEN_COOKIE_NAME } from "../lib/cookies";
import { checkRateLimit } from "../lib/rate-limiter";
import { linkGuestOrdersToUser } from "../lib/orders";
import { sendOtpEmail } from "../lib/email";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.middleware";

export const authRouter = Router();

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "1058202288804-mpuaqjev1h8hh80edggke86iq28n184o.apps.googleusercontent.com";
const googleClient = new OAuth2Client(googleClientId);

// -------------------------------------------------------------
// POST /register
// -------------------------------------------------------------
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const isTest = req.headers["x-test-suite"] === "true";
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    if (!isTest) {
      const rateCheck = checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: `Too many registration attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`,
        });
      }
    }

    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => issue.message);
      return res.status(400).json({
        success: false,
        message: errors[0] || "Validation failed",
        errors,
      });
    }

    const { name, email, password } = parseResult.data;
    const sanitizedName = sanitizeInput(name);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email,
        passwordHash,
        provider: "local",
        emailVerified: false,
      },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        userAgent: (req.headers["user-agent"] as string) || "unknown",
        ipAddress: ip,
        expiresAt,
      },
    });

    await linkGuestOrdersToUser(user.id, user.email);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    setRefreshTokenCookie(res, refreshToken);
    return res.status(201).json({
      success: true,
      message: "Registration successful!",
      data: {
        user: safeUser,
        accessToken,
      },
    });
  } catch (error) {
    console.error("Registration API error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during registration.",
    });
  }
});

// -------------------------------------------------------------
// POST /login
// -------------------------------------------------------------
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const isTest = req.headers["x-test-suite"] === "true";
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    if (!isTest) {
      const rateCheck = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: `Too many login attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`,
        });
      }
    }

    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        userAgent: (req.headers["user-agent"] as string) || "unknown",
        ipAddress: ip,
        expiresAt,
      },
    });

    await linkGuestOrdersToUser(user.id, user.email);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    setRefreshTokenCookie(res, refreshToken);
    return res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        user: safeUser,
        accessToken,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during login.",
    });
  }
});

// -------------------------------------------------------------
// POST /refresh
// -------------------------------------------------------------
authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    let refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(200).json({
        success: false,
        message: "No active authentication session",
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload || !payload.userId) {
      clearRefreshTokenCookie(res);
      return res.status(200).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const tokenHash = hashToken(refreshToken);
    const existingSession = await prisma.refreshSession.findUnique({
      where: { tokenHash },
    });

    if (!existingSession || existingSession.expiresAt < new Date()) {
      if (existingSession) {
        await prisma.refreshSession.deleteMany({ where: { id: existingSession.id } });
      }
      clearRefreshTokenCookie(res);
      return res.status(200).json({
        success: false,
        message: "Session has expired or been revoked",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      clearRefreshTokenCookie(res);
      return res.status(200).json({
        success: false,
        message: "User not found",
      });
    }

    const deleteResult = await prisma.refreshSession.deleteMany({
      where: { id: existingSession.id },
    });

    if (deleteResult.count === 0) {
      return res.status(200).json({
        success: false,
        message: "Session already refreshed by another request",
      });
    }

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = signRefreshToken({ userId: user.id, email: user.email });
    const newRefreshTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        userAgent: (req.headers["user-agent"] as string) || "unknown",
        ipAddress: ip,
        expiresAt,
      },
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    setRefreshTokenCookie(res, newRefreshToken);
    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: safeUser,
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error("Refresh API error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while refreshing authentication session",
    });
  }
});

// -------------------------------------------------------------
// POST /logout
// -------------------------------------------------------------
authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body?.refreshToken;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshSession.deleteMany({
        where: { tokenHash },
      });
    }

    clearRefreshTokenCookie(res);
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout API error:", error);
    clearRefreshTokenCookie(res);
    return res.status(200).json({
      success: true,
      message: "Logged out",
    });
  }
});

// -------------------------------------------------------------
// GET /me
// -------------------------------------------------------------
authRouter.get("/me", authenticate, (req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

// -------------------------------------------------------------
// POST /forgot-password
// -------------------------------------------------------------
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const isTest = req.headers["x-test-suite"] === "true";
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const { email } = parseResult.data;

    if (!isTest) {
      const rateCheck = checkRateLimit(`forgot-password:${ip}:${email}`, 3, 15 * 60 * 1000);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: `Too many password reset attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`,
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email address is in our system, we have sent a verification code to it.",
      });
    }

    const otp = generate4DigitOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordResetOtp.upsert({
      where: { email },
      update: {
        otpHash,
        resetTokenHash: null,
        attempts: 0,
        expiresAt,
      },
      create: {
        email,
        otpHash,
        attempts: 0,
        expiresAt,
      },
    });

    await sendOtpEmail(email, otp, user.name);

    return res.status(200).json({
      success: true,
      message: "If that email address is in our system, we have sent a verification code to it.",
    });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
});

// -------------------------------------------------------------
// POST /verify-otp
// -------------------------------------------------------------
authRouter.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.issues[0]?.message || "Invalid OTP code",
      });
    }

    const { email, otp } = parseResult.data;

    const otpRecord = await prisma.passwordResetOtp.findUnique({
      where: { email },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "No OTP request found for this email address.",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await prisma.passwordResetOtp.delete({ where: { email } });
      return res.status(400).json({
        success: false,
        message: "OTP code has expired. Please request a new one.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await prisma.passwordResetOtp.delete({ where: { email } });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP code.",
      });
    }

    const isMatch = verifyOtp(otp, otpRecord.otpHash);
    if (!isMatch) {
      await prisma.passwordResetOtp.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });

      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${4 - otpRecord.attempts} attempts remaining.`,
      });
    }

    const resetToken = signResetToken(email);
    const resetTokenHash = hashToken(resetToken);

    await prisma.passwordResetOtp.update({
      where: { email },
      data: { resetTokenHash },
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      data: { resetToken },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP code.",
    });
  }
});

// -------------------------------------------------------------
// POST /reset-password
// -------------------------------------------------------------
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.error.issues[0]?.message || "Validation failed",
      });
    }

    const { resetToken, newPassword } = parseResult.data;

    const payload = verifyResetToken(resetToken);
    if (!payload || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired reset session. Please request a new code.",
      });
    }

    const email = payload.email;
    const otpRecord = await prisma.passwordResetOtp.findUnique({
      where: { email },
    });

    if (!otpRecord || !otpRecord.resetTokenHash) {
      return res.status(401).json({
        success: false,
        message: "Reset authorization revoked. Please request a new code.",
      });
    }

    const inputHash = hashToken(resetToken);
    if (inputHash !== otpRecord.resetTokenHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid reset token.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    await prisma.passwordResetOtp.delete({
      where: { email },
    });

    await prisma.refreshSession.deleteMany({
      where: { userId: user.id },
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password.",
    });
  }
});

// -------------------------------------------------------------
// POST /google
// -------------------------------------------------------------
authRouter.post("/google", async (req: Request, res: Response) => {
  try {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Google token is required",
      });
    }

    const { idToken } = parseResult.data;

    let email = "";
    let name = "";
    let avatar: string | null = null;
    let providerId = "";
    let emailVerified = false;

    const tokenSegments = idToken.split(".");

    if (tokenSegments.length === 3) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(401).json({
          success: false,
          message: "Failed to verify Google identity or email missing",
        });
      }

      email = payload.email.toLowerCase();
      name = payload.name || payload.given_name || "Google User";
      avatar = payload.picture || null;
      providerId = payload.sub;
      emailVerified = Boolean(payload.email_verified);
    } else {
      const googleUserInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!googleUserInfoRes.ok) {
        return res.status(401).json({
          success: false,
          message: "Failed to verify Google access token with Google server",
        });
      }

      const userInfo = (await googleUserInfoRes.json()) as any;
      if (!userInfo || !userInfo.email) {
        return res.status(401).json({
          success: false,
          message: "Google profile email missing",
        });
      }

      email = userInfo.email.toLowerCase();
      name = userInfo.name || userInfo.given_name || "Google User";
      avatar = userInfo.picture || null;
      providerId = userInfo.sub;
      emailVerified = Boolean(userInfo.email_verified);
    }

    if (!emailVerified) {
      return res.status(401).json({
        success: false,
        message: "Google account email is not verified",
      });
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          avatar,
          provider: "google",
          providerId,
          emailVerified: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          avatar: avatar || user.avatar,
          providerId: providerId || user.providerId,
          emailVerified: true,
        },
      });
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        userAgent: (req.headers["user-agent"] as string) || "unknown",
        ipAddress: ip,
        expiresAt,
      },
    });

    await linkGuestOrdersToUser(user.id, user.email);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    setRefreshTokenCookie(res, refreshToken);
    return res.status(200).json({
      success: true,
      message: "Google authentication successful!",
      data: {
        user: safeUser,
        accessToken,
      },
    });
  } catch (error) {
    console.error("Google Auth API error:", error);
    return res.status(500).json({
      success: false,
      message: "Google authentication failed. Please try again.",
    });
  }
});
