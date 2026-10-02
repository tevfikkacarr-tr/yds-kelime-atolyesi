/** Service worker kaydı ve güncelleme akışı (yalnızca üretim derlemesinde, yalnızca istemcide). */
export type UpdateListener = (apply: () => void) => void;

export function registerServiceWorker(onUpdate: UpdateListener): void {
  if (process.env.NODE_ENV !== "production") return;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const offer = (reg: ServiceWorkerRegistration) => {
    const waiting = reg.waiting;
    if (!waiting || !navigator.serviceWorker.controller) return;
    onUpdate(() => {
      // Yerel veri önce diske yazılır; güncelleme localStorage'a dokunmaz.
      try {
        (window as unknown as { __ydsFlush?: () => void }).__ydsFlush?.();
      } catch {}
      waiting.postMessage({ type: "SKIP_WAITING" });
    });
  };

  const run = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      offer(reg);
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed") offer(reg);
        });
      });
      // İlk ziyarette yüklenen dosyaları çevrimdışı kullanım için önbelleğe aldır
      const ready = await navigator.serviceWorker.ready;
      const urls = [location.origin + "/", ...performance.getEntriesByType("resource").map((e) => e.name)].filter((u) => u.startsWith(location.origin));
      ready.active?.postMessage({ type: "CACHE_URLS", urls });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    } catch {
      /* SW desteklenmiyorsa uygulama yine çalışır */
    }
  };
  // Bileşen, sayfa "load" olayından sonra da bağlanabilir: o durumda hemen kaydet.
  if (document.readyState === "complete") void run();
  else window.addEventListener("load", () => void run(), { once: true });
}

/** "Ana ekrana ekle" desteği: Android/Chrome'da beforeinstallprompt yakalanır; iOS'ta açıklama gösterilir. */
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function setupInstallPrompt(): void {
  if (typeof window === "undefined") return;
  let deferred: BIPEvent | null = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // agresif açılır pencere yok; Ayarlar'dan tetiklenir
    deferred = e as BIPEvent;
    (window as unknown as { __ydsRender?: () => void }).__ydsRender?.();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
  });
  const nav = navigator as Navigator & { standalone?: boolean };
  (window as unknown as { __ydsInstall: unknown }).__ydsInstall = {
    canPrompt: () => !!deferred,
    prompt: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
    },
    standalone: () => window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true,
    ios: () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
  };
}
