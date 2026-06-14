import type { OrderStatus, ItemStatus, Role } from "./constants";

export interface Category {
  id: string;
  name: string;
  sort: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort: number;
  created_at: string;
}

export interface CafeTable {
  id: string;
  label: string;
  token: string;
  seats: number;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  role: Role;
  pin?: string; // продакшнда тизмеде кайтарылбайт (жашырылган)
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  name: string;
  role: Role;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  qty: number;
  status: ItemStatus;
  note: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  number: number;
  table_id: string | null;
  type: "dine_in" | "takeaway";
  source: "qr" | "pos";
  status: OrderStatus;
  customer_note: string | null;
  subtotal: number;
  discount: number;
  total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // байланышкан маалымат (join)
  items?: OrderItem[];
  table?: CafeTable | null;
}

export interface Payment {
  id: string;
  order_id: string;
  method: "cash" | "card" | "qr";
  amount: number;
  received: number | null;
  change: number | null;
  created_by: string | null;
  created_at: string;
}

// Себеттин позициясы (кардар тарап, локалдык)
export interface CartLine {
  product: Product;
  qty: number;
  note?: string;
}
