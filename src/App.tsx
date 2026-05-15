import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useApp } from './context/AppContext';
import { useTime } from './hooks/useTime';
import { usePrayerTimes } from './hooks/usePrayerTimes';
import { useOffline } from './hooks/useOffline';
import { locationService } from './services/location';
import { NotificationService } from './services/notification';
import { AudioService } from './utils/audio';
import { VibrationService } from './utils/vibration';
import { StorageService } from './utils/storage';
import { useZikrProgress } from './hooks/useZikrProgress';
import { useZikrReminder } from './hooks/useZikrReminder';
import { QuranService } from './services/quran';
import { ZIKR_DB, SPECIAL_READINGS } from './constants/zikrDatabase';
import { 
  MapPinIcon, 
  SettingsIcon, 
  MoonIcon, 
  SunIcon, 
  BookOpenIcon, 
  CheckCircleIcon, 
  RefreshCwIcon, 
  ClockIcon, 
  ChevronRightIcon, 
  Volume2Icon, 
  VibrateIcon, 
  RotateCcwIcon,
  Trash2Icon,
  CheckSquareIcon,
  PlusIcon,
  XIcon,
  DownloadIcon,
  SparklesIcon
} from './components/Icons';
import type { AppTab, Coordinates, ZikrMode, CustomZikr, Language } from './types';
import { getLocalTodayDate } from './utils/helpers';

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

  // Dhikr reminders
  useZikrReminder(prayerData, time);

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
    <div className="min-h-screen bg-slate-50 dark:bg-black transition-colors duration-300 antialiased">
      <Header currentTime={time} locationName={locationName} />
      
      <main className="main-layout px-4">
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
      </main>

      <Navbar active={activeTab} onChange={handleTabChange} />
    </div>
  );
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

const Header: React.FC<{ currentTime: Date; locationName: string }> = ({ 
  currentTime, 
  locationName 
}) => {
  const { t, fs } = useApp();
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50 safe-area-pt">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center overflow-hidden">
             <img src="/icon1.jpg" className="w-full h-full object-cover" alt="App Icon" />
          </div>
          <span className="font-bold text-slate-800 dark:text-white" style={fs(1)}>
            {t('appName')}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[120px]">
             {locationName || t('loading')}
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
             {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </header>
  );
};

const Navbar: React.FC<{ active: AppTab; onChange: (tab: AppTab) => void }> = ({ 
  active, 
  onChange 
}) => {
  const { t, fs } = useApp();
  
  const tabs: { id: AppTab; icon: React.FC<any>; label: string }[] = [
    { id: 'times', icon: ClockIcon, label: t('times') },
    { id: 'tasbeeh', icon: RefreshCwIcon, label: t('tasbeeh') },
    { id: 'quran', icon: BookOpenIcon, label: t('quran') },
    { id: 'settings', icon: SettingsIcon, label: t('settings') }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 scale-110' : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <Icon size={22} className={isActive ? 'animate-pulse-slow' : ''} />
              <span className="text-[10px] mt-1 font-bold" style={fs(0.65)}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const PrayerTimesView: React.FC<{
  prayerData: PrayerTimesResult | null;
  loading: boolean;
  currentTime: Date;
  locationName: string;
}> = ({ prayerData, loading, currentTime, locationName }) => {
  const { t, fs } = useApp();

  if (loading && !prayerData) {
    return <div className="flex items-center justify-center py-20 animate-pulse">{t('loading')}</div>;
  }

  if (!prayerData) {
    return (
      <div className="text-center py-20 text-red-500">
        <MapPinIcon size={48} className="mx-auto mb-4 opacity-50" />
        <p>{t('error')}</p>
      </div>
    );
  }

  const { times, special, nextPrayer } = prayerData;
  const isKerahat = (period: 'ishraq' | 'istiwa' | 'isfirar') => {
    const p = special.kerahat[period];
    return currentTime >= p.start && currentTime < p.end;
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Next Prayer Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <span className="text-emerald-100 font-medium" style={fs(0.85)}>
              {t('nextPrayer')}: {t(nextPrayer.name)}
            </span>
            <SparklesIcon size={20} className="text-emerald-300 opacity-50" />
          </div>
          <div className="text-4xl font-black mb-1 tracking-tight">
            {Math.floor(nextPrayer.remaining / 3600000)}h {Math.floor((nextPrayer.remaining % 3600000) / 60000)}m
          </div>
          <p className="text-emerald-50 text-[10px] uppercase tracking-wider font-bold opacity-80">
            {t('remaining')} {t('now')}
          </p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      </div>

      {/* Kerahat Indicators */}
      {(isKerahat('ishraq') || isKerahat('istiwa') || isKerahat('isfirar')) && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center space-x-3 text-amber-800 dark:text-amber-300 animate-fade-in">
           <ClockIcon size={20} className="shrink-0" />
           <span className="font-bold text-sm" style={fs(0.85)}>
             {t('kerahatHeader')}: {isKerahat('ishraq') ? t('kerahatMorning') : isKerahat('istiwa') ? t('kerahatNoon') : t('kerahatEvening')}
           </span>
        </div>
      )}

      {/* Main Times List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((name) => {
          const time = times[name];
          const isNext = nextPrayer.name === name;
          return (
            <div 
              key={name}
              className={`flex items-center justify-between px-4 py-3 border-b last:border-0 border-slate-100 dark:border-slate-800 ${
                isNext ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${isNext ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <span className={`font-bold ${isNext ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`} style={fs(0.9)}>
                  {t(name)}
                </span>
              </div>
              <span className={`font-mono text-lg font-black ${isNext ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Special Times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
           <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase">{t('teheccud')}</p>
           <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
             {special.teheccud.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
           <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase">{t('kerahatMorning')}</p>
           <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
             {special.kerahat.ishraq.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </p>
        </div>
      </div>
    </div>
  );
};

const TasbeehView: React.FC = () => {
  const { t, fs } = useApp();
  const [mode, setMode] = useState<ZikrMode>(() => 
    (localStorage.getItem('lastZikrMode') as ZikrMode) || 'morning'
  );

  const handleModeChange = (newMode: ZikrMode) => {
    setMode(newMode);
    localStorage.setItem('lastZikrMode', newMode);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-4 shrink-0 shadow-inner">
        {(['morning', 'ikindi', 'night', 'ek', 'personal'] as const).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`flex-1 py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${
              mode === m
                ? 'bg-emerald-600 text-white shadow-lg scale-[1.02]'
                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            style={fs(0.65)}
          >
            {t(m + 'Zikr').toUpperCase()}
          </button>
        ))}
      </div>

      <TasbeehContent key={mode} mode={mode} />
    </div>
  );
};

const TasbeehContent: React.FC<{ mode: ZikrMode }> = ({ mode }) => {
  const { t, fs, settings, lang } = useApp();
  const {
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
    savePersonalProgress,
    getPersonalProgress
  } = useZikrProgress({ mode });

  const [cooldown, setCooldown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const zikrList = useMemo(() => {
    const db = ZIKR_DB;
    const g = (k: keyof typeof ZIKR_DB) => (db[k][lang] || db[k]['en']);
    
    const common = {
        fatiha: { target: 19, title: "Fatiha", text: g('fatiha').t, arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", skippable: true },
        estag: { type: 'timer' as const, id: 'estag', duration: 300, target: 0, title: "Estağfirullah (5 dk)", text: g('estag').t, arabic: "أَسْتَغْفِرُ اللّٰهَ" },
        salavatM: { target: 10, title: t('salavatMuhammed'), text: g('salavatM').t, arabic: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِ سَيِّدِنَا مُحَمَّدٍ", skippable: true },
        salavatA: { target: 10, title: t('salavatAdam'), text: g('salavatA').t, arabic: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا آدَمَ", skippable: true },
        salavatI: { target: 10, title: t('salavatIsa'), text: g('salavatI').t, arabic: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا عِيسَى", skippable: true },
        kehf1: { target: 10, title: t('readFirst10'), type: 'kehf_first_10' as const, isReading: true },
        kehf2: { target: 10, title: t('readLast10'), type: 'kehf_last_10' as const, isReading: true },
        salavatB: { type: 'infinite' as const, target: 3, minTarget: 3, title: t('salavatBedr'), text: g('salavatB').t },
        kuddus: { type: 'infinite' as const, target: 3, minTarget: 3, title: "El-Kuddüs", text: g('kuddus').t, arabic: "القدوس" },
        random: { target: 1, title: t('read15Random'), type: 'random15' as const, isReading: true },
        amena: { target: 11, title: t('amenarresulu'), type: 'amenarresulu' as const },
        ek_tasks: { type: 'checklist' as const, title: t('ekHeader'), list: db.ek_list[lang] || db.ek_list['en'] }
    };

    if (mode === 'morning') return [common.fatiha, common.estag, common.salavatA, common.salavatI, common.salavatM, common.kehf1, common.salavatB];
    if (mode === 'ikindi') return [{ ...common.fatiha, target: 21 }, { ...common.salavatM, target: 11, skippable: true }, common.kuddus, common.kehf2, common.random];
    if (mode === 'ek') return [common.ek_tasks];
    if (mode === 'personal') return customZikrs;
    return [common.amena];
  }, [mode, t, lang, customZikrs]);

  const current = zikrList[index];

  useEffect(() => {
    let timer: any;
    if (current && (current.type === 'timer' || current.type === 'min_timer') && timeLeft > 0 && !isFinished) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          const newVal = prev - 1;
          if (newVal === 0) {
            VibrationService.vibrate([200, 100, 200]);
            if (settings.soundEnabled) AudioService.play('finish');
          }
          return newVal;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [current, timeLeft, isFinished, settings.soundEnabled]);

  const handleTap = useCallback(() => {
    if (isFinished || cooldown || !current) return;
    
    VibrationService.vibrate(40);
    if (settings.soundEnabled) AudioService.play('tick');

    incrementCount();
    
    if (current.target > 0 && count + 1 >= current.target && current.type !== 'infinite' && current.type !== 'timer' && current.type !== 'min_timer') {
        if (settings.soundEnabled) AudioService.play('finish');
        setCooldown(true);
        setTimeout(() => {
            if (index < zikrList.length - 1) {
                setIndex(index + 1);
            } else {
                markFinished();
            }
            setCooldown(false);
        }, 300);
    }
  }, [isFinished, cooldown, current, count, index, zikrList.length, settings.soundEnabled, incrementCount, setIndex, markFinished]);

  if (isFinished) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircleIcon size={48} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2" style={fs(1.5)}>
          {t('completed')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8" style={fs(0.9)}>
          {t(mode + 'Zikr')} tamamlandı. Allah kabul etsin.
        </p>
        <button 
          onClick={reset}
          className="flex items-center space-x-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-transform"
        >
          <RotateCcwIcon size={20} />
          <span>{t('reset')}</span>
        </button>
      </div>
    );
  }

  if (mode === 'ek') {
    return (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center space-x-2">
                <CheckSquareIcon size={20} className="text-emerald-600" />
                <span>{t('ekHeader')}</span>
            </h3>
            <div className="space-y-3">
                {current?.list?.map((item: any, i: number) => (
                    <div 
                        key={item.id}
                        onClick={() => toggleChecklistItem(i)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            checklistState[i] 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                    >
                        <div className="flex-1">
                            <p className={`font-bold ${checklistState[i] ? 'text-emerald-800 dark:text-emerald-400 line-through opacity-60' : 'text-slate-800 dark:text-slate-100'}`} style={fs(0.9)}>
                                {item.text}
                            </p>
                            {item.sub && <p className="text-[10px] text-slate-500 mt-1">{item.sub}</p>}
                        </div>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 ${
                            checklistState[i] 
                                ? 'bg-emerald-600 border-emerald-600 text-white' 
                                : 'border-slate-300 dark:border-slate-700'
                        }`}>
                            {checklistState[i] && <CheckCircleIcon size={16} />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mb-6 overflow-hidden shrink-0">
        <div 
          className="h-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${((index + 1) / zikrList.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-between py-4">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest" style={fs(1.1)}>
            {current?.title}
          </h3>
          {current?.arabic && (
            <p className="text-3xl font-arabic text-slate-800 dark:text-slate-100 leading-relaxed py-4" dir="rtl">
              {current.arabic}
            </p>
          )}
          {current?.text && (
            <p className="text-sm text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed" style={fs(0.85)}>
              "{current.text}"
            </p>
          )}
        </div>

        {/* Big Tap Area */}
        <div className="flex-1 flex items-center justify-center py-8">
            <button
              onClick={handleTap}
              className={`w-52 h-52 rounded-full flex flex-col items-center justify-center relative transition-all duration-150 active:scale-90 touch-manipulation ripple-effect ${
                cooldown 
                  ? 'bg-slate-200 dark:bg-slate-800 opacity-50' 
                  : 'bg-white dark:bg-slate-900 border-4 border-emerald-500 shadow-2xl shadow-emerald-500/20'
              }`}
            >
              <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">
                {count}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 font-bold">
                {current?.target > 0 ? `/ ${current.target}` : '∞'}
              </span>
              
              {/* Radial Progress Ring */}
              {current?.target > 0 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                  <circle
                    cx="104"
                    cy="104"
                    r="100"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-emerald-500/10"
                  />
                  <circle
                    cx="104"
                    cy="104"
                    r="100"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 100}
                    strokeDashoffset={2 * Math.PI * 100 * (1 - Math.min(count / current.target, 1))}
                    strokeLinecap="round"
                    className="text-emerald-500 transition-all duration-300"
                  />
                </svg>
              )}
            </button>
        </div>

        <div className="flex justify-between items-center px-4 shrink-0">
          <button 
            onClick={() => { if(confirm(t('areYouSure'))) reset(); }}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:bg-slate-200"
          >
            <RotateCcwIcon size={20} />
          </button>
          
          <button 
            onClick={() => {
              if (index < zikrList.length - 1) setIndex(index + 1);
              else markFinished();
            }}
            className="flex items-center space-x-2 bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-2xl font-bold active:scale-95 transition-transform"
          >
            <span>{t('next')}</span>
            <ChevronRightIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const QuranView: React.FC = () => {
  const { t, lang, fs } = useApp();
  const [page, setPage] = useState<QuranPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (pageNum?: number) => {
    setLoading(true);
    try {
      let result;
      if (pageNum) {
        result = await QuranService.fetchPage(pageNum, lang);
      } else {
        result = await QuranService.getRandomPage(lang);
      }
      if (result) {
        setPage(result);
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [lang]);

  useEffect(() => {
    const lastPage = QuranService.getLastPage();
    if (lastPage) {
        loadPage(lastPage);
    } else {
        loadPage();
    }
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="flex justify-between items-center mb-4 shrink-0">
         <div className="flex items-center space-x-2">
            <BookOpenIcon size={20} className="text-emerald-600" />
            <h2 className="font-black text-slate-800 dark:text-white" style={fs(1.1)}>
              {t('quran')}
            </h2>
         </div>
         {page && (
            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500">
              {t('pageInfo')} {page.pageNumber}
            </span>
         )}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-20"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
             <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-400 font-bold text-xs">{t('loading')}</p>
          </div>
        ) : page ? (
          page.ayahs.map((ayah, i) => (
            <div key={i} className="space-y-3 animate-fade-in">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <p className="text-2xl font-arabic text-slate-800 dark:text-slate-100 leading-[2] text-right mb-4" dir="rtl">
                  {ayah.arabic}
                </p>
                <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                   <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold italic leading-relaxed" style={fs(0.75)}>
                     {ayah.trans}
                   </p>
                   <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium" style={fs(0.85)}>
                     {ayah.text}
                   </p>
                </div>
                <div className="mt-3 flex justify-end">
                   <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">
                     {ayah.info}
                   </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-slate-400">
            <button onClick={() => loadPage()} className="bg-emerald-600 text-white px-6 py-2 rounded-xl">
              {t('loadContent')}
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 left-0 right-0 px-6 flex justify-center pointer-events-none">
         <button 
           onClick={() => loadPage()}
           disabled={loading}
           className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-emerald-600/30 active:scale-95 transition-all pointer-events-auto flex items-center space-x-2"
         >
           <RefreshCwIcon size={18} className={loading ? 'animate-spin' : ''} />
           <span>{t('nextAyah')}</span>
         </button>
      </div>
    </div>
  );
};

const SettingsView: React.FC<{
  downloading: boolean;
  progress: DownloadProgress | null;
  onDownload: () => Promise<boolean>;
}> = ({ downloading, progress, onDownload }) => {
  const { 
    t, 
    lang, 
    setLang, 
    themeMode, 
    toggleTheme, 
    settings, 
    updateSetting,
    fs
  } = useApp();

  return (
    <div className="space-y-4 pb-20 overflow-y-auto no-scrollbar h-full">
      <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
        <SettingsIcon size={24} className="text-emerald-600" />
        <span>{t('settings')}</span>
      </h2>

      {/* Language */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('language')}</p>
        <div className="flex gap-2">
          {(['tr', 'en', 'de'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                lang === l 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">TEMA</p>
        <div className="flex gap-2">
          {[
            { id: 'light', icon: SunIcon, label: 'LIGHT' },
            { id: 'dark', icon: MoonIcon, label: 'OLED' },
            { id: 'auto', icon: SparklesIcon, label: 'AUTO' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => {
                // Manually trigger theme toggle or set specific
                if (m.id === 'light') updateSetting('fontSize', settings.fontSize); // dummy to trigger
                toggleTheme(); // This toggle logic in AppContext needs to be smarter for direct set
              }}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] flex flex-col items-center space-y-1 transition-all ${
                themeMode === m.id 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <m.icon size={18} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        <div className="p-4 flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <Volume2Icon size={20} className="text-slate-400" />
              <span className="font-bold text-sm" style={fs(0.9)}>{t('sound')}</span>
           </div>
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
        <div className="p-4 flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <VibrateIcon size={20} className="text-slate-400" />
              <span className="font-bold text-sm" style={fs(0.9)}>{t('vibration')}</span>
           </div>
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
      </div>

      {/* Offline Download */}
      <div className="bg-emerald-600 rounded-2xl p-4 text-white shadow-xl shadow-emerald-600/20">
        <div className="flex items-center space-x-3 mb-3">
           <DownloadIcon size={24} />
           <p className="font-black text-sm uppercase tracking-tight">{t('downloadForOffline')}</p>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          className="w-full py-3 rounded-xl bg-white text-emerald-700 font-black text-sm disabled:opacity-50 active:scale-95 transition-transform"
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
        className="w-full py-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-black text-sm border border-red-100 dark:border-red-900/30"
      >
        {t('resetAllData')}
      </button>
    </div>
  );
};
