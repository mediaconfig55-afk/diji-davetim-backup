-- =========================================================================
-- Fotograf havuzu sertlestirme
-- migration.sql'i tamamlar. Mevcut bir projede de guvenle calistirilabilir:
-- her adim yeniden calistirmaya dayaniklidir.
--
-- Supabase Dashboard > SQL Editor icine yapistirip calistir.
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1) Depo sinirlari  (EN ONEMLI ADIM)
--
-- storage.objects uzerindeki insert policy yalnizca "bucket dogru mu"
-- diye bakiyordu; boyut ve dosya turu kontrolu yoktu. Yukleme adresi
-- QR kodla herkese acik oldugu icin, bu haliyle bucket'a herhangi bir
-- dosya turu sinirsiz boyutta yuklenebiliyordu. Bucket herkese acik
-- oldugundan bu, marka alan adiniz altinda ucretsiz dosya barindirma
-- anlamina gelir. Asagidaki sinirlar Supabase tarafinda zorunlu tutulur,
-- tarayicidan atlatilamaz.
-- ---------------------------------------------------------------------
update storage.buckets
set
  file_size_limit = 26214400,  -- 25 MB. Telefon fotografi icin fazlasiyla yeterli.
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',   -- iPhone varsayilani
    'image/heif',
    'image/gif'
  ]
where id = 'wedding-photos';

-- Video da kabul edilecekse yukaridaki diziye su satirlari ekleyin ve
-- file_size_limit degerini yukseltin (or. 209715200 = 200 MB):
--   'video/mp4', 'video/quicktime'
-- Ayrica src/app/upload/page.tsx icindeki accept ve MAX_FILE_BYTES
-- degerlerini de guncellemeyi unutmayin.

-- ---------------------------------------------------------------------
-- 2) photos tablosu alan sinirlari
--
-- Insert policy "with check (true)" oldugu icin anon istemci bu tabloya
-- istedigi uzunlukta metin yazabiliyordu. storage_path'i uuid.uzanti
-- kalibina baglamak, baska bir bucket yoluna isaret eden kayit
-- olusturulmasini da engeller.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'photos_storage_path_format'
  ) then
    alter table public.photos
      add constraint photos_storage_path_format
      check (storage_path ~ '^[0-9a-fA-F-]{36}\.[a-zA-Z0-9]{1,8}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'photos_uploader_name_len'
  ) then
    alter table public.photos
      add constraint photos_uploader_name_len
      check (uploader_name is null or char_length(uploader_name) <= 60);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3) rsvps ve guestbook alan sinirlari
--
-- Ayni sebep: her iki tablonun da insert policy'si herkese acik ve
-- metin alanlarinda uzunluk siniri yoktu.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rsvps_full_name_len') then
    alter table public.rsvps
      add constraint rsvps_full_name_len
      check (char_length(full_name) between 1 and 80);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'rsvps_note_len') then
    alter table public.rsvps
      add constraint rsvps_note_len
      check (note is null or char_length(note) <= 500);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'guestbook_full_name_len') then
    alter table public.guestbook
      add constraint guestbook_full_name_len
      check (char_length(full_name) between 1 and 80);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4) Kontrol sorgusu
-- Calistirdiktan sonra asagidakini de calistirip sonucu dogrulayin.
-- ---------------------------------------------------------------------
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'wedding-photos';
--
-- select conname from pg_constraint
--  where conrelid in ('public.photos'::regclass,
--                     'public.rsvps'::regclass,
--                     'public.guestbook'::regclass)
--    and contype = 'c'
--  order by conname;
