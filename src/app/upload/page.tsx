"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { defaultResolvedConfig } from "@/lib/event-config";
import FloatingBackground from "@/components/FloatingBackground";

const BUCKET = "wedding-photos";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// supabase/hardening.sql bucket'a 25 MB sınırı koyuyor. Buradaki değer onunla
// aynı olmalı: aksi halde misafir yüklemeye başlıyor ve sunucu reddediyor.
const MAX_FILE_BYTES = 25 * 1024 * 1024;
// Tek seferde çok fazla dosya seçmek mobil tarayıcıyı kilitliyor.
const MAX_FILES_PER_BATCH = 30;
// hardening.sql'deki allowed_mime_types ile aynı liste.
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif",
];
const MAX_NAME_LENGTH = 60;

// Supabase'in ham hata metni misafire bir şey anlatmıyor ("new row violates
// row-level security policy" gibi). Sık karşılaşılanları anlaşılır cümleye çevir.
function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("exceeded the maximum allowed size") || s.includes("payload too large")) {
    return "Fotoğraf çok büyük. 25 MB'ın altındaki bir kareyi deneyin.";
  }
  if (s.includes("mime type") || s.includes("invalid_mime_type")) {
    return "Bu dosya türü desteklenmiyor. Lütfen bir fotoğraf seçin.";
  }
  if (s.includes("row-level security") || s.includes("violates")) {
    return "Yükleme reddedildi. Lütfen tekrar deneyin ya da çiftle iletişime geçin.";
  }
  if (s.includes("ağ") || s.includes("network") || s.includes("failed to fetch")) {
    return "Bağlantı koptu. İnternetinizi kontrol edip tekrar deneyin.";
  }
  return "Fotoğraf yüklenemedi. Lütfen tekrar deneyin.";
}

function uploadFileWithProgress(path: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(xhr.responseText || `Yükleme hatası (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Ağ hatası, bağlantını kontrol et."));
    xhr.send(file);
  });
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploaderName, setUploaderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [names, setNames] = useState({
    bride: defaultResolvedConfig.bride,
    groom: defaultResolvedConfig.groom,
  });

  // İsimler admin panelinden değiştirilmiş olabilir; davetiye sayfasıyla
  // aynı kaynaktan oku ki iki sayfa farklı isim göstermesin.
  useEffect(() => {
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg?.bride_name && cfg?.groom_name) {
          setNames({ bride: cfg.bride_name, groom: cfg.groom_name });
        }
      })
      .catch(() => {});
  }, []);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);

    // Sunucunun zaten reddedeceği dosyaları buradan ele: misafir yüklemenin
    // ortasında değil, seçim anında öğrensin.
    const tooLarge = selected.filter((f) => f.size > MAX_FILE_BYTES);
    const wrongType = selected.filter(
      (f) => f.type && !ALLOWED_TYPES.includes(f.type.toLowerCase())
    );
    const skipped = new Set([...tooLarge, ...wrongType]);
    let usable = selected.filter((f) => !skipped.has(f));

    const notes: string[] = [];
    if (tooLarge.length > 0) notes.push(`${tooLarge.length} dosya 25 MB'ı aştı`);
    if (wrongType.length > 0) notes.push(`${wrongType.length} dosya fotoğraf değil`);

    if (usable.length > MAX_FILES_PER_BATCH) {
      notes.push(`tek seferde en fazla ${MAX_FILES_PER_BATCH} fotoğraf yüklenebilir`);
      usable = usable.slice(0, MAX_FILES_PER_BATCH);
    }

    setFiles(usable);
    setError(
      notes.length > 0
        ? `${notes.join(", ")}. ${usable.length > 0 ? "Kalanlar yüklenebilir." : ""}`.trim()
        : null
    );
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError("Lütfen en az bir fotoğraf seçin.");
      return;
    }
    setUploading(true);
    setError(null);
    setProgress(0);
    let successCount = 0;
    let lastErrorMessage: string | null = null;

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    let uploadedBytesBase = 0;

    for (const file of files) {
      // Uzantısı olmayan dosyalarda split(".").pop() dosya adının tamamını
      // döndürüyordu; uzantıyı yalnızca gerçekten varsa kullan.
      const dotIndex = file.name.lastIndexOf(".");
      const rawExt = dotIndex > 0 ? file.name.slice(dotIndex + 1) : "";
      const ext = /^[a-zA-Z0-9]{1,8}$/.test(rawExt) ? rawExt.toLowerCase() : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      try {
        await uploadFileWithProgress(path, file, (fraction) => {
          setProgress((uploadedBytesBase + fraction * file.size) / totalBytes);
        });
        uploadedBytesBase += file.size;
        setProgress(uploadedBytesBase / totalBytes);

        const { error: insertError } = await supabaseBrowser.from("photos").insert({
          storage_path: path,
          // hardening.sql 60 karakterde kesiyor; burada da kırp ki
          // uzun isim yüzünden kayıt tamamen düşmesin.
          uploader_name: uploaderName.trim().slice(0, MAX_NAME_LENGTH) || null,
        });

        if (insertError) {
          lastErrorMessage = insertError.message;
          continue;
        }

        successCount++;
      } catch (e) {
        lastErrorMessage = e instanceof Error ? e.message : String(e);
        uploadedBytesBase += file.size;
      }
    }

    setUploading(false);
    setUploadedCount((c) => c + successCount);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";

    if (successCount === 0) {
      // Ham Supabase hatasını misafire gösterme; anlaşılır karşılığını ver.
      setError(
        lastErrorMessage
          ? friendlyError(lastErrorMessage)
          : "Fotoğraflar yüklenemedi, lütfen tekrar deneyin."
      );
    } else if (lastErrorMessage) {
      setError(`${successCount} fotoğraf yüklendi, bir kısmı yüklenemedi. Kalanları tekrar deneyin.`);
    }
  }

  return (
    <div className="relative min-h-screen px-6 py-16">
      <FloatingBackground />

      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[color:var(--color-text)]/60 hover:text-[color:var(--color-primary)]"
        >
          <ArrowLeft size={15} />
          Davetiyeye dön
        </Link>

        <div className="glass-card rounded-3xl px-6 py-8 text-center sm:px-10">
          <Camera className="mx-auto mb-4 text-[color:var(--color-primary)]" size={26} />
          <h1 className="font-display gold-text text-2xl">Anı Fotoğrafı Ekle</h1>
          <p className="mt-2 text-sm text-[color:var(--color-text)]/60">
            {names.bride} & {names.groom} için çektiğiniz fotoğrafları
            havuza ekleyin. Fotoğraflar gece bitene kadar sadece havuzda saklanır, kimse göremez.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleSelect}
            className="hidden"
            id="photo-input"
          />

          <label
            htmlFor="photo-input"
            className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--color-primary)]/40 px-6 py-10 text-sm text-[color:var(--color-text)]/70 transition hover:border-[color:var(--color-primary)]"
          >
            <ImagePlus size={22} />
            {files.length > 0 ? `${files.length} fotoğraf seçildi` : "Fotoğraf çek veya seç"}
          </label>

          <input
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="name"
            placeholder="Adınız (opsiyonel)"
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-text)]/35 focus:border-[color:var(--color-primary)]"
          />

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

          {uploading && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(120deg,var(--color-primary),var(--color-primary-dark))]"
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ ease: "linear", duration: 0.15 }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[color:var(--color-text)]/50">
                {Math.round(progress * 100)}%
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,var(--color-primary),var(--color-primary-dark))] py-3 text-sm font-medium text-[#1a1420] transition hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="animate-spin" size={16} /> : null}
            {uploading ? "Yükleniyor…" : "Havuza Ekle"}
          </button>

          {uploadedCount > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center justify-center gap-2 text-sm text-[color:var(--color-primary)]"
            >
              <CheckCircle2 size={16} />
              {uploadedCount} fotoğraf havuza eklendi
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
