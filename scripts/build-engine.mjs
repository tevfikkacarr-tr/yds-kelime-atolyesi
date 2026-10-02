// Motor parçalarını sırayla tek bir istemci modülünde birleştirir ve service worker'ı sürüm numarasıyla üretir.
// Davranış değişmez: parçalar, tek dosyalı v5.1 sürümünün birebir bölünmüş halidir.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const order = JSON.parse(readFileSync(join(root, "scripts/engine-order.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const body = order.map((p) => readFileSync(join(root, p), "utf8")).join("\n");
const header = `// @ts-nocheck\n/* eslint-disable */\n/* OTOMATİK ÜRETİLDİ — düzenleme! Kaynak: src/engine/** (sıra: scripts/engine-order.json). */\n"use strict";\n`;
const out = join(root, "src/engine/app.generated.js");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, header + body);

// Önbellek sürümü: Vercel'de commit SHA, yerelde git veya zaman damgası
let rev = process.env.VERCEL_GIT_COMMIT_SHA || "";
if (!rev) { try { rev = execSync("git rev-parse --short HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { rev = ""; } }
if (!rev) rev = Date.now().toString(36);
const version = `${pkg.version}-${rev.slice(0, 12)}`;
const sw = readFileSync(join(root, "scripts/sw.template.js"), "utf8").replace("__CACHE_VERSION__", version);
writeFileSync(join(root, "public/sw.js"), sw);
writeFileSync(join(root, "src/lib/engine/build-info.json"), JSON.stringify({ version, engineParts: order.length }, null, 1) + "\n");
console.log(`engine: ${order.length} parça, ${(body.length / 1024).toFixed(0)} KB · sw sürümü ${version}`);
