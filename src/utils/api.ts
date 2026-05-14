import { CONFIG } from '@constants/config';
import { SURAH_NAMES_TR } from '@constants/config';
import { CacheService } from './cache';
import type { Language, AladhanResponse, QuranApiResponse } from '@/types';

// ============================================================
// API SERVICE - With Retry Logic and Rate Limiting
// ============================================================

// Rate limiter state
interface RateLimitState {
  lastRequest: number;
  requestCount: number;
  windowStart: number;
}

const rateLimits: Map<string, RateLimitState> = new Map();

export class ApiService {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly RATE_LIMIT_MAX = 30; // 30 requests per minute

  /**
   * Fetch JSON with timeout, retry, and error handling
   */
  static async fetchJson<T>(
    url: string, 
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    // Check rate limit
    const domain = new URL(url).hostname;
    if (!this.checkRateLimit(domain)) {
      throw new Error(`Rate limit exceeded for ${domain}`);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 429) {
          throw new Error('API rate limit exceeded');
        }
        if (response.status === 503) {
          throw new Error('Service temporarily unavailable');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;

    } catch (error) {
      clearTimeout(timeoutId);

      // Retry on network errors or 5xx errors
      if (retryCount < this.MAX_RETRIES && this.shouldRetry(error)) {
        await this.delay(this.RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return this.fetchJson(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check if we should retry the request
   */
  private static shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors
      if (error.name === 'TypeError' || error.name === 'AbortError') {
        return true;
      }
      // 5xx errors
      if (error.message.includes('HTTP 5')) {
        return true;
      }
      // Rate limit (wait longer)
      if (error.message.includes('Rate limit')) {
        return false; // Don't retry immediately
      }
    }
    return false;
  }

  /**
   * Check rate limit for domain
   */
  private static checkRateLimit(domain: string): boolean {
    const now = Date.now();
    let state = rateLimits.get(domain);

    if (!state || now - state.windowStart > this.RATE_LIMIT_WINDOW) {
      // New window
      state = {
        lastRequest: now,
        requestCount: 1,
        windowStart: now
      };
      rateLimits.set(domain, state);
      return true;
    }

    // Check if within limit
    if (state.requestCount >= this.RATE_LIMIT_MAX) {
      return false;
    }

    state.requestCount++;
    state.lastRequest = now;
    return true;
  }

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get Surah name in Turkish
   */
  static getSurahNameTR(num: number): string {
    if (num > 0 && num <= SURAH_NAMES_TR.length) {
      return SURAH_NAMES_TR[num - 1];
    }
    return `Surah ${num}`;
  }

  /**
   * Get Quran translation edition based on language
   */
  static getTranslationEdition(lang: Language): string {
    const editions: Record<Language, string> = {
      de: 'de.aburida',
      en: 'en.sahih',
      tr: 'tr.diyanet'
    };
    return editions[lang] || editions.tr;
  }

  /**
   * Get Quran transliteration edition based on language
   */
  static getTransliterationEdition(lang: Language): string {
    return lang === 'tr' ? 'tr.transliteration' : 'en.transliteration';
  }

  /**
   * Fetch prayer times with caching
   */
  static async fetchPrayerTimes(
    year: number,
    month: number,
    lat: number,
    lng: number,
    methodId: number,
    asrMethod: number
  ): Promise<AladhanResponse> {
    const cacheKey = `prayer_${year}_${month}_${lat.toFixed(2)}_${lng.toFixed(2)}_${methodId}_${asrMethod}`;
    
    // Check cache first
    const cached = CacheService.get<AladhanResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fix: Aladhan ignores school=1 for method=13 (Diyanet)
    // Use Method 3 (MWL) as proxy for Diyanet angles when Hanafi is selected
    const effectiveMethod = (methodId === 13 && asrMethod === 1) ? 3 : methodId;
    const schoolParam = asrMethod === 1 ? '&school=1' : '&school=0';

    const url = `${CONFIG.API.ALADHAN}/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=${effectiveMethod}${schoolParam}`;
    
    const response = await this.fetchJson<AladhanResponse>(url);
    
    // Cache for 30 days
    CacheService.set(cacheKey, response, CONFIG.CACHE_TTL.PRAYER_TIMES);
    
    return response;
  }

  /**
   * Fetch Quran page with caching
   */
  static async fetchQuranPage(
    page: number,
    lang: Language
  ): Promise<{ arabic: QuranApiResponse; translation: QuranApiResponse; transliteration: QuranApiResponse }> {
    const edition = this.getTranslationEdition(lang);
    const transEdition = this.getTransliterationEdition(lang);

    const cacheKey = `quran_page_${page}_${lang}`;
    const cached = CacheService.get<{
      arabic: QuranApiResponse;
      translation: QuranApiResponse;
      transliteration: QuranApiResponse;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const [arabic, translation, transliteration] = await Promise.all([
      this.fetchJson<QuranApiResponse>(`${CONFIG.API.QURAN}/page/${page}/quran-uthmani`),
      this.fetchJson<QuranApiResponse>(`${CONFIG.API.QURAN}/page/${page}/${edition}`),
      this.fetchJson<QuranApiResponse>(`${CONFIG.API.QURAN}/page/${page}/${transEdition}`)
    ]);

    const result = { arabic, translation, transliteration };
    
    // Cache permanently (no expiry)
    CacheService.set(cacheKey, result, null);
    
    return result;
  }

  /**
   * Fetch special reading (Kehf, Qaf, etc.)
   */
  static async fetchSpecialReading(
    surah: number,
    offset: number,
    limit: number,
    lang: Language
  ): Promise<QuranApiResponse> {
    const edition = this.getTranslationEdition(lang);
    const transEdition = this.getTransliterationEdition(lang);
    
    const cacheKey = `special_${surah}_${offset}_${limit}_${lang}`;
    const cached = CacheService.get<QuranApiResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const url = `${CONFIG.API.QURAN}/surah/${surah}/editions/quran-uthmani,${edition},${transEdition}?offset=${offset}&limit=${limit}`;
    
    const response = await this.fetchJson<QuranApiResponse>(url);
    
    // Cache permanently
    CacheService.set(cacheKey, response, null);
    
    return response;
  }

  /**
   * Reverse geocode (get location name from coordinates)
   */
  static async reverseGeocode(lat: number, lng: number): Promise<string> {
    const cacheKey = `geocode_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = CacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const url = `${CONFIG.API.NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}`;
    
    const response = await this.fetchJson<{
      address: {
        city?: string;
        town?: string;
        district?: string;
        village?: string;
        county?: string;
      };
    }>(url);

    const name = response.address?.city || 
                 response.address?.town || 
                 response.address?.district || 
                 response.address?.village || 
                 response.address?.county || 
                 'Unknown';

    // Cache for 7 days
    CacheService.set(cacheKey, name, CONFIG.CACHE_TTL.LOCATION);
    
    return name;
  }

  /**
   * Search location by query
   */
  static async searchLocation(query: string, limit = 5): Promise<Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>> {
    const cacheKey = `search_${query}_${limit}`;
    const cached = CacheService.get<typeof results>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const url = `${CONFIG.API.NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}`;
    
    interface LocationResult {
      display_name: string;
      lat: string;
      lon: string;
    }
    const results = await this.fetchJson<LocationResult[]>(url);
    
    // Cache for 7 days
    CacheService.set(cacheKey, results, CONFIG.CACHE_TTL.LOCATION);
    
    return results;
  }

  /**
   * Get current rate limit status
   */
  static getRateLimitStatus(): Record<string, { requests: number; windowEnds: Date }> {
    const status: Record<string, { requests: number; windowEnds: Date }> = {};
    const now = Date.now();

    rateLimits.forEach((state, domain) => {
      status[domain] = {
        requests: state.requestCount,
        windowEnds: new Date(state.windowStart + this.RATE_LIMIT_WINDOW)
      };
    });

    return status;
  }
}
