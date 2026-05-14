import { ApiService } from '@utils/api';
import { CacheService } from '@utils/cache';
import { 
  parseTimeString, 
  adjustTime, 
  calculateTeheccudTime,
  calculateKerahatTimes
} from '@utils/helpers';
import type { 
  PrayerData, 
  PrayerTimings, 
  Coordinates, 
  AppSettings,
  TimeOffsets 
} from '@/types';

// ============================================================
// PRAYER TIMES SERVICE - Calculation and Management
// ============================================================

export interface ProcessedPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  midnight: Date;
}

export interface SpecialTimes {
  teheccud: { start: Date; end: Date };
  kerahat: {
    ishraq: { start: Date; end: Date };
    istiwa: { start: Date; end: Date };
    isfirar: { start: Date; end: Date };
  };
}

export interface PrayerTimesResult {
  times: ProcessedPrayerTimes;
  special: SpecialTimes;
  nextPrayer: {
    name: string;
    time: Date;
    remaining: number; // milliseconds
  };
  date: PrayerData['date'];
}

export class PrayerService {
  /**
   * Fetch and process prayer times
   */
  static async fetchPrayerTimes(
    coords: Coordinates,
    settings: Pick<AppSettings, 'methodId' | 'asrMethod' | 'offsets'>
  ): Promise<PrayerTimesResult | null> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const response = await ApiService.fetchPrayerTimes(
        year,
        month,
        coords.lat,
        coords.lng,
        settings.methodId,
        settings.asrMethod
      );

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid prayer times data');
      }

      // Find today's data
      const today = now.getDate();
      const todayData = response.data.find(
        d => parseInt(d.date.gregorian.day) === today
      );

      if (!todayData) {
        throw new Error('Today\'s prayer times not found');
      }

      return this.processPrayerTimes(todayData.timings, todayData.date, settings.offsets);

    } catch (error) {
      console.error('Failed to fetch prayer times:', error);
      
      // Try to use cached data
      const cacheKey = `prayer_${year}_${month}_${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}_${settings.methodId}_${settings.asrMethod}`;
      const cached = CacheService.get<{ data: PrayerData[] }>(cacheKey);
      
      if (cached?.data) {
        const today = new Date().getDate();
        const todayData = cached.data.find(
          d => parseInt(d.date.gregorian.day) === today
        );
        
        if (todayData) {
          return this.processPrayerTimes(
            todayData.timings, 
            todayData.date, 
            settings.offsets
          );
        }
      }
      
      return null;
    }
  }

  /**
   * Process raw prayer times data
   */
  private static processPrayerTimes(
    timings: PrayerTimings,
    date: PrayerData['date'],
    offsets: TimeOffsets
  ): PrayerTimesResult {
    const now = new Date();

    // Parse and adjust times
    const times: ProcessedPrayerTimes = {
      fajr: this.parseAndAdjust(timings.Fajr, offsets.fajr, now),
      sunrise: this.parseAndAdjust(timings.Sunrise, offsets.sunrise, now),
      dhuhr: this.parseAndAdjust(timings.Dhuhr, offsets.dhuhr, now),
      asr: this.parseAndAdjust(timings.Asr, offsets.asr, now),
      maghrib: this.parseAndAdjust(timings.Maghrib, offsets.maghrib, now),
      isha: this.parseAndAdjust(timings.Isha, offsets.isha, now),
      midnight: new Date(now)
    };

    // Calculate midnight as halfway between Maghrib and Fajr
    const fajrTomorrow = new Date(times.fajr);
    fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);
    const nightDuration = fajrTomorrow.getTime() - times.maghrib.getTime();
    times.midnight = new Date(times.maghrib.getTime() + (nightDuration / 2));

    // Calculate special times
    const special: SpecialTimes = {
      teheccud: {
        start: calculateTeheccudTime(times.maghrib, times.fajr, true),
        end: fajrTomorrow
      },
      kerahat: calculateKerahatTimes({
        sunrise: times.sunrise,
        dhuhr: times.dhuhr,
        maghrib: times.maghrib
      })
    };

    // Determine next prayer
    const nextPrayer = this.getNextPrayer(times, now);

    return {
      times,
      special,
      nextPrayer,
      date
    };
  }

  /**
   * Parse time string and apply offset
   */
  private static parseAndAdjust(
    timeStr: string, 
    offsetMinutes: number,
    baseDate: Date
  ): Date {
    const parsed = parseTimeString(timeStr, baseDate);
    if (!parsed) {
      // Fallback to current time (shouldn't happen with valid data)
      return new Date(baseDate);
    }
    return adjustTime(parsed, offsetMinutes);
  }

  /**
   * Get next prayer and time remaining
   */
  private static getNextPrayer(
    times: ProcessedPrayerTimes,
    now: Date
  ): { name: string; time: Date; remaining: number } {
    const prayers = [
      { name: 'fajr', time: times.fajr },
      { name: 'sunrise', time: times.sunrise },
      { name: 'dhuhr', time: times.dhuhr },
      { name: 'asr', time: times.asr },
      { name: 'maghrib', time: times.maghrib },
      { name: 'isha', time: times.isha }
    ];

    // Find next prayer
    for (const prayer of prayers) {
      if (now < prayer.time) {
        return {
          name: prayer.name,
          time: prayer.time,
          remaining: prayer.time.getTime() - now.getTime()
        };
      }
    }

    // All prayers passed, next is tomorrow's Fajr
    const tomorrowFajr = new Date(times.fajr);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    
    return {
      name: 'fajr',
      time: tomorrowFajr,
      remaining: tomorrowFajr.getTime() - now.getTime()
    };
  }

  /**
   * Pre-fetch prayer times for next month (for offline use)
   */
  static async prefetchNextMonth(
    coords: Coordinates,
    settings: Pick<AppSettings, 'methodId' | 'asrMethod'>
  ): Promise<boolean> {
    const now = new Date();
    const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();

    try {
      await ApiService.fetchPrayerTimes(
        nextYear,
        nextMonth,
        coords.lat,
        coords.lng,
        settings.methodId,
        settings.asrMethod
      );
      return true;
    } catch (e) {
      console.error('Failed to prefetch next month:', e);
      return false;
    }
  }

  /**
   * Check if a time is within a kerahat period
   */
  static isKerahatTime(
    time: Date,
    kerahat: SpecialTimes['kerahat']
  ): { isKerahat: boolean; period?: string } {
    if (time >= kerahat.ishraq.start && time < kerahat.ishraq.end) {
      return { isKerahat: true, period: 'ishraq' };
    }
    if (time >= kerahat.istiwa.start && time < kerahat.istiwa.end) {
      return { isKerahat: true, period: 'istiwa' };
    }
    if (time >= kerahat.isfirar.start && time < kerahat.isfirar.end) {
      return { isKerahat: true, period: 'isfirar' };
    }
    return { isKerahat: false };
  }
}
