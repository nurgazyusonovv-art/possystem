// Кафенин аты (чекте жана жалпы колдонулат)
export const CAFE_NAME = "Менин Кафе";

// Буйрутманын статустары жана роль аныктамалары

export type OrderStatus =
  | "pending"
  | "cooking"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export type ItemStatus = "pending" | "cooking" | "ready" | "served";

export type Role = "admin" | "cashier" | "waiter" | "kitchen";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Жаңы",
  cooking: "Даярдоодо",
  ready: "Даяр",
  served: "Берилди",
  paid: "Төлөндү",
  cancelled: "Жокко чыгарылды",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  cooking: "bg-primary/15 text-primary border-primary/30",
  ready: "bg-success/15 text-success border-success/30",
  served: "bg-muted text-muted-foreground border-border",
  paid: "bg-success/20 text-success border-success/40",
  cancelled: "bg-danger/15 text-danger border-danger/30",
};

// Кухня агымы: жаңы → даярдоодо → даяр
export const KITCHEN_FLOW: OrderStatus[] = ["pending", "cooking", "ready"];

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Накта",
  card: "Карта",
  qr: "QR / Перевод",
  online: "Онлайн",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Админ",
  cashier: "Кассир",
  waiter: "Официант",
  kitchen: "Ашкана",
};

// Кирген кызматкер ролу боюнча алгачкы бет
export const ROLE_DEFAULT_ROUTE: Record<Role, string> = {
  admin: "/admin",
  cashier: "/pos",
  waiter: "/waiter",
  kitchen: "/kitchen",
};
