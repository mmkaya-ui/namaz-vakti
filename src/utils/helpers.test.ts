import { describe, it, expect } from 'vitest';
import {
  getSecureRandomNumber,
  getLocalTodayDate,
  parseTimeString,
  formatDuration,
  formatTimer,
  isSameDay,
  generateId
} from './helpers';

describe('Helpers', () => {
  describe('getSecureRandomNumber', () => {
    it('should return number within range', () => {
      const result = getSecureRandomNumber(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should work without crypto API', () => {
      const originalCrypto = window.crypto;
      Object.defineProperty(window, 'crypto', {
        value: undefined,
        writable: true
      });
      
      const result = getSecureRandomNumber(1, 100);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
      
      window.crypto = originalCrypto;
    });
  });

  describe('getLocalTodayDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = getLocalTodayDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('parseTimeString', () => {
    it('should parse HH:MM format', () => {
      const baseDate = new Date('2024-01-15');
      const result = parseTimeString('14:30', baseDate);
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.getHours()).toBe(14);
      expect(result?.getMinutes()).toBe(30);
    });

    it('should return null for invalid string', () => {
      const result = parseTimeString('invalid');
      expect(result).toBeNull();
    });

    it('should handle time with spaces', () => {
      const baseDate = new Date('2024-01-15');
      const result = parseTimeString('05:45 (GMT+3)', baseDate);
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.getHours()).toBe(5);
      expect(result?.getMinutes()).toBe(45);
    });
  });

  describe('formatDuration', () => {
    it('should format hours and minutes', () => {
      expect(formatDuration(3660000)).toBe('1h 1m');
    });

    it('should format only minutes when less than hour', () => {
      expect(formatDuration(900000)).toBe('15m');
    });
  });

  describe('formatTimer', () => {
    it('should format as MM:SS', () => {
      expect(formatTimer(125)).toBe('2:05');
    });

    it('should handle single digit seconds', () => {
      expect(formatTimer(5)).toBe('0:05');
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const d1 = new Date('2024-01-15 10:00');
      const d2 = new Date('2024-01-15 20:00');
      expect(isSameDay(d1, d2)).toBe(true);
    });

    it('should return false for different days', () => {
      const d1 = new Date('2024-01-15');
      const d2 = new Date('2024-01-16');
      expect(isSameDay(d1, d2)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should include prefix when provided', () => {
      const id = generateId('test_');
      expect(id.startsWith('test_')).toBe(true);
    });
  });
});
