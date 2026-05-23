import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Foreground behavior: show banner when app is in foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let initialized = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync('market', {
    name: 'Market alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

const NotificationService = {
  async ensurePermission() {
    if (!initialized) {
      await ensureAndroidChannel();
      initialized = true;
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  },

  // Schedule at a specific Date. Returns the platform notification id (or null).
  async scheduleAt(date, { title, body, data = {} }) {
    try {
      const ok = await NotificationService.ensurePermission();
      if (!ok) return null;
      if (!(date instanceof Date) || isNaN(date) || date <= new Date()) return null;
      return await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: false },
        trigger: { date, channelId: 'reminders' },
      });
    } catch (e) {
      console.warn('[Notifications] scheduleAt', e);
      return null;
    }
  },

  // Monthly recurring at given day-of-month + time. Day must be 1..28 to avoid
  // months without that day. Returns the platform id, or null on failure.
  async scheduleMonthly({ day, hour = 9, minute = 0, title, body, data = {} }) {
    try {
      const ok = await NotificationService.ensurePermission();
      if (!ok) return null;
      const d = Math.max(1, Math.min(28, Math.floor(day)));
      const monthlyType =
        Notifications.SchedulableTriggerInputTypes?.MONTHLY ?? 'monthly';
      return await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: false },
        trigger: {
          type: monthlyType,
          day: d,
          hour,
          minute,
          channelId: 'reminders',
        },
      });
    } catch (e) {
      console.warn('[Notifications] scheduleMonthly', e);
      return null;
    }
  },

  async cancel(id) {
    if (!id) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.warn('[Notifications] cancel', e);
    }
  },

  async cancelMany(ids = []) {
    for (const id of ids) await NotificationService.cancel(id);
  },

  // ── Market alerts (Stock Lens) ─────────────────────────────────────
  // Schedule a one-off price-alert notification when an external
  // price-check tick has already determined the alert should fire.
  // Routing through the same service keeps EMI reminders + market
  // alerts under one permission grant and one platform handler.
  async fireStockAlert({ symbol, name, message, data = {} }) {
    try {
      const ok = await NotificationService.ensurePermission();
      if (!ok) return null;
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: `${symbol} alert`,
          body: message || `${name || symbol} hit your watch level.`,
          data: { kind: 'market', symbol, ...data },
          sound: false,
        },
        trigger: { seconds: 1, channelId: 'market' },
      });
    } catch (e) {
      console.warn('[Notifications] fireStockAlert', e);
      return null;
    }
  },

  // Daily price-check reminder for a watched symbol (light touch — the
  // actual price-vs-threshold compare is done by the caller).
  async scheduleDailyPriceCheck({ symbol, hour = 10, minute = 0 }) {
    try {
      const ok = await NotificationService.ensurePermission();
      if (!ok) return null;
      const dailyType =
        Notifications.SchedulableTriggerInputTypes?.DAILY ?? 'daily';
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: `Check ${symbol}`,
          body: `Daily price check for ${symbol}`,
          data: { kind: 'market', symbol },
          sound: false,
        },
        trigger: { type: dailyType, hour, minute, channelId: 'market' },
      });
    } catch (e) {
      console.warn('[Notifications] scheduleDailyPriceCheck', e);
      return null;
    }
  },
};

export default NotificationService;
