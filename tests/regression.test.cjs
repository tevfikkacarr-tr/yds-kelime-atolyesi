// Regresyon: Next.js'e taşınan motor ile tek dosyalı v5.1 sürümü aynı girdilerle AYNI öğrenme durumunu üretmeli.
const { createPage } = require("./lib/sandbox.cjs");
const { loadData, ENGINE, REFERENCE } = require("./lib/data.cjs");
const data = loadData();
const R = { tests: 0, checks: 0, failures: 0, log: [] };
function test(name, fn) { R.tests++; const f0 = R.failures; try { fn(); } catch (e) { R.failures++; R.log.push("  EXCEPTION " + e.message); } console.log((R.failures > f0 ? "✗ " : "✓ ") + name); R.log.splice(0).forEach((l) => console.log(l)); }
function ok(c, m) { R.checks++; if (!c) { R.failures++; R.log.push("     - " + m); } }

// Aynı deterministik senaryo (sabit saat + tohumlu rastgelelik)
const SCENARIO = `
function play(p){let g=0;while(SS&&g++<2000){const it=cur();
  if(["flash","learn","connfo"].includes(it.k)){if(SS.stage==="front"){if(it.open)SS.stage="back";else{SS.self=Math.random()<.7?"know":"unsure";SS.stage="back"}}const r=Math.random();rate(r<.1?"again":r<.2?"hard":r<.85?"good":"easy")}
  else if(it.k==="reverse"){SS.stage="back";record(it,Math.random()<p,null);next()}
  else if(["pair","ladder","passage","leech"].includes(it.k))next();
  else{const okI=it.opts.findIndex(o=>o.ok);answer(Math.random()<p?okI:(okI+1)%it.opts.length);next()}}}
`;
function runScenario(engineFile, withData) {
  const store = {};
  const page = createPage({ engineFile, data: withData ? data : null, store, seed: 42 });
  page.run(SCENARIO);
  for (let d = 0; d < 25; d++) {
    page.setDay(d);
    page.run(`startSession("daily");if(SS)play(.8);`);
    if (d % 4 === 1) page.run(`startSession("yds",10);play(.7);`);
    if (d % 5 === 2) page.run(`startSession("read");play(.7);`);
    if (d % 6 === 3) page.run(`startSession("clz");play(.7);`);
    if (d % 7 === 4) page.run(`if(weakList().length){startSession("weak");play(.6)}`);
    if (d % 3 === 0) page.run(`S.fav=[...new Set([...S.fav,Object.keys(S.cards)[0]])];`);
  }
  page.run("flush()");
  const out = JSON.parse(page.run(`JSON.stringify({S, metrics:Object.keys(S.cards).sort().map(id=>[id,recallProbability(id),masteryScore(id),transferScore(id)&&transferScore(id).score,Math.round(learningValueScore(id,today())*1e6)/1e6,[...wordTags(id)].sort().join("|")]),
    plan:(()=>{const p=planRaw("daily");return{review:p.review,newIds:p.newIds,weak:p.weak,early:p.early,dtc:p.dtc,load:p.load}})(),
    alg:ALG, dv:DATA_VERSION, words:W.length, bank:BANK.length+RD.length, passages:PASSAGES.length, clozes:CLOZES.length, status:statusMap(), report:JSON.stringify(realCalibration())})`));
  return { out, store };
}

const ref = runScenario(REFERENCE, false);
const neu = runScenario(ENGINE, true);

test("scheduler-v2 değişmedi (algoritma sürümü ve veri sürümü)", () => { ok(neu.out.alg === "scheduler-v2" && ref.out.alg === neu.out.alg, "alg"); ok(neu.out.dv === 5 && ref.out.dv === 5, "dataVersion"); });
test("öğrenme durumu birebir aynı (25 günlük deterministik senaryo)", () => {
  const a = JSON.stringify(ref.out.S), b = JSON.stringify(neu.out.S);
  ok(a === b, "S farklı");
  ok(Object.keys(neu.out.S.cards).length > 100, "senaryo yeterince kart üretti: " + Object.keys(neu.out.S.cards).length);
});
test("recall probability, mastery, transfer, learningValue ve iç etiketler aynı", () => {
  ok(JSON.stringify(ref.out.metrics) === JSON.stringify(neu.out.metrics), "metrikler farklı");
  ok(neu.out.metrics.length === Object.keys(neu.out.S.cards).length, "tüm kartlar");
});
test("günlük plan sıralaması (LearningValue) aynı", () => { ok(JSON.stringify(ref.out.plan) === JSON.stringify(neu.out.plan), "plan farklı"); });
test("kalibrasyon raporu ve durumlar aynı", () => { ok(ref.out.report === neu.out.report, "calibration"); ok(JSON.stringify(ref.out.status) === JSON.stringify(neu.out.status), "status"); });
test("içerik havuzu değişmedi", () => {
  ok(neu.out.words === 567 && ref.out.words === 567, "567 kelime");
  ok(neu.out.bank === 315 && ref.out.bank === 315, "315 Mini YDS");
  ok(neu.out.passages === 40 && neu.out.clozes === 30, "40 reading · 30 cloze");
});
test("kalıcı depoda aynı anahtar ve aynı içerik", () => {
  ok(ref.store["ydsKelimeAtolyesi"] === neu.store["ydsKelimeAtolyesi"], "ydsKelimeAtolyesi içeriği farklı");
  ok(!Object.keys(neu.store).some((k) => !k.startsWith("ydsKelimeAtolyesi")), "beklenmeyen anahtar");
});
console.log(`RESULT_JSON ${JSON.stringify({ suite: "regression", tests: R.tests, checks: R.checks, failures: R.failures })}`);
process.exitCode = R.failures ? 1 : 0;
