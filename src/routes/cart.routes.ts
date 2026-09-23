import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getSiteSettings } from "../lib/site";

export const cartRouter = Router();

type CartInput = {
  items: { id: string; qty: number }[];
  zone?: "dhaka" | "outside";
};

cartRouter.post("/calculate", async (req: Request, res: Response) => {
  try {
    const body = req.body as CartInput;
    const { items, zone = "dhaka" } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          lines: [],
          subtotal: 0,
          shipping: 0,
          total: 0,
          itemCount: 0,
        },
      });
    }

    const MAX_QTY = 10;
    const cleanItems = items
      .filter((it) => it.id && typeof it.qty === "number" && it.qty > 0)
      .map((it) => ({ id: it.id, qty: Math.min(Math.max(Math.round(it.qty), 1), MAX_QTY) }));

    if (cleanItems.length === 0) {
      return res.status(200).json({
        success: true,
        data: { lines: [], subtotal: 0, shipping: 0, total: 0, itemCount: 0 },
      });
    }

    const productIds = cleanItems.map((it) => it.id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const lines = cleanItems
      .filter((it) => productMap.has(it.id))
      .map((it) => {
        const p = productMap.get(it.id)!;
        const qty = Math.min(it.qty, p.stock);
        const lineTotal = p.price * qty;
        return {
          product: {
            id: p.id,
            name: p.name,
            brand: p.brand,
            category: p.category,
            size: p.size,
            price: p.price,
            rrp: p.rrp,
            emoji: p.emoji,
            tint: p.tint,
            image: p.image,
            badge: p.badge,
            rating: p.rating,
            reviews: p.reviews,
            stock: p.stock,
          },
          qty,
          lineTotal,
        };
      });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const {
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      shippingInsideDhaka: SHIPPING_INSIDE_DHAKA,
      shippingOutsideDhaka: SHIPPING_OUTSIDE_DHAKA,
    } = await getSiteSettings();
    const shipping =
      subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : zone === "dhaka"
        ? SHIPPING_INSIDE_DHAKA
        : SHIPPING_OUTSIDE_DHAKA;
    const total = subtotal + shipping;

    const invalidIds = cleanItems
      .filter((it) => !productMap.has(it.id))
      .map((it) => it.id);

    return res.status(200).json({
      success: true,
      data: {
        lines,
        subtotal,
        shipping,
        total,
        itemCount: lines.reduce((n, l) => n + l.qty, 0),
        ...(invalidIds.length > 0 ? { invalidIds } : {}),
      },
    });
  } catch (error) {
    console.error("POST /api/cart/calculate error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate cart",
    });
  }
});
