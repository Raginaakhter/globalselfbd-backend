import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

export const productRouter = Router();

function parseHighlights(p: { highlights: string; [key: string]: any }) {
  return { ...p, highlights: JSON.parse(p.highlights) as string[] };
}

// -------------------------------------------------------------
// GET /featured — returns grouped products for landing page
// -------------------------------------------------------------
productRouter.get("/featured", async (_req: Request, res: Response) => {
  try {
    const [bestSellers, topDeals, newArrivals] = await Promise.all([
      prisma.product.findMany({
        where: { active: true, group: "best-sellers" },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { active: true, group: "top-deals" },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { active: true, group: "new-arrivals" },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        bestSellers: bestSellers.map(parseHighlights),
        topDeals: topDeals.map(parseHighlights),
        newArrivals: newArrivals.map(parseHighlights),
      },
    });
  } catch (error) {
    console.error("GET /api/products/featured error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured products",
    });
  }
});

// -------------------------------------------------------------
// GET / — list products with optional filters
// -------------------------------------------------------------
productRouter.get("/", async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) ?? "";
    const q = ((req.query.q as string) ?? "").trim().toLowerCase();
    const sort = (req.query.sort as string) ?? "popular";
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) ?? "50", 10) || 50, 1), 100);
    const offset = Math.max(parseInt((req.query.offset as string) ?? "0", 10) || 0, 0);

    const where: Prisma.ProductWhereInput = { active: true };
    if (category) {
      where.category = category;
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
      case "new":
        orderBy = { createdAt: "desc" };
        break;
      case "discount":
      case "popular":
      default:
        orderBy = { reviews: "desc" };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    const result = products.map((p) => ({
      ...p,
      highlights: JSON.parse(p.highlights) as string[],
    }));

    if (sort === "discount") {
      result.sort((a, b) => {
        const discA = a.rrp && a.rrp > a.price ? Math.round(((a.rrp - a.price) / a.rrp) * 100) : 0;
        const discB = b.rrp && b.rrp > b.price ? Math.round(((b.rrp - b.price) / b.rrp) * 100) : 0;
        return discB - discA;
      });
    }

    if (sort === "new") {
      result.sort((a, b) => Number(b.badge === "NEW") - Number(a.badge === "NEW"));
    }

    return res.status(200).json({
      success: true,
      data: {
        products: result,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
});

// -------------------------------------------------------------
// GET /:id — get a single product by ID
// -------------------------------------------------------------
productRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const product = await prisma.product.findFirst({
      where: { id, active: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const parsed = {
      ...product,
      highlights: JSON.parse(product.highlights) as string[],
    };

    const related = await prisma.product.findMany({
      where: {
        active: true,
        id: { not: id },
      },
      orderBy: { reviews: "desc" },
      take: 12,
    });

    const relatedParsed = related
      .sort((a, b) => {
        const aMatch = a.category === product.category ? 1 : 0;
        const bMatch = b.category === product.category ? 1 : 0;
        return bMatch - aMatch;
      })
      .slice(0, 6)
      .map((p) => ({
        ...p,
        highlights: JSON.parse(p.highlights) as string[],
      }));

    return res.status(200).json({
      success: true,
      data: {
        product: parsed,
        related: relatedParsed,
      },
    });
  } catch (error) {
    console.error("GET /api/products/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
});
