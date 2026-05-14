import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from './context/AppContext';
import { useTime } from './hooks/useTime';
import { usePrayerTimes } from './hooks/usePrayerTimes';
import { useOffline } from './hooks/useOffline';
import { locationService } from './services/location';
import { NotificationService } from './services/notification';
import { AudioService } from './utils/audio';
import { VibrationService } from './utils/vibration';
import type { AppTab, Coordinates } from './types';

// ============================================================
// MAIN APP COMPONENT
// ============================================================

export const App: React.FC = () => {
  const { lang, isOffline, settings, t } = useApp();
  const { time, isNewDay } = useTime();
  
  const [activeTab, setActiveTab] = useState<AppTab>('times');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  // Fetch prayer times
  const { data: prayerData, loading: prayerLoading, error: prayerError } = usePrayerTimes({
    coords,
    settings,
    enabled: !!coords
  });

  // Offline content download
  const { 
    downloading, 
    progress, 
    downloadContent, 
    checkAndDownloadMissing 
  } = useOffline({
    lang,
    coords,
    settings
  });

  // Initialize services and location
  useEffect(() => {
    // Init services
    AudioService.init();
    VibrationService.init(settings.vibrationEnabled);
    NotificationService.init();

    // Subscribe to location service
    const unsubscribe = locationService.subscribe((state) => {
      setCoords(state.coords);
      setLocationName(state.locationName);
    });

    // Detect location on first load if not set
    const currentState = locationService.getState();
    if (!currentState.coords && !currentState.loading) {
      locationService.detectLocation();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Update vibration setting
  useEffect(() => {
    VibrationService.setEnabled(settings.vibrationEnabled);
  }, [settings.vibrationEnabled]);

  // Check for offline content on mount
  useEffect(() => {
    if (navigator.onLine && coords) {
      checkAndDownloadMissing();
    }
  }, [coords, checkAndDownloadMissing]);

  // Handle new day
  useEffect(() => {
    if (isNewDay) {
      // Refresh data for new day
      window.location.reload();
    }
  }, [isNewDay]);

  // Simple tab switching
  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    window.history.pushState({ tab }, '', `#${tab}`);
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const tab = (event.state?.tab as AppTab) || 
                  window.location.hash.replace('#', '') as AppTab;
      if (['times', 'tasbeeh', 'quran', 'settings'].includes(tab)) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (prayerError) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">{t('error')}</h2>
          <p className="text-slate-600 mb-4">{prayerError.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-slate-800 dark:text-slate-100">
            {t('appName')}
          </h1>
          <div className="flex items-center gap-2">
            {isOffline && (
              <span className="text-xs text-orange-600 font-medium">OFFLINE</span>
            )}
            <time className="font-mono text-emerald-600 dark:text-emerald-400">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-14 pb-16 overflow-hidden max-w-md mx-auto w-full">
        <div className="h-full p-4 overflow-y-auto">
          {activeTab === 'times' && (
            <PrayerTimesView 
              prayerData={prayerData}
              loading={prayerLoading}
              currentTime={time}
              locationName={locationName}
            />
          )}
          {activeTab === 'tasbeeh' && <TasbeehView />}
          {activeTab === 'quran' && <QuranView />}
          {activeTab === 'settings' && (
            <SettingsView 
              downloading={downloading}
              progress={progress}
              onDownload={downloadContent}
            />
          )}
        </div>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-pb">
        <div className="max-w-md mx-auto h-16 grid grid-cols-4">
          {[
            { id: 'times', label: t('prayerTimes'), icon: '⏰' },
            { id: 'tasbeeh', label: t('tasbeeh'), icon: '📿' },
            { id: 'quran', label: t('quran'), icon: '📖' },
            { id: 'settings', label: t('settings'), icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as AppTab)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                activeTab === tab.id 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

// Placeholder view components
const PrayerTimesView: React.FC<{
  prayerData: ReturnType<typeof usePrayerTimes>['data'];
  loading: boolean;
  currentTime: Date;
  locationName: string;
}> = ({ prayerData, loading, currentTime, locationName }) => {
  const { t, fs } = useApp();

  if (loading || !prayerData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-b-2 border-emerald-600 rounded-full" />
      </div>
    );
  }

  const { times, special, nextPrayer } = prayerData;
  const diffHours = Math.floor(nextPrayer.remaining / 3600000);
  const diffMinutes = Math.floor((nextPrayer.remaining % 3600000) / 60000);

  return (
    <div className="space-y-4">
      {/* Next Prayer Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white">
        <p className="text-emerald-100 text-sm">{t('nextPrayer')}</p>
        <h2 className="text-3xl font-bold mt-1">{t(nextPrayer.name)}</h2>
        <p className="text-2xl font-mono mt-2">
          {diffHours > 0 && `${diffHours}h `}{diffMinutes}m {t('remaining')}
        </p>
        <p className="text-sm text-emerald-200 mt-2 flex items-center gap-1">
          📍 {locationName}
        </p>
      </div>

      {/* Prayer Times List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {[
          { key: 'fajr', time: times.fajr, icon: '🌙' },
          { key: 'sunrise', time: times.sunrise, icon: '🌅' },
          { key: 'dhuhr', time: times.dhuhr, icon: '☀️' },
          { key: 'asr', time: times.asr, icon: '🌤️' },
          { key: 'maghrib', time: times.maghrib, icon: '🌇' },
          { key: 'isha', time: times.isha, icon: '🌃' }
        ].map(({ key, time, icon }) => (
          <div 
            key={key}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span>{icon}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t(key)}
              </span>
            </div>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Special Times */}
      <div className="space-y-2">
        <div className="bg-indigo-50 dark:bg-indigo-950/50 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌙</span>
              <div>
                <p className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">
                  {t('teheccud')}
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  {t('bestTimeTeheccud')}
                </p>
              </div>
            </div>
            <span className="font-mono text-sm text-indigo-800 dark:text-indigo-300">
              {special.teheccud.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
              {special.teheccud.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TasbeehView: React.FC = () => {
  const { t } = useApp();
  const [mode, setMode] = useState<'morning' | 'ikindi' | 'night' | 'ek' | 'personal'>('morning');

  return (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
        {t('tasbeeh')}
      </h2>
      <p className="text-slate-600 dark:text-slate-400">
        Mode: {mode}
      </p>
      <div className="flex gap-2 justify-center mt-4">
        {['morning', 'ikindi', 'night', 'ek', 'personal'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m as typeof mode)}
            className={`px-3 py-1 rounded-full text-sm ${
              mode === m 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
};

const QuranView: React.FC = () => {
  const { t } = useApp();
  
  return (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
        {t('quran')}
      </h2>
      <p className="text-slate-600 dark:text-slate-400">
        Random Quran page will appear here
      </p>
    </div>
  );
};

const SettingsView: React.FC<{
  downloading: boolean;
  progress: { current: number; total: number } | null;
  onDownload: () => Promise<boolean>;
}> = ({ downloading, progress, onDownload }) => {
  const { 
    t, 
    lang, 
    setLang, 
    themeMode, 
    toggleTheme, 
    settings, 
    updateSetting 
  } = useApp();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        {t('settings')}
      </h2>

      {/* Language */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
        <p className="font-medium mb-2">{t('language')}</p>
        <div className="flex gap-2">
          {(['tr', 'en', 'de'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-2 rounded-lg font-bold ${
                lang === l 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
        <p className="font-medium mb-2">Theme</p>
        <button
          onClick={toggleTheme}
          className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800"
        >
          {themeMode === 'light' && '☀️ Light'}
          {themeMode === 'dark' && '🌙 Dark'}
          {themeMode === 'auto' && '⚡ Auto'}
        </button>
      </div>

      {/* Sound */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span>{t('sound')}</span>
        <button
          onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
          className={`w-12 h-6 rounded-full p-1 transition-colors ${
            settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
            settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Vibration */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span>{t('vibration')}</span>
        <button
          onClick={() => updateSetting('vibrationEnabled', !settings.vibrationEnabled)}
          className={`w-12 h-6 rounded-full p-1 transition-colors ${
            settings.vibrationEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
            settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Offline Download */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
        <p className="font-medium mb-2">{t('downloadForOffline')}</p>
        <button
          onClick={onDownload}
          disabled={downloading}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white disabled:bg-slate-400"
        >
          {downloading 
            ? `${t('downloading')} ${progress ? `(${progress.current}/${progress.total})` : ''}`
            : t('downloadContent')
          }
        </button>
      </div>

      {/* Reset */}
      <button
        onClick={() => {
          if (confirm(t('areYouSure'))) {
            localStorage.clear();
            window.location.reload();
          }
        }}
        className="w-full py-3 rounded-xl bg-red-100 text-red-600 font-medium"
      >
        {t('resetAllData')}
      </button>
    </div>
  );
};
