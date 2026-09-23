export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending: "We've received your order and it's waiting to be confirmed.",
  confirmed: "Your order has been confirmed and is being prepared.",
  processing: "Your order is being packed for shipment.",
  out_for_delivery: "Your order is on its way to you.",
  delivered: "Your order has been delivered. Enjoy!",
  cancelled: "This order has been cancelled.",
};

export function isValidOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function orderStatusLabel(status: string): string {
  return isValidOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status;
}

export function orderStatusFlowIndex(status: string): number {
  return ORDER_STATUS_FLOW.indexOf(status as OrderStatus);
}
