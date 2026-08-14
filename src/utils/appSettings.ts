export type AutoLockMinutes = "off" | "1" | "5" | "15" | "30";
export type ThemeMode = "warm" | "system";

export interface AppSettings {
  autoLockMinutes: AutoLockMinutes;
  aiEnabled: boolean;
  defaultRemindIntervalDays: 30 | 60 | 90;
  theme: ThemeMode;
  eventReminder: boolean;
  checkInReminder: boolean;
  contactCycleReminder: boolean;
}

const SETTINGS_KEY = "saramdam_app_settings";

export const defaultAppSettings: AppSettings = {
  autoLockMinutes: "5",
  aiEnabled: true,
  defaultRemindIntervalDays: 60,
  theme: "warm",
  eventReminder: true,
  checkInReminder: true,
  contactCycleReminder: true
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultAppSettings;
    return { ...defaultAppSettings, ...JSON.parse(raw) };
  } catch {
    return defaultAppSettings;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
