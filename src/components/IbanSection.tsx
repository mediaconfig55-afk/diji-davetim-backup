"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { defaultResolvedConfig, type ResolvedEventConfig } from "@/lib/event-config";
import ScrollFade from "./ScrollFade";
import SectionHeading from "./SectionHeading";
import TiltCard from "./TiltCard";

function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export default function IbanSection({
  config = defaultResolvedConfig,
}: {
  config?: ResolvedEventConfig;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [failedIndex, setFailedIndex] = useState<number | null>(null);

  async function handleCopy(iban: string, index: number) {
    const clean = iban.replace(/\s+/g, "");
    let ok = true;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clean);
      } else {
        ok = legacyCopy(clean);
      }
    } catch {
      ok = legacyCopy(clean);
    }

    if (ok) {
      setFailedIndex(null);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 2000);
    } else {
      setCopiedIndex(null);
      setFailedIndex(index);
      setTimeout(() => setFailedIndex((cur) => (cur === index ? null : cur)), 2500);
    }
  }

  return (
    <section className="relative sec-pad">
      <div className="sec-wrap">
      <SectionHeading
          title="Hediye"
          subtitle="Bizzat gelemeseniz de dijital hediyenizi aşağıdaki hesaplara gönderebilirsiniz."
          className="mb-12"
        />

      <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
        {config.ibans.map((card, i) => (
          <ScrollFade key={card.iban} delay={i * 0.15}>
            <TiltCard className="px-6 py-7">
              <p className="font-display text-lg text-[color:var(--color-text)]">{card.label}</p>
              <p className="mt-1 text-xs text-[color:var(--color-text)]/50">{card.bankName}</p>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="font-mono text-xs tracking-wide text-[color:var(--color-text)]/85 sm:text-sm">
                  {card.iban}
                </span>
                <button
                  onClick={() => handleCopy(card.iban, i)}
                  className="ml-3 shrink-0 rounded-lg border border-[color:var(--color-primary)]/40 p-2 text-[color:var(--color-primary)] transition hover:bg-[color:var(--color-primary)]/10"
                  aria-label="IBAN'ı kopyala"
                >
                  {copiedIndex === i ? (
                    <Check size={15} />
                  ) : failedIndex === i ? (
                    <AlertCircle size={15} className="text-red-400" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
              {failedIndex === i && (
                <p className="mt-2 text-xs text-red-400">
                  Kopyalanamadı, lütfen IBAN&apos;ı elle seçip kopyalayın.
                </p>
              )}
            </TiltCard>
          </ScrollFade>
        ))}
      </div>
    </div>
    </section>
  );
}
