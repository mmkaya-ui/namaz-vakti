import { CONFIG } from '@constants/config';
import type { StorageFullError } from '../types';

// ============================================================
// STORAGE SERVICE - With Quota Management & LRU Eviction
// ============================================================

class StorageQuotaError extends Error implements StorageFullError {
  constructor(
    message: string = 'Storage quota exceeded',
    public readonly name: string = 'StorageQuotaError'
  ) {
    super(message);
    this.name = name;
  }
}

interface StorageEntry {
  key: string;
  size: number;
  timestamp: number;
}

export class StorageService {
  private static readonly MAX_RETRIES = 3;
  private static readonly QUOTA_BUFFER = 1024 * 1024; // 1MB buffer

  /**
   * Get item from localStorage with JSON parsing
   */
  static get<T>(key: string, fallback: T | null = null): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`StorageService.get error for key "${key}":`, e);
      return fallback;
    }
  }

  /**
   * Set item to localStorage with JSON serialization
   * Includes quota management and LRU eviction
   */
  static set<T>(key: string, value: T, retryCount = 0): boolean {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        if (retryCount < this.MAX_RETRIES) {
          // Try to free up space
          const freed = this.evictLRU(5); // Evict 5 oldest items
          if (freed > 0) {
            // Retry with backoff
            return this.set(key, value, retryCount + 1);
          }
        }
        console.error('Storage quota exceeded after retries:', e);
        throw new StorageQuotaError();
      }
      console.warn(`StorageService.set error for key "${key}":`, e);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`StorageService.remove error for key "${key}":`, e);
    }
  }

  /**
   * Clear all app-related data from localStorage
   */
  static clearAppData(): void {
    const keysToPreserve: string[] = [];
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error clearing app data:', e);
    }
  }

  /**
   * Get storage usage statistics
   */
  static getUsage(): { used: number; remaining: number; total: number; percentage: number } {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          used += key.length + value.length;
        }
      }
      
      // Approximate total (varies by browser, typically 5-10MB)
      const total = 5 * 1024 * 1024; // 5MB estimate
      const remaining = Math.max(0, total - used);
      const percentage = (used / total) * 100;
      
      return { used, remaining, total, percentage };
    } catch (e) {
      return { used: 0, remaining: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Check if storage is nearly full
   */
  static isNearlyFull(threshold = 90): boolean {
    const usage = this.getUsage();
    return usage.percentage >= threshold;
  }

  /**
   * Evict oldest items using LRU (Least Recently Used) strategy
   * Returns bytes freed
   */
  private static evictLRU(count: number): number {
    try {
      const entries: StorageEntry[] = [];
      
      // Collect all entries with their sizes
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !this.isProtectedKey(key)) {
          const value = localStorage.getItem(key) || '';
          entries.push({
            key,
            size: key.length + value.length,
            timestamp: this.getEntryTimestamp(key)
          });
        }
      }
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest entries
      let freed = 0;
      const toRemove = entries.slice(0, count);
      
      for (const entry of toRemove) {
        localStorage.removeItem(entry.key);
        freed += entry.size;
        console.log(`Evicted from storage: ${entry.key} (${entry.size} bytes)`);
      }
      
      return freed;
    } catch (e) {
      console.error('Error during LRU eviction:', e);
      return 0;
    }
  }

  /**
   * Check if a key is protected from eviction
   */
  private static isProtectedKey(key: string): boolean {
    const protectedPrefixes = [
      CONFIG.STORAGE_KEYS.COORDS,
      CONFIG.STORAGE_KEYS.LOC_NAME,
      CONFIG.STORAGE_KEYS.LANG,
      CONFIG.STORAGE_KEYS.THEME,
      CONFIG.STORAGE_KEYS.SETTINGS,
      CONFIG.STORAGE_KEYS.LAST_ZIKR_MODE
    ];
    
    return protectedPrefixes.some(prefix => key.startsWith(prefix));
  }

  /**
   * Get timestamp for an entry (uses stored timestamp or falls back to now)
   */
  private static getEntryTimestamp(key: string): number {
    // Try to get stored timestamp from value if it's an object
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && '_timestamp' in parsed) {
          return parsed._timestamp;
        }
      }
    } catch {
      // Not a JSON object, use current time
    }
    return Date.now();
  }

  /**
   * Save with automatic timestamp for LRU tracking
   */
  static setWithTimestamp<T>(key: string, value: T): boolean {
    const valueWithMeta = {
      _timestamp: Date.now(),
      _version: CONFIG.VERSION,
      data: value
    };
    return this.set(key, valueWithMeta as unknown as T);
  }

  /**
   * Get with timestamp stripping
   */
  static getWithTimestamp<T>(key: string, fallback: T | null = null): { value: T | null; timestamp: number | null } {
    const raw = this.get<unknown>(key);
    if (raw && typeof raw === 'object' && 'data' in raw && '_timestamp' in raw) {
      return {
        value: (raw as { data: T }).data,
        timestamp: (raw as { _timestamp: number })._timestamp
      };
    }
    return { value: raw as T, timestamp: null };
  }

  /**
   * Batch set multiple items (with quota handling)
   */
  static setBatch(items: Array<{ key: string; value: unknown }>): { success: string[]; failed: string[] } {
    const success: string[] = [];
    const failed: string[] = [];

    for (const item of items) {
      if (this.set(item.key, item.value)) {
        success.push(item.key);
      } else {
        failed.push(item.key);
      }
    }

    return { success, failed };
  }

  /**
   * Get all keys matching a prefix
   */
  static getKeysByPrefix(prefix: string): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
    } catch (e) {
      console.error('Error getting keys by prefix:', e);
    }
    return keys;
  }

  /**
   * Remove all keys matching a prefix
   */
  static removeByPrefix(prefix: string): number {
    const keys = this.getKeysByPrefix(prefix);
    keys.forEach(key => this.remove(key));
    return keys.length;
  }
}

// Export singleton instance methods for convenience
export const { get: storageGet, set: storageSet, remove: storageRemove } = StorageService;
