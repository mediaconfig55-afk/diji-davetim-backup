"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { GuestbookRecord } from "@/lib/types";
import ScrollFade from "./ScrollFade";
import SectionHeading from "./SectionHeading";
import TiltCard from "./TiltCard";

// supabase/migration.sql'deki `char_length(message) between 1 and 1000`
// kısıtıyla aynı olmalı — aksi halde insert sessizce reddedilir.
const MESSAGE_MAX = 1000;
const NAME_MAX = 80;

export default function GuestbookSection() {
  const [entries, setEntries] = useState<GuestbookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEntries() {
    const { data } = await supabaseBrowser
      .from("guestbook")
      .select("id, full_name, message, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setEntries(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !message.trim()) {
      setError("Lütfen ad soyad ve anı yazınızı girin.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabaseBrowser.from("guestbook").insert({
      full_name: fullName.trim(),
      message: message.trim(),
    });

    setSubmitting(false);
    if (insertError) {
      setError("Bir şeyler ters gitti, lütfen tekrar deneyin.");
      return;
    }
    setFullName("");
    setMessage("");
    loadEntries();
  }

  return (
    <section className="relative sec-pad">
      <div className="sec-wrap">
      <SectionHeading
          title="Anı Defteri"
          subtitle="Gelin ve damada güzel bir anı ya da dilek bırakın."
          className="mb-12"
        />

      <ScrollFade className="mx-auto max-w-md">
        <TiltCard className="px-6 py-8 sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ad Soyad"
              maxLength={NAME_MAX}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-text)]/35 focus:border-[color:var(--color-primary)]"
            />
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Anınızı yazın…"
                rows={3}
                maxLength={MESSAGE_MAX}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-text)]/35 focus:border-[color:var(--color-primary)]"
              />
              {message.length > MESSAGE_MAX - 100 && (
                <p className="mt-1 text-right text-[11px] text-[color:var(--color-text)]/45">
                  {message.length} / {MESSAGE_MAX}
                </p>
              )}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,var(--color-primary),var(--color-primary-dark))] py-3 text-sm font-medium text-[#1a1420] transition hover:opacity-90 disabled:opacity-60"
            >
              <Send size={15} />
              {submitting ? "Gönderiliyor…" : "Anıyı Bırak"}
            </button>
          </form>
        </TiltCard>
      </ScrollFade>

      <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
        {!loading &&
          entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 6) * 0.06, duration: 0.6 }}
              className="glass-card rounded-2xl px-5 py-4"
            >
              <p className="text-sm text-[color:var(--color-text)]/80">“{entry.message}”</p>
              <p className="mt-3 text-xs uppercase tracking-[0.15em] text-[color:var(--color-primary)]">
                {entry.full_name}
              </p>
            </motion.div>
          ))}
        {!loading && entries.length === 0 && (
          <p className="col-span-full text-center text-sm text-[color:var(--color-text)]/45">
            İlk anıyı siz bırakın.
          </p>
        )}
      </div>
    </div>
    </section>
  );
}
