import { useState, useCallback, useRef } from 'react';
import { QuranService } from '@services/quran';
import { PrayerService } from '@services/prayer';
import type { 
  Language, 
  Coordinates, 
  AppSettings,
  DownloadProgress 
} from '@app-types';

// ============================================================
// USE OFFLINE HOOK - Download and manage offline content
// ============================================================

interface UseOfflineOptions {
  lang: Language;
  coords: Coordinates | null;
  settings: Pick<AppSettings, 'methodId' | 'asrMethod'>;
}

interface UseOfflineReturn {
  downloading: boolean;
  progress: DownloadProgress | null;
  error: Error | null;
  downloadContent: () => Promise<boolean>;
  downloadFullQuran: () => Promise<boolean>;
  checkAndDownloadMissing: () => Promise<boolean>;
}

export const useOffline = ({
  lang,
  coords,
  settings
}: UseOfflineOptions): UseOfflineReturn => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const setErrorState = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);
    console.error('Offline download error:', error);
  }, []);

  /**
   * Download standard offline content (pool + special readings)
   */
  const downloadContent = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setErrorState(new Error('Cannot download while offline'));
      return false;
    }

    // Cancel any ongoing download
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setDownloading(true);
    setError(null);
    setProgress({ current: 0, total: 100, phase: 'preparing' });

    try {
      // Download Quran content
      const quranSuccess = await QuranService.preloadContent(
        lang,
        (p) => {
          if (!abortControllerRef.current?.signal.aborted) {
            setProgress(p);
          }
        }
      );

      if (abortControllerRef.current?.signal.aborted) {
        return false;
      }

      // Download prayer times for current and next month
      if (coords && quranSuccess) {
        setProgress({ current: 0, total: 2, phase: 'special' });
        
        const currentMonthSuccess = await PrayerService.prefetchNextMonth(
          coords,
          settings
        );
        
        if (abortControllerRef.current?.signal.aborted) {
          return false;
        }

        setProgress({ 
          current: currentMonthSuccess ? 1 : 0, 
          total: 2, 
          phase: 'special' 
        });

        setProgress({ current: 100, total: 100, phase: 'complete' });
      }

      return quranSuccess;

    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return false;
      }
      setErrorState(err);
      return false;
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setDownloading(false);
      }
    }
  }, [lang, coords, settings, setErrorState]);

  /**
   * Download full Quran (all 604 pages)
   */
  const downloadFullQuran = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setErrorState(new Error('Cannot download while offline'));
      return false;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setDownloading(true);
    setError(null);

    try {
      const { success, failed } = await QuranService.downloadFullQuran(
        lang,
        (p) => {
          if (!abortControllerRef.current?.signal.aborted) {
            setProgress(p);
          }
        }
      );

      if (abortControllerRef.current?.signal.aborted) {
        return false;
      }

      setProgress({ current: success, total: 604, phase: 'complete' });
      
      // Consider success if we got at least 90%
      return failed < 61;

    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return false;
      }
      setErrorState(err);
      return false;
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setDownloading(false);
      }
    }
  }, [lang, setErrorState]);

  /**
   * Check if offline content needs update and download missing
   */
  const checkAndDownloadMissing = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    // Check if pool exists and is recent
    const pool = QuranService.getOfflinePool();
    if (pool.length === 0) {
      return downloadContent();
    }

    // Check cache status
    const status = await QuranService.getCacheStatus();
    
    // If less than 50% cached, re-download
    if (status.percentage < 50) {
      return downloadContent();
    }

    return true;
  }, [downloadContent]);

  return {
    downloading,
    progress,
    error,
    downloadContent,
    downloadFullQuran,
    checkAndDownloadMissing
  };
};
