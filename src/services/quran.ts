import { ApiService } from '@utils/api';
import { CacheService, CacheHelper } from '@utils/cache';
import { StorageService } from '@utils/storage';
import { 
  getSecureRandomNumber, 
  generateOfflinePool 
} from '@utils/helpers';
import { CONFIG } from '@constants/config';
import type { 
  Language, 
  QuranAyah, 
  QuranPageData,
  OfflinePoolState 
} from '@/types';

// ============================================================
// QURAN SERVICE - Page fetching and offline management
// ============================================================

export interface QuranDownloadProgress {
  current: number;
  total: number;
  phase: 'pages' | 'special' | 'complete';
}

export type DownloadProgressCallback = (progress: QuranDownloadProgress) => void;

export class QuranService {
  private static readonly POOL_KEY = CONFIG.STORAGE_KEYS.OFFLINE_QURAN_POOL;
  private static readonly UPDATE_KEY = CONFIG.STORAGE_KEYS.LAST_POOL_UPDATE;

  /**
   * Get or generate offline pool
   */
  static getOfflinePool(): number[] {
    const existing = StorageService.get<OfflinePoolState>(this.POOL_KEY);
    
    if (existing?.pool && existing.pool.length > 0) {
      return existing.pool;
    }

    // Generate new pool
    const newPool = generateOfflinePool(CONFIG.OFFLINE.DEFAULT_POOL_SIZE);
    this.savePool(newPool);
    
    return newPool;
  }

  /**
   * Save pool to storage
   */
  private static savePool(pool: number[]): void {
    const state: OfflinePoolState = {
      pool,
      lastUpdate: new Date().toISOString()
    };
    StorageService.set(this.POOL_KEY, state);
    StorageService.set(this.UPDATE_KEY, new Date().toISOString());
  }

  /**
   * Refresh pool (add new random pages)
   */
  static refreshPool(preserveActive: number[] = []): number[] {
    const currentPool = this.getOfflinePool();
    const newPool = generateOfflinePool(
      CONFIG.OFFLINE.DEFAULT_POOL_SIZE,
      [...preserveActive, ...currentPool]
    );
    
    this.savePool(newPool);
    return newPool;
  }

  /**
   * Fetch Quran page
   */
  static async fetchPage(
    page: number,
    lang: Language
  ): Promise<QuranPageData | null> {
    // Check cache first
    const cacheKey = `quran_page_${page}_${lang}`;
    const cached = CacheService.get<QuranPageData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { arabic, translation, transliteration } = 
        await ApiService.fetchQuranPage(page, lang);

      if (arabic.code !== 200 || !arabic.data || Array.isArray(arabic.data)) {
        throw new Error('Invalid Quran data');
      }
      const arabicData = arabic.data as { ayahs: Array<{ text: string; surah: { name: string }; numberInSurah: number }> };

      const ayahs: QuranAyah[] = arabicData.ayahs.map((ayah: { text: string; surah: { name: string }; numberInSurah: number }, i: number) => ({
        arabic: ayah.text,
        text: translation.data?.ayahs?.[i]?.text || '',
        trans: transliteration.data?.ayahs?.[i]?.text || '',
        info: `${ayah.surah.name} : ${ayah.numberInSurah}`,
        number: ayah.numberInSurah
      }));

      const result: QuranPageData = { ayahs, pageNumber: page };
      
      // Cache result
      CacheService.set(cacheKey, result, null); // No expiry
      
      return result;

    } catch (error) {
      console.error(`Failed to fetch Quran page ${page}:`, error);
      return null;
    }
  }

  /**
   * Get random page from pool (with fallback)
   */
  static async getRandomPage(lang: Language): Promise<QuranPageData | null> {
    // Online: true random
    if (navigator.onLine) {
      const page = getSecureRandomNumber(1, CONFIG.OFFLINE.QURAN_PAGES);
      const result = await this.fetchPage(page, lang);
      if (result) {
        this.setLastPage(page);
        return result;
      }
    }

    // Offline: use pool with cache check
    return this.getPageFromPool(lang);
  }

  /**
   * Get page from offline pool
   */
  private static async getPageFromPool(lang: Language): Promise<QuranPageData | null> {
    const pool = this.getOfflinePool();
    const lastPage = this.getLastPage();

    // Find available pages (not recently used and cached)
    const availablePages: number[] = [];
    
    for (const page of pool) {
      if (page === lastPage) continue;
      
      const isCached = await CacheHelper.has(
        `${CONFIG.API.QURAN}/page/${page}/quran-uthmani`
      );
      
      if (isCached) {
        availablePages.push(page);
      }
    }

    // Try to fetch from available pages
    for (const page of availablePages) {
      const result = await this.fetchPage(page, lang);
      if (result) {
        this.setLastPage(page);
        return result;
      }
    }

    // Fallback: try any page in pool
    for (const page of pool) {
      if (page === lastPage) continue;
      
      const result = await this.fetchPage(page, lang);
      if (result) {
        this.setLastPage(page);
        return result;
      }
    }

    return null;
  }

  /**
   * Set last read page
   */
  static setLastPage(page: number): void {
    StorageService.set('last_quran_page', page);
    StorageService.set('last_picked_quran_page', page);
  }

  /**
   * Get last read page
   */
  static getLastPage(): number | null {
    return StorageService.get<number>('last_quran_page');
  }

  /**
   * Download pages for offline use
   */
  static async downloadPages(
    pages: number[],
    lang: Language,
    onProgress?: DownloadProgressCallback
  ): Promise<{ success: number[]; failed: number[] }> {
    const success: number[] = [];
    const failed: number[] = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      try {
        // Check if already cached
        const isCached = await CacheHelper.has(
          `${CONFIG.API.QURAN}/page/${page}/quran-uthmani`
        );
        
        if (isCached) {
          success.push(page);
        } else {
          // Fetch and cache
          const result = await this.fetchPage(page, lang);
          if (result) {
            success.push(page);
          } else {
            failed.push(page);
          }
        }

        // Report progress
        onProgress?.({
          current: i + 1,
          total: pages.length,
          phase: 'pages'
        });

        // Small delay to avoid rate limiting
        if (i < pages.length - 1) {
          await new Promise(r => setTimeout(r, 100));
        }

      } catch (e) {
        failed.push(page);
      }
    }

    return { success, failed };
  }

  /**
   * Download full Quran (all 604 pages)
   */
  static async downloadFullQuran(
    lang: Language,
    onProgress?: DownloadProgressCallback
  ): Promise<{ success: number; failed: number }> {
    const allPages = Array.from({ length: CONFIG.OFFLINE.QURAN_PAGES }, (_, i) => i + 1);
    const { success, failed } = await this.downloadPages(allPages, lang, onProgress);
    
    onProgress?.({
      current: success.length,
      total: allPages.length,
      phase: 'complete'
    });

    return { success: success.length, failed: failed.length };
  }

  /**
   * Preload content (default pool + special readings)
   */
  static async preloadContent(
    lang: Language,
    onProgress?: DownloadProgressCallback
  ): Promise<boolean> {
    try {
      // Download pool pages
      const pool = this.getOfflinePool();
      await this.downloadPages(pool, lang, (p) => {
        onProgress?.({ ...p, phase: 'pages' });
      });

      // Download special readings
      onProgress?.({ current: 0, total: 5, phase: 'special' });
      
      const specialReadings = [
        { surah: 18, offset: 0, limit: 10 },      // Kehf first 10
        { surah: 18, offset: 100, limit: 10 },   // Kehf last 10
        { surah: 50, offset: 0, limit: 10 },     // Qaf first 10
        { surah: 50, offset: 35, limit: 10 },    // Qaf last 10
        { surah: 2, offset: 284, limit: 2 }      // Amenarrasul
      ];

      for (let i = 0; i < specialReadings.length; i++) {
        const reading = specialReadings[i];
        await ApiService.fetchSpecialReading(
          reading.surah,
          reading.offset,
          reading.limit,
          lang
        );
        onProgress?.({ current: i + 1, total: 5, phase: 'special' });
      }

      onProgress?.({ current: 100, total: 100, phase: 'complete' });
      
      // Update pool timestamp
      this.savePool(pool);
      
      return true;

    } catch (error) {
      console.error('Preload failed:', error);
      return false;
    }
  }

  /**
   * Get cache status
   */
  static async getCacheStatus(): Promise<{
    cached: number;
    total: number;
    percentage: number;
  }> {
    const pool = this.getOfflinePool();
    let cached = 0;

    for (const page of pool) {
      const isCached = await CacheHelper.has(
        `${CONFIG.API.QURAN}/page/${page}/quran-uthmani`
      );
      if (isCached) cached++;
    }

    return {
      cached,
      total: pool.length,
      percentage: Math.round((cached / pool.length) * 100)
    };
  }
}
