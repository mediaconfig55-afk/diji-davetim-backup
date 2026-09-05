import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-session";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { EventType, IbanCard, ProgramItem } from "@/lib/config";

const TEXT_FIELDS = [
  "bride_name",
  "groom_name",
  "bride_father",
  "bride_mother",
  "groom_father",
  "groom_mother",
  "venue_name",
  "venue_address",
  "venue_map_url",
  "welcome_title",
  "welcome_message",
] as const;

const DATE_FIELDS = ["event_date", "event_end_at"] as const;

const COLOR_FIELDS = [
  "theme_primary",
  "theme_primary_dark",
  "theme_background",
  "theme_surface",
  "theme_text_light",
] as const;

const EVENT_TYPES: EventType[] = ["wedding", "kina", "sunnet"];
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

type NormalizeResult<T> = { ok: true; value: T[] } | { ok: false };

// Her satırda zorunlu alanlar dolu olmalı; tek bir satır bile geçersizse
// (boş saat/başlık, boş IBAN vb.) tüm liste reddedilir ki yazım hatası fark
// edilsin — sessizce atlanıp veri kaybına yol açmasın.
function normalizeList<T>(
  value: unknown,
  requiredFields: string[],
  build: (item: Record<string, unknown>) => T
): NormalizeResult<T> {
  if (!Array.isArray(value)) return { ok: false };
  const items: T[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) return { ok: false };
    const item = raw as Record<string, unknown>;
    if (!requiredFields.every((field) => isNonEmptyString(item[field]))) return { ok: false };
    items.push(build(item));
  }
  return { ok: true, value: items };
}

function normalizeProgram(value: unknown): NormalizeResult<ProgramItem> {
  return normalizeList<ProgramItem>(value, ["time", "title"], (item) => {
    const description = typeof item.description === "string" ? item.description.trim() : "";
    return {
      time: (item.time as string).trim(),
      title: (item.title as string).trim(),
      ...(description ? { description } : {}),
    };
  });
}

function normalizeIbans(value: unknown): NormalizeResult<IbanCard> {
  return normalizeList<IbanCard>(value, ["label", "bankName", "iban"], (item) => ({
    label: (item.label as string).trim(),
    bankName: (item.bankName as string).trim(),
    iban: (item.iban as string).trim(),
  }));
}

export async function GET(request: NextRequest) {
  const valid = await verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!valid) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin.from("event_config").select("*").eq("id", 1).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || {});
}

export async function POST(request: NextRequest) {
  const valid = await verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!valid) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  // Gelen gövdeyi olduğu gibi yaymak yerine yalnızca düzenlenebilir sütunları
  // al — beklenmedik bir alan tüm upsert'i hataya düşürmesin.
  const payload: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };

  for (const field of TEXT_FIELDS) {
    if (field in body) {
      const value = body[field];
      payload[field] = typeof value === "string" && value.trim() === "" ? null : value;
    }
  }

  for (const field of DATE_FIELDS) {
    if (field in body) {
      const value = body[field];
      payload[field] = typeof value === "string" && value.trim() === "" ? null : value;
    }
  }

  for (const field of COLOR_FIELDS) {
    if (field in body) {
      const value = body[field];
      const normalized = typeof value === "string" && value.trim() === "" ? null : value;
      if (normalized !== null && (typeof normalized !== "string" || !HEX_COLOR.test(normalized))) {
        return NextResponse.json({ error: `Geçersiz renk kodu: ${field}` }, { status: 400 });
      }
      payload[field] = normalized;
    }
  }

  if ("event_type" in body) {
    if (!EVENT_TYPES.includes(body.event_type)) {
      return NextResponse.json({ error: "Geçersiz etkinlik türü." }, { status: 400 });
    }
    payload.event_type = body.event_type;
  }

  if ("program" in body) {
    const result = normalizeProgram(body.program);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Program listesi geçersiz — her satırda saat ve başlık dolu olmalı." },
        { status: 400 }
      );
    }
    payload.program = result.value;
  }

  if ("ibans" in body) {
    const result = normalizeIbans(body.ibans);
    if (!result.ok) {
      return NextResponse.json(
        { error: "IBAN listesi geçersiz — her kartta isim, banka ve IBAN dolu olmalı." },
        { status: 400 }
      );
    }
    payload.ibans = result.value;
  }

  const admin = supabaseAdmin();

  // Bitiş saati başlangıçtan önce olmamalı. Sayfadaki form bunu zaten
  // gönderilmeden önce kontrol ediyor, ama sadece tek bir tarih alanı
  // güncellenirse (örn. doğrudan API çağrısıyla) bu kısıt fark edilmeden
  // atlanabilir — bu yüzden burada da, gerekirse mevcut satırdan okuyarak
  // ikinci kez doğrulanıyor.
  if ("event_date" in payload || "event_end_at" in payload) {
    let effectiveStart = payload.event_date as string | null | undefined;
    let effectiveEnd = payload.event_end_at as string | null | undefined;

    if (effectiveStart === undefined || effectiveEnd === undefined) {
      const { data: current } = await admin
        .from("event_config")
        .select("event_date, event_end_at")
        .eq("id", 1)
        .maybeSingle();
      if (effectiveStart === undefined) effectiveStart = current?.event_date ?? null;
      if (effectiveEnd === undefined) effectiveEnd = current?.event_end_at ?? null;
    }

    if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
      return NextResponse.json(
        { error: "Bitiş saati başlangıçtan sonra olmalı — fotoğraf havuzu aksi halde etkinlik başlamadan açılır." },
        { status: 400 }
      );
    }
  }

  const { error } = await admin.from("event_config").upsert(payload, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
