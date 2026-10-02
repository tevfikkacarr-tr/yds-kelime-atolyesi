"use client";

import { useEffect, useRef, useState } from "react";
import { createStorageAdapter } from "@/lib/storage/adapter";
import { preloadContent, startEngine } from "@/lib/engine/load";
import { registerServiceWorker, setupInstallPrompt } from "@/lib/pwa/register";
import FatalScreen from "@/components/FatalScreen";

/** Motorun kullandığı DOM kabuğu. React bu düğümün çocuklarını yönetmez (hydration uyuşmazlığı olmaz). */
const SHELL = `
<main id="app" aria-live="off"></main>
<nav id="tabs" aria-label="Bölümler"><div class="in">
  <button class="tab" data-act="tab" data-v="home">Bugün</button>
  <button class="tab" data-act="tab" data-v="study">Çalış</button>
  <button class="tab" data-act="tab" data-v="words">Kelimeler</button>
  <button class="tab" data-act="tab" data-v="progress">İlerleme</button>
  <button class="tab" data-act="tab" data-v="settings">Ayarlar</button>
</div></nav>
<div id="sheet"></div>
<div id="live" class="sr" aria-live="polite"></div>`;

let shellBuilt = false;
// İçerik indirmesi modül yüklenir yüklenmez başlar (yalnızca tarayıcıda); ilk ekran daha erken hazır olur.
preloadContent();

export default function AppShell() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<unknown>(null);
  const [online, setOnline] = useState(true);
  const [update, setUpdate] = useState<null | (() => void)>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!shellBuilt) {
      host.innerHTML = SHELL;
      shellBuilt = true;
    }
    setupInstallPrompt();
    startEngine(createStorageAdapter())
      .then(() => setPhase("ready"))
      .catch((e) => {
        console.error("[YDS] engine start error", e);
        setError(e);
        setPhase("error");
      });
    registerServiceWorker((apply) => setUpdate(() => apply));
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <>
      <div ref={hostRef} className="engine-host" suppressHydrationWarning />
      {phase === "loading" && (
        <div className="boot" role="status" aria-live="polite">
          <div className="boot-brand">YDS Kelime Atölyesi</div>
          <div className="boot-sub">Yükleniyor…</div>
        </div>
      )}
      {phase === "error" && <FatalScreen error={error} />}
      {!online && (
        <div className="offline-pill" role="status">
          Çevrimdışı
        </div>
      )}
      {update && (
        <div className="update-toast" role="status">
          <span>YDS Kelime Atölyesi&apos;nin yeni sürümü hazır.</span>
          <button className="btn btn-primary btn-sm" onClick={() => update()}>
            Güncelle
          </button>
        </div>
      )}
    </>
  );
}
