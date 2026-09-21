"use client";

import { defaultResolvedConfig, type ResolvedEventConfig } from "@/lib/event-config";
import ScrollFade from "./ScrollFade";
import SectionHeading from "./SectionHeading";
import TiltCard from "./TiltCard";

export default function ParentsSection({
  config = defaultResolvedConfig,
}: {
  config?: ResolvedEventConfig;
}) {
  const { parents } = config;

  const cards = [
    { title: `${config.bride}'in Ailesi`, father: parents.bride.father, mother: parents.bride.mother },
    { title: `${config.groom}'in Ailesi`, father: parents.groom.father, mother: parents.groom.mother },
  ];

  return (
    <section className="relative sec-pad">
      <div className="sec-wrap">
        <SectionHeading
          title="Aileler"
          subtitle="Bu günü birlikte hazırladığımız ailelerimiz"
          className="mb-12"
        />

        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {cards.map((c, i) => (
            <ScrollFade key={c.title} delay={i * 0.15}>
              <TiltCard className="h-full px-8 py-11 text-center">
                <p className="font-display gold-text text-2xl">{c.title}</p>
                <div className="ornament ornament--sm my-5" aria-hidden="true">
                  <i />
                </div>
                <div className="space-y-1.5 text-[15px] text-[color:var(--color-text)]/75">
                  <p>{c.father}</p>
                  <p>{c.mother}</p>
                </div>
              </TiltCard>
            </ScrollFade>
          ))}
        </div>
      </div>
    </section>
  );
}
