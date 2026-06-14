// Локалдык демо провайдер: localStorage + BroadcastChannel (Supabase'сиз).
// Бардык функциялар supabaseApi.ts менен бирдей сигнатурада.

import type {
  Category,
  Product,
  Order,
  OrderItem,
  CafeTable,
  Payment,
  Staff,
} from "../types";
import type { OrderStatus, ItemStatus, Role } from "../constants";
import type { CreateOrderInput } from "./supabaseApi";
import { fileToDataUrl } from "../image";

// Демо режимде сүрөт base64 data URL болуп сакталат
export async function uploadImage(file: File): Promise<string> {
  return fileToDataUrl(file);
}

const KEY = "qrmenu_db_v1";
const CHANGE_EVENT = "qrmenu:change";

interface DB {
  categories: Category[];
  products: Product[];
  tables: CafeTable[];
  orders: Order[];
  payments: Payment[];
  staff: Staff[];
  seq: number;
}

const now = () => new Date().toISOString();
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// ---------------- Баштапкы демо маалымат ----------------
function seed(): DB {
  const cat = (name: string, sort: number): Category => ({
    id: uid(),
    name,
    sort,
    is_active: true,
    created_at: now(),
  });
  const cIssyk = cat("Ысык тамактар", 1);
  const cSalat = cat("Салаттар", 2);
  const cDrink = cat("Ичимдиктер", 3);
  const cDesert = cat("Десерттер", 4);

  const prod = (
    name: string,
    price: number,
    description: string,
    category_id: string,
    sort: number,
  ): Product => ({
    id: uid(),
    category_id,
    name,
    description,
    price,
    image_url: null,
    is_available: true,
    sort,
    created_at: now(),
  });

  const table = (label: string, seats: number): CafeTable => ({
    id: uid(),
    label,
    token: uid().slice(0, 12),
    seats,
    is_active: true,
    created_at: now(),
  });

  return {
    categories: [cIssyk, cSalat, cDrink, cDesert],
    products: [
      prod("Бешбармак", 350, "Кол менен жасалган камыр, эт", cIssyk.id, 1),
      prod("Лагман", 280, "Кууруулган лагман", cIssyk.id, 2),
      prod("Манты (5 даана)", 250, "Эт мантысы", cIssyk.id, 3),
      prod("Плов", 260, "Өзбек плову", cIssyk.id, 4),
      prod("Цезарь салаты", 240, "Тоок эти менен", cSalat.id, 1),
      prod("Ачучук", 120, "Помидор, пияз", cSalat.id, 2),
      prod("Кара чай", 50, "Чайник", cDrink.id, 1),
      prod("Кофе", 120, "Американо", cDrink.id, 2),
      prod("Компот", 80, "Үй компоту", cDrink.id, 3),
      prod("Чизкейк", 180, "Нью-Йорк чизкейк", cDesert.id, 1),
    ],
    tables: [table("Стол 1", 4), table("Стол 2", 4), table("Стол 3", 2), table("ВИП", 8)],
    orders: [],
    payments: [],
    staff: [
      { id: uid(), name: "Админ", role: "admin", pin: "1111", is_active: true, created_at: now() },
      { id: uid(), name: "Кассир", role: "cashier", pin: "2222", is_active: true, created_at: now() },
      { id: uid(), name: "Ашкана", role: "kitchen", pin: "3333", is_active: true, created_at: now() },
      { id: uid(), name: "Официант", role: "waiter", pin: "4444", is_active: true, created_at: now() },
    ],
    seq: 1,
  };
}

function load(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const db = JSON.parse(raw) as Partial<DB>;
    // Эски маалыматта жетишпеген талааларды толуктайбыз (миграция)
    const base = seed();
    return {
      categories: db.categories ?? base.categories,
      products: db.products ?? base.products,
      tables: db.tables ?? base.tables,
      orders: db.orders ?? [],
      payments: db.payments ?? [],
      staff: db.staff && db.staff.length ? db.staff : base.staff,
      seq: db.seq ?? 1,
    };
  } catch {
    return seed();
  }
}

let _bc: BroadcastChannel | null = null;
function bc(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!_bc && "BroadcastChannel" in window) _bc = new BroadcastChannel("qrmenu");
  return _bc;
}

function save(db: DB) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new Event(CHANGE_EVENT)); // ушул таб
  bc()?.postMessage("changed"); // башка табтар
}

function recalc(o: Order) {
  o.subtotal = (o.items ?? []).reduce((s, it) => s + it.price * it.qty, 0);
  o.total = Math.max(o.subtotal - (o.discount ?? 0), 0);
  o.updated_at = now();
}

// ---------------- Меню ----------------
export async function getCategories(): Promise<Category[]> {
  return load()
    .categories.filter((c) => c.is_active)
    .sort((a, b) => a.sort - b.sort);
}

export async function getProducts(): Promise<Product[]> {
  return load().products.slice().sort((a, b) => a.sort - b.sort);
}

export async function addCategory(name: string, sort = 0): Promise<Category> {
  const db = load();
  const c: Category = { id: uid(), name, sort, is_active: true, created_at: now() };
  db.categories.push(c);
  save(db);
  return c;
}

export async function deleteCategory(id: string) {
  const db = load();
  db.categories = db.categories.filter((c) => c.id !== id);
  save(db);
}

export async function addProduct(input: {
  name: string;
  price: number;
  category_id: string | null;
  description?: string;
  image_url?: string;
}): Promise<Product> {
  const db = load();
  const p: Product = {
    id: uid(),
    category_id: input.category_id,
    name: input.name,
    price: input.price,
    description: input.description ?? null,
    image_url: input.image_url ?? null,
    is_available: true,
    sort: db.products.length,
    created_at: now(),
  };
  db.products.push(p);
  save(db);
  return p;
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  const db = load();
  const p = db.products.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
  save(db);
}

export async function deleteProduct(id: string) {
  const db = load();
  db.products = db.products.filter((p) => p.id !== id);
  save(db);
}

export async function addTable(label: string, seats = 4): Promise<CafeTable> {
  const db = load();
  const t: CafeTable = {
    id: uid(),
    label,
    token: uid().slice(0, 12),
    seats,
    is_active: true,
    created_at: now(),
  };
  db.tables.push(t);
  save(db);
  return t;
}

export async function deleteTable(id: string) {
  const db = load();
  db.tables = db.tables.filter((t) => t.id !== id);
  save(db);
}

// ---------------- Столдор ----------------
export async function getTables(): Promise<CafeTable[]> {
  return load().tables.slice().sort((a, b) => a.label.localeCompare(b.label));
}

export async function getTableByToken(token: string): Promise<CafeTable | null> {
  return load().tables.find((t) => t.token === token) ?? null;
}

// ---------------- Кызматкерлер ----------------
export async function getStaff(): Promise<Staff[]> {
  return load().staff.slice();
}

export async function addStaff(input: {
  name: string;
  role: Role;
  pin: string;
}): Promise<Staff> {
  const db = load();
  const s: Staff = {
    id: uid(),
    name: input.name,
    role: input.role,
    pin: input.pin,
    is_active: true,
    created_at: now(),
  };
  db.staff.push(s);
  save(db);
  return s;
}

export async function deleteStaff(id: string) {
  const db = load();
  db.staff = db.staff.filter((s) => s.id !== id);
  save(db);
}

export async function loginWithPin(pin: string): Promise<Staff | null> {
  return load().staff.find((s) => s.pin === pin && s.is_active) ?? null;
}

// Демо режимде Auth жок — эч нерсе кылбайт
export async function signOut(): Promise<void> {}

// ---------------- Буйрутмалар ----------------
function hydrate(db: DB, o: Order): Order {
  return {
    ...o,
    table: o.table_id ? db.tables.find((t) => t.id === o.table_id) ?? null : null,
    items: (o.items ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

export async function getOrders(opts?: {
  statuses?: OrderStatus[];
  all?: boolean;
  since?: string;
  limit?: number;
}): Promise<Order[]> {
  const db = load();
  let list = db.orders.slice();
  if (!opts?.all) {
    const allowed = opts?.statuses ?? ["pending", "cooking", "ready", "served"];
    list = list.filter((o) => allowed.includes(o.status));
  }
  if (opts?.since) list = list.filter((o) => o.created_at >= opts.since!);
  list = list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (opts?.limit) list = list.slice(0, opts.limit);
  return list.map((o) => hydrate(db, o));
}

export async function getOrder(id: string): Promise<Order | null> {
  const db = load();
  const o = db.orders.find((x) => x.id === id);
  return o ? hydrate(db, o) : null;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const db = load();
  const oid = uid();
  const items: OrderItem[] = input.lines.map((l) => ({
    id: uid(),
    order_id: oid,
    product_id: l.product.id,
    name: l.product.name,
    price: l.product.price,
    qty: l.qty,
    status: "pending",
    note: l.note ?? null,
    created_at: now(),
  }));
  const order: Order = {
    id: oid,
    number: db.seq++,
    table_id: input.tableId ?? null,
    type: input.type ?? "dine_in",
    source: input.source ?? "pos",
    status: "pending",
    customer_note: input.customerNote ?? null,
    subtotal: 0,
    discount: 0,
    total: 0,
    created_by: input.createdBy ?? null,
    created_at: now(),
    updated_at: now(),
    items,
  };
  recalc(order);
  db.orders.push(order);
  save(db);
  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const db = load();
  const o = db.orders.find((x) => x.id === id);
  if (o) {
    o.status = status;
    o.updated_at = now();
  }
  save(db);
}

export async function updateItemStatus(id: string, status: ItemStatus) {
  const db = load();
  for (const o of db.orders) {
    const it = o.items?.find((x) => x.id === id);
    if (it) {
      it.status = status;
      break;
    }
  }
  save(db);
}

export async function setOrderDiscount(id: string, discount: number) {
  const db = load();
  const o = db.orders.find((x) => x.id === id);
  if (o) {
    o.discount = discount;
    recalc(o);
  }
  save(db);
}

// ---------------- Төлөм ----------------
export async function payOrder(params: {
  orderId: string;
  method: "cash" | "card" | "qr";
  amount: number;
  received?: number;
  createdBy?: string | null;
}) {
  const db = load();
  // Кош төлөмдөн коргоо
  if (db.payments.some((p) => p.order_id === params.orderId)) {
    throw new Error("Бул заказ мурунтан төлөнгөн");
  }
  const change =
    params.received != null ? Math.max(params.received - params.amount, 0) : null;
  db.payments.push({
    id: uid(),
    order_id: params.orderId,
    method: params.method,
    amount: params.amount,
    received: params.received ?? null,
    change,
    created_by: params.createdBy ?? null,
    created_at: now(),
  });
  // Эскертүү: төлөм статусту өзгөртпөйт. "Төлөндү" белгиси payment жазуусу
  // боюнча аныкталат, статус болсо жеткирүү баскычын билдирет.
  const o = db.orders.find((x) => x.id === params.orderId);
  if (o) o.updated_at = now();
  save(db);
  return { change };
}

export async function getPayments(opts?: {
  since?: string;
}): Promise<Payment[]> {
  let list = load().payments.slice();
  if (opts?.since) list = list.filter((p) => p.created_at >= opts.since!);
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------------- Realtime (табтар аралык) ----------------
export function subscribeOrders(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(CHANGE_EVENT, handler); // ушул таб
  const channel = bc();
  if (channel) channel.addEventListener("message", handler); // башка табтар
  window.addEventListener("storage", handler); // fallback
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    if (channel) channel.removeEventListener("message", handler);
    window.removeEventListener("storage", handler);
  };
}
