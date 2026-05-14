import { useState, useEffect, useCallback, useRef } from 'react';
import { PrayerService } from '@services/prayer';
import { CONFIG } from '@constants/config';
import type { 
  Coordinates, 
  AppSettings, 
  PrayerTimesResult 
} from '@app-types';

// ============================================================
// USE PRAYER TIMES HOOK - Fetch and manage prayer times
// ============================================================

interface UsePrayerTimesOptions {
  coords: Coordinates | null;
  settings: Pick<AppSettings, 'methodId' | 'asrMethod' | 'offsets'>;
  enabled?: boolean;
}

interface UsePrayerTimesReturn {
  data: PrayerTimesResult | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const usePrayerTimes = ({
  coords,
  settings,
  enabled = true
}: UsePrayerTimesOptions): UsePrayerTimesReturn => {
  const [data, setData] = useState<PrayerTimesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  // Track last fetched params to prevent duplicate requests
  const lastFetchedRef = useRef<string>('');

  const fetchPrayerTimes = useCallback(async () => {
    if (!coords || !isMountedRef.current) return;

    // Create cache key from params
    const cacheKey = `${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}_${settings.methodId}_${settings.asrMethod}_${JSON.stringify(settings.offsets)}`;
    
    // Skip if already fetching same params
    if (loading && lastFetchedRef.current === cacheKey) return;
    
    lastFetchedRef.current = cacheKey;
    setLoading(true);
    setError(null);

    try {
      const result = await PrayerService.fetchPrayerTimes(coords, settings);
      
      if (isMountedRef.current) {
        if (result) {
          setData(result);
        } else {
          setError(new Error('Failed to fetch prayer times'));
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [coords, settings]);

  // Fetch on mount and when params change
  useEffect(() => {
    isMountedRef.current = true;
    
    if (enabled && coords) {
      fetchPrayerTimes();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPrayerTimes, enabled, coords]);

  // Refetch function
  const refetch = useCallback(async () => {
    lastFetchedRef.current = ''; // Clear cache key to force refetch
    await fetchPrayerTimes();
  }, [fetchPrayerTimes]);

  return {
    data,
    loading,
    error,
    refetch
  };
};
