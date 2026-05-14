import { useState, useEffect, useRef, useCallback } from 'react';
import { getLocalTodayDate } from '@utils/helpers';

// ============================================================
// USE TIME HOOK - Current time with day boundary handling
// ============================================================

interface UseTimeReturn {
  time: Date;
  isNewDay: boolean;
  resetNewDayFlag: () => void;
}

export const useTime = (): UseTimeReturn => {
  const [time, setTime] = useState<Date>(new Date());
  const [isNewDay, setIsNewDay] = useState(false);
  const lastDayRef = useRef<string>(getLocalTodayDate());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetNewDayFlag = useCallback(() => {
    setIsNewDay(false);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now);

      // Check for day boundary
      const today = getLocalTodayDate();
      if (today !== lastDayRef.current) {
        lastDayRef.current = today;
        setIsNewDay(true);
      }
    };

    // Initial call
    tick();

    // Set up interval
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    time,
    isNewDay,
    resetNewDayFlag
  };
};
