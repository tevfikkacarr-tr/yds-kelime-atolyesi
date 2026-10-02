// Üretim derlemesi üzerinde tarayıcı duman testi (Playwright + Chromium). Kullanım: npm run build && node tests/smoke.mjs
// PLAYWRIGHT_PATH ile playwright konumu, CHROME_PATH ile tarayıcı verilebilir.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || 3123, URL = `http://localhost:${PORT}`;
const shots = join(root, "tests/.tmp"); mkdirSync(shots, { recursive: true });
const results = []; const ok = (c, m) => { results.push([!!c, m]); console.log((c ? "✓ " : "✗ ") + m); };

const server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], { cwd: root, stdio: "pipe" });
await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("server timeout")), 30000); server.stdout.on("data", (d) => { if (/Ready|started/i.test(String(d))) { clearTimeout(t); res(); } }); });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
const act = async (sel) => { await page.locator(sel).first().click(); };
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("ydsKelimeAtolyesi") || "null"));
async function playUntilDone(max = 400) {
  for (let i = 0; i < max; i++) {
    if (await page.locator("[data-act=self][data-v=know]").count()) { await act("[data-act=self][data-v=know]"); continue; }
    if (await page.locator("[data-act=reveal]").count()) { await act("[data-act=reveal]"); continue; }
    if (await page.locator("[data-act=orate][data-v=know]").count()) { await act("[data-act=orate][data-v=know]"); continue; }
    if (await page.locator("[data-act=rate][data-v=good]").count()) { await act("[data-act=rate][data-v=good]"); continue; }
    if (await page.locator("[data-act=rev][data-v='1']").count()) { await act("[data-act=rev][data-v='1']"); continue; }
    if (await page.locator("[data-act=ans]:not([disabled])").count()) { await act("[data-act=ans]:not([disabled])"); continue; }
    if (await page.locator("#nextbtn, [data-act=next]").count()) { await act("#nextbtn, [data-act=next]"); continue; }
    return i;
  }
  return max;
}

// 1) İlk açılış, karşılama, PWA kurulabilirlik
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("#app .stack, #app h1", { timeout: 15000 });
ok(await page.locator("text=YDS hedefin nedir?").count(), "ilk açılışta 3 adımlı karşılama");
const manifest = await page.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); const r = await fetch(l.href); return { status: r.status, ct: r.headers.get("content-type"), j: await r.json() }; });
ok(manifest.status === 200 && manifest.j.display === "standalone", "manifest servis ediliyor");
const meta = await page.evaluate(() => ({ apple: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'), title: document.title, desc: document.querySelector('meta[name="description"]')?.content, theme: !!document.querySelector('meta[name="theme-color"]'), vp: document.querySelector('meta[name="viewport"]')?.content, touch: !!document.querySelector('link[rel="apple-touch-icon"]') }));
ok(meta.apple && meta.touch && meta.theme && /viewport-fit=cover/.test(meta.vp) && meta.title === "YDS Kelime Atölyesi" && /aktif hatırlama/.test(meta.desc || ""), "iOS meta, theme-color, viewport-fit, başlık/açıklama");
await page.screenshot({ path: join(shots, "01-onboarding-390.png") });
await act('[data-act=ob][data-v="70–80"]'); await act('[data-act=ob][data-v="20"]'); await act('[data-act=ob][data-v="Yaklaşık 50"]');
await act("[data-act=start]");
await page.waitForSelector(".shead");
// 2) Kelime ve bağlam cevapla, oturumu tamamla
let sawCtx = false;
for (let i = 0; i < 400; i++) {
  if (await page.locator(".eyebrow:has-text('Bağlam')").count()) sawCtx = true;
  const left = await playUntilDone(1); if (left === 0) break;
}
await page.waitForSelector("text=Bugünün özeti", { timeout: 10000 }).catch(() => {});
ok(await page.locator("text=Today's Summary").count(), "günlük oturum tamamlandı → özet");
ok(sawCtx, "bağlam sorusu cevaplandı");
const s1 = await state(); ok(s1 && Object.keys(s1.cards).length >= 8, "kelime ilerlemesi kaydedildi (" + (s1 ? Object.keys(s1.cards).length : 0) + ")");
// 3) İlerleme, Mini YDS, okuma, cloze, favori, arama, ayarlar, yedek
await act("[data-act=tab][data-v=progress]"); ok(await page.locator("text=Kişisel performans paneli").count(), "İlerleme");
await act("[data-act=tab][data-v=study]"); await act("[data-act=ydsopen]"); await act("[data-act=ydsstart][data-v='5']"); await playUntilDone(60);
ok(await page.locator("text=Mini YDS sonucu").count(), "Mini YDS tamamlandı");
await act("[data-act=tab][data-v=study]"); await act(".sc[data-act=read]"); await playUntilDone(20); ok(await page.locator("text=Okuma köprüsü tamam").count(), "Okuma köprüsü");
await act("[data-act=tab][data-v=study]"); await act(".sc[data-act=clz]"); await playUntilDone(20); ok(await page.locator("text=Cloze köprüsü tamam").count(), "Cloze köprüsü");
await act("[data-act=tab][data-v=words]"); await page.fill("#wsearch", "decline"); await page.waitForTimeout(200);
ok(await page.locator(".wrow:has-text('decline')").count(), "arama");
await act(".wrow:has-text('decline')"); await act(".sheet [data-act=fav]"); await page.waitForTimeout(600); 
// geri tuşu panel kapatır
await page.goBack(); await page.waitForTimeout(200); ok((await page.locator(".sheet").count()) === 0 && (await page.url()).startsWith(URL), "geri tuşu kelime detayını kapatır");
const s2 = await state(); ok(s2.fav.includes("decline"), "favori kaydedildi");
await act("[data-act=tab][data-v=settings]"); ok(await page.locator("text=Yedekle").count() && await page.locator("text=Çalışma ilerlemen bu cihaz ve tarayıcıda saklanır").count(), "Ayarlar + yedek bölümü + cihaz notu");
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: URL });
await act("[data-act=copybackup]"); await page.waitForTimeout(300);
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
ok(clip.includes('"dataVersion":5') && clip.includes("scheduler-v2"), "Yedeği Kopyala → panoda geçerli yedek");
// 4) Yeniden yükleme ve kapat-aç
await page.reload({ waitUntil: "networkidle" }); await page.waitForSelector("#app .stack");
const s3 = await state(); ok(JSON.stringify(s3.cards) === JSON.stringify(s2.cards) && s3.fav.includes("decline") && s3.mini.length === 1, "yeniden yükleme sonrası veri korunuyor");
// 5) Oturum ortasında yenileme → kurtarma; geri tuşu → çıkış onayı
await act("[data-act=tab][data-v=home]"); await act("[data-act=extra], [data-act=start]");
await playUntilDone(3);
await page.goBack(); await page.waitForTimeout(200); ok(await page.locator("text=Oturumdan çıkılsın mı?").count(), "aktif oturumda geri → çıkış onayı");
await act("[data-act=close]");
await page.reload({ waitUntil: "networkidle" }); await page.waitForSelector("#app .stack");
ok(await page.locator("text=Yarım kalan çalışman var").count(), "yenileme sonrası yarım oturum önerisi");
await act("[data-act=resume]"); ok(await page.locator(".shead").count(), "oturum kaldığı yerden sürdü"); await playUntilDone(400);
// 6) Genişlikler
for (const w of [375, 390, 430]) { await page.setViewportSize({ width: w, height: 812 }); await act("[data-act=tab][data-v=home]"); await page.waitForTimeout(100);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); ok(!ov, `${w}px: yatay taşma yok`); await page.screenshot({ path: join(shots, `w${w}-home.png`) }); }
await page.setViewportSize({ width: 1280, height: 900 }); const appW = await page.evaluate(() => document.getElementById("app").getBoundingClientRect().width); ok(appW <= 700, "masaüstünde okunabilir genişlik (" + Math.round(appW) + "px)");
await page.setViewportSize({ width: 390, height: 844 });
// 7) Service worker ve çevrimdışı
const swState = await page.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 15000))]); return r ? { active: !!r.active, scope: r.scope } : { active: false }; });
ok(swState.active && swState.scope === URL + "/", "service worker etkin");
await page.waitForTimeout(1500);
const before = await state();
await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("#app .stack", { timeout: 15000 });
ok(await page.locator(".offline-pill:has-text('Çevrimdışı')").count(), "çevrimdışı gösterge");
ok(JSON.stringify((await state()).cards) === JSON.stringify(before.cards), "çevrimdışı açılışta veri aynı");
const cardsOff0 = Object.keys((await state()).cards).length;
await act("[data-act=tab][data-v=home]"); await act("[data-act=extra], [data-act=start]"); await playUntilDone(400);
ok(Object.keys((await state()).cards).length > cardsOff0, "çevrimdışı kelime çalışması (yeni kartlar kaydedildi)");
await act("[data-act=tab][data-v=study]"); await act("[data-act=ydsopen]"); await act("[data-act=ydsstart][data-v='5']"); await playUntilDone(60); ok(await page.locator("text=Mini YDS sonucu").count(), "çevrimdışı Mini YDS");
await act("[data-act=tab][data-v=study]"); await act(".sc[data-act=read]"); await playUntilDone(20); ok(await page.locator("text=Okuma köprüsü tamam").count(), "çevrimdışı okuma");
await act("[data-act=tab][data-v=progress]"); ok(await page.locator("text=Kişisel performans paneli").count(), "çevrimdışı ilerleme");
const offState = await state(); ok(offState.mini.length === before.mini.length + 1, "çevrimdışı cevaplar kaydedildi");
await page.close();
const page2 = await context.newPage(); await page2.goto(URL, { waitUntil: "domcontentloaded" }); await page2.waitForSelector("#app .stack", { timeout: 15000 });
const reopened = await page2.evaluate(() => JSON.parse(localStorage.getItem("ydsKelimeAtolyesi")));
ok(reopened.mini.length === offState.mini.length, "çevrimdışı kapat-aç sonrası veri korunuyor");
await context.setOffline(false);
// 8) Yeni sürüm (deployment) simülasyonu: sw.js değişir → "yeni sürüm hazır" → Güncelle → veri korunur
const swPath = join(root, "public/sw.js"); const orig = readFileSync(swPath, "utf8");
writeFileSync(swPath, orig.replace(/const VERSION = "([^"]+)"/, 'const VERSION = "$1-next"'));
await page2.reload({ waitUntil: "networkidle" }); await page2.waitForSelector("#app .stack");
await page2.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
await page2.waitForSelector(".update-toast", { timeout: 15000 }).catch(() => {});
ok(await page2.locator("text=yeni sürümü hazır").count(), "yeni sürüm bildirimi");
const pre = await page2.evaluate(() => localStorage.getItem("ydsKelimeAtolyesi"));
await Promise.all([page2.waitForEvent("load", { timeout: 15000 }).catch(() => {}), page2.locator(".update-toast button").click().catch(() => {})]);
await page2.waitForSelector("#app .stack", { timeout: 15000 });
const post = await page2.evaluate(() => localStorage.getItem("ydsKelimeAtolyesi"));
const caches = await page2.evaluate(async () => (await caches.keys()).join(","));
ok(pre === post, "güncelleme sonrası ilerleme aynen korunuyor");
ok(/-next/.test(caches) && caches.split(",").filter((k) => k.startsWith("yds-app-")).length === 1, "eski önbellek silindi, yeni sürüm etkin (" + caches + ")");
writeFileSync(swPath, orig);
ok(errors.length === 0, "konsolda hata yok" + (errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""));
await browser.close(); server.kill();
const failed = results.filter((r) => !r[0]).length;
console.log(`\nSMOKE: ${results.length} kontrol · ${failed} başarısız`);
process.exit(failed ? 1 : 0);
