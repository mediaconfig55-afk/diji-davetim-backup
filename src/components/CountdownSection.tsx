"use client";

import { useEffect, useState } from "react";
import { defaultResolvedConfig, type ResolvedEventConfig } from "@/lib/event-config";
import ScrollFade from "./ScrollFade";
import SectionHeading from "./SectionHeading";

function getTimeLeft(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  const clamped = Math.max(0, diff);
  return {
    days: Math.floor(clamped / (1000 * 60 * 60 * 24)),
    hours: Math.floor((clamped / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((clamped / (1000 * 60)) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
    over: diff <= 0,
  };
}

export default function CountdownSection({
  config = defaultResolvedConfig,
}: {
  config?: ResolvedEventConfig;
}) {
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null);
  const targetDate = config.date;

  useEffect(() => {
    setTime(getTimeLeft(targetDate));
    const id = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const units = [
    { label: "Gün", value: time?.days },
    { label: "Saat", value: time?.hours },
    { label: "Dakika", value: time?.minutes },
    { label: "Saniye", value: time?.seconds },
  ];

  return (
    <section className="relative sec-pad">
      <div className="sec-wrap">
        <SectionHeading
          title={time?.over ? "Bugün Büyük Gün!" : "Geri Sayım"}
          subtitle={
            time?.over
              ? "Sizi aramızda görmek bizi çok mutlu etti."
              : "O güne kalan süre"
          }
          className="mb-12"
        />

        {/* Tarih geçtiyse dört tane 00 göstermek bozuk duruyordu; onun
            yerine günü kutlayan tek bir kart gösteriyoruz. */}
        {time?.over ? (
          <ScrollFade className="mx-auto max-w-md">
            <div className="glass-card rounded-3xl px-8 py-12 text-center">
              <p className="font-display gold-text text-4xl sm:text-5xl">Bugün!</p>
              <div className="ornament ornament--sm my-5" aria-hidden="true">
                <i />
              </div>
              <p className="text-sm text-[color:var(--color-text)]/60">
                Mutluluğumuzu paylaştığınız için teşekkür ederiz.
              </p>
            </div>
          </ScrollFade>
        ) : (
          <ScrollFade className="mx-auto grid max-w-xl grid-cols-4 gap-3 sm:gap-4">
            {units.map((u) => (
              <div
                key={u.label}
                className="glass-card rounded-2xl px-2 py-6 text-center sm:px-4 sm:py-8"
              >
                <p className="font-display gold-text text-3xl tabular-nums sm:text-5xl">
                  {u.value !== undefined ? String(u.value).padStart(2, "0") : "--"}
                </p>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text)]/50 sm:text-xs">
                  {u.label}
                </p>
              </div>
            ))}
          </ScrollFade>
        )}
      </div>
    </section>
  );
}
