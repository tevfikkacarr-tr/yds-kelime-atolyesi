import type { StorageAdapter } from "@/lib/storage/adapter";

/** İçerik verisi ayrı modüllerden (ayrı JS parçaları) yüklenir; ağ API'si gerekmez, service worker önbelleğiyle çevrimdışı çalışır. */
let contentPromise: ReturnType<typeof fetchContent> | null = null;
/** Veri indirmesini React hidrasyonuyla paralel başlatır (yalnızca tarayıcıda). Motor modülü burada içe aktarılmaz:
 *  motorun yan etkili başlangıcı, veri ve depolama adaptörü hazır olduktan sonra startEngine() içinde olur. */
export function preloadContent(): void {
  if (typeof window === "undefined") return;
  contentPromise ??= fetchContent();
}
export function loadContent() {
  contentPromise ??= fetchContent();
  return contentPromise;
}
async function fetchContent() {
  const [words, bank, traps, passages, reading, clozes, ladders, rel, meta] = await Promise.all([
    import("@/data/vocabulary/words.json"),
    import("@/data/questions/mini-yds-bank.json"),
    import("@/data/questions/traps.json"),
    import("@/data/reading/passages.json"),
    import("@/data/reading/questions.json"),
    import("@/data/cloze/clozes.json"),
    import("@/data/semantic-ladders/ladders.json"),
    import("@/data/semantic-ladders/relations.json"),
    import("@/data/questions/content-meta.json"),
  ]);
  return {
    words: words.default,
    content: {
      bank: bank.default,
      traps: traps.default,
      passages: passages.default,
      reading: reading.default,
      clozes: clozes.default,
      ladders: ladders.default,
      rel: rel.default,
      held: meta.default.held,
    },
  };
}

type EngineGlobals = typeof globalThis & { __YDS_DATA?: unknown; __YDS_STORE?: StorageAdapter; __ydsEngineStarted?: boolean };

/** Öğrenme motorunu yalnızca tarayıcıda, bir kez başlatır. */
export async function startEngine(store: StorageAdapter): Promise<void> {
  const g = globalThis as EngineGlobals;
  if (g.__ydsEngineStarted) return;
  g.__ydsEngineStarted = true;
  try {
    g.__YDS_DATA = await loadContent();
    g.__YDS_STORE = store;
    await import("@/engine/app.generated.js");
  } catch (e) {
    g.__ydsEngineStarted = false;
    throw e;
  }
}
