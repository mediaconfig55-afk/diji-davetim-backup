"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Edit2, Plus, Trash2 } from "lucide-react";
import type { EventType, IbanCard, ProgramItem } from "@/lib/config";

// Etkinlik saatleri her zaman Türkiye saatiyle girilir ve gösterilir.
// Türkiye 2016'dan beri yaz saati uygulamadığı için ofset yıl boyu sabittir.
const EVENT_TIMEZONE = "Europe/Istanbul";
const EVENT_UTC_OFFSET = "+03:00";

function isoToDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(" ", "T");
}

function dateTimeLocalToIso(value: string): string | null {
  if (!value) return null;
  return `${value}:00${EVENT_UTC_OFFSET}`;
}

interface ConfigFormState {
  event_type: EventType;
  bride_name: string;
  groom_name: string;
  bride_father: string;
  bride_mother: string;
  groom_father: string;
  groom_mother: string;
  event_date: string;
  event_end_at: string;
  venue_name: string;
  venue_address: string;
  venue_map_url: string;
  welcome_title: string;
  welcome_message: string;
  program: ProgramItem[];
  ibans: IbanCard[];
  theme_primary: string;
  theme_primary_dark: string;
  theme_background: string;
  theme_surface: string;
  theme_text_light: string;
}

const EMPTY_STATE: ConfigFormState = {
  event_type: "wedding",
  bride_name: "",
  groom_name: "",
  bride_father: "",
  bride_mother: "",
  groom_father: "",
  groom_mother: "",
  event_date: "",
  event_end_at: "",
  venue_name: "",
  venue_address: "",
  venue_map_url: "",
  welcome_title: "",
  welcome_message: "",
  program: [],
  ibans: [],
  theme_primary: "#b98b56",
  theme_primary_dark: "#8a6636",
  theme_background: "#0f0b12",
  theme_surface: "#1a1420",
  theme_text_light: "#f7f1e8",
};

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "wedding", label: "Düğün" },
  { value: "kina", label: "Kına Gecesi" },
  { value: "sunnet", label: "Sünnet Töreni" },
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-[color:var(--color-text)]/30 focus:border-[color:var(--color-primary)]";

function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const next = [...list];
  const target = index + direction;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function EventConfigEditor({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ConfigFormState>(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadConfigData() {
    // /api/config, DB'de henüz doldurulmamış alanlar için config.ts
    // varsayılanlarına düşer — böylece form her zaman sitede o an
    // görünen gerçek değerleri gösterir, boş alanlarla admini yanıltmaz.
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/config");
      if (!res.ok) {
        setLoadError("Mevcut bilgiler yüklenemedi, lütfen tekrar deneyin.");
        return;
      }
      const cfg = await res.json();
      setForm({
        event_type: (cfg.event_type as EventType) || "wedding",
        bride_name: cfg.bride_name || "",
        groom_name: cfg.groom_name || "",
        bride_father: cfg.bride_father || "",
        bride_mother: cfg.bride_mother || "",
        groom_father: cfg.groom_father || "",
        groom_mother: cfg.groom_mother || "",
        event_date: isoToDateTimeLocal(cfg.event_date),
        event_end_at: isoToDateTimeLocal(cfg.event_end_at),
        venue_name: cfg.venue_name || "",
        venue_address: cfg.venue_address || "",
        venue_map_url: cfg.venue_map_url || "",
        welcome_title: cfg.welcome_title || "",
        welcome_message: cfg.welcome_message || "",
        program: Array.isArray(cfg.program) ? cfg.program : [],
        ibans: Array.isArray(cfg.ibans) ? cfg.ibans : [],
        theme_primary: cfg.theme_primary || EMPTY_STATE.theme_primary,
        theme_primary_dark: cfg.theme_primary_dark || EMPTY_STATE.theme_primary_dark,
        theme_background: cfg.theme_background || EMPTY_STATE.theme_background,
        theme_surface: cfg.theme_surface || EMPTY_STATE.theme_surface,
        theme_text_light: cfg.theme_text_light || EMPTY_STATE.theme_text_light,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Asenkron veri okuması; setState yalnızca await sonrası çalışıyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) loadConfigData();
  }, [open]);

  async function handleSaveConfig() {
    const startIso = dateTimeLocalToIso(form.event_date);
    const endIso = dateTimeLocalToIso(form.event_end_at);

    // Gece yarısını aşan düğünlerde bitiş tarihini bir sonraki güne yazmayı
    // unutmak, fotoğraf havuzunun daha etkinlik başlamadan herkese açılmasına
    // yol açıyor. Kaydetmeden önce burada engelle (sunucu tarafında da
    // ayrıca doğrulanıyor).
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
      setMessage(
        "Hata: Bitiş saati başlangıçtan sonra olmalı. Gece yarısını geçen etkinliklerde bitiş tarihi bir sonraki gün olmalıdır."
      );
      return;
    }

    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/event-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: form.event_type,
        bride_name: form.bride_name,
        groom_name: form.groom_name,
        bride_father: form.bride_father,
        bride_mother: form.bride_mother,
        groom_father: form.groom_father,
        groom_mother: form.groom_mother,
        event_date: startIso,
        event_end_at: endIso,
        venue_name: form.venue_name,
        venue_address: form.venue_address,
        venue_map_url: form.venue_map_url,
        welcome_title: form.welcome_title,
        welcome_message: form.welcome_message,
        program: form.program,
        ibans: form.ibans,
        theme_primary: form.theme_primary,
        theme_primary_dark: form.theme_primary_dark,
        theme_background: form.theme_background,
        theme_surface: form.theme_surface,
        theme_text_light: form.theme_text_light,
      }),
    });
    setSaving(false);

    if (res.ok) {
      setMessage("Etkinlik bilgileri kaydedildi. Davetiye sayfası artık bu bilgileri gösteriyor.");
      onSaved?.();
      setTimeout(() => setOpen(false), 2000);
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(`Hata: ${err.error ?? "kaydedilemedi."}`);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-primary)]/25 bg-[color:var(--color-primary)]/5 px-6 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-[color:var(--color-text)]">Etkinlik Bilgilerini Düzenle</h2>
          <p className="mt-1 text-xs text-[color:var(--color-text)]/55">
            İsimler, program, IBAN, karşılama metni ve tema renkleri — sitedeki her şey burada
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[color:var(--color-primary)]/40 px-4 py-2 text-sm text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10"
          >
            <Edit2 size={16} /> Düzenle
          </button>
        )}
      </div>

      {open && (
        <div className="mt-6 space-y-8">
          {loading ? (
            <p className="text-sm text-[color:var(--color-text)]/50">Yükleniyor…</p>
          ) : loadError ? (
            <p className="text-sm text-red-300">{loadError}</p>
          ) : (
            <>
              <FormSection title="Etkinlik Türü">
                <select
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType })}
                  className={inputClass}
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormSection>

              <FormSection title="Karşılama Metni">
                <input
                  type="text"
                  value={form.welcome_title}
                  onChange={(e) => setForm({ ...form, welcome_title: e.target.value })}
                  placeholder="Örn. Düğünümüze Hoş Geldiniz"
                  className={inputClass}
                />
                <textarea
                  value={form.welcome_message}
                  onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                  placeholder="Karşılama açıklaması"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </FormSection>

              <FormSection title="Gelin / Damat ve Aileler">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={form.bride_name}
                    onChange={(e) => setForm({ ...form, bride_name: e.target.value })}
                    placeholder="Gelin Adı"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={form.groom_name}
                    onChange={(e) => setForm({ ...form, groom_name: e.target.value })}
                    placeholder="Damat Adı"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={form.bride_father}
                    onChange={(e) => setForm({ ...form, bride_father: e.target.value })}
                    placeholder="Gelin Babası"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={form.bride_mother}
                    onChange={(e) => setForm({ ...form, bride_mother: e.target.value })}
                    placeholder="Gelin Annesi"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={form.groom_father}
                    onChange={(e) => setForm({ ...form, groom_father: e.target.value })}
                    placeholder="Damat Babası"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={form.groom_mother}
                    onChange={(e) => setForm({ ...form, groom_mother: e.target.value })}
                    placeholder="Damat Annesi"
                    className={inputClass}
                  />
                </div>
              </FormSection>

              <FormSection title="Tarih ve Mekan">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[color:var(--color-text)]/50">
                      Düğün Tarihi ve Saati
                    </label>
                    <input
                      type="datetime-local"
                      value={form.event_date}
                      onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[color:var(--color-text)]/50">
                      Düğün Bitişi Saati
                    </label>
                    <input
                      type="datetime-local"
                      value={form.event_end_at}
                      onChange={(e) => setForm({ ...form, event_end_at: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={form.venue_name}
                  onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                  placeholder="Mekan Adı (ör. Zümrüt Davet Salonu)"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={form.venue_address}
                  onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
                  placeholder="Mekan Adresi"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={form.venue_map_url}
                  onChange={(e) => setForm({ ...form, venue_map_url: e.target.value })}
                  placeholder="Google Maps Linki (opsiyonel)"
                  className={inputClass}
                />
              </FormSection>

              <FormSection title="Gün Programı">
                <ProgramEditor items={form.program} onChange={(program) => setForm({ ...form, program })} />
              </FormSection>

              <FormSection title="Hediye / IBAN Kartları">
                <IbanEditor items={form.ibans} onChange={(ibans) => setForm({ ...form, ibans })} />
              </FormSection>

              <FormSection title="Tema Renkleri">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    label="Ana Renk (Altın)"
                    value={form.theme_primary}
                    onChange={(v) => setForm({ ...form, theme_primary: v })}
                  />
                  <ColorField
                    label="Ana Renk (Koyu)"
                    value={form.theme_primary_dark}
                    onChange={(v) => setForm({ ...form, theme_primary_dark: v })}
                  />
                  <ColorField
                    label="Arka Plan"
                    value={form.theme_background}
                    onChange={(v) => setForm({ ...form, theme_background: v })}
                  />
                  <ColorField
                    label="Kart Yüzeyi"
                    value={form.theme_surface}
                    onChange={(v) => setForm({ ...form, theme_surface: v })}
                  />
                  <ColorField
                    label="Yazı Rengi"
                    value={form.theme_text_light}
                    onChange={(v) => setForm({ ...form, theme_text_light: v })}
                  />
                </div>
              </FormSection>

              {message && <p className="text-xs text-[color:var(--color-text)]/70">{message}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="rounded-lg bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-[#1a1420] hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[color:var(--color-text)]/70"
                >
                  Kapat
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl bg-white/5 p-5">
      <h3 className="text-xs font-medium tracking-wide text-[color:var(--color-primary)] uppercase">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[color:var(--color-text)]/50">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={inputClass}
        />
      </div>
    </div>
  );
}

function ReorderButtons({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label="Yukarı taşı"
        className="rounded-lg border border-white/10 p-1.5 text-[color:var(--color-text)]/60 hover:border-[color:var(--color-primary)]/50 disabled:opacity-30"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        aria-label="Aşağı taşı"
        className="rounded-lg border border-white/10 p-1.5 text-[color:var(--color-text)]/60 hover:border-[color:var(--color-primary)]/50 disabled:opacity-30"
      >
        <ChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Sil"
        className="rounded-lg border border-red-400/30 p-1.5 text-red-400 hover:bg-red-500/10"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function ProgramEditor({
  items,
  onChange,
}: {
  items: ProgramItem[];
  onChange: (items: ProgramItem[]) => void;
}) {
  function update(index: number, patch: Partial<ProgramItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-white/10 p-3 sm:flex-row sm:items-start">
          <div className="grid flex-1 gap-2 sm:grid-cols-[100px_1fr_1fr]">
            <input
              type="text"
              value={item.time}
              onChange={(e) => update(i, { time: e.target.value })}
              placeholder="20:00"
              className={inputClass}
            />
            <input
              type="text"
              value={item.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Başlık (ör. Pasta Kesimi)"
              className={inputClass}
            />
            <input
              type="text"
              value={item.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Açıklama (opsiyonel)"
              className={inputClass}
            />
          </div>
          <ReorderButtons
            index={i}
            count={items.length}
            onMove={(direction) => onChange(moveItem(items, i, direction))}
            onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-[color:var(--color-text)]/40">Henüz program öğesi yok.</p>}
      <button
        type="button"
        onClick={() => onChange([...items, { time: "", title: "" }])}
        className="flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs text-[color:var(--color-text)]/60 hover:border-[color:var(--color-primary)]/50 hover:text-[color:var(--color-primary)]"
      >
        <Plus size={14} /> Program Öğesi Ekle
      </button>
    </div>
  );
}

function IbanEditor({ items, onChange }: { items: IbanCard[]; onChange: (items: IbanCard[]) => void }) {
  function update(index: number, patch: Partial<IbanCard>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-white/10 p-3 sm:flex-row sm:items-start">
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <input
              type="text"
              value={item.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Etiket (ör. Gelin - Sevgi Demir)"
              className={inputClass}
            />
            <input
              type="text"
              value={item.bankName}
              onChange={(e) => update(i, { bankName: e.target.value })}
              placeholder="Banka Adı"
              className={inputClass}
            />
            <input
              type="text"
              value={item.iban}
              onChange={(e) => update(i, { iban: e.target.value })}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              className={`${inputClass} font-mono`}
            />
          </div>
          <ReorderButtons
            index={i}
            count={items.length}
            onMove={(direction) => onChange(moveItem(items, i, direction))}
            onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
          />
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-[color:var(--color-text)]/40">Henüz IBAN kartı yok.</p>}
      <button
        type="button"
        onClick={() => onChange([...items, { label: "", bankName: "", iban: "" }])}
        className="flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs text-[color:var(--color-text)]/60 hover:border-[color:var(--color-primary)]/50 hover:text-[color:var(--color-primary)]"
      >
        <Plus size={14} /> IBAN Kartı Ekle
      </button>
    </div>
  );
}
