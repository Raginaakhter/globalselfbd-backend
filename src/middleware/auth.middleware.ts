import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  provider: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Authenticate incoming HTTP request via Bearer Token
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | null = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing authentication token",
      });
    }

    const payload = verifyAccessToken(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token expired or invalid",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        provider: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User account not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
}

/**
 * Optional authentication: attaches user if token is present, does not block if absent.
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      if (payload && payload.userId) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            provider: true,
            role: true,
            emailVerified: true,
            createdAt: true,
          },
        });
        if (user) {
          req.user = user;
        }
      }
    }
  } catch {
    // Ignore errors for optional auth
  }
  next();
}

/**
 * Require user to be authenticated and have the 'admin' role
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await authenticate(req, res, () => {
    if (!req.user) return;
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access required",
      });
    }
    next();
  });
}
