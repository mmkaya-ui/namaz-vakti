import type { ReactNode } from 'react';

// ============================================================
// TYPE DEFINITIONS - Namaz ve Zikir Application
// ============================================================

// Language Support
export type Language = 'tr' | 'en' | 'de';

// Theme Modes
export type ThemeMode = 'light' | 'dark' | 'auto';

// Prayer Times
export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Midnight?: string;
  Imsak?: string;
}

export interface PrayerDate {
  gregorian: {
    day: string;
    month: { number: number; en: string };
    year: string;
  };
  hijri: {
    day: string;
    month: { number: number; en: string; ar: string };
    year: string;
  };
  readable: string;
  timestamp: string;
}

export interface PrayerData {
  timings: PrayerTimings;
  date: PrayerDate;
}

// Location
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationState {
  coords: Coordinates | null;
  locationName: string;
  loading: boolean;
  error: LocationError | null;
}

export interface LocationError {
  type: 'GEO_PERMISSION_DENIED' | 'GEO_TIMEOUT' | 'GEO_UNAVAILABLE' | 'API_ERROR';
  message: string;
}

// Settings
export interface AppSettings {
  methodId: number;      // Calculation method
  asrMethod: 0 | 1;      // 0: Standard, 1: Hanafi
  offsets: TimeOffsets;
  fontSize: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface TimeOffsets {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

// Zikr Types
export type ZikrType = 'standard' | 'timer' | 'infinite' | 'min_timer' | 'checklist' | 'reading';

export interface ZikrItem {
  id?: string;
  type: ZikrType;
  title: string;
  text?: string;
  arabic?: string;
  target: number;
  duration?: number;     // For timer (seconds)
  minTarget?: number;    // For infinite with minimum
  skippable?: boolean;
  isReading?: boolean;
  list?: ChecklistItem[]; // For checklist type
}

export interface ChecklistItem {
  id: string;
  text: string;
  sub?: string;
  arabic?: string;
}

export interface CustomZikr extends ZikrItem {
  id: string;
}

// Zikr Progress
export interface ZikrProgress {
  date: string;  // ISO date string YYYY-MM-DD
  idx: number;
  cnt: number;
}

export interface ZikrStatus {
  date: string;
  finished: boolean;
}

// Quran Types
export interface QuranAyah {
  arabic: string;
  text: string;      // Translation
  trans: string;     // Transliteration
  info: string;      // Surah:Ayah info
  number?: number;   // Ayah number in surah
}

export interface QuranPageData {
  ayahs: QuranAyah[];
  pageNumber: number;
}

// API Response Types
export interface AladhanResponse {
  code: number;
  status: string;
  data: Array<{
    timings: PrayerTimings;
    date: PrayerDate;
  }>;
}

export interface QuranApiEdition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
  direction: string;
}

export interface QuranApiResponse {
  code: number;
  status: string;
  data: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
    numberOfAyahs: number;
    ayahs: Array<{
      number: number;
      text: string;
      numberInSurah: number;
      juz: number;
      manzil: number;
      page: number;
      ruku: number;
      hizbQuarter: number;
      sajda: boolean;
      surah: {
        number: number;
        name: string;
        englishName: string;
        revelationType: string;
      };
    }>;
  } | QuranApiEdition[];
}

// Translation Types
export interface TranslationStrings {
  [key: string]: string;
}

export interface Translations {
  tr: TranslationStrings;
  en: TranslationStrings;
  de: TranslationStrings;
}

// App Context
export interface AppContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  isOffline: boolean;
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  t: (key: string) => string;
  fs: (baseRem: number) => { fontSize: string; lineHeight: string };
}

// Storage Keys
export interface StorageKeys {
  LANG: string;
  COORDS: string;
  LOC_NAME: string;
  THEME: string;
  SETTINGS: string;
  CUSTOM_ZIKRS: string;
  OFFLINE_QURAN_POOL: string;
  LAST_POOL_UPDATE: string;
  TASBEEH_PROGRESS_PREFIX: string;
  TASBEEH_STATUS_PREFIX: string;
  LAST_ZIKR_MODE: string;
}

// Notification Types
export interface NotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: { action: string; title: string; icon?: string }[];
  badge?: string;
}

// Component Props
export interface CounterCardProps {
  current: ZikrItem;
  count: number;
  next: () => void;
  tap: () => void;
  cooldown: boolean;
  index: number;
  totalLength: number;
  resetLocal: () => void;
  timeLeft?: number;
  onDelete?: ((id: string) => void) | null;
}

export interface PrayerTimesViewProps {
  prayerData: PrayerData | null;
  loading: boolean;
  currentTime: Date;
  locationName: string;
}

export interface NavbarProps {
  active: string;
  setActive: (tab: string) => void;
}

export interface HeaderProps {
  currentTime: Date;
}

// Error Types
export type AppError = 
  | { type: 'API_ERROR'; message: string; retry?: () => void }
  | { type: 'STORAGE_ERROR'; message: string }
  | { type: 'GEO_ERROR'; message: string }
  | { type: 'NETWORK_ERROR'; message: string; isOffline: boolean };

export interface StorageFullError extends Error {
  name: string;
}

// Cache Types
export interface CacheEntry<T> {
  value: T;
  expiry: number | null;
}

// Safe Area Insets (for mobile)
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// Vibration Pattern
export type VibrationPattern = number | number[];

// Audio Types
export type AudioType = 'tick' | 'finish' | 'error';

// Tab Types
export type AppTab = 'times' | 'tasbeeh' | 'quran' | 'settings';

// Zikr Mode
export type ZikrMode = 'morning' | 'ikindi' | 'night' | 'ek' | 'personal';

// Offline Content
export interface OfflinePoolState {
  pool: number[];
  lastUpdate: string;
}

export interface DownloadProgress {
  current: number;
  total: number;
  percentage?: number;
  phase?: 'pages' | 'special' | 'complete' | 'preparing';
}

// API Config
export interface ApiConfig {
  ALADHAN: string;
  QURAN: string;
  NOMINATIM: string;
}

// Calculation Method
export interface CalcMethod {
  id: number;
  name: string;
}

// Help Content
export interface HelpSection {
  title: string;
  content: string;
}

// Zikr Database Entry
export interface ZikrDbEntry {
  tr: { t: string; m: string };
  en: { t: string; m: string };
  de: { t: string; m: string };
}

// Icon Path (SVG)
export type IconPath = ReactNode;


// Timeout/Interval refs
export type TimerRef = ReturnType<typeof setTimeout> | null;
export type IntervalRef = ReturnType<typeof setInterval> | null;

// Abort Controller ref
export type AbortControllerRef = AbortController | null;
