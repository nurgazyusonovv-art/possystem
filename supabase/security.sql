-- ============================================================
-- ПРОДАКШН КООПСУЗДУГУ — schema.sql + seed.sql'ден КИЙИН иштетиңиз
-- Бул файл идемпотенттүү: кайра иштетсе болот.
-- ============================================================

-- ------------------------------------------------------------
-- 1) PIN коддорун жашыруу
-- staff таблицасын анон окуудан жабабыз. Кирүү атайын RPC аркылуу.
-- ------------------------------------------------------------

-- Логин функциясы: PIN'ди серверде текшерет, PIN'ди эч качан кайтарбайт
create or replace function public.staff_login(p_pin text)
returns table (id uuid, name text, role text)
language sql
security definer
set search_path = public
as $$
  select s.id, s.name, s.role
  from staff s
  where s.pin = p_pin and s.is_active = true
  limit 1;
$$;

revoke all on function public.staff_login(text) from public;
grant execute on function public.staff_login(text) to anon, authenticated;

-- Кызматкерлердин тизмеси (PIN'сиз) — админ панели үчүн
-- View ээси (postgres) менен иштейт → staff RLS'ти айланып, бирок pin'ди көрсөтпөйт
drop view if exists public.staff_public;
create view public.staff_public as
  select id, name, role, is_active, created_at from staff;
grant select on public.staff_public to anon, authenticated;

-- staff таблицасынын ачык SELECT саясатын алып салабыз (PIN корголот)
drop policy if exists "staff_all" on staff;
-- Кошуу/өчүрүү азырынча ачык (Auth кошулганда админге чектелет — төмөн кара)
drop policy if exists "staff_insert" on staff;
drop policy if exists "staff_delete" on staff;
drop policy if exists "staff_update" on staff;
create policy "staff_insert" on staff for insert with check (true);
create policy "staff_delete" on staff for delete using (true);
create policy "staff_update" on staff for update using (true) with check (true);

-- ------------------------------------------------------------
-- 2) Төлөмдөрдү өзгөртүлгүс кылуу + кош төлөмдөн коргоо
-- ------------------------------------------------------------

-- Бир заказга бир гана төлөм (кош басууну болтурбайт)
do $$ begin
  alter table payments add constraint payments_order_unique unique (order_id);
exception when duplicate_table then null; when others then null; end $$;

drop policy if exists "payments_all" on payments;
create policy "payments_read" on payments for select using (true);
create policy "payments_insert" on payments for insert with check (true);
-- update/delete жок → төлөм жазуусу өзгөртүлбөйт/өчүрүлбөйт

-- ------------------------------------------------------------
-- 3) Заказдарды өчүрүүгө тыюу (тарых сакталат)
-- ------------------------------------------------------------
drop policy if exists "orders_all" on orders;
create policy "orders_read" on orders for select using (true);
create policy "orders_insert" on orders for insert with check (true);
create policy "orders_update" on orders for update using (true) with check (true);
-- delete жок

drop policy if exists "order_items_all" on order_items;
create policy "order_items_read" on order_items for select using (true);
create policy "order_items_insert" on order_items for insert with check (true);
create policy "order_items_update" on order_items for update using (true) with check (true);
-- delete жок

-- ------------------------------------------------------------
-- 4) Өндүрүмдүүлүк индекстери (отчёт/тарых ылдамдашат)
-- ------------------------------------------------------------
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_orders_created_by on orders (created_by);
create index if not exists idx_payments_order on payments (order_id);
create index if not exists idx_payments_created_at on payments (created_at desc);
create index if not exists idx_payments_created_by on payments (created_by);

-- ------------------------------------------------------------
-- 5) Сүрөттөр үчүн Storage bucket (base64'тен CDN'ге)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_read" on storage.objects;
create policy "product_images_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_write" on storage.objects;
create policy "product_images_write" on storage.objects
  for insert with check (bucket_id = 'product-images');

drop policy if exists "product_images_delete" on storage.objects;
create policy "product_images_delete" on storage.objects
  for delete using (bucket_id = 'product-images');

-- ============================================================
-- КИЙИНКИ КАДАМ — ТОЛУК РОЛЬ КООПСУЗДУГУ (Supabase Auth керек)
-- ============================================================
-- Азыр бардык жазуу анон ачкыч менен ачык (бир кафе үчүн кабыл алса болот,
-- бирок интернетке ачык болсо роль чектөө керек). Толук RBAC үчүн:
--
-- 1. Supabase Auth күйгүзүп, ар кызматкерди auth user кылуу
-- 2. profiles таблицасына role коюу (auth.users.id менен байланышкан)
-- 3. Саясаттарды auth.uid()/role боюнча жазуу, мисалы:
--
--   create policy "admin_writes_menu" on products for all
--     using ( (select role from profiles where id = auth.uid()) = 'admin' );
--
--   create policy "staff_creates_orders" on orders for insert
--     with check ( auth.uid() is not null );
--
-- Ушундан кийин анон ачкыч менен жазуу мүмкүн болбойт.
