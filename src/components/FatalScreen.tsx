"use client";

import { useState } from "react";
import { readRawBackup } from "@/lib/storage/adapter";

/** Beyaz ekran yerine gösterilen güvenli hata ekranı. Kullanıcı verisini asla silmez veya sıfırlamaz. */
export default function FatalScreen({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const [backup, setBackup] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error);

  return (
    <div className="fatal-screen" role="alert">
      <h1>Uygulama açılırken bir sorun oluştu.</h1>
      <p>İlerlemen silinmedi; bu cihazda saklanmaya devam ediyor.</p>
      <div className="fatal-actions">
        <button className="btn btn-primary" onClick={() => (onRetry ? onRetry() : window.location.reload())}>
          Tekrar Dene
        </button>
        <button className="btn btn-ghost" onClick={() => setBackup(readRawBackup())}>
          Yedeği Dışa Aktar
        </button>
        <button className="btn btn-ghost" onClick={() => setDetails((d) => !d)}>
          Ayrıntıları Gör
        </button>
      </div>
      {backup !== null && (
        <div className="fatal-backup">
          <p>Bu metni kopyalayıp güvenli bir yere kaydet. Uygulama düzelince Ayarlar → Yedeği İçe Aktar ile geri yükleyebilirsin.</p>
          <textarea readOnly value={backup || "(Bu cihazda kayıtlı ilerleme bulunamadı.)"} aria-label="Yedek metni" />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              navigator.clipboard
                ?.writeText(backup)
                .then(() => setCopied(true))
                .catch(() => setCopied(false))
            }
          >
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
      )}
      {details && <pre className="fatal-details">{text}</pre>}
    </div>
  );
}
