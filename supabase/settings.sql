-- ============================================================
-- Чек жөндөөлөрү — кафенин аты, дареги, телефону, чек туурасы
-- auth-rbac.sql'ден КИЙИН иштетиңиз (user_role() керек).
-- ============================================================

create table if not exists cafe_settings (
  id int primary key default 1,
  name text not null default 'Менин Кафе',
  address text not null default '',
  phone text not null default '',
  footer text not null default 'Рахмат! Дагы келиңиз 🙏',
  receipt_width int not null default 80,        -- 58 же 80 мм
  pay_qr_url text not null default '',           -- онлайн төлөм QR сүрөтү
  pay_info text not null default '',             -- төлөм маалыматы/номери
  updated_at timestamptz not null default now(),
  constraint cafe_settings_single check (id = 1)  -- бир гана сап
);

-- Эгер таблица мурда түзүлгөн болсо, жетпеген тилкелерди кошобуз
alter table cafe_settings add column if not exists pay_qr_url text not null default '';
alter table cafe_settings add column if not exists pay_info text not null default '';

insert into cafe_settings (id) values (1) on conflict (id) do nothing;

alter table cafe_settings enable row level security;

-- Баары окуй алат (чекте колдонулат), админ гана жазат
drop policy if exists "settings_read" on cafe_settings;
create policy "settings_read" on cafe_settings for select using (true);

drop policy if exists "settings_admin_write" on cafe_settings;
create policy "settings_admin_write" on cafe_settings for all
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');
