import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { StorageService } from '@utils/storage';
import { generateManifest } from '@utils/helpers';
import { TRANSLATIONS } from '@constants/translations';
import { CONFIG } from '@constants/config';
import type { 
  Language, 
  ThemeMode, 
  AppSettings, 
  AppContextValue 
} from '@app-types';

// ============================================================
// APP CONTEXT - Global state management
// ============================================================

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Language state
  const [lang, setLangState] = useState<Language>(() => {
    return StorageService.get<Language>(CONFIG.STORAGE_KEYS.LANG, CONFIG.DEFAULTS.LANG) || 'tr';
  });

  // Theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return StorageService.get<ThemeMode>(CONFIG.STORAGE_KEYS.THEME, CONFIG.DEFAULTS.THEME) || 'auto';
  });

  // Offline state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    return {
      ...CONFIG.DEFAULTS.SETTINGS,
      ...StorageService.get<Partial<AppSettings>>(CONFIG.STORAGE_KEYS.SETTINGS, {})
    };
  });

  // Update language
  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    StorageService.set(CONFIG.STORAGE_KEYS.LANG, newLang);
  }, []);

  // Toggle theme (light -> dark -> auto -> light)
  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : (prev === 'dark' ? 'auto' : 'light');
      StorageService.set(CONFIG.STORAGE_KEYS.THEME, next);
      return next;
    });
  }, []);

  // Update individual setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      StorageService.set(CONFIG.STORAGE_KEYS.SETTINGS, next);
      return next;
    });
  }, []);

  // Translation helper
  const t = useCallback((key: string): string => {
    const translations = TRANSLATIONS[lang];
    return translations[key] || TRANSLATIONS.en[key] || key;
  }, [lang]);

  // Font size helper
  const fs = useCallback((baseRem: number) => ({
    fontSize: `${baseRem * settings.fontSize}rem`,
    lineHeight: '1.4'
  }), [settings.fontSize]);

  // Apply theme
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#000000');
        document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', 'black-translucent');
      } else {
        document.documentElement.classList.remove('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
        document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', 'default');
      }
    };

    if (themeMode === 'light') {
      applyTheme(false);
    } else if (themeMode === 'dark') {
      applyTheme(true);
    } else {
      // Auto: check time (6 AM to 8 PM is light)
      const hour = new Date().getHours();
      applyTheme(hour < 6 || hour >= 20);
    }
  }, [themeMode]);

  // Update manifest and title when language changes
  useEffect(() => {
    const appName = t('appName');
    
    let manifestLink = document.getElementById('app-manifest') as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.id = 'app-manifest';
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = generateManifest(appName);
    
    document.title = appName;
  }, [lang, t]);

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        try {
          await fetch('./manifest.json?t=' + Date.now(), { method: 'HEAD' });
          setIsOffline(false);
        } catch {
          setIsOffline(true);
        }
      } else {
        setIsOffline(true);
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Context value
  const value = useMemo<AppContextValue>(() => ({
    lang,
    setLang,
    themeMode,
    toggleTheme,
    isOffline,
    settings,
    updateSetting,
    t,
    fs
  }), [lang, setLang, themeMode, toggleTheme, isOffline, settings, updateSetting, t, fs]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
