import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resolveEventConfig, type EventConfigRow, type ResolvedEventConfig } from "@/lib/event-config";

// Sunucu tarafında etkinlik bilgilerini getirir. Veritabanına ulaşılamazsa
// (anahtar yok, ağ hatası, tablo henüz kurulmamış) sessizce config.ts
// varsayılanlarına döner — davetiye hiçbir koşulda boş sayfa göstermez.
// React cache(): aynı istek içinde (layout + generateMetadata + page)
// birden çok kez çağrılsa da veritabanına tek sorgu gider.
export const getEventConfig = cache(async (): Promise<ResolvedEventConfig> => {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.from("event_config").select("*").eq("id", 1).single();
    if (error) return resolveEventConfig(null);
    return resolveEventConfig(data as EventConfigRow);
  } catch {
    return resolveEventConfig(null);
  }
});
