-- ============================================================
-- AUTH RBAC — чыныгы роль боюнча коопсуздук
-- schema.sql + seed.sql + security.sql'ден КИЙИН иштетиңиз.
-- Ар кызматкер Supabase Auth колдонуучусу болот (PIN аркылуу).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 1) profiles — роль булагы (auth.users менен байланышкан)
-- ------------------------------------------------------------
alter table profiles add column if not exists name text;
-- эски full_name болсо name'ге көчүрөбүз
update profiles set name = coalesce(name, full_name) where name is null;

-- ------------------------------------------------------------
-- 2) Учурдагы колдонуучунун ролу (RLS үчүн)
--    ("current_role" — Postgres'те брондолгон, ошондуктан user_role)
-- ------------------------------------------------------------
create or replace function public.user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;
grant execute on function public.user_role() to anon, authenticated;

-- ------------------------------------------------------------
-- 3) Кызматкер түзүү/өчүрүү (auth.users + profiles)
--    SECURITY DEFINER. Ички функция (anon'го берилбейт) — чыныгы түзүү.
--    Сырткы RPC — АДМИН гана чакыра алат.
-- ------------------------------------------------------------

-- Ички (ишеничтүү) түзгүч — миграция/бутстрап үчүн, анонго берилбейт
create or replace function public.staff_create_internal(p_pin text, p_name text, p_role text)
returns table (id uuid, name text, role text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  uid uuid := gen_random_uuid();
  mail text := p_pin || '@staff.local';
begin
  if exists (select 1 from auth.users where email = mail) then
    raise exception 'Бул PIN мурунтан колдонулган';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, confirmation_token,
    recovery_token, email_change_token_new, email_change
  ) values (
    uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    mail, crypt('pin_' || p_pin, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), uid, uid::text,
    json_build_object('sub', uid::text, 'email', mail),
    'email', now(), now(), now()
  );

  insert into profiles (id, name, role, is_active)
  values (uid, p_name, p_role, true);

  return query select uid, p_name, p_role;
end;
$$;
revoke all on function public.staff_create_internal(text, text, text) from public, anon, authenticated;

-- Сырткы RPC — АДМИН гана кызматкер кошот
create or replace function public.staff_create(p_pin text, p_name text, p_role text)
returns table (id uuid, name text, role text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_role() is distinct from 'admin' then
    raise exception 'Уруксат жок: админ гана кызматкер кошо алат';
  end if;
  return query select * from public.staff_create_internal(p_pin, p_name, p_role);
end;
$$;
revoke all on function public.staff_create(text, text, text) from public, anon;
grant execute on function public.staff_create(text, text, text) to authenticated;

-- Өчүрүү — АДМИН гана
create or replace function public.staff_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.user_role() is distinct from 'admin' then
    raise exception 'Уруксат жок: админ гана';
  end if;
  delete from auth.users where id = p_id;  -- profiles cascade менен өчөт
end;
$$;
revoke all on function public.staff_delete(uuid) from public, anon;
grant execute on function public.staff_delete(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) Демо кызматкерлерди Auth колдонуучуларына көчүрүү
--    (эски staff таблицасынан PIN'дерди алып)
-- ------------------------------------------------------------
do $$
declare s record;
begin
  for s in select pin, name, role from staff loop
    begin
      perform public.staff_create_internal(s.pin, s.name, s.role);
    exception when others then
      -- мурунтан бар болсо өткөрүп жиберебиз
      null;
    end;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 5) RLS — роль боюнча кайра жазабыз
-- ------------------------------------------------------------
alter table profiles enable row level security;

-- profiles: аутентификацияланган окуй алат; жазуу RPC аркылуу гана
drop policy if exists "profiles_read" on profiles;
drop policy if exists "profiles_authenticated_read" on profiles;
create policy "profiles_authenticated_read" on profiles
  for select using (auth.uid() is not null);

-- ---- Меню (категория/продукт/стол): баары окуйт, админ гана жазат ----
do $$
declare t text;
begin
  foreach t in array array['categories','products','cafe_tables'] loop
    execute format('drop policy if exists "%1$s_public_read" on %1$s', t);
    execute format('drop policy if exists "%1$s_write" on %1$s', t);
    execute format('drop policy if exists "%1$s_read_all" on %1$s', t);
    execute format('drop policy if exists "%1$s_admin_write" on %1$s', t);
    execute format('create policy "%1$s_read_all" on %1$s for select using (true)', t);
    execute format('create policy "%1$s_admin_write" on %1$s for all using (public.user_role() = ''admin'') with check (public.user_role() = ''admin'')', t);
  end loop;
end $$;

-- ---- Заказдар: баары окуй/түзө алат (QR кардарлар), өзгөртүү кызматкерге ----
drop policy if exists "orders_read" on orders;
drop policy if exists "orders_insert" on orders;
drop policy if exists "orders_update" on orders;
create policy "orders_read" on orders for select using (true);
create policy "orders_insert" on orders for insert with check (true);
create policy "orders_update" on orders for update using (auth.uid() is not null) with check (auth.uid() is not null);
-- delete жок

drop policy if exists "order_items_read" on order_items;
drop policy if exists "order_items_insert" on order_items;
drop policy if exists "order_items_update" on order_items;
create policy "order_items_read" on order_items for select using (true);
create policy "order_items_insert" on order_items for insert with check (true);
create policy "order_items_update" on order_items for update using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---- Төлөмдөр: кызматкерлерге ГАНА (финансы корголгон) ----
drop policy if exists "payments_read" on payments;
drop policy if exists "payments_insert" on payments;
create policy "payments_read" on payments for select using (auth.uid() is not null);
create policy "payments_insert" on payments for insert with check (auth.uid() is not null);
-- update/delete жок

-- ------------------------------------------------------------
-- 6) created_by эми profiles'ке шилтейт (staff эмес)
-- Эски заказдардагы профилде жок id'лерди тазалайбыз (FK ката бербеши үчүн)
-- ------------------------------------------------------------
update orders set created_by = null
  where created_by is not null and created_by not in (select id from profiles);
update payments set created_by = null
  where created_by is not null and created_by not in (select id from profiles);

alter table orders drop constraint if exists orders_created_by_fkey;
alter table orders add constraint orders_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table payments drop constraint if exists payments_created_by_fkey;
alter table payments add constraint payments_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- ------------------------------------------------------------
-- 7) Сумма триггери SECURITY DEFINER болсун
-- (анон/QR заказы үчүн да суммасы RLS'ке карабай эсептелсин)
-- ------------------------------------------------------------
create or replace function recalc_order_totals() returns trigger
language plpgsql security definer set search_path = public
as $$
declare oid uuid := coalesce(new.order_id, old.order_id); sub numeric(10,2);
begin
  select coalesce(sum(price * qty), 0) into sub from order_items where order_id = oid;
  update orders set subtotal = sub, total = greatest(sub - discount, 0), updated_at = now()
  where id = oid;
  return null;
end; $$;

-- Бузук (0 болуп калган) заказдардын суммасын кайра эсептейбиз
update orders o set subtotal = x.s, total = greatest(x.s - o.discount, 0)
from (select order_id, coalesce(sum(price * qty), 0) s from order_items group by order_id) x
where o.id = x.order_id and o.subtotal <> x.s;

-- ============================================================
-- ДАЯР. Эми:
--  • Кызматкерлер PIN менен кирет (Supabase Auth)
--  • Финансы (төлөм) маалыматын кирген кызматкер гана көрөт
--  • Меню/кызматкер башкарууну админ гана өзгөртөт
--  • QR кардарлар меню көрүп, заказ бере алат (кирүүсүз)
-- ============================================================
