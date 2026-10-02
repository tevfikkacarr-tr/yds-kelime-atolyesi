// Dağıtım (deployment) testleri: kalıcılık, oturum kurtarma, manifest, geçiş, service worker, çevrimdışı veri, yedek, adaptör, istemci/sunucu sınırı.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createPage } = require("./lib/sandbox.cjs");
const { loadData, ENGINE, REFERENCE } = require("./lib/data.cjs");
const ROOT = path.join(__dirname, "..");
const data = loadData();
const R = { tests: 0, checks: 0, failures: 0, log: [] };
async function test(name, fn) { R.tests++; const f0 = R.failures; try { await fn(); } catch (e) { R.failures++; R.log.push("  EXCEPTION " + e.message + " " + (e.stack || "").split("\n")[1]); } console.log((R.failures > f0 ? "✗ " : "✓ ") + name); R.log.splice(0).forEach((l) => console.log(l)); }
function ok(c, m) { R.checks++; if (!c) { R.failures++; R.log.push("     - " + m); } }
const open = (store, extra = {}) => createPage({ engineFile: ENGINE, data, store, ...extra });
const PLAY = `function answerAll(n){let k=0;while(SS&&k<n){const it=cur();if(["flash","learn","connfo"].includes(it.k)){SS.self="know";SS.stage="back";rate("good")}else if(it.k==="reverse"){SS.stage="back";record(it,true,null);next()}else if(it.opts){answer(it.opts.findIndex(o=>o.ok));next()}else next();k++}}`;
const pngSize = (f) => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), png: b.slice(1, 4).toString() === "PNG" }; };

(async () => {
  await test("LocalStorage kalıcılığı: kelime, favori ve Mini YDS sonucu kapat-aç sonrası korunur", () => {
    const store = {};
    const a = open(store);
    a.run(PLAY + `S.profile={skipped:true};startSession("daily");answerAll(8);exitSession();S.fav.push("increase");save();startSession("yds",5);answerAll(5);flush();`);
    const before = a.run("JSON.stringify({cards:Object.keys(S.cards).length,fav:S.fav,mini:S.mini.length,ev:S.ev.length})");
    const b = open(store);
    const after = b.run("JSON.stringify({cards:Object.keys(S.cards).length,fav:S.fav,mini:S.mini.length,ev:S.ev.length})");
    ok(before === after, `farklı: ${before} / ${after}`);
    ok(JSON.parse(after).cards > 0 && JSON.parse(after).mini === 1 && JSON.parse(after).fav.includes("increase"), "içerik");
  });

  await test("Yenileme kalıcılığı: kaydedilmemiş (debounce) cevaplar pagehide ile yazılır", () => {
    const store = {};
    const a = open(store);
    a.run(PLAY + `S.profile={skipped:true};startSession("daily");answerAll(6);`);
    const n = a.run("Object.keys(S.cards).length");
    a.fire("pagehide");
    const b = open(store);
    ok(b.run("Object.keys(S.cards).length") === n && n > 0, "kart sayısı " + n);
  });

  await test("Aktif oturum kurtarma: yenilemeden sonra kaldığı yerden devam", () => {
    const store = {};
    const a = open(store);
    a.run(PLAY + `S.profile={skipped:true};startSession("daily");answerAll(7);flush();`);
    const pos = a.run("JSON.stringify({pi:SS.pi,ii:SS.ii,q:SS.q,mode:SS.mode,n:SS.phases.length,id:cur().id})");
    ok(!!store["ydsKelimeAtolyesi.session"], "anlık görüntü yazıldı");
    const b = open(store);
    ok(b.run("!!pendingSession()") === true, "bekleyen oturum");
    ok(b.run("restoreSession()") === true, "geri yüklendi");
    const pos2 = b.run("JSON.stringify({pi:SS.pi,ii:SS.ii,q:SS.q,mode:SS.mode,n:SS.phases.length,id:cur().id})");
    ok(pos === pos2, `konum ${pos} / ${pos2}`);
    b.run(PLAY + `answerAll(500)`);
    ok(b.run("SS===null&&summary&&summary.type==='daily'") === true, "oturum tamamlandı");
    ok(!store["ydsKelimeAtolyesi.session"], "bitince anlık görüntü silindi");
    const c = open(store);
    ok(c.run("pendingSession()") === null, "tekrar sorulmaz");
    // Ertesi gün eski anlık görüntü önerilmez
    store["ydsKelimeAtolyesi.session"] = JSON.stringify({ v: 1, d: 0, ss: {} });
    ok(open(store).run("pendingSession()") === null, "eski güne ait anlık görüntü yok sayılır");
  });

  await test("Manifest geçerliliği ve ikonlar", () => {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, "public/manifest.webmanifest"), "utf8"));
    ok(m.name === "YDS Kelime Atölyesi" && m.short_name === "YDS Atölyesi", "ad");
    ok(m.display === "standalone" && m.start_url === "/" && m.scope === "/" && m.orientation === "portrait-primary", "display/start_url/scope/orientation");
    ok(/^#[0-9a-f]{6}$/i.test(m.background_color) && /^#[0-9a-f]{6}$/i.test(m.theme_color), "renkler");
    for (const size of [192, 512]) {
      const any = m.icons.find((i) => i.sizes === `${size}x${size}` && i.purpose === "any"), mask = m.icons.find((i) => i.sizes === `${size}x${size}` && i.purpose === "maskable");
      ok(any && mask, size + " ikon tanımı");
      for (const ic of [any, mask]) { const s = pngSize(path.join(ROOT, "public", ic.src)); ok(s.png && s.w === size && s.h === size, ic.src + " boyutu"); }
    }
    const apple = pngSize(path.join(ROOT, "public/apple-touch-icon.png")); ok(apple.w === 180, "apple-touch-icon 180");
    const layout = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
    ok(/apple-mobile-web-app-capable/.test(layout) && /appleWebApp/.test(layout) && /viewportFit: "cover"/.test(layout) && /themeColor/.test(layout), "iOS meta + safe-area + theme-color");
  });

  await test("Yeni sürüm sonrası geçiş: eski (tek dosyalı v5.1) sürümün verisi aynen okunur", () => {
    const store = {};
    // v1 eski anahtar + v5.1 ile üretilmiş aktivite
    const t0 = Math.floor(Date.UTC(2026, 9, 2, 9) / 86400000);
    store["ydsKelimeAtolyesi.v1"] = JSON.stringify({ cards: { increase: { step: 2, due: t0, reps: 3, lapses: 0, correct: 4, wrong: 1, first: t0 - 5, last: t0 - 1 } }, days: {}, streak: 3, last: t0 - 1 });
    const old = createPage({ engineFile: REFERENCE, store, seed: 7 });
    old.run(PLAY + `S.profile={skipped:true};startSession("daily");answerAll(30);exitSession();S.fav.push("decline");startSession("yds",5);answerAll(5);flush();`);
    const before = old.run("JSON.stringify({S, m:Object.keys(S.cards).map(id=>[id,masteryScore(id),recallProbability(id)])})");
    const neu = open(store);
    const after = neu.run("JSON.stringify({S, m:Object.keys(S.cards).map(id=>[id,masteryScore(id),recallProbability(id)])})");
    ok(before === after, "durum, ustalık ve hatırlama olasılığı aynı");
    ok(neu.run("S.dataVersion") === 5 && neu.run("S.fav.includes('decline')") && neu.run("S.mini.length") === 1 && neu.run("S.streak") >= 1, "sürüm/favori/Mini YDS/seri");
  });

  await test("Bozuk kayıt üzerine yazılmaz (veri güvenliği)", () => {
    const store = { ydsKelimeAtolyesi: "{bozuk json" };
    const a = open(store);
    a.run("flush()");
    const k = Object.keys(store).find((x) => x.startsWith("ydsKelimeAtolyesi.corrupt-"));
    ok(k && store[k] === "{bozuk json", "bozuk ham veri ayrı anahtara kopyalandı");
  });

  await test("PWA önbellek sürümü: eski önbellekler silinir, kişisel veriye dokunulmaz", async () => {
    const sw = fs.readFileSync(path.join(ROOT, "public/sw.js"), "utf8");
    const info = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/engine/build-info.json"), "utf8"));
    ok(sw.includes(`"${info.version}"`) && !sw.includes("__CACHE_VERSION__"), "sürüm gömülü: " + info.version);
    ok(!/localStorage|indexedDB/.test(sw.replace(/\/\*[\s\S]*?\*\//g, "")), "service worker kullanıcı verisine erişmez");
    const env = makeSW(sw, { "/": "<html><script src=\"/_next/static/chunks/a.js\"></script></html>", "/_next/static/chunks/a.js": "js" });
    env.caches._store.set("yds-app-old", new Map([["/", "old"]]));
    env.caches._store.set("baska-uygulama", new Map());
    await env.dispatch("install"); await env.dispatch("activate");
    const keys = [...env.caches._store.keys()];
    ok(keys.includes("yds-app-" + info.version) && !keys.includes("yds-app-old") && keys.includes("baska-uygulama"), "önbellekler: " + keys.join(","));
    ok(env.caches._store.get("yds-app-" + info.version).has("/_next/static/chunks/a.js"), "kabuktaki JS önceden önbelleğe alındı");
    ok(!env.skipped, "yeni sürüm kullanıcı onayı olmadan etkinleşmez");
    await env.dispatch("message", { data: { type: "SKIP_WAITING" } }); ok(env.skipped, "Güncelle → skipWaiting");
  });

  await test("Çevrimdışı veri erişimi: içerik modülleri eksiksiz, ağ yokken önbellekten servis", async () => {
    ok(data.words.length === 567 && data.content.bank.length + data.content.reading.length === 315 && data.content.passages.length === 40 && data.content.clozes.length === 30, "veri modülleri");
    const ctx = data.words.reduce((a, w) => a + 2 + (w.x2 ? 1 : 0) + (w.cx || []).length, 0); ok(ctx === 1786, "1.786 bağlam cümlesi: " + ctx);
    const load = fs.readFileSync(path.join(ROOT, "src/lib/engine/load.ts"), "utf8");
    ok(!/fetch\(/.test(load) && (load.match(/import\("@\/data\//g) || []).length === 9, "veri ağ API'si değil, paketlenmiş modül");
    const sw = fs.readFileSync(path.join(ROOT, "public/sw.js"), "utf8");
    const env = makeSW(sw, { "/": "<html>shell</html>", "/_next/static/chunks/data.js": "DATA" });
    await env.dispatch("install"); await env.dispatch("activate");
    await env.dispatch("message", { data: { type: "CACHE_URLS", urls: ["https://app.test/_next/static/chunks/data.js"] } });
    env.offline = true;
    const nav = await env.fetch({ url: "https://app.test/", mode: "navigate", method: "GET" });
    ok(nav && (await nav.text()) === "<html>shell</html>", "çevrimdışı açılış kabuğu");
    const st = await env.fetch({ url: "https://app.test/_next/static/chunks/data.js", mode: "cors", method: "GET" });
    ok(st && (await st.text()) === "DATA", "çevrimdışı veri parçası");
  });

  await test("Üretim yedeği gidiş-dönüş (yeni sürümde dışa → başka cihazda içe)", () => {
    const a = open({});
    a.run(PLAY + `S.profile={skipped:true};startSession("daily");answerAll(25);exitSession();S.fav.push("increase");flush();`);
    const txt = a.run("exportText()");
    const b = open({});
    b.run(`var __r=validateBackup(${JSON.stringify(txt)});doImport(__r.state);`);
    ok(b.run("JSON.stringify(S.cards)") === a.run("JSON.stringify(S.cards)"), "kartlar");
    ok(b.run("JSON.stringify(S.qstats)") === a.run("JSON.stringify(S.qstats)") && b.run("S.fav.includes('increase')"), "soru istatistikleri ve favoriler");
    ok(JSON.parse(txt).dataVersion === 5 && JSON.parse(txt).algorithmVersion === "scheduler-v2", "sürüm bilgisi");
  });

  await test("Depolama adaptörü: motor kişisel veriye yalnızca adaptör üzerinden erişir", () => {
    const calls = []; const mem = {};
    const adapter = { kind: "memory", get: (k) => { calls.push(["get", k]); return k in mem ? mem[k] : null; }, set: (k, v) => { calls.push(["set", k]); mem[k] = v; }, remove: (k) => { calls.push(["remove", k]); delete mem[k]; } };
    const store = {};
    const p = createPage({ engineFile: ENGINE, data, store, adapter });
    p.run(PLAY + `S.profile={skipped:true};startSession("daily");answerAll(5);flush();`);
    ok(calls.some((c) => c[0] === "set" && c[1] === "ydsKelimeAtolyesi") && !!mem.ydsKelimeAtolyesi, "adaptöre yazıldı");
    ok(Object.keys(store).length === 0, "doğrudan localStorage kullanılmadı");
    const ts = fs.readFileSync(path.join(ROOT, "src/lib/storage/adapter.ts"), "utf8");
    ok(/interface StorageAdapter/.test(ts) && /class LocalStorageAdapter/.test(ts), "TS arayüzü");
    const all = walk(path.join(ROOT, "src")).filter((f) => /\.(js|ts|tsx)$/.test(f) && !f.endsWith("app.generated.js"));
    const code = (f) => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    ok(!all.some((f) => /localStorage\.clear\s*\(/.test(code(f))), "localStorage.clear() hiçbir yerde çağrılmıyor");
  });

  await test("İstemci/sunucu sınırı: sunucu bileşenleri tarayıcı API'si kullanmaz", () => {
    for (const f of ["src/app/layout.tsx", "src/app/page.tsx", "src/app/not-found.tsx"]) {
      const s = fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\/.*$/gm, "");
      ok(!/\b(window|document|localStorage|navigator)\b/.test(s) && !/"use client"/.test(s), f + " sunucu bileşeni temiz");
    }
    const shell = fs.readFileSync(path.join(ROOT, "src/components/AppShell.tsx"), "utf8");
    ok(shell.startsWith('"use client"') && /useEffect\(\(\) => \{[\s\S]*startEngine\(/.test(shell), "motor yalnızca istemcide, useEffect içinde başlar");
    const html = path.join(ROOT, ".next/server/app/index.html");
    if (fs.existsSync(html)) { const h = fs.readFileSync(html, "utf8"); ok(h.includes("engine-host") && !h.includes('id="app"') && h.includes("manifest.webmanifest"), "önceden üretilen HTML yalnızca kabuk içerir"); }
    else ok(true, "build yok (atlandı)");
  });

  console.log(`RESULT_JSON ${JSON.stringify({ suite: "deploy", tests: R.tests, checks: R.checks, failures: R.failures })}`);
  process.exitCode = R.failures ? 1 : 0;
})();

function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])); }

// Basit service worker çalışma ortamı (Cache API + fetch taklidi)
function makeSW(code, net) {
  const handlers = {};
  class Resp { constructor(body, init = {}) { this._b = String(body); this.status = init.status || 200; this.ok = this.status < 400; } clone() { return new Resp(this._b, { status: this.status }); } async text() { return this._b; } }
  const store = new Map();
  const keyOf = (r) => { const u = typeof r === "string" ? r : r.url; return u.replace("https://app.test", ""); };
  const cacheObj = (m) => ({ match: async (r) => (m.has(keyOf(r)) ? new Resp(m.get(keyOf(r))) : undefined), put: async (r, res) => { m.set(keyOf(r), await res.text()); } });
  const env = { offline: false, skipped: false, caches: { _store: store, open: async (n) => { if (!store.has(n)) store.set(n, new Map()); return cacheObj(store.get(n)); }, keys: async () => [...store.keys()], delete: async (n) => store.delete(n) } };
  const self = { location: { origin: "https://app.test" }, addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting: () => { env.skipped = true; }, clients: { claim: async () => {} } };
  const ctx = { self, caches: env.caches, URL, Response: Resp, Promise, Set, Map, JSON, console,
    fetch: async (r) => { if (env.offline) throw new Error("offline"); const k = keyOf(r); if (k in net) return new Resp(net[k]); return new Resp("nf", { status: 404 }); } };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  env.dispatch = async (t, extra = {}) => { const ps = []; const ev = Object.assign({ waitUntil: (p) => ps.push(p) }, extra); if (handlers[t]) handlers[t](ev); await Promise.all(ps); };
  env.fetch = async (req) => { let res; const ev = { request: req, respondWith: (p) => { res = p; } }; handlers.fetch(ev); return res ? await res : undefined; };
  return env;
}
