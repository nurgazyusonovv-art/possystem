import { supabase } from "../supabase/client";
import type {
  Category,
  Product,
  Order,
  CafeTable,
  CartLine,
  Staff,
  Payment,
  CafeSettings,
} from "../types";
import type { OrderStatus, ItemStatus, Role } from "../constants";
import { DEFAULT_SETTINGS } from "../settings";

// ---------------- Меню ----------------
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase()
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort");
  if (error) throw error;
  return data ?? [];
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .order("sort");
  if (error) throw error;
  return data ?? [];
}

// ---------------- Чек жөндөөлөрү ----------------
export async function getSettings(): Promise<CafeSettings> {
  const { data, error } = await supabase()
    .from("cafe_settings")
    .select("name, address, phone, footer, receipt_width, pay_qr_url, pay_info")
    .eq("id", 1)
    .maybeSingle();
  // Таблица/тилке әли түзүлө элек болсо — демейкини кайтарабыз (колдонмо бузулбайт)
  if (error) {
    if (
      error.code === "42P01" || // таблица жок
      error.code === "42703" || // тилке жок
      error.code === "PGRST205" ||
      error.code === "PGRST204"
    ) {
      return DEFAULT_SETTINGS;
    }
    throw error;
  }
  return data ?? DEFAULT_SETTINGS;
}

export async function updateSettings(
  patch: Partial<CafeSettings>,
): Promise<void> {
  const { error } = await supabase()
    .from("cafe_settings")
    .update(patch)
    .eq("id", 1);
  if (error) throw error;
}

// ---------------- Сүрөт жүктөө (Storage) ----------------
import { fileToDataUrl } from "../image";

export async function uploadImage(file: File): Promise<string> {
  // Кичирейтип, кысып (jpeg) Storage'ка жүктөйбүз → CDN URL кайтабыз
  const dataUrl = await fileToDataUrl(file);
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${crypto.randomUUID()}.jpg`;
  const sb = supabase();
  const { error } = await sb.storage
    .from("product-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

// ---------------- Меню башкаруу (админ) ----------------
export async function addCategory(name: string, sort = 0): Promise<Category> {
  const { data, error } = await supabase()
    .from("categories")
    .insert({ name, sort })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase().from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function addProduct(input: {
  name: string;
  price: number;
  category_id: string | null;
  description?: string;
  image_url?: string;
}): Promise<Product> {
  const { data, error } = await supabase()
    .from("products")
    .insert({
      name: input.name,
      price: input.price,
      category_id: input.category_id,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  const { error } = await supabase().from("products").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase().from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function addTable(label: string, seats = 4): Promise<CafeTable> {
  const { data, error } = await supabase()
    .from("cafe_tables")
    .insert({ label, seats })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTable(id: string) {
  const { error } = await supabase().from("cafe_tables").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Столдор ----------------
export async function getTables(): Promise<CafeTable[]> {
  const { data, error } = await supabase()
    .from("cafe_tables")
    .select("*")
    .order("label");
  if (error) throw error;
  return data ?? [];
}

export async function getTableByToken(token: string): Promise<CafeTable | null> {
  const { data, error } = await supabase()
    .from("cafe_tables")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------- Кызматкерлер (Supabase Auth) ----------------
// Роль булагы — profiles таблицасы
export async function getStaff(): Promise<Staff[]> {
  const { data, error } = await supabase()
    .from("profiles")
    .select("id, name, role, is_active, created_at")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

// Кызматкер кошуу — RPC auth.users + profiles түзөт
export async function addStaff(input: {
  name: string;
  role: Role;
  pin: string;
}): Promise<Staff> {
  const { data, error } = await supabase().rpc("staff_create", {
    p_pin: input.pin,
    p_name: input.name,
    p_role: input.role,
  });
  if (error) {
    if (error.code === "23505" || /колдонулган/.test(error.message)) {
      throw new Error("Бул PIN мурунтан колдонулган");
    }
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    is_active: true,
    created_at: "",
  };
}

export async function deleteStaff(id: string) {
  const { error } = await supabase().rpc("staff_delete", { p_id: id });
  if (error) throw error;
}

// PIN менен кирүү — чыныгы Supabase Auth (email/password)
export async function loginWithPin(pin: string): Promise<Staff | null> {
  const sb = supabase();
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: `${pin}@staff.local`,
    password: `pin_${pin}`,
  });
  if (authErr || !auth.user) return null;

  const { data: profile, error: pErr } = await sb
    .from("profiles")
    .select("id, name, role")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (pErr || !profile) {
    await sb.auth.signOut();
    return null;
  }
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    is_active: true,
    created_at: "",
  };
}

// Чыгуу — Auth сессиясын жабат
export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}

// ---------------- Буйрутмалар ----------------
const ORDER_SELECT = "*, items:order_items(*), table:cafe_tables(*)";

export async function getOrders(opts?: {
  statuses?: OrderStatus[];
  all?: boolean;
  since?: string;
  limit?: number;
}): Promise<Order[]> {
  let q = supabase()
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });
  if (!opts?.all) {
    q = q.in(
      "status",
      opts?.statuses ?? ["pending", "cooking", "ready", "served"],
    );
  }
  if (opts?.since) q = q.gte("created_at", opts.since);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((o) => ({
    ...o,
    items: (o.items ?? []).sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        a.created_at.localeCompare(b.created_at),
    ),
  })) as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export interface CreateOrderInput {
  tableId?: string | null;
  type?: "dine_in" | "takeaway";
  source?: "qr" | "pos";
  customerNote?: string;
  createdBy?: string | null;
  lines: CartLine[];
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const sb = supabase();
  const { data: order, error } = await sb
    .from("orders")
    .insert({
      table_id: input.tableId ?? null,
      type: input.type ?? "dine_in",
      source: input.source ?? "pos",
      customer_note: input.customerNote ?? null,
      created_by: input.createdBy ?? null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;

  const items = input.lines.map((l) => ({
    order_id: order.id,
    product_id: l.product.id,
    name: l.product.name,
    price: l.product.price,
    qty: l.qty,
    note: l.note ?? null,
  }));
  const { error: itemsErr } = await sb.from("order_items").insert(items);
  if (itemsErr) throw itemsErr;

  return order as Order;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { error } = await supabase()
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateItemStatus(id: string, status: ItemStatus) {
  const { error } = await supabase()
    .from("order_items")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function setOrderDiscount(id: string, discount: number) {
  const { error } = await supabase()
    .from("orders")
    .update({ discount })
    .eq("id", id);
  if (error) throw error;
}

// ---------------- Төлөм ----------------
export async function payOrder(params: {
  orderId: string;
  method: "cash" | "card" | "qr";
  amount: number;
  received?: number;
  createdBy?: string | null;
}) {
  const sb = supabase();
  const change =
    params.received != null
      ? Math.max(params.received - params.amount, 0)
      : null;
  const { error: payErr } = await sb.from("payments").insert({
    order_id: params.orderId,
    method: params.method,
    amount: params.amount,
    received: params.received ?? null,
    change,
    created_by: params.createdBy ?? null,
  });
  if (payErr) {
    // 23505 = unique бузулуу → заказ мурунтан төлөнгөн
    if (payErr.code === "23505") {
      throw new Error("Бул заказ мурунтан төлөнгөн");
    }
    throw payErr;
  }
  // Төлөм статусту өзгөртпөйт — "төлөндү" белгиси payment жазуусу боюнча.
  return { change };
}

export async function getPayments(opts?: {
  since?: string;
}): Promise<Payment[]> {
  let q = supabase()
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.since) q = q.gte("created_at", opts.since);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ---------------- Realtime ----------------
export function subscribeOrders(onChange: () => void): () => void {
  const channel = supabase()
    .channel("orders-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "order_items" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "payments" },
      onChange,
    )
    .subscribe();
  return () => {
    supabase().removeChannel(channel);
  };
}
