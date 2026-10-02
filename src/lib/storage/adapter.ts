/**
 * Depolama adaptörü. Öğrenme motoru kişisel veriyi yalnızca bu arayüz üzerinden okur/yazar.
 * Şimdilik tek etkin uygulama LocalStorageAdapter'dır. İleride bir CloudStorageAdapter
 * (ör. hesap tabanlı senkronizasyon) aynı arayüzle eklenebilir; zamanlayıcı değişmez.
 */
export interface StorageAdapter {
  readonly kind: "local" | "memory" | "cloud";
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Anahtar adları v1'den beri aynıdır; DEĞİŞTİRMEYİN (değişirse migration gerekir). */
export const STORAGE_KEYS = {
  state: "ydsKelimeAtolyesi",
  legacy: "ydsKelimeAtolyesi.v1",
  session: "ydsKelimeAtolyesi.session",
  undo: "ydsKelimeAtolyesi.undo",
} as const;

export class LocalStorageAdapter implements StorageAdapter {
  readonly kind = "local" as const;
  get(key: string): string | null {
    return window.localStorage.getItem(key);
  }
  set(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  }
  remove(key: string): void {
    // Yalnızca tek anahtar silinir; localStorage.clear() hiçbir yerde kullanılmaz.
    window.localStorage.removeItem(key);
  }
}

/** Test ve önizleme için bellek içi adaptör. */
export class MemoryStorageAdapter implements StorageAdapter {
  readonly kind = "memory" as const;
  private data = new Map<string, string>();
  get(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  set(key: string, value: string) {
    this.data.set(key, String(value));
  }
  remove(key: string) {
    this.data.delete(key);
  }
}

/** Yalnızca istemcide çağrılır. localStorage erişilemezse (ör. gizli mod kısıtı) bellek içi adaptöre düşer. */
export function createStorageAdapter(): StorageAdapter {
  try {
    const probe = "__yds_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return new LocalStorageAdapter();
  } catch {
    return new MemoryStorageAdapter();
  }
}

/** Hata ekranındaki "Yedeği Dışa Aktar" için ham kayıt (motor yüklenemese bile). */
export function readRawBackup(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.state) ?? "";
  } catch {
    return "";
  }
}
