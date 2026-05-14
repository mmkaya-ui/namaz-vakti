import type { NotificationOptions } from '@app-types';

// ============================================================
// NOTIFICATION SERVICE - Push and Local Notifications
// ============================================================

export class NotificationService {
  private static permission: NotificationPermission = 'default';
  private static sentNotifications: Set<string> = new Set();
  private static cleanupScheduled = false;

  /**
   * Initialize notification service
   */
  static init(): void {
    if (!('Notification' in window)) {
      this.permission = 'denied';
      return;
    }

    this.permission = Notification.permission;
  }

  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (e) {
      console.error('Failed to request notification permission:', e);
      return 'denied';
    }
  }

  /**
   * Get current permission status
   */
  static getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Check if notifications are supported and permitted
   */
  static isEnabled(): boolean {
    return 'Notification' in window && this.permission === 'granted';
  }

  /**
   * Send notification
   */
  static async send(
    title: string, 
    options: NotificationOptions = {}
  ): Promise<Notification | null> {
    if (!this.isEnabled()) {
      return null;
    }

    // Deduplication: check if already sent today
    const tag = options.tag || title;
    if (this.sentNotifications.has(tag)) {
      return null;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icon1.jpg',
      badge: '/icon1.jpg',
      requireInteraction: false,
      ...options
    };

    try {
      // Try Service Worker first (better for mobile)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.active) {
          await registration.showNotification(title, {
            ...defaultOptions,
            tag
          });
          this.sentNotifications.add(tag);
          return null; // SW notification doesn't return Notification object
        }
      }

      // Fallback to standard Notification API
      const notification = new Notification(title, {
        ...defaultOptions,
        tag
      });

      this.sentNotifications.add(tag);
      
      // Auto-remove from sent set after some time
      setTimeout(() => {
        this.sentNotifications.delete(tag);
      }, 60000); // 1 minute

      // Clear all sent notifications at midnight to prevent memory leak
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const msUntilMidnight = midnight.getTime() - now.getTime();
      
      // Schedule a one-time cleanup if not already scheduled
      if (!this.cleanupScheduled) {
        this.cleanupScheduled = true;
        setTimeout(() => {
          this.sentNotifications.clear();
          this.cleanupScheduled = false;
        }, msUntilMidnight);
      }

      return notification;

    } catch (e) {
      console.error('Failed to send notification:', e);
      return null;
    }
  }

  /**
   * Send prayer time notification
   */
  static async sendPrayerNotification(
    prayerName: string,
    timeString: string
  ): Promise<void> {
    await this.send(
      prayerName,
      {
        body: `${timeString} - Prayer time approaching`,
        tag: `prayer_${prayerName}_${new Date().toDateString()}`,
        requireInteraction: true
      }
    );
  }

  /**
   * Send zikr completion notification
   */
  static async sendZikrCompletion(zikrName: string): Promise<void> {
    await this.send(
      'Zikr Completed',
      {
        body: `${zikrName} tesbihatı tamamlandı.`,
        tag: `zikr_complete_${zikrName}_${new Date().toDateString()}`
      }
    );
  }

  /**
   * Send reminder for incomplete zikr
   */
  static async sendIncompleteReminder(
    zikrName: string,
    nextPrayerName: string
  ): Promise<void> {
    await this.send(
      'Incomplete Zikr',
      {
        body: `${zikrName} tesbihatı henüz tamamlanmadı. ${nextPrayerName} vakti yaklaşıyor.`,
        tag: `zikr_incomplete_${zikrName}_${new Date().toDateString()}`,
        requireInteraction: true
      }
    );
  }

  /**
   * Clear all notifications
   */
  static async clearAll(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const notifications = await registration.getNotifications();
      notifications.forEach(n => n.close());
    }

    this.sentNotifications.clear();
  }

  /**
   * Schedule notification (using setTimeout - not persistent)
   * For persistent scheduling, use server-side or Background Sync API
   */
  static schedule(
    title: string,
    options: NotificationOptions,
    delayMs: number
  ): () => void {
    const timeoutId = setTimeout(() => {
      this.send(title, options);
    }, delayMs);

    // Return cancel function
    return () => clearTimeout(timeoutId);
  }

  /**
   * Mark notification as sent (prevents duplicates)
   */
  static markSent(tag: string): void {
    this.sentNotifications.add(tag);
  }

  /**
   * Check if notification was already sent
   */
  static wasSent(tag: string): boolean {
    return this.sentNotifications.has(tag);
  }
}
