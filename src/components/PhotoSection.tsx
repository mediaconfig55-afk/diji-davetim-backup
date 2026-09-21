"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Images } from "lucide-react";
import { defaultResolvedConfig, type ResolvedEventConfig } from "@/lib/event-config";
import ScrollFade from "./ScrollFade";
import SectionHeading from "./SectionHeading";
import TiltCard from "./TiltCard";

export default function PhotoSection({
  config = defaultResolvedConfig,
}: {
  config?: ResolvedEventConfig;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const uploadUrl = `${config.siteUrl.replace(/\/$/, "")}/upload`;

  useEffect(() => {
    QRCode.toDataURL(uploadUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#1a1420", light: "#f7f1e8" },
    }).then(setQrDataUrl);
  }, [uploadUrl]);

  return (
    <section className="relative sec-pad">
      <div className="sec-wrap">
      <SectionHeading
          title="Anı Fotoğrafları"
          subtitle="Çektiğiniz fotoğrafları QR kodu okutarak havuza ekleyin. Tüm fotoğraflar gece sona erdikten sonra herkese açılacak — o ana kadar kimse göremez."
          className="mb-12"
        />

      <ScrollFade className="mx-auto max-w-md">
        <TiltCard className="flex flex-col items-center px-6 py-8 text-center sm:px-10">
          <div className="rounded-2xl bg-[color:var(--color-text)] p-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Fotoğraf yükleme QR kodu" width={200} height={200} />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded-xl bg-black/10" />
            )}
          </div>

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
            <Link
              href="/upload"
              className="flex-1 rounded-xl bg-[linear-gradient(120deg,var(--color-primary),var(--color-primary-dark))] py-3 text-sm font-medium text-[#1a1420] transition hover:opacity-90"
            >
              Fotoğraf Yükle
            </Link>
            <Link
              href="/gallery"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm text-[color:var(--color-text)]/80 transition hover:border-[color:var(--color-primary)]/50"
            >
              <Images size={15} />
              Galeri
            </Link>
          </div>
        </TiltCard>
      </ScrollFade>
    </div>
    </section>
  );
}
