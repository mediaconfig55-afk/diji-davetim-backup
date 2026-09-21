"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, HelpCircle, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RsvpStatus } from "@/lib/types";
import ScrollFade from "./ScrollFade";
import SectionHeading from "./SectionHeading";
import TiltCard from "./TiltCard";

const options: { value: RsvpStatus; label: string; icon: typeof Check }[] = [
  { value: "attending", label: "Katılıyorum", icon: Check },
  { value: "not_attending", label: "Katılmıyorum", icon: X },
  { value: "undecided", label: "Belirsiz", icon: HelpCircle },
];

export default function RsvpSection() {
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const [fullName, setFullName] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status || !fullName.trim()) {
      setError("Lütfen ad soyad girip bir seçenek belirleyin.");
      return;
    }
    setSubmitting(true);
    setError(null);

    // Kişi sayısı yalnızca "Katılıyorum" için anlamlı. Misafir önce sayıyı
    // artırıp sonra "Katılmıyorum"a geçerse eski sayı kaydedilmesin.
    const { error: insertError } = await supabaseBrowser.from("rsvps").insert({
      full_name: fullName.trim(),
      status,
      guest_count: status === "attending" ? guestCount : 1,
      note: note.trim() || null,
    });

    setSubmitting(false);
    if (insertError) {
      setError("Bir şeyler ters gitti, lütfen tekrar deneyin.");
      return;
    }
    setDone(true);
  }

  return (
    <section className="relative sec-pad">
      <div className="sec-wrap">
      <SectionHeading
          title="Katılım Bildirimi"
          subtitle="Bizimle olup olamayacağınızı bildirerek hazırlıklarımıza yardımcı olabilirsiniz."
          className="mb-12"
        />

      <ScrollFade className="mx-auto max-w-md">
        <TiltCard className="px-6 py-8 sm:px-10">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center"
            >
              <Check className="mx-auto mb-3 text-[color:var(--color-primary)]" size={32} />
              <p className="font-display text-xl text-[color:var(--color-text)]">Teşekkür ederiz!</p>
              <p className="mt-2 text-sm text-[color:var(--color-text)]/60">Cevabınız kaydedildi.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {options.map((opt) => {
                  const Icon = opt.icon;
                  const active = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-xs transition ${
                        active
                          ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/15 text-[color:var(--color-text)]"
                          : "border-white/10 text-[color:var(--color-text)]/60 hover:border-white/25"
                      }`}
                    >
                      <Icon size={18} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ad Soyad"
                maxLength={80}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-text)]/35 focus:border-[color:var(--color-primary)]"
              />

              {status === "attending" && (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span className="text-[color:var(--color-text)]/70">Kişi sayısı</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                      className="h-7 w-7 rounded-full border border-white/15 text-[color:var(--color-text)]/70"
                    >
                      −
                    </button>
                    <span>{guestCount}</span>
                    <button
                      type="button"
                      onClick={() => setGuestCount((c) => Math.min(20, c + 1))}
                      className="h-7 w-7 rounded-full border border-white/15 text-[color:var(--color-text)]/70"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Not (opsiyonel)"
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-text)]/35 focus:border-[color:var(--color-primary)]"
              />

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[linear-gradient(120deg,var(--color-primary),var(--color-primary-dark))] py-3 text-sm font-medium text-[#1a1420] transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Gönderiliyor…" : "Gönder"}
              </button>
            </form>
          )}
        </TiltCard>
      </ScrollFade>
    </div>
    </section>
  );
}
