const STORAGE_KEY = "notificationSoundEnabled";

export function isNotificationSoundEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export async function enableNotificationSound(): Promise<void> {
  localStorage.setItem(STORAGE_KEY, "true");
}

export function disableNotificationSound(): void {
  localStorage.setItem(STORAGE_KEY, "false");
}
