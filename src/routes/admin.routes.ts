import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, AuthenticatedRequest } from "../middleware/auth.middleware";
import { serializeOrder, serializeOrderSummary } from "../lib/orders";
import { updateOrderStatusSchema, bannersSchema, bannerUploadSchema } from "../lib/validation";
import { getBanners, saveBanners, saveBannerImage } from "../lib/banners";
import { sendOrderStatusUpdateEmail } from "../lib/email";
import { orderStatusLabel } from "../lib/order-status";
import type { Prisma } from "@prisma/client";

export const adminRouter = Router();

// Apply requireAdmin to all admin endpoints
adminRouter.use(requireAdmin);

// -------------------------------------------------------------
// GET /orders — list/search/filter all orders
// -------------------------------------------------------------
adminRouter.get("/orders", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = (req.query.status as string)?.trim();
    const q = (req.query.q as string)?.trim();
    const page = Math.max(parseInt((req.query.page as string) || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "20", 10) || 20, 1), 100);

    const where: Prisma.OrderWhereInput = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { id: { contains: q } },
        { customerName: { contains: q } },
        { customerEmail: { contains: q } },
        { customerPhone: { contains: q } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        orders: orders.map(serializeOrderSummary),
        pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin orders",
    });
  }
});

// -------------------------------------------------------------
// GET /orders/:id — full order detail
// -------------------------------------------------------------
adminRouter.get("/orders/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, statusHistory: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" },);
    }

    return res.status(200).json({ success: true, data: serializeOrder(order) });
  } catch (error) {
    console.error("GET /api/admin/orders/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});

// -------------------------------------------------------------
// PATCH & PUT /orders/:id — update order status
// -------------------------------------------------------------
const updateAdminOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const parsed = updateOrderStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid status",
      });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const { status, note } = parsed.data;

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            note: note || `Status changed to ${orderStatusLabel(status)} by admin`,
            changedBy: user.email,
          },
        },
      },
      include: { items: true, statusHistory: true },
    });

    const serialized = serializeOrder(order);

    if (existing.status !== status && serialized.customerEmail) {
      sendOrderStatusUpdateEmail(serialized).catch((err) =>
        console.error("Order status update email failed:", err)
      );
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to "${orderStatusLabel(status)}"`,
      data: serialized,
    });
  } catch (error) {
    console.error("PATCH /api/admin/orders/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

adminRouter.patch("/orders/:id", updateAdminOrder);
adminRouter.put("/orders/:id", updateAdminOrder);

// -------------------------------------------------------------
// Homepage banners (image-only hero slides)
// -------------------------------------------------------------

// Absolute URL for an uploaded file, so the storefront (a different origin) can load it.
function publicUrl(req: AuthenticatedRequest, pathname: string): string {
  const base = process.env.PUBLIC_API_URL?.replace(/\/+$/, "") || `${req.protocol}://${req.get("host")}`;
  return `${base}${pathname}`;
}

// GET /banners — current banner list
adminRouter.get("/banners", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    return res.status(200).json({ success: true, data: await getBanners() });
  } catch (error) {
    console.error("GET /api/admin/banners error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch banners" });
  }
});

// PUT /banners — replace the whole list (array order = display order)
adminRouter.put("/banners", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = bannersSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid banners",
      });
    }
    await saveBanners(parsed.data.banners);
    return res.status(200).json({ success: true, message: "Banners updated", data: await getBanners() });
  } catch (error) {
    console.error("PUT /api/admin/banners error:", error);
    return res.status(500).json({ success: false, message: "Failed to update banners" });
  }
});

// POST /banners/upload — { image: base64 or data URL } → { url }
adminRouter.post("/banners/upload", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = bannerUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid image",
    });
  }
  try {
    const pathname = await saveBannerImage(parsed.data.image);
    return res.status(201).json({ success: true, data: { url: publicUrl(req, pathname) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload image";
    return res.status(400).json({ success: false, message });
  }
});
