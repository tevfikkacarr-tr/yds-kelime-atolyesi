// Tüm test paketlerini çalıştırır: öğrenme motoru (70), regresyon (v5.1 ile birebir), dağıtım.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const suites = ["engine.test.cjs", "regression.test.cjs", "deploy.test.cjs"];
let tests = 0, checks = 0, failures = 0, crashed = false;
for (const s of suites) {
  const r = spawnSync(process.execPath, [join(here, s)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  const fails = out.split("\n").filter((l) => /^✗|^\s+- |EXCEPTION/.test(l));
  const m = out.match(/RESULT_JSON (.*)/);
  if (!m) { crashed = true; console.log(`✗ ${s}: sonuç alınamadı\n${out.slice(-2000)}`); continue; }
  const j = JSON.parse(m[1]);
  tests += j.tests; checks += j.checks; failures += j.failures;
  console.log(`${j.failures ? "✗" : "✓"} ${j.suite}: ${j.tests} test, ${j.checks} kontrol, ${j.failures} başarısız`);
  fails.slice(0, 20).forEach((l) => console.log("   " + l));
}
console.log(`\nTOPLAM: ${tests} test · ${checks} kontrol · ${failures} başarısız`);
process.exit(failures || crashed ? 1 : 0);
