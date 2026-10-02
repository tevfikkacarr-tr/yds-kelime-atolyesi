# YDS Kelime Atölyesi

YDS kelimelerini aktif hatırlama, aralıklı tekrar ve sınav odaklı çalışmalarla öğrenmek için mobil öncelikli, kurulabilir (PWA), çevrimdışı çalışabilen ve verisi cihazda kalan (local-first) bir web uygulaması.

| | |
|---|---|
| Sürüm | 5.1.0 · veri sürümü v5 · algoritma `scheduler-v2` |
| İçerik | 567 kelime (558 çekirdek + 9 destek) · 1.786 bağlam cümlesi · 315 Mini YDS sorusu · 40 okuma pasajı · 30 cloze pasajı |
| Teknoloji | Next.js 15 (App Router) + TypeScript · istemci tarafı öğrenme motoru · service worker |
| Veri | Tarayıcı `localStorage` (anahtar: `ydsKelimeAtolyesi`). Sunucu, veritabanı veya hesap yok. |

## Project

```
src/
  app/                 Next.js App Router (layout, page, error, global-error, not-found, globals.css)
  components/          React kabuğu: AppShell (motoru istemcide başlatır), ErrorBoundary, FatalScreen
  lib/
    storage/adapter.ts StorageAdapter arayüzü + LocalStorageAdapter (ileride CloudStorageAdapter)
    engine/load.ts     İçerik modüllerini yükler ve öğrenme motorunu yalnızca tarayıcıda başlatır
    pwa/register.ts    Service worker kaydı, güncelleme bildirimi, "Ana ekrana ekle"
  engine/              Öğrenme motoru (scheduler-v2). Mantıksal parçalar:
    lib/scheduler/     hafıza modeli, planlama, zamanlama
    lib/storage/       durum, geçiş (v1→v5), yedek doğrulama
    lib/analytics/     olay günlüğü, bakım, koçluk
    lib/validation/    içerik doğrulama (#debug)
    features/          reviews, vocabulary, mini-yds, progress, calibration, settings
    components/        ekranlar, paneller, gezinme, olaylar
  data/                İçerik modülleri (vocabulary, questions, reading, cloze, semantic-ladders)
public/                manifest.webmanifest, ikonlar, sw.js (derlemede üretilir)
scripts/               build-engine.mjs (motor parçalarını birleştirir, sw.js sürümünü yazar), sw.template.js, make-icons.cjs
tests/                 engine (70 test), regression (v5.1 ile birebir), deploy, smoke (tarayıcı)
tools/content/         İçeriğin kaynak dosyaları ve derleyicileri (derleme için gerekmez)
```

Motor parçaları `scripts/engine-order.json` sırasıyla tek bir istemci modülünde (`src/engine/app.generated.js`) birleştirilir. Bu dosya üretilir; düzenlemeler `src/engine/**` parçalarında yapılır. Sunucu bileşenleri tarayıcı API'si kullanmaz; motor `AppShell` içinde `useEffect` ile yalnızca istemcide yüklenir.

## Local Development

Gereken: Node.js 18.18+ (önerilen 20 veya 22).

```bash
npm install
npm run dev          # http://localhost:3000 (service worker yalnızca üretim derlemesinde etkindir)
```

## Build

```bash
npm run build        # prebuild: motoru birleştirir ve public/sw.js'i sürüm numarasıyla üretir
npm run start        # üretim sunucusu
npm run typecheck    # TypeScript (0 hata)
npm run lint         # ESLint (0 hata)
```

## Tests

```bash
npm test             # motor (70) + regresyon + dağıtım testleri
npm run build && node tests/smoke.mjs   # tarayıcı duman testi (Playwright + Chromium gerekir)
```

- **engine** — öğrenme algoritması, geçişler, yedek, kalibrasyon (70 test).
- **regression** — Next.js'e taşınan motor, tek dosyalı v5.1 sürümüyle (`tests/fixtures`) aynı deterministik senaryoda birebir aynı öğrenme durumunu, hatırlama olasılığını, ustalığı, aktarımı ve günlük planı üretir.
- **deploy** — localStorage kalıcılığı, yenileme, oturum kurtarma, manifest/ikonlar, eski sürüm verisinin geçişi, bozuk kaydın korunması, service worker önbellek sürümü, çevrimdışı veri, yedek gidiş-dönüş, depolama adaptörü, istemci/sunucu sınırı.
- **smoke** — üretim sunucusunda tam kullanıcı akışı, geri tuşu, çevrimdışı mod ve "yeni sürüm" güncellemesi.

## Vercel Deployment

Ek ayar gerekmez; Vercel Next.js projesini otomatik tanır. `vercel.json` ve ortam değişkeni yoktur (uygulamada gizli anahtar yok).

1. Bu klasörü bir GitHub deposuna gönder (`main` dalı).
2. vercel.com → **Add New… → Project** → depoyu seç → **Deploy**.
3. `main` dalına her gönderim üretim (production) dağıtımı, diğer dallar ve pull request'ler önizleme (preview) dağıtımı oluşturur.
4. Özel alan adı (ör. `ydsatolyesi.com`): Vercel → Project → **Settings → Domains**. Kodda alan adı sabit yazılmamıştır.

Yeni bir dağıtımdan sonra kullanıcıya "YDS Kelime Atölyesi'nin yeni sürümü hazır · Güncelle" bildirimi gösterilir. Güncelleme yalnızca uygulama dosyalarını değiştirir; kişisel ilerleme (localStorage) korunur.

## Backup Information

- İlerleme **bu cihazdaki tarayıcıda** saklanır. Telefon ve bilgisayar birbirinden bağımsızdır; bulut senkronizasyonu yoktur.
- **Ayarlar → Yedekle**: *Yedeği Kopyala* (panoya JSON), *Yedeği Metin Olarak Göster*, *Yedeği İçe Aktar* (doğrulanır; hatalı yedek mevcut veriyi bozmaz; içe aktarma geri alınabilir).
- Tarayıcı verilerini temizlemeden veya cihaz değiştirmeden önce yedek al.
- Eski adresten (ör. claude.ai üzerindeki sürüm) geçerken: eski sürümde **Yedeği Kopyala**, yeni adreste **Yedeği İçe Aktar**. Farklı adresler tarayıcıda ayrı depolama alanı kullanır.
- Kayıt okunamazsa üzerine yazılmaz; ham hali `ydsKelimeAtolyesi.corrupt-<zaman>` anahtarına kopyalanır. Hata ekranında "Yedeği Dışa Aktar" her zaman çalışır.

## Gizli hata ayıklama paneli

Adresin sonuna `#debug` ekleyip İlerleme sekmesini aç: kalibrasyon panosu, depolama kullanımı, içerik doğrulama ve gerçek cihaz kontrol listesi. Panel yalnızca okur; kullanıcı verisini değiştirmez.
