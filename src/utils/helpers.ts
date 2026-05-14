import { CacheService } from './cache';
import type { Coordinates, VibrationPattern } from '../types';

// ============================================================
// HELPER UTILITIES - Date, Random, and UI Helpers
// ============================================================

/**
 * Generate cryptographically secure random number
 * Falls back to Math.random if crypto is unavailable
 */
export const getSecureRandomNumber = (min: number, max: number): number => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const range = max - min + 1;
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return min + (array[0] % range);
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Get today's date in local timezone as ISO string (YYYY-MM-DD)
 */
export const getLocalTodayDate = (): string => {
  const d = new Date();
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

/**
 * Parse time string (HH:MM) to Date object
 */
export const parseTimeString = (timeStr: string, baseDate = new Date()): Date | null => {
  if (!timeStr) return null;
  
  const parts = timeStr.split(' ')[0].split(':');
  if (parts.length < 2) return null;
  
  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
};

/**
 * Format time as HH:MM
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

/**
 * Format duration (milliseconds to human readable)
 */
export const formatDuration = (ms: number): string => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Format timer seconds to MM:SS
 */
export const formatTimer = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * Get tomorrow's date
 */
export const getTomorrow = (date = new Date()): Date => {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

/**
 * Calculate time difference in milliseconds
 * Handles day boundary correctly
 */
export const getTimeDifference = (target: Date, now = new Date()): number => {
  // Create dates with same day base for comparison
  const targetCopy = new Date(now);
  targetCopy.setHours(target.getHours(), target.getMinutes(), 0, 0);
  
  // If target has passed, it's for tomorrow
  if (targetCopy < now) {
    targetCopy.setDate(targetCopy.getDate() + 1);
  }
  
  return targetCopy.getTime() - now.getTime();
};

/**
 * Calculate prayer time with offset
 */
export const adjustTime = (date: Date, offsetMinutes: number): Date => {
  const adjusted = new Date(date);
  adjusted.setMinutes(adjusted.getMinutes() + offsetMinutes);
  return adjusted;
};

/**
 * Calculate Teheccud start time (last 1/3 of night)
 */
export const calculateTeheccudTime = (
  maghribTime: Date,
  fajrTime: Date,
  tomorrow = false
): Date => {
  const fajr = new Date(fajrTime);
  
  // If for tomorrow, add a day
  if (tomorrow) {
    fajr.setDate(fajr.getDate() + 1);
  }
  
  const maghrib = new Date(maghribTime);
  
  // If maghrib is after fajr (shouldn't happen), adjust
  if (maghrib > fajr) {
    maghrib.setDate(maghrib.getDate() - 1);
  }
  
  const nightDuration = fajr.getTime() - maghrib.getTime();
  const teheccudStart = new Date(fajr.getTime() - (nightDuration / 3));
  
  return teheccudStart;
};

/**
 * Calculate Kerahat (disliked) times
 */
export const calculateKerahatTimes = (prayerTimes: {
  sunrise: Date;
  dhuhr: Date;
  maghrib: Date;
}): {
  ishraq: { start: Date; end: Date };
  istiwa: { start: Date; end: Date };
  isfirar: { start: Date; end: Date };
} => {
  const { sunrise, dhuhr, maghrib } = prayerTimes;
  
  return {
    ishraq: {
      start: sunrise,
      end: new Date(sunrise.getTime() + 45 * 60000) // 45 minutes after sunrise
    },
    istiwa: {
      start: new Date(dhuhr.getTime() - 45 * 60000), // 45 minutes before dhuhr
      end: dhuhr
    },
    isfirar: {
      start: new Date(maghrib.getTime() - 45 * 60000), // 45 minutes before maghrib
      end: maghrib
    }
  };
};

/**
 * Generate offline Quran pool
 */
export const generateOfflinePool = (
  size: number,
  preserve: number[] = [],
  maxPage = 604
): number[] => {
  const pool = new Set<number>(preserve);
  
  while (pool.size < size + preserve.length) {
    const r = getSecureRandomNumber(1, maxPage);
    pool.add(r);
  }
  
  return Array.from(pool);
};

/**
 * Generate PWA manifest dynamically
 */
export const generateManifest = (appName: string): string => {
  const manifest = {
    name: appName,
    short_name: appName,
    start_url: ".",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    orientation: "portrait",
    icons: [
      { 
        src: "https://cdn-icons-png.flaticon.com/512/5533/5533023.png", 
        sizes: "512x512", 
        type: "image/png" 
      }
    ]
  };
  
  return `data:application/manifest+json;base64,${btoa(JSON.stringify(manifest))}`;
};

/**
 * Safe vibration wrapper (handles iOS restrictions)
 */
export const safeVibrate = (pattern: VibrationPattern): void => {
  if (!navigator.vibrate) return;
  
  // iOS security: limit duration
  const MAX_VIBRATION = 10000; // 10 seconds max
  
  try {
    let safePattern: VibrationPattern;
    
    if (typeof pattern === 'number') {
      safePattern = Math.min(pattern, MAX_VIBRATION);
    } else {
      // Sum up pattern to check total duration
      const total = pattern.reduce((sum, val) => sum + val, 0);
      if (total > MAX_VIBRATION) {
        // Scale down proportionally
        const scale = MAX_VIBRATION / total;
        safePattern = pattern.map(v => Math.floor(v * scale));
      } else {
        safePattern = pattern;
      }
    }
    
    navigator.vibrate(safePattern);
  } catch (e) {
    console.warn('Vibration failed:', e);
  }
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Sleep/delay promise
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry with exponential backoff
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError;
};

/**
 * Generate unique ID
 */
export const generateId = (prefix = ''): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`;
};

/**
 * Check if device is iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Check if device is Android
 */
export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Check if running as PWA (standalone)
 */
export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as { standalone?: boolean }).standalone === true;
};

/**
 * Get safe area insets (for notched devices)
 */
export const getSafeAreaInsets = (): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} => {
  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10) || 
         parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10) ||
            parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10) ||
          parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10) ||
           parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10)
  };
};
