# Namaz ve Zikir v3.0

Modern, TypeScript-tabanlı PWA (Progressive Web App) namaz vakitleri, tesbihat ve Kur'an okuma uygulaması.

## Özellikler

- **Namaz Vakitleri**: Diyanet, MWL, ISNA, Egypt hesaplama yöntemleri
- **Tesbihat**: Sabah, İkindi, Yatsı, Günlük ve Kişisel zikir modları
- **Kur'an**: Rastgele sayfa okuma, çevrimdışı destek
- **Çoklu Dil**: Türkçe, English, Deutsch
- **Karanlık/Aydınlık Mod**: Otomatik ve manuel tema
- **Çevrimdışı Destek**: Namaz vakitleri ve Kur'an sayfaları önbelleğe alınır
- **Bildirimler**: Vakit hatırlatmaları (isteğe bağlı)

## Teknoloji Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite 5
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **PWA**: Vite PWA Plugin

## Kurulum

```bash
npm install
```

## Geliştirme

```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

## Build

```bash
npm run build
```

Build çıktısı `dist/` klasöründe oluşturulur.

## Test

```bash
# Testleri çalıştır
npm test

# Testleri UI modunda çalıştır
npm run test:ui

# Coverage raporu
npm run test:coverage
```

## Type Check

```bash
npm run type-check
```

## ESLint

```bash
npm run lint
```

## Proje Yapısı

```
src/
├── components/     # React bileşenleri
├── constants/      # Sabitler (translations, config, zikrDatabase)
├── context/        # React Context (AppContext)
├── hooks/          # Custom hooks
│   ├── useTime.ts
│   ├── usePrayerTimes.ts
│   ├── useOffline.ts
│   └── useZikrProgress.ts
├── services/       # Servisler
│   ├── location.ts
│   ├── prayer.ts
│   ├── quran.ts
│   └── notification.ts
├── types/          # TypeScript tip tanımları
├── utils/          # Yardımcı fonksiyonlar
│   ├── storage.ts      # LocalStorage + LRU eviction
│   ├── cache.ts        # TTL cache
│   ├── audio.ts        # Web Audio API
│   ├── api.ts          # API çağrıları + retry
│   ├── helpers.ts      # Genel yardımcılar
│   └── vibration.ts    # Titreşim API
├── App.tsx         # Ana uygulama
├── main.tsx        # Entry point
└── index.css       # Global stiller
```

## Temel Bug Fix'ler ve İyileştirmeler

### 1. Storage Quota Handling
- `StorageService` LRU (Least Recently Used) eviction ile dolduğunda otomatik temizlik
- Korumalı anahtarlar (koordinat, dil vb.) korunur

### 2. Date Boundary Fix
- `useTime` hook gece yarısı geçişini algılar ve state'i sıfırlar
- `getLocalTodayDate()` yerel zaman dilimini kullanır

### 3. Race Condition Fix
- `usePrayerTimes` ve `useOffline` abort controller ile cleanup
- API çağrılarında exponential backoff retry

### 4. Memory Leak Fix
- Tüm interval ve timeout'lar cleanup edilir
- AbortController ile pending request iptali

### 5. Safe Vibration
- iOS 10 saniye limit kontrolü
- Graceful degradation

### 6. Rate Limiting
- `ApiService` domain-based rate limiting
- 30 istek/dakika limiti

## API'lar

- **Aladhan**: https://api.aladhan.com/v1 (Namaz vakitleri)
- **Alquran**: https://api.alquran.cloud/v1 (Kur'an)
- **Nominatim**: https://nominatim.openstreetmap.org (Coğrafi kodlama)

## Lisans

MIT
