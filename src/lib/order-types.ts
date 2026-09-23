export type OrderItemData = {
  id: string;
  name: string;
  emoji: string;
  size: string;
  price: number;
  qty: number;
  lineTotal: number;
};

export type OrderStatusHistoryEntry = {
  status: string;
  note: string;
  createdAt: string;
};

export type OrderData = {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  area: string;
  zone: string;
  note: string;
  payment: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemData[];
  statusHistory: OrderStatusHistoryEntry[];
};

export type OrderSummaryData = {
  id: string;
  status: string;
  total: number;
  itemCount: number;
  firstItemName: string;
  firstItemEmoji: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
};
