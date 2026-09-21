"use client";

import type { ReactNode } from "react";
import ScrollFade from "./ScrollFade";

/**
 * Bölüm başlığı: altın süsleme + büyük serif başlık + isteğe bağlı alt metin.
 *
 * Daha önce her bölüm kendi lucide ikonunu ve `text-3xl` başlığını
 * kuruyordu; ikonlar küçük kalıyor, başlıklar kapladıkları boşluğa göre
 * zayıf duruyordu. Tek yerden yönetmek hem hiyerarşiyi güçlendiriyor hem
 * de bölümler arası tutarlılığı garantiliyor.
 */
export default function SectionHeading({
  title,
  subtitle,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <ScrollFade className={`mx-auto max-w-2xl text-center ${className}`}>
      <div className="ornament mb-6" aria-hidden="true">
        <i />
      </div>
      <h2 className="font-display gold-text sheen-once text-[clamp(2rem,5.2vw,3.25rem)] leading-[1.08]">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[color:var(--color-text)]/60 sm:text-base">
          {subtitle}
        </p>
      )}
    </ScrollFade>
  );
}
