import type { AudioType } from '../types';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// ============================================================
// AUDIO SERVICE - Web Audio API with Compressor
// ============================================================

export class AudioService {
  private static ctx: AudioContext | null = null;
  private static compressor: DynamicsCompressorNode | null = null;
  private static isInitializing = false;
  private static lastTickTime = 0;
  private static tickDebounceMs = 50; // Minimum 50ms between ticks

  /**
   * Initialize AudioContext with compressor
   */
  static init(): boolean {
    if (this.ctx || this.isInitializing) return !!this.ctx;
    
    this.isInitializing = true;
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        return false;
      }

      this.ctx = new AudioContextClass();

      // Create master compressor for loudness normalization (makes quiet sounds louder)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime); // Start compressing early
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime); // Soft knee
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime); // High compression ratio
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime); // Fast attack
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      console.log('AudioService initialized');
      return true;
    } catch (e) {
      console.error('Audio initialization error:', e);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Resume AudioContext (needed for suspended state on iOS)
   */
  static async resume(): Promise<boolean> {
    if (!this.ctx) {
      return this.init();
    }
    
    if (this.ctx.state === 'suspended') {
      try {
        // iOS fix: Add small delay before resume to prevent pop/click
        await new Promise(resolve => setTimeout(resolve, 10));
        await this.ctx.resume();
        return true;
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Play audio by type
   */
  static async play(type: AudioType): Promise<void> {
    // Initialize if needed
    if (!this.ctx) {
      if (!this.init()) return;
    }

    // Resume if suspended
    if (this.ctx!.state === 'suspended') {
      const resumed = await this.resume();
      if (!resumed) return;
    }

    try {
      switch (type) {
        case 'tick':
          this.playTick();
          break;
        case 'finish':
          this.playFinish();
          break;
        case 'error':
          this.playError();
          break;
        default:
          console.warn('Unknown audio type:', type);
      }
    } catch (e) {
      console.error('Audio play error:', e);
    }
  }

  /**
   * Play tick sound (soft sine wave) with debounce
   */
  private static playTick(): void {
    if (!this.ctx || !this.compressor) return;

    // Debounce: prevent rapid-fire ticks
    const now = Date.now();
    if (now - this.lastTickTime < this.tickDebounceMs) return;
    this.lastTickTime = now;

    const audioNow = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.compressor);

    // Softer sine wave for more spiritual sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioNow);
    osc.frequency.exponentialRampToValueAtTime(100, audioNow + 0.08);

    // Keep linear ramp for audibility, but smoother attack
    gain.gain.setValueAtTime(0, audioNow);
    gain.gain.linearRampToValueAtTime(0.5, audioNow + 0.005); 
    gain.gain.exponentialRampToValueAtTime(0.01, audioNow + 0.08);

    osc.start(audioNow);
    osc.stop(audioNow + 0.09);

    // Cleanup
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, 200);
  }

  /**
   * Play finish sound (gentle chime)
   */
  private static playFinish(): void {
    if (!this.ctx || !this.compressor) return;

    const now = this.ctx.currentTime;
    
    // Create two oscillators for a chord
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.compressor);

    // Major third chord
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now); // E5

    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.0);
    osc2.stop(now + 1.0);

    // Cleanup
    setTimeout(() => {
      osc1.disconnect();
      osc2.disconnect();
      gain.disconnect();
    }, 1100);
  }

  /**
   * Play error sound (low buzz)
   */
  private static playError(): void {
    if (!this.ctx || !this.compressor) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);

    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, 350);
  }

  /**
   * Check if audio is supported
   */
  static isSupported(): boolean {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Get AudioContext state
   */
  static getState(): string {
    return this.ctx?.state || 'closed';
  }

  /**
   * Suspend AudioContext (to save battery)
   */
  static async suspend(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') {
      await this.ctx.suspend();
    }
  }

  /**
   * Close AudioContext
   */
  static close(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.compressor = null;
    }
  }
}
