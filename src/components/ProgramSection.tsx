"use client";

import { defaultResolvedConfig, type ResolvedEventConfig } from "@/lib/event-config";
import ScrollFade from "./ScrollFade";
import SectionHeading from "./SectionHeading";

export default function ProgramSection({
  config = defaultResolvedConfig,
}: {
  config?: ResolvedEventConfig;
}) {
  return (
    <section className="relative sec-pad">
      <div className="sec-wrap">
        <SectionHeading
          title="Gün Programı"
          subtitle="Günün akışı — dilediğiniz bölüme katılabilirsiniz"
          className="mb-12"
        />

      <div className="mx-auto max-w-xl">
        <div className="glass-card rounded-3xl px-6 py-9 sm:px-10">
          <ol className="relative border-l border-[color:var(--color-primary)]/30">
            {config.program.map((p, i) => (
              <ScrollFade key={p.time + p.title} delay={i * 0.1} y={20}>
                <li className="relative mb-8 pl-8 last:mb-0">
                  <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-[color:var(--color-primary)]" />
                  <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-primary)]">
                    {p.time}
                  </p>
                  <p className="mt-1 font-display text-lg text-[color:var(--color-text)]">{p.title}</p>
                  {p.description && (
                    <p className="mt-1 text-sm text-[color:var(--color-text)]/55">{p.description}</p>
                  )}
                </li>
              </ScrollFade>
            ))}
          </ol>
        </div>
      </div>
      </div>
    </section>
  );
}
