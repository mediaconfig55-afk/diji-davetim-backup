"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { AlertTriangle, Download, LogOut, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { eventConfig } from "@/lib/config";
import type { RsvpRecord, GuestbookRecord, PhotoRecord } from "@/lib/types";
import FloatingBackground from "@/components/FloatingBackground";
import EventConfigEditor from "@/components/admin/EventConfigEditor";

interface DashboardData {
  rsvps: RsvpRecord[];
  guestbook: GuestbookRecord[];
  manualRevealOverride: boolean;
  revealed: boolean;
  revealAt: string;
  photoCount: number;
  photos: PhotoRecord[];
}

const statusLabels: Record<string, string> = {
  attending: "Katılıyor",
  not_attending: "Katılmıyor",
  undecided: "Belirsiz",
};

// Etkinlik saatleri her zaman Türkiye saatiyle gösterilir.
const EVENT_TIMEZONE = "Europe/Istanbul";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [qrCodes, setQrCodes] = useState<{ invite: string; upload: string } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/admin/data");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const base = eventConfig.siteUrl.replace(/\/$/, "");
    Promise.all([
      QRCode.toDataURL(base, { width: 480, margin: 1 }),
      QRCode.toDataURL(`${base}/upload`, { width: 480, margin: 1 }),
    ]).then(([invite, upload]) => setQrCodes({ invite, upload }));
  }, []);

  async function handleToggleReveal() {
    if (!data) return;
    setToggling(true);
    const next = !data.manualRevealOverride;
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualRevealOverride: next }),
    });
    setToggling(false);
    if (res.ok) loadData();
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  async function handleReset() {
    if (resetConfirmText !== "SIFIRLA") return;
    setResetting(true);
    setResetMessage(null);
    const res = await fetch("/api/admin/reset", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setResetting(false);

    if (res.ok) {
      setResetMessage(`Temizlendi: ${body.deletedPhotos ?? 0} fotoğraf, tüm RSVP ve anı kayıtları silindi.`);
      setResetOpen(false);
      setResetConfirmText("");
      loadData();
    } else {
      setResetMessage(`Hata: ${body.error ?? "bilinmeyen bir sorun oluştu."}`);
    }
  }

  const rsvpCounts = data?.rsvps.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      acc.totalGuests += r.status === "attending" ? r.guest_count : 0;
      return acc;
    },
    { attending: 0, not_attending: 0, undecided: 0, totalGuests: 0 } as Record<string, number>
  );

  return (
    <div className="relative min-h-screen px-6 py-12">
      <FloatingBackground />

      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display gold-text text-2xl sm:text-3xl">Yönetim Paneli</h1>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs text-[color:var(--color-text)]/70 hover:border-[color:var(--color-primary)]/50"
            >
              <RefreshCw size={13} /> Yenile
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs text-[color:var(--color-text)]/70 hover:border-red-400/50"
            >
              <LogOut size={13} /> Çıkış
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-[color:var(--color-text)]/50">Yükleniyor…</p>}

        {!loading && data && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: "Katılıyor", value: rsvpCounts?.attending ?? 0 },
                { label: "Katılmıyor", value: rsvpCounts?.not_attending ?? 0 },
                { label: "Belirsiz", value: rsvpCounts?.undecided ?? 0 },
                { label: "Toplam Kişi", value: rsvpCounts?.totalGuests ?? 0 },
                { label: "Fotoğraf", value: data.photoCount },
              ].map((s) => (
                <div key={s.label} className="glass-card rounded-2xl px-3 py-4 text-center">
                  <p className="font-display gold-text text-2xl">{s.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-[color:var(--color-text)]/50">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <EventConfigEditor onSaved={loadData} />

            <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-5">
              <div>
                <p className="text-sm text-[color:var(--color-text)]">Fotoğraf Havuzu — Misafirlere Görünürlük</p>
                <p className="mt-1 text-xs text-[color:var(--color-text)]/50">
                  {data.revealed
                    ? "Herkese açık: /gallery sayfasındaki tüm fotoğrafları artık misafirler de görebilir."
                    : `Şu an sadece sen görebiliyorsun. Otomatik olarak ${new Date(data.revealAt).toLocaleString("tr-TR", { timeZone: EVENT_TIMEZONE })} tarihinde herkese açılacak, veya aşağıdaki butonla şimdi açabilirsin.`}
                </p>
              </div>
              <button
                onClick={handleToggleReveal}
                disabled={toggling}
                className="flex items-center gap-2 rounded-xl border border-[color:var(--color-primary)]/40 px-4 py-2 text-sm text-[color:var(--color-primary)] transition hover:bg-[color:var(--color-primary)]/10 disabled:opacity-50"
              >
                {data.manualRevealOverride ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {data.manualRevealOverride ? "Herkese açık (kapatmak için tıkla)" : "Şimdi herkese aç"}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {qrCodes && (
                <>
                  <QrDownloadCard title="Davetiye QR" dataUrl={qrCodes.invite} filename="davetiye-qr.png" />
                  <QrDownloadCard title="Fotoğraf Yükleme QR" dataUrl={qrCodes.upload} filename="fotograf-qr.png" />
                </>
              )}
            </div>

            <section>
              <h2 className="mb-3 font-display text-lg text-[color:var(--color-text)]">
                Fotoğraf Havuzu — Sadece Sen Görüyorsun ({data.photoCount})
              </h2>
              {data.photos.length === 0 ? (
                <p className="text-sm text-[color:var(--color-text)]/40">Henüz fotoğraf yüklenmedi.</p>
              ) : (
                <div className="columns-2 gap-3 sm:columns-4 [&>*]:mb-3">
                  {data.photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.url}
                      alt={p.uploader_name ?? "Anı fotoğrafı"}
                      className="w-full rounded-xl border border-white/10"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-display text-lg text-[color:var(--color-text)]">
                Katılım Bildirimleri ({data.rsvps.length})
              </h2>
              <div className="glass-card overflow-x-auto rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[color:var(--color-text)]/50">
                      <th className="px-4 py-3 font-normal">Ad Soyad</th>
                      <th className="px-4 py-3 font-normal">Durum</th>
                      <th className="px-4 py-3 font-normal">Kişi</th>
                      <th className="px-4 py-3 font-normal">Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rsvps.map((r) => (
                      <tr key={r.id} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3">{r.full_name}</td>
                        <td className="px-4 py-3">{statusLabels[r.status]}</td>
                        <td className="px-4 py-3">{r.guest_count}</td>
                        <td className="px-4 py-3 text-[color:var(--color-text)]/60">{r.note ?? "—"}</td>
                      </tr>
                    ))}
                    {data.rsvps.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-[color:var(--color-text)]/40">
                          Henüz kayıt yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="mb-3 font-display text-lg text-[color:var(--color-text)]">
                Anı Defteri ({data.guestbook.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.guestbook.map((g) => (
                  <div key={g.id} className="glass-card rounded-2xl px-5 py-4">
                    <p className="text-sm text-[color:var(--color-text)]/80">“{g.message}”</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-[color:var(--color-primary)]">
                      {g.full_name}
                    </p>
                  </div>
                ))}
                {data.guestbook.length === 0 && (
                  <p className="text-sm text-[color:var(--color-text)]/40">Henüz anı yok.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-red-500/25 bg-red-500/5 px-6 py-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-red-400" size={18} />
                <div className="flex-1">
                  <h2 className="font-display text-lg text-[color:var(--color-text)]">
                    Yeni Etkinliğe Hazırlan
                  </h2>
                  <p className="mt-1 text-xs text-[color:var(--color-text)]/55">
                    Bu düğün bitip yeni bir etkinlik (başka bir düğün/kına/sünnet) için bu siteyi
                    yeniden kullanacaksan: önce burada <strong>Tüm Verileri Sıfırla</strong>&apos;ya bas
                    (tüm RSVP&apos;ler, anı defteri yazıları ve fotoğraflar kalıcı olarak silinir),
                    sonra yukarıdaki <strong>Etkinlik Bilgilerini Düzenle</strong> bölümünden isim,
                    aile, tarih, mekan, program ve IBAN dahil tüm bilgileri güncelle — hepsi bu
                    panelden değişir, koda dokunmana gerek yok.
                  </p>

                  {!resetOpen && (
                    <button
                      onClick={() => setResetOpen(true)}
                      className="mt-4 rounded-xl border border-red-400/40 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                    >
                      Tüm Verileri Sıfırla
                    </button>
                  )}

                  {resetOpen && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-[color:var(--color-text)]/70">
                        Bu işlem geri alınamaz. Onaylamak için kutuya <strong>SIFIRLA</strong> yaz.
                      </p>
                      <input
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        placeholder="SIFIRLA"
                        className="w-full max-w-xs rounded-xl border border-red-400/30 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-[color:var(--color-text)]/30 focus:border-red-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleReset}
                          disabled={resetConfirmText !== "SIFIRLA" || resetting}
                          className="rounded-xl bg-red-500/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {resetting ? "Siliniyor…" : "Onayla ve Sil"}
                        </button>
                        <button
                          onClick={() => {
                            setResetOpen(false);
                            setResetConfirmText("");
                          }}
                          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[color:var(--color-text)]/70"
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  )}

                  {resetMessage && (
                    <p className="mt-3 text-xs text-[color:var(--color-text)]/70">{resetMessage}</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function QrDownloadCard({ title, dataUrl, filename }: { title: string; dataUrl: string; filename: string }) {
  return (
    <div className="glass-card flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={title} className="h-16 w-16 rounded-lg bg-white p-1" />
        <p className="text-sm text-[color:var(--color-text)]">{title}</p>
      </div>
      <a
        href={dataUrl}
        download={filename}
        className="flex items-center gap-2 rounded-lg border border-[color:var(--color-primary)]/40 px-3 py-2 text-xs text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10"
      >
        <Download size={13} /> İndir
      </a>
    </div>
  );
}
