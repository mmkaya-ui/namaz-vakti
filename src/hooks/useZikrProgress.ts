import { useState, useCallback, useEffect, useRef } from 'react';
import { StorageService } from '@utils/storage';
import { getLocalTodayDate } from '@utils/helpers';
import { CONFIG } from '@constants/config';
import type { 
  ZikrMode, 
  ZikrProgress, 
  ZikrStatus, 
  CustomZikr 
} from '@app-types';

// ============================================================
// USE ZIKR PROGRESS HOOK - Manage zikr state and persistence
// ============================================================

interface UseZikrProgressOptions {
  mode: ZikrMode;
}

interface UseZikrProgressReturn {
  index: number;
  count: number;
  isFinished: boolean;
  checklistState: Record<number, boolean>;
  customZikrs: CustomZikr[];
  setIndex: (idx: number) => void;
  setCount: (cnt: number) => void;
  incrementCount: () => void;
  markFinished: () => void;
  reset: () => void;
  toggleChecklistItem: (itemIndex: number) => void;
  addCustomZikr: (zikr: CustomZikr) => void;
  deleteCustomZikr: (id: string) => void;
  getPersonalProgress: (index: number) => number;
  savePersonalProgress: (index: number, count: number) => void;
}

export const useZikrProgress = ({ mode }: UseZikrProgressOptions): UseZikrProgressReturn => {
  const today = getLocalTodayDate();
  const isMountedRef = useRef(true);

  // Initialize state from storage
  const [index, setIndexState] = useState<number>(() => {
    const saved = StorageService.get<ZikrProgress>(
      `${CONFIG.STORAGE_KEYS.TASBEEH_PROGRESS_PREFIX}${mode}`
    );
    return saved?.date === today ? saved.idx || 0 : 0;
  });

  const [count, setCountState] = useState<number>(() => {
    const saved = StorageService.get<ZikrProgress>(
      `${CONFIG.STORAGE_KEYS.TASBEEH_PROGRESS_PREFIX}${mode}`
    );
    return saved?.date === today ? saved.cnt || 0 : 0;
  });

  const [isFinished, setIsFinished] = useState<boolean>(() => {
    const saved = StorageService.get<ZikrStatus>(
      `${CONFIG.STORAGE_KEYS.TASBEEH_STATUS_PREFIX}${mode}`
    );
    return saved?.date === today && saved.finished;
  });

  const [checklistState, setChecklistState] = useState<Record<number, boolean>>(() => {
    return StorageService.get<Record<number, boolean>>(
      `checklist_${mode}_${today}`
    ) || {};
  });

  const [customZikrs, setCustomZikrs] = useState<CustomZikr[]>(() => {
    if (mode === 'personal') {
      return StorageService.get<CustomZikr[]>(
        CONFIG.STORAGE_KEYS.CUSTOM_ZIKRS
      ) || [];
    }
    return [];
  });

  // Sync state changes to storage
  useEffect(() => {
    if (!isFinished && mode !== 'personal') {
      StorageService.set(
        `${CONFIG.STORAGE_KEYS.TASBEEH_PROGRESS_PREFIX}${mode}`,
        { date: today, idx: index, cnt: count }
      );
    }
  }, [index, count, isFinished, mode, today]);

  // Sync checklist state
  useEffect(() => {
    StorageService.set(`checklist_${mode}_${today}`, checklistState);
  }, [checklistState, mode, today]);

  // Sync custom zikrs
  useEffect(() => {
    if (mode === 'personal' || customZikrs.length > 0) {
      StorageService.set(CONFIG.STORAGE_KEYS.CUSTOM_ZIKRS, customZikrs);
    }
  }, [customZikrs, mode]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setIndex = useCallback((idx: number) => {
    setIndexState(idx);
    setCountState(0);
  }, []);

  const setCount = useCallback((cnt: number) => {
    setCountState(cnt);
  }, []);

  const incrementCount = useCallback(() => {
    setCountState(prev => prev + 1);
  }, []);

  const markFinished = useCallback(() => {
    setIsFinished(true);
    StorageService.set(
      `${CONFIG.STORAGE_KEYS.TASBEEH_STATUS_PREFIX}${mode}`,
      { date: today, finished: true }
    );
    StorageService.remove(`${CONFIG.STORAGE_KEYS.TASBEEH_PROGRESS_PREFIX}${mode}`);
  }, [mode, today]);

  const reset = useCallback(() => {
    setIndexState(0);
    setCountState(0);
    setIsFinished(false);
    setChecklistState({});

    StorageService.remove(`${CONFIG.STORAGE_KEYS.TASBEEH_STATUS_PREFIX}${mode}`);
    StorageService.remove(`${CONFIG.STORAGE_KEYS.TASBEEH_PROGRESS_PREFIX}${mode}`);
    StorageService.remove(`checklist_${mode}_${today}`);

    // Clean up timer states
    if (mode === 'morning') {
      StorageService.remove(`timer_estag_${today}`);
    }
    if (mode === 'ikindi') {
      StorageService.remove(`tasbeeh_read_page_${today}`);
    }
    if (mode === 'personal') {
      customZikrs.forEach(z => {
        if (z.type === 'timer' || z.type === 'min_timer') {
          StorageService.remove(`timer_${z.id}_${today}`);
        }
      });
    }
  }, [mode, today, customZikrs]);

  const toggleChecklistItem = useCallback((itemIndex: number) => {
    setChecklistState(prev => ({
      ...prev,
      [itemIndex]: !prev[itemIndex]
    }));
  }, []);

  const addCustomZikr = useCallback((zikr: CustomZikr) => {
    setCustomZikrs(prev => [...prev, zikr]);
  }, []);

  const deleteCustomZikr = useCallback((id: string) => {
    setCustomZikrs(prev => {
      const filtered = prev.filter(z => z.id !== id);
      return filtered;
    });
    
    // Clean up timer state
    StorageService.remove(`timer_${id}_${today}`);
    StorageService.remove(`tasbeeh_progress_personal_${customZikrs.findIndex(z => z.id === id)}`);
  }, [today, customZikrs]);

  const getPersonalProgress = useCallback((personalIndex: number): number => {
    const saved = StorageService.get<ZikrProgress>(
      `tasbeeh_progress_personal_${personalIndex}`
    );
    return saved?.date === today ? saved.cnt || 0 : 0;
  }, [today]);

  const savePersonalProgress = useCallback((personalIndex: number, cnt: number) => {
    StorageService.set(
      `tasbeeh_progress_personal_${personalIndex}`,
      { date: today, cnt }
    );
  }, [today]);

  return {
    index,
    count,
    isFinished,
    checklistState,
    customZikrs,
    setIndex,
    setCount,
    incrementCount,
    markFinished,
    reset,
    toggleChecklistItem,
    addCustomZikr,
    deleteCustomZikr,
    getPersonalProgress,
    savePersonalProgress
  };
};
