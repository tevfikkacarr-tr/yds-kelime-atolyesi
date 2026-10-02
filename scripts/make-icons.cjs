// Uygulama ikonlarını üretir (bir kez çalıştırılır; çıktı public/ altına commit edilir). Gerekli: playwright + chromium.
const { chromium } = require(process.env.PW_PATH || "playwright");
const path = require("path");
const font = "file://" + path.resolve(__dirname, "../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff2");
const sans = "file://" + path.resolve(__dirname, "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2");
const sansExt = "file://" + path.resolve(__dirname, "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-600-normal.woff2");
// Tasarım: koyu lacivert zemin, beyaz serif "YDS", altında açık mavi çizgi ve küçük "KELİME" etiketi — akademik, sade.
const svg = (size, { maskable = false, rounded = true } = {}) => {
  const pad = maskable ? size * 0.12 : 0, r = rounded && !maskable ? size * 0.22 : 0, inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f55ad"/><stop offset="1" stop-color="#1f3a7a"/></linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <g transform="translate(${pad},${pad})">
   <text x="${inner / 2}" y="${inner * 0.6}" text-anchor="middle" font-family="SS" font-weight="700" font-size="${inner * 0.36}" fill="#ffffff" letter-spacing="${inner * 0.005}">YDS</text>
   <rect x="${inner * 0.27}" y="${inner * 0.67}" width="${inner * 0.46}" height="${Math.max(2, inner * 0.022)}" rx="${inner * 0.011}" fill="#8fb0ff"/>
   ${inner >= 120 ? `<text x="${inner / 2}" y="${inner * 0.8}" text-anchor="middle" font-family="PS" font-weight="600" font-size="${inner * 0.085}" fill="#dfe6f6" letter-spacing="${inner * 0.018}">KELİME</text>` : ""}
  </g></svg>`;
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const p = await b.newPage();
  const jobs = [["icons/icon-192.png", 192, {}], ["icons/icon-512.png", 512, {}], ["icons/maskable-512.png", 512, { maskable: true }], ["icons/maskable-192.png", 192, { maskable: true }],
    ["apple-touch-icon.png", 180, { rounded: false }], ["icons/favicon-48.png", 48, {}], ["icons/favicon-32.png", 32, {}]];
  for (const [file, size, opt] of jobs) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><head><style>@font-face{font-family:SS;src:url(${font})}@font-face{font-family:PS;src:url(${sans});unicode-range:U+0000-00FF}@font-face{font-family:PS;src:url(${sansExt});unicode-range:U+0100-024F}html,body{margin:0;background:transparent}</style></head><body>${svg(size, opt)}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.resolve(__dirname, "../public/" + file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  require("fs").writeFileSync(path.resolve(__dirname, "../public/icons/icon.svg"), svg(512, {}).replace(/font-family="SS"/g, 'font-family="Georgia,serif"').replace(/font-family="PS"/g, 'font-family="system-ui,sans-serif"'));
  await b.close();
  console.log("icons ok");
})();
