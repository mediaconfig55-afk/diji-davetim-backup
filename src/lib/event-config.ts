import { eventConfig, type EventType, type IbanCard, type ProgramItem } from "@/lib/config";

// =========================================================================
// Etkinlik bilgilerinin TEK çözümleme noktası.
//
// Kaynak sırası: veritabanındaki event_config satırı (admin panelinden
// düzenlenir) > src/lib/config.ts varsayılanları. DB'de boş/null bırakılan
// her alan sessizce config.ts değerine düşer, böylece yeni bir etkinlik
// kurarken sadece config.ts'i doldurmak da yeterli olur.
// =========================================================================

export interface ResolvedEventConfig {
  eventType: EventType;
  bride: string;
  groom: string;
  parents: {
    bride: { father: string; mother: string };
    groom: { father: string; mother: string };
  };
  welcomeTitle: string;
  welcomeMessage: string;
  date: string;
  weddingEndAt: string;
  venue: { name: string; address: string; mapUrl: string };
  program: ProgramItem[];
  ibans: IbanCard[];
  siteUrl: string;
  theme: {
    primary: string;
    primaryDark: string;
    background: string;
    surface: string;
    textLight: string;
  };
}

// Supabase'ten dönen ham satır — tüm alanlar opsiyonel ve null olabilir.
export interface EventConfigRow {
  event_type?: EventType | null;
  bride_name?: string | null;
  groom_name?: string | null;
  bride_father?: string | null;
  bride_mother?: string | null;
  groom_father?: string | null;
  groom_mother?: string | null;
  event_date?: string | null;
  event_end_at?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  venue_map_url?: string | null;
  welcome_title?: string | null;
  welcome_message?: string | null;
  program?: ProgramItem[] | null;
  ibans?: IbanCard[] | null;
  theme_primary?: string | null;
  theme_primary_dark?: string | null;
  theme_background?: string | null;
  theme_surface?: string | null;
  theme_text_light?: string | null;
}

// Boş string de "doldurulmamış" sayılır — admin bir alanı silip kaydettiğinde
// sitede boşluk değil, config.ts varsayılanı görünsün.
function pick(dbValue: string | null | undefined, fallback: string): string {
  const trimmed = dbValue?.trim();
  return trimmed ? trimmed : fallback;
}

export function resolveEventConfig(row: EventConfigRow | null | undefined): ResolvedEventConfig {
  const db = row ?? {};

  return {
    eventType: db.event_type ?? eventConfig.eventType,
    bride: pick(db.bride_name, eventConfig.couple.bride),
    groom: pick(db.groom_name, eventConfig.couple.groom),
    parents: {
      bride: {
        father: pick(db.bride_father, eventConfig.parents.bride.father),
        mother: pick(db.bride_mother, eventConfig.parents.bride.mother),
      },
      groom: {
        father: pick(db.groom_father, eventConfig.parents.groom.father),
        mother: pick(db.groom_mother, eventConfig.parents.groom.mother),
      },
    },
    welcomeTitle: pick(db.welcome_title, eventConfig.welcomeTitle),
    welcomeMessage: pick(db.welcome_message, eventConfig.welcomeMessage),
    date: pick(db.event_date, eventConfig.date),
    weddingEndAt: pick(db.event_end_at, eventConfig.weddingEndAt),
    venue: {
      name: pick(db.venue_name, eventConfig.venue.name),
      address: pick(db.venue_address, eventConfig.venue.address),
      mapUrl: pick(db.venue_map_url, eventConfig.venue.mapUrl),
    },
    program: db.program?.length ? db.program : eventConfig.program,
    ibans: db.ibans?.length ? db.ibans : eventConfig.ibans,
    siteUrl: eventConfig.siteUrl,
    theme: {
      primary: pick(db.theme_primary, eventConfig.theme.primary),
      primaryDark: pick(db.theme_primary_dark, eventConfig.theme.primaryDark),
      background: pick(db.theme_background, eventConfig.theme.background),
      surface: pick(db.theme_surface, eventConfig.theme.surface),
      textLight: pick(db.theme_text_light, eventConfig.theme.textLight),
    },
  };
}

// config.ts'i tek başına çözümlenmiş hale getirir (DB'ye hiç gitmeden).
// İstemci tarafındaki bileşenlerin güvenli varsayılanı budur.
export const defaultResolvedConfig: ResolvedEventConfig = resolveEventConfig(null);
