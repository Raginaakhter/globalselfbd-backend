import type { Order, OrderItem, OrderStatusHistory } from "@prisma/client";
import { prisma } from "./prisma";

export function newOrderId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GS-${stamp}${rand}`;
}

type OrderWithRelations = Order & {
  items: OrderItem[];
  statusHistory?: OrderStatusHistory[];
};

/** The single shape every order-related API route returns to the frontend. */
export function serializeOrder(order: OrderWithRelations) {
  return {
    id: order.id,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    address: order.address,
    area: order.area,
    zone: order.zone,
    note: order.note,
    payment: order.payment,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.productId,
      name: it.name,
      emoji: it.emoji,
      size: it.size,
      price: it.price,
      qty: it.qty,
      lineTotal: it.lineTotal,
    })),
    statusHistory: (order.statusHistory ?? [])
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((h) => ({
        status: h.status,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
  };
}

export type SerializedOrder = ReturnType<typeof serializeOrder>;

/** Lightweight summary shape for order list views (My Orders, admin order list). */
export function serializeOrderSummary(order: OrderWithRelations) {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    itemCount: order.items.reduce((n, it) => n + it.qty, 0),
    firstItemName: order.items[0]?.name ?? "",
    firstItemEmoji: order.items[0]?.emoji ?? "📦",
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    createdAt: order.createdAt.toISOString(),
  };
}

/**
 * Associates any previously-placed guest orders with a user account once we know that account's
 * verified email address (called right after login/register/Google sign-in).
 */
export async function linkGuestOrdersToUser(userId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const guestOrders = await prisma.order.findMany({
    where: { userId: null, customerEmail: { not: "" } },
    select: { id: true, customerEmail: true },
  });
  const matchIds = guestOrders
    .filter((o) => o.customerEmail.trim().toLowerCase() === normalizedEmail)
    .map((o) => o.id);
  if (matchIds.length > 0) {
    await prisma.order.updateMany({ where: { id: { in: matchIds } }, data: { userId } });
  }
}
