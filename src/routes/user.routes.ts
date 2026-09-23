import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { updateProfileSchema } from "../lib/validation";
import { sanitizeInput } from "../lib/security";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.middleware";

export const userRouter = Router();

// GET /api/user/profile
userRouter.get("/profile", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  return res.status(200).json({
    success: true,
    message: "Protected user profile fetched successfully",
    data: {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    },
  });
});

// PATCH & PUT /api/user/profile
const updateProfileHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid profile data",
      });
    }

    const { name, avatar } = parsed.data;
    if (avatar && !/^https?:\/\//i.test(avatar)) {
      return res.status(400).json({
        success: false,
        message: "Avatar must be an http(s) URL",
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: sanitizeInput(name),
        ...(avatar !== undefined && { avatar: avatar || null }),
      },
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

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { profile: updated },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

userRouter.patch("/profile", authenticate, updateProfileHandler);
userRouter.put("/profile", authenticate, updateProfileHandler);
