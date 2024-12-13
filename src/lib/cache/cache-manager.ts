type CacheItem = {
  value: any;
  expiry: number;
};

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheItem>;

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  public set(key: string, value: any, expiryMinutes: number): void {
    const expiry = Date.now() + expiryMinutes * 60 * 1000;
    this.cache.set(key, { value, expiry });
  }

  public get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  public clear(): void {
    this.cache.clear();
  }
} 