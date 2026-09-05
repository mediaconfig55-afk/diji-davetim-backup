-- =========================================================================
-- Dijital Davetiye — Supabase şema kurulumu
-- Supabase Dashboard > SQL Editor içine yapıştırıp çalıştır.
-- Yeni bir etkinlik (yeni Supabase projesi) kurarken bu dosyayı olduğu
-- gibi yeniden çalıştırman yeterli.
-- =========================================================================

-- RSVP (katılım bildirimi) tablosu
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  status text not null check (status in ('attending', 'not_attending', 'undecided')),
  guest_count int not null default 1 check (guest_count between 1 and 20),
  note text,
  created_at timestamptz not null default now()
);

alter table public.rsvps enable row level security;

drop policy if exists "rsvps_insert_public" on public.rsvps;
create policy "rsvps_insert_public"
  on public.rsvps for insert
  to public
  with check (true);
-- Not: RSVP listesi mahremdir, anon select policy YOK.
-- Admin paneli service_role anahtarıyla okur (RLS'i bypass eder).

-- Anı defteri tablosu (herkese açık gösterim)
create table if not exists public.guestbook (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.guestbook enable row level security;

drop policy if exists "guestbook_insert_public" on public.guestbook;
create policy "guestbook_insert_public"
  on public.guestbook for insert
  to public
  with check (true);

drop policy if exists "guestbook_select_public" on public.guestbook;
create policy "guestbook_select_public"
  on public.guestbook for select
  to public
  using (true);

-- Fotoğraf havuzu metadata tablosu
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  uploader_name text,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

drop policy if exists "photos_insert_public" on public.photos;
create policy "photos_insert_public"
  on public.photos for insert
  to public
  with check (true);
-- Not: Düğün bitene kadar hiç kimse fotoğraf listesini görmesin diye
-- anon select policy YOK. Galeri sayfası service_role ile server tarafında
-- reveal kontrolü yapıp öyle döner (bkz. src/app/api/photos/route.ts).

-- Etkinlik ayarları (manuel "fotoğrafları aç" anahtarı) — tek satır
create table if not exists public.event_settings (
  id int primary key default 1,
  manual_reveal_override boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.event_settings (id, manual_reveal_override)
values (1, false)
on conflict (id) do nothing;

alter table public.event_settings enable row level security;
-- Anon için hiçbir policy yok: sadece admin (service_role) okuyup yazabilir.

-- Etkinlik temel bilgileri (gelin/damat, aile, tarih, mekan, program vb.)
-- Admin panelden düzenlenebilir; frontend bunu config.ts defaults yerine kullanır.
create table if not exists public.event_config (
  id int primary key default 1,
  event_type text not null default 'wedding' check (event_type in ('wedding', 'kina', 'sunnet')),
  bride_name text,
  groom_name text,
  bride_father text,
  bride_mother text,
  groom_father text,
  groom_mother text,
  event_date timestamptz,
  event_end_at timestamptz,
  venue_name text,
  venue_address text,
  venue_map_url text,
  welcome_title text,
  welcome_message text,
  program jsonb, -- [{time, title, description}, ...]
  ibans jsonb, -- [{label, bankName, iban}, ...]
  theme_primary text,
  theme_primary_dark text,
  theme_background text,
  theme_surface text,
  theme_text_light text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.event_config (id)
values (1)
on conflict (id) do nothing;

alter table public.event_config enable row level security;
-- Anon için hiçbir policy yok: sadece admin (service_role) okuyup yazabilir.

-- ---------------------------------------------------------------------
-- Storage: fotoğraf yükleme bucket'ı
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('wedding-photos', 'wedding-photos', true)
on conflict (id) do nothing;

drop policy if exists "wedding_photos_insert_public" on storage.objects;
create policy "wedding_photos_insert_public"
  on storage.objects for insert
  to public
  with check (bucket_id = 'wedding-photos');
