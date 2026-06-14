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
  updated_at timestamptz not null default now(),
  constraint cafe_settings_single check (id = 1)  -- бир гана сап
);

insert into cafe_settings (id) values (1) on conflict (id) do nothing;

alter table cafe_settings enable row level security;

-- Баары окуй алат (чекте колдонулат), админ гана жазат
drop policy if exists "settings_read" on cafe_settings;
create policy "settings_read" on cafe_settings for select using (true);

drop policy if exists "settings_admin_write" on cafe_settings;
create policy "settings_admin_write" on cafe_settings for all
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');
