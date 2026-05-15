import { useState, useEffect } from 'react';
import { useApp } from '@context/AppContext';
import { NotificationService } from '@services/notification';
import { StorageService } from '@utils/storage';
import type { PrayerTimesResult } from '@app-types';

export const useZikrReminder = (prayerData: PrayerTimesResult | null, currentTime: Date) => {
  const { t } = useApp();
  const [notifSentFor, setNotifSentFor] = useState<string | null>(null);

  useEffect(() => {
    if (!prayerData) return;

    const timings = prayerData.times;
    const now = currentTime.getTime();

    const checkAndSend = (targetTime: Date, targetName: string, prevModeToCheck?: string) => {
      const diff = targetTime.getTime() - now;
      
      // Send notification 30 minutes before
      if (diff > 0 && diff <= 30 * 60 * 1000) {
        const today = new Date().toISOString().split('T')[0];
        const key = `${today}_${targetName}`;
        const sent = StorageService.get(`notif_sent_${key}`);

        if (!sent && notifSentFor !== targetName) {
          const isModeFinished = (mode: string) => {
            const s = StorageService.get<any>(`tasbeeh_status_${mode}`);
            return s && s.date === today && s.finished;
          };

          let bodyText = `${t('notifTimeLeft')} ${targetName}.`;
          if (prevModeToCheck && !isModeFinished(prevModeToCheck)) {
            bodyText += ` ${t('notifUnfinished')}`;
          }

          NotificationService.send(t('appName'), {
            body: bodyText,
            tag: key
          });
          
          setNotifSentFor(targetName);
          StorageService.set(`notif_sent_${key}`, true);
        }
      }
    };

    // Check all prayer times
    checkAndSend(timings.dhuhr, t('dhuhr'), 'morning');
    checkAndSend(timings.asr, t('asr'));
    checkAndSend(timings.maghrib, t('maghrib'), 'ikindi');
    checkAndSend(timings.isha, t('isha'));

  }, [currentTime, prayerData, notifSentFor, t]);
};
