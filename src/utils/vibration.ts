import { isIOS } from './helpers';
import type { VibrationPattern } from '../types';

// ============================================================
// VIBRATION SERVICE - Safe wrapper with iOS handling
// ============================================================

export class VibrationService {
  private static isEnabled = true;
  private static hasPermission = true;
  private static readonly IOS_MAX_DURATION = 10000; // 10 seconds

  /**
   * Initialize vibration service
   */
  static init(enabled: boolean): void {
    this.isEnabled = enabled;
    this.checkPermission();
  }

  /**
   * Check if vibration is supported
   */
  static isSupported(): boolean {
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }

  /**
   * Check permission (mainly for iOS)
   */
  private static checkPermission(): void {
    // Most browsers don't require permission for vibration
    // but iOS may block it in some contexts
    this.hasPermission = true;
  }

  /**
   * Enable/disable vibration
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get enabled state
   */
  static getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Safe vibration with iOS handling
   */
  static vibrate(pattern: VibrationPattern): void {
    if (!this.isEnabled || !this.isSupported() || !this.hasPermission) {
      return;
    }

    try {
      let safePattern: VibrationPattern;

      if (typeof pattern === 'number') {
        // Single duration
        safePattern = this.limitDuration(pattern);
      } else {
        // Pattern array
        safePattern = this.normalizePattern(pattern);
      }

      navigator.vibrate(safePattern);
    } catch (e) {
      // iOS may throw errors for certain vibration patterns
      console.warn('Vibration failed:', e);
    }
  }

  /**
   * Vibrate for tick (short feedback)
   */
  static tick(): void {
    this.vibrate(40);
  }

  /**
   * Vibrate for completion (longer feedback)
   */
  static complete(): void {
    if (isIOS()) {
      // iOS: Single longer vibration
      this.vibrate(200);
    } else {
      // Android/others: Pattern
      this.vibrate([200, 100, 200]);
    }
  }

  /**
   * Vibrate for error
   */
  static error(): void {
    if (isIOS()) {
      this.vibrate(100);
    } else {
      this.vibrate([100, 50, 100, 50, 100]);
    }
  }

  /**
   * Stop all vibration
   */
  static stop(): void {
    if (this.isSupported()) {
      navigator.vibrate(0);
    }
  }

  /**
   * Limit single duration for iOS
   */
  private static limitDuration(duration: number): number {
    if (isIOS()) {
      return Math.min(duration, this.IOS_MAX_DURATION);
    }
    return duration;
  }

  /**
   * Normalize pattern for iOS
   */
  private static normalizePattern(pattern: number[]): number[] {
    if (!isIOS()) {
      return pattern;
    }

    // Calculate total duration
    const totalDuration = pattern.reduce((sum, val) => sum + val, 0);

    // If total exceeds limit, scale down
    if (totalDuration > this.IOS_MAX_DURATION) {
      const scale = this.IOS_MAX_DURATION / totalDuration;
      return pattern.map(v => Math.max(1, Math.floor(v * scale)));
    }

    return pattern;
  }

  /**
   * Test vibration (user-initiated for iOS)
   */
  static async test(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // Short test vibration
      const result = navigator.vibrate(50);
      return result !== false;
    } catch (e) {
      return false;
    }
  }
}

export const { vibrate: safeVibrate, tick: vibrateTick, complete: vibrateComplete } = VibrationService;
