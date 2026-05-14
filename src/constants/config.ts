import type { ApiConfig, StorageKeys, Coordinates, Language, CalcMethod } from '@/types';

// ============================================================
// APP CONFIGURATION
// ============================================================

export const CONFIG = Object.freeze({
  API: {
    ALADHAN: 'https://api.aladhan.com/v1',
    QURAN: 'https://api.alquran.cloud/v1',
    NOMINATIM: 'https://nominatim.openstreetmap.org'
  } as ApiConfig,

  STORAGE_KEYS: {
    LANG: 'appLang',
    COORDS: 'coords',
    LOC_NAME: 'locName',
    THEME: 'isDarkMode',
    SETTINGS: 'appSettings',
    CUSTOM_ZIKRS: 'customZikrs',
    OFFLINE_QURAN_POOL: 'offlineQuranPool',
    LAST_POOL_UPDATE: 'offlinePoolLastUpdate',
    TASBEEH_PROGRESS_PREFIX: 'tasbeeh_progress_',
    TASBEEH_STATUS_PREFIX: 'tasbeeh_status_',
    LAST_ZIKR_MODE: 'lastZikrMode',
    MIGRATED_TO_SW_V2: 'migrated_to_sw_v2'
  } as StorageKeys,

  DEFAULTS: {
    COORDS: { lat: 41.0082, lng: 28.9784 } as Coordinates, // Istanbul
    LOC_NAME: "İstanbul",
    LANG: 'tr' as Language,
    THEME: 'auto' as const,
    SETTINGS: {
      methodId: 13,      // Diyanet
      asrMethod: 0,      // Standard
      offsets: {
        fajr: 0,
        sunrise: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0
      },
      fontSize: 1.35,
      soundEnabled: true,
      vibrationEnabled: true
    }
  },

  // Cache TTL in minutes
  CACHE_TTL: {
    PRAYER_TIMES: 60 * 24 * 30,  // 30 days
    QURAN_PAGE: null,            // No expiry (permanent)
    ZIKR_DATA: null,             // No expiry (permanent)
    LOCATION: 60 * 24 * 7        // 7 days
  },

  // Offline Pool Settings
  OFFLINE: {
    DEFAULT_POOL_SIZE: 50,
    MAX_POOL_SIZE: 604,          // Full Quran
    QURAN_PAGES: 604,
    DOWNLOAD_CHUNK_SIZE: 3       // Parallel downloads
  },

  // UI Settings
  UI: {
    COOLDOWN_MS: 500,
    NOTIFICATION_BEFORE_MINUTES: 30,
    MIN_FONT_SIZE: 0.8,
    MAX_FONT_SIZE: 2.0,
    FONT_SIZE_STEP: 0.1
  },

  // Calculation Methods
  CALC_METHODS: [
    { id: 13, name: 'Diyanet' },
    { id: 3, name: 'Muslim World League' },
    { id: 2, name: 'ISNA' },
    { id: 5, name: 'Egypt' }
  ] as CalcMethod[],

  // Version
  VERSION: '3.0.0'
});

// Surah Names in Turkish (for display)
export const SURAH_NAMES_TR = [
  "Fatiha", "Bakara", "Ali İmran", "Nisa", "Maide", "En'am", "Araf", "Enfal", "Tevbe", "Yunus",
  "Hud", "Yusuf", "Ra'd", "İbrahim", "Hicr", "Nahl", "İsra", "Kehf", "Meryem", "Taha",
  "Enbiya", "Hac", "Mü'minun", "Nur", "Furkan", "Şuara", "Neml", "Kasas", "Ankebut", "Rum",
  "Lokman", "Secde", "Ahzab", "Sebe", "Fatır", "Yasin", "Saffat", "Sad", "Zümer", "Mü'min",
  "Fussilet", "Şura", "Zuhruf", "Duhan", "Casiye", "Ahkaf", "Muhammed", "Fetih", "Hucurat", "Kaf",
  "Zariyat", "Tur", "Necm", "Kamer", "Rahman", "Vakıa", "Hadid", "Mücadele", "Haşr", "Mümtehine",
  "Saf", "Cuma", "Münafikun", "Tegabun", "Talak", "Tahrim", "Mülk", "Kalem", "Hakka", "Mearic",
  "Nuh", "Cin", "Müzzemmil", "Müddessir", "Kıyamet", "İnsan", "Mürselat", "Nebe", "Naziat", "Abese",
  "Tekvir", "İnfitar", "Mutaffifin", "İnşikak", "Buruc", "Tarık", "A'la", "Gaşiye", "Fecr", "Beled",
  "Şems", "Leyl", "Duha", "İnşirah", "Tin", "Alak", "Kadir", "Beyyine", "Zilzal", "Adiyat",
  "Karia", "Tekasür", "Asr", "Hümeze", "Fil", "Kureyn", "Maun", "Kevser", "Kafirun", "Nasr",
  "Tebbet", "İhlas", "Felak", "Nas"
] as const;

// Zikr Modes
export const ZIKR_MODES = ['morning', 'ikindi', 'night', 'ek', 'personal'] as const;

// App Tabs
export const APP_TABS = ['times', 'tasbeeh', 'quran', 'settings'] as const;
