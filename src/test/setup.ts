import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn()
});

// Mock caches API
const cachesMock = {
  match: vi.fn(),
  open: vi.fn().mockResolvedValue({
    put: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn()
  }),
  keys: vi.fn().mockResolvedValue([]),
  delete: vi.fn()
};
Object.defineProperty(window, 'caches', {
  value: cachesMock
});

// Mock geolocation
const geolocationMock = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
};
Object.defineProperty(navigator, 'geolocation', {
  value: geolocationMock
});

// Mock Notification API
class MockNotification {
  static permission = 'default';
  static requestPermission = vi.fn().mockResolvedValue('granted');
  constructor(public title: string, public options?: object) {}
  close = vi.fn();
}
Object.defineProperty(window, 'Notification', {
  value: MockNotification
});

// Mock service worker
const serviceWorkerMock = {
  register: vi.fn().mockResolvedValue({
    scope: '/',
    update: vi.fn(),
    unregister: vi.fn()
  }),
  ready: Promise.resolve({
    scope: '/'
  })
};
Object.defineProperty(navigator, 'serviceWorker', {
  value: serviceWorkerMock
});

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  createOscillator = vi.fn().mockReturnValue({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    type: 'sine'
  });
  createGain = vi.fn().mockReturnValue({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  });
  createDynamicsCompressor = vi.fn().mockReturnValue({
    connect: vi.fn(),
    threshold: { setValueAtTime: vi.fn() },
    knee: { setValueAtTime: vi.fn() },
    ratio: { setValueAtTime: vi.fn() },
    attack: { setValueAtTime: vi.fn() },
    release: { setValueAtTime: vi.fn() }
  });
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}
Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext
});
Object.defineProperty(window, 'webkitAudioContext', {
  value: MockAudioContext
});

// Mock fetch
global.fetch = vi.fn();
