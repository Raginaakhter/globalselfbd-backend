import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.middleware";
import { wishlistToggleSchema } from "../lib/validation";

export const wishlistRouter = Router();

// GET /api/wishlist
wishlistRouter.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const products = items
    .filter((it) => it.product.active)
    .map((it) => ({ ...it.product, highlights: JSON.parse(it.product.highlights) as string[] }));

  return res.status(200).json({
    success: true,
    data: { products, productIds: products.map((p) => p.id) },
  });
});

// POST /api/wishlist
wishlistRouter.post("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const parsed = wishlistToggleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid product",
      });
    }

    const { productId } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
    } else {
      await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
    }

    const count = await prisma.wishlistItem.count({ where: { userId: user.id } });

    return res.status(200).json({
      success: true,
      message: existing ? "Removed from wishlist" : "Added to wishlist",
      data: { wishlisted: !existing, count },
    });
  } catch (error) {
    console.error("POST /api/wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update wishlist",
    });
  }
});
