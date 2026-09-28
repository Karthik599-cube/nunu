import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationScheduleItem {
  id: number;
  label: string;
  sub?: string;
  time: string; // e.g. "08:00 AM" or "14:30"
  date: string; // e.g. "2026-09-28"
  taken?: boolean;
}

/**
 * Request notification permissions from Capacitor or Web browser
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        return req.display === 'granted';
      }
      return true;
    } else if ('Notification' in window) {
      if (Notification.permission !== 'granted') {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return true;
    }
  } catch (err) {
    console.error('[NotificationService] Permission request failed:', err);
  }
  return false;
}

/**
 * Create custom notification channel for Android
 */
export async function setupNotificationChannel() {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: 'nunu_pill_reminders',
        name: 'Pill Reminders',
        description: 'Notifications for your scheduled pills and medications',
        importance: 5, // Max/High importance
        visibility: 1, // Public
        vibration: true,
        lights: true,
        lightColor: '#008b8b'
      });
    } catch (err) {
      console.warn('[NotificationService] Channel creation warning:', err);
    }
  }
}

/**
 * Parse date string "YYYY-MM-DD" and time string "HH:MM AM/PM" or "HH:MM" into a JavaScript Date object
 */
export function parseDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;

    let hours = 0;
    let minutes = 0;

    const cleanTime = timeStr.trim();
    const isPM = /pm/i.test(cleanTime);
    const isAM = /am/i.test(cleanTime);

    const timeParts = cleanTime.replace(/(am|pm)/i, '').trim().split(':');
    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }

    const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return scheduledDate;
  } catch (e) {
    console.error('[NotificationService] Error parsing date/time:', e);
    return null;
  }
}

/**
 * Schedule a local notification for a specific reminder
 */
export async function scheduleLocalNotification(item: NotificationScheduleItem): Promise<boolean> {
  if (item.taken) return false;

  const targetDate = parseDateTime(item.date, item.time);
  if (!targetDate) return false;

  const now = new Date();
  if (targetDate.getTime() <= now.getTime()) {
    // Already passed
    return false;
  }

  const hasPerm = await requestNotificationPermission();
  if (!hasPerm) return false;

  try {
    if (Capacitor.isNativePlatform()) {
      await setupNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `💊 Time for ${item.label}`,
            body: item.sub ? item.sub : `Take your scheduled dose of ${item.label}`,
            id: Math.abs(item.id) % 2147483647,
            schedule: { at: targetDate },
            channelId: 'nunu_pill_reminders',
            sound: undefined,
            smallIcon: 'ic_launcher',
            actionTypeId: 'TAKE_PILL_ACTION',
            extra: {
              reminderId: item.id,
              pillName: item.label
            }
          }
        ]
      });
      console.log(`[NotificationService] Scheduled native notification for ${item.label} at ${targetDate.toLocaleString()}`);
      return true;
    } else if ('Notification' in window && Notification.permission === 'granted') {
      const timeMs = targetDate.getTime() - now.getTime();
      if (timeMs > 0 && timeMs < 86400000 * 7) {
        setTimeout(() => {
          new Notification(`💊 Time for ${item.label}`, {
            body: item.sub ? item.sub : `Take your scheduled dose of ${item.label}`,
            icon: '/nunu_logo.png'
          });
        }, timeMs);
        return true;
      }
    }
  } catch (err) {
    console.error('[NotificationService] Failed to schedule notification:', err);
  }
  return false;
}

/**
 * Sync and schedule notifications for an array of reminders
 */
export async function syncAllNotifications(reminders: NotificationScheduleItem[]) {
  try {
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm) return;

    if (Capacitor.isNativePlatform()) {
      // Cancel existing pending notifications to avoid duplicates
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (const rem of reminders) {
      if (!rem.taken && rem.date >= todayStr) {
        await scheduleLocalNotification(rem);
      }
    }
  } catch (err) {
    console.error('[NotificationService] Error syncing notifications:', err);
  }
}

/**
 * Send an immediate test or alert notification
 */
export async function sendInstantNotification(title: string, body: string): Promise<boolean> {
  try {
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm) return false;

    if (Capacitor.isNativePlatform()) {
      await setupNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 1000) },
            channelId: 'nunu_pill_reminders'
          }
        ]
      });
      return true;
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/nunu_logo.png' });
      return true;
    }
  } catch (err) {
    console.error('[NotificationService] Instant notification error:', err);
  }
  return false;
}
