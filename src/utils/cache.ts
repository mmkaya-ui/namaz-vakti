import { StorageService } from './storage';
import { CONFIG } from '@constants/config';
import type { CacheEntry } from '../types';

// ============================================================
// CACHE SERVICE - With TTL and Service Worker Integration
// ============================================================

export class CacheService {
  private static readonly CACHE_PREFIX = 'app_cache_';

  /**
   * Get cached item with TTL check
   */
  static get<T>(key: string): T | null {
    try {
      const item = StorageService.get<CacheEntry<T>>(this.CACHE_PREFIX + key);
      if (!item) return null;

      const { value, expiry } = item;
      
      // Check if expired
      if (expiry && Date.now() > expiry) {
        this.remove(key);
        return null;
      }
      
      return value;
    } catch (e) {
      console.warn(`CacheService.get error for key "${key}":`, e);
      return null;
    }
  }

  /**
   * Set cached item with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMinutes - Time to live in minutes (null = no expiry)
   */
  static set<T>(key: string, value: T, ttlMinutes: number | null = 60): boolean {
    try {
      const expiry = ttlMinutes ? Date.now() + (ttlMinutes * 60 * 1000) : null;
      const entry: CacheEntry<T> = { value, expiry };
      return StorageService.set(this.CACHE_PREFIX + key, entry);
    } catch (e) {
      console.warn(`CacheService.set error for key "${key}":`, e);
      return false;
    }
  }

  /**
   * Remove cached item
   */
  static remove(key: string): void {
    StorageService.remove(this.CACHE_PREFIX + key);
  }

  /**
   * Check if cache has valid item
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache info (expiry time)
   */
  static getInfo(key: string): { exists: boolean; expired: boolean; expiresAt: Date | null } {
    const item = StorageService.get<CacheEntry<unknown>>(this.CACHE_PREFIX + key);
    
    if (!item) {
      return { exists: false, expired: true, expiresAt: null };
    }

    const { expiry } = item;
    const expired = expiry ? Date.now() > expiry : false;
    
    return {
      exists: true,
      expired,
      expiresAt: expiry ? new Date(expiry) : null
    };
  }

  /**
   * Clear all cached items
   */
  static clear(): void {
    const keys = StorageService.getKeysByPrefix(this.CACHE_PREFIX);
    keys.forEach(key => StorageService.remove(key));
    console.log(`Cleared ${keys.length} cache entries`);
  }

  /**
   * Clear expired cache entries
   */
  static clearExpired(): number {
    const keys = StorageService.getKeysByPrefix(this.CACHE_PREFIX);
    let cleared = 0;

    for (const fullKey of keys) {
      const key = fullKey.replace(this.CACHE_PREFIX, '');
      const info = this.getInfo(key);
      if (info.expired) {
        this.remove(key);
        cleared++;
      }
    }

    console.log(`Cleared ${cleared} expired cache entries`);
    return cleared;
  }

  /**
   * Get or compute (with caching)
   */
  static async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlMinutes: number | null = 60
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const computed = await compute();
    this.set(key, computed, ttlMinutes);
    return computed;
  }
}

// ============================================================
// SERVICE WORKER CACHE HELPER
// ============================================================

export class CacheHelper {
  /**
   * Check if URL is cached in Service Worker
   */
  static async has(url: string): Promise<boolean> {
    if (!('caches' in window)) return false;
    
    try {
      const match = await caches.match(url);
      return !!match;
    } catch (e) {
      console.warn('CacheHelper.has error:', e);
      return false;
    }
  }

  /**
   * Get cached response
   */
  static async get(url: string): Promise<Response | null> {
    if (!('caches' in window)) return null;
    
    try {
      return (await caches.match(url)) || null;
    } catch (e) {
      console.warn('CacheHelper.get error:', e);
      return null;
    }
  }

  /**
   * Preload URLs into cache
   */
  static async preload(urls: string[]): Promise<{ success: string[]; failed: string[] }> {
    if (!('caches' in window)) {
      return { success: [], failed: urls };
    }

    const success: string[] = [];
    const failed: string[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const cache = await caches.open('app-precache');
          await cache.put(url, response);
          success.push(url);
        } else {
          failed.push(url);
        }
      } catch (e) {
        console.warn(`Failed to preload ${url}:`, e);
        failed.push(url);
      }
    }

    return { success, failed };
  }

  /**
   * Get cache size (approximate)
   */
  static async getSize(): Promise<{ entries: number; size: number }> {
    if (!('caches' in window)) {
      return { entries: 0, size: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      let totalEntries = 0;
      let totalSize = 0;

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        totalEntries += requests.length;

        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return { entries: totalEntries, size: totalSize };
    } catch (e) {
      console.warn('CacheHelper.getSize error:', e);
      return { entries: 0, size: 0 };
    }
  }

  /**
   * Clear all Service Worker caches
   */
  static async clearAll(): Promise<boolean> {
    if (!('caches' in window)) return false;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log(`Cleared ${cacheNames.length} Service Worker caches`);
      return true;
    } catch (e) {
      console.error('CacheHelper.clearAll error:', e);
      return false;
    }
  }
}
