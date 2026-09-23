import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getSiteSettings } from "../lib/site";
import { newOrderId, serializeOrder, serializeOrderSummary } from "../lib/orders";
import { sendOrderConfirmationEmail } from "../lib/email";
import { authenticate, optionalAuth, AuthenticatedRequest } from "../middleware/auth.middleware";
import { checkRateLimit } from "../lib/rate-limiter";
import { trackOrderSchema } from "../lib/validation";

export const orderRouter = Router();

const MAX_QTY = 10;
const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OrderInput = {
  items: { id: string; qty: number }[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    area: string;
    zone: "dhaka" | "outside";
    note?: string;
  };
  payment?: "cod";
  userId?: string;
};

// -------------------------------------------------------------
// POST /track — guest order tracking
// -------------------------------------------------------------
orderRouter.post("/track", async (req: Request, res: Response) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const rateCheck = checkRateLimit(`track-order:${ip}`, 15, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many attempts. Please try again in ${rateCheck.resetInSeconds} seconds.`,
      });
    }

    const parsed = trackOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Please enter a valid Order ID and email.",
      });
    }

    const { orderId, email } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId.trim().toUpperCase() },
      include: { items: true, statusHistory: true },
    });

    const NOT_FOUND_MESSAGE =
      "We couldn't find an order matching that Order ID and email address. Please double-check and try again.";

    if (!order || !order.customerEmail || order.customerEmail.trim().toLowerCase() !== email) {
      return res.status(404).json({ success: false, message: NOT_FOUND_MESSAGE });
    }

    return res.status(200).json({ success: true, data: serializeOrder(order) });
  } catch (error) {
    console.error("POST /api/orders/track error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
});

// -------------------------------------------------------------
// GET / — "My Orders": list of authenticated user's own orders
// -------------------------------------------------------------
orderRouter.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({
    success: true,
    data: { orders: orders.map(serializeOrderSummary) },
  });
});

// -------------------------------------------------------------
// POST / — place a new order (guest or authenticated)
// -------------------------------------------------------------
orderRouter.post("/", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const rateCheck = checkRateLimit(`place-order:${ip}`, 20, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many orders placed. Please try again in ${rateCheck.resetInSeconds} seconds.`,
      });
    }

    const body = req.body as OrderInput;
    const { items, customer } = body;

    // Only trust userId from verified access token
    const verifiedUserId = req.user?.id || null;

    // Validate customer fields
    const errors: Record<string, string> = {};
    if (!customer?.name || customer.name.trim().length < 2) {
      errors.name = "Please enter your full name.";
    }
    if (!customer?.phone || !BD_PHONE.test(customer.phone.replace(/[\s-]/g, ""))) {
      errors.phone = "Enter a valid Bangladeshi mobile number.";
    }
    if (!customer?.email || !EMAIL_RE.test(customer.email)) {
      errors.email = "Enter a valid email address — it's used for your order confirmation and order tracking.";
    }
    if (!customer?.address || customer.address.trim().length < 8) {
      errors.address = "Please enter your full delivery address.";
    }
    if (!customer?.area || customer.area.trim().length < 2) {
      errors.area = "Please enter your area / district.";
    }
    if (!customer?.zone || !["dhaka", "outside"].includes(customer.zone)) {
      errors.zone = "Please select a delivery zone.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const cleanItems = items
      .filter((it) => it.id && typeof it.qty === "number" && it.qty > 0)
      .map((it) => ({ id: it.id, qty: Math.min(Math.max(Math.round(it.qty), 1), MAX_QTY) }));

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid items in cart",
      });
    }

    // Fetch real prices from DB
    const productIds = cleanItems.map((it) => it.id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const invalidIds = cleanItems.filter((it) => !productMap.has(it.id)).map((it) => it.id);
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Products not found: ${invalidIds.join(", ")}`,
      });
    }

    // Check stock & compute totals
    const orderItems: {
      productId: string;
      name: string;
      emoji: string;
      size: string;
      price: number;
      qty: number;
      lineTotal: number;
    }[] = [];

    for (const item of cleanItems) {
      const p = productMap.get(item.id)!;
      if (item.qty > p.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${p.stock} units of "${p.name}" available`,
        });
      }
      orderItems.push({
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        size: p.size,
        price: p.price,
        qty: item.qty,
        lineTotal: p.price * item.qty,
      });
    }

    const subtotal = orderItems.reduce((sum, it) => sum + it.lineTotal, 0);
    const {
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      shippingInsideDhaka: SHIPPING_INSIDE_DHAKA,
      shippingOutsideDhaka: SHIPPING_OUTSIDE_DHAKA,
    } = await getSiteSettings();
    const shipping =
      subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : customer.zone === "dhaka"
        ? SHIPPING_INSIDE_DHAKA
        : SHIPPING_OUTSIDE_DHAKA;
    const total = subtotal + shipping;

    const orderId = newOrderId();

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cleanItems) {
        await tx.product.update({
          where: { id: item.id },
          data: { stock: { decrement: item.qty } },
        });
      }

      return tx.order.create({
        data: {
          id: orderId,
          userId: verifiedUserId,
          customerName: customer.name.trim(),
          customerPhone: customer.phone.replace(/[\s-]/g, ""),
          customerEmail: customer.email?.trim().toLowerCase() || "",
          address: customer.address.trim(),
          area: customer.area.trim(),
          zone: customer.zone,
          note: customer.note || "",
          payment: "cod",
          subtotal,
          shipping,
          total,
          items: {
            create: orderItems,
          },
          statusHistory: {
            create: { status: "pending", note: "Order placed", changedBy: "system" },
          },
        },
        include: { items: true, statusHistory: true },
      });
    });

    const serialized = serializeOrder(order);

    if (serialized.customerEmail) {
      sendOrderConfirmationEmail(serialized).catch((err) =>
        console.error("Order confirmation email failed:", err)
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order placed successfully!",
      data: serialized,
    });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order",
    });
  }
});

// -------------------------------------------------------------
// GET /:id — fetch single order details (owner or email match)
// -------------------------------------------------------------
orderRouter.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, statusHistory: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    let authorized = false;

    // Check if user is owner or admin
    if (req.user) {
      if (req.user.role === "admin" || (order.userId && req.user.id === order.userId)) {
        authorized = true;
      }
    }

    // Check if email query param matches customerEmail
    if (!authorized) {
      const emailParam = (req.query.email as string)?.trim().toLowerCase();
      if (emailParam && order.customerEmail && order.customerEmail.trim().toLowerCase() === emailParam) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeOrder(order),
    });
  } catch (error) {
    console.error("GET /api/orders/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});
