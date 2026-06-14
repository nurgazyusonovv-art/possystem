-- ============================================================
-- QR Menu / Cafe POS — Supabase schema
-- Postgres + Realtime. Run in Supabase SQL editor.
-- ============================================================

-- ---------- Категориялар ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Продукттар (меню) ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  is_available boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Столдор (QR токени менен) ----------
create table if not exists cafe_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null,                       -- "Стол 1"
  token text unique not null default encode(gen_random_bytes(8), 'hex'),
  seats int not null default 4,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Кызматкерлер (auth.users менен байланышкан) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'waiter',       -- admin | cashier | waiter | kitchen
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Кызматкерлер (PIN менен кирүү) ----------
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'waiter',       -- admin | cashier | waiter | kitchen
  pin text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Буйрутмалар ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,  -- адамга ыңгайлуу номер
  table_id uuid references cafe_tables(id) on delete set null,
  type text not null default 'dine_in',        -- dine_in | takeaway
  source text not null default 'pos',          -- qr | pos
  status text not null default 'pending',      -- pending | cooking | ready | served | paid | cancelled
  customer_note text,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Буйрутманын позициялары ----------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,
  price numeric(10,2) not null,
  qty int not null default 1,
  status text not null default 'pending',      -- pending | cooking | ready | served
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Төлөмдөр ----------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  method text not null default 'cash',         -- cash | card | qr
  amount numeric(10,2) not null,
  received numeric(10,2),
  change numeric(10,2),
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_items_order on order_items(order_id);

-- ============================================================
-- Буйрутманын суммасын автоматтык эсептөө
-- ============================================================
create or replace function recalc_order_totals() returns trigger as $$
declare
  oid uuid := coalesce(new.order_id, old.order_id);
  sub numeric(10,2);
begin
  select coalesce(sum(price * qty), 0) into sub from order_items where order_id = oid;
  update orders
    set subtotal = sub,
        total = greatest(sub - discount, 0),
        updated_at = now()
  where id = oid;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_recalc_totals on order_items;
create trigger trg_recalc_totals
  after insert or update or delete on order_items
  for each row execute function recalc_order_totals();

-- ============================================================
-- Realtime: бул столдорду каналга кошобуз
-- ============================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table payments;

-- ============================================================
-- RLS (баштапкы: жөнөкөй. Продакшнда катаалдатуу керек)
-- ============================================================
alter table categories enable row level security;
alter table products enable row level security;
alter table cafe_tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table profiles enable row level security;
alter table staff enable row level security;

-- Меню баарына окууга ачык (QR кардарлар үчүн)
create policy "menu_public_read" on products for select using (true);
create policy "categories_public_read" on categories for select using (true);
create policy "tables_public_read" on cafe_tables for select using (true);

-- Буйрутмаларды баары түзө/окуй алат (демо үчүн; кийин роль боюнча чектейбиз)
create policy "orders_all" on orders for all using (true) with check (true);
create policy "order_items_all" on order_items for all using (true) with check (true);
create policy "payments_all" on payments for all using (true) with check (true);
create policy "categories_write" on categories for all using (true) with check (true);
create policy "products_write" on products for all using (true) with check (true);
create policy "tables_write" on cafe_tables for all using (true) with check (true);
create policy "profiles_read" on profiles for select using (true);
create policy "staff_all" on staff for all using (true) with check (true);
