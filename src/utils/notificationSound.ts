const STORAGE_KEY = "notificationSoundEnabled";
const SOUND_PATH = "/sounds/notification.mp3";

export function isNotificationSoundEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export async function enableNotificationSound(): Promise<void> {
  localStorage.setItem(STORAGE_KEY, "true");
  try {
    const audio = new Audio(SOUND_PATH);
    audio.volume = 0.1;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // Navegador pode exigir interação do usuário para liberar áudio
  }
}

export function disableNotificationSound(): void {
  localStorage.setItem(STORAGE_KEY, "false");
}

export async function playNotificationSound(): Promise<void> {
  if (!isNotificationSoundEnabled()) return;
  try {
    const audio = new Audio(SOUND_PATH);
    audio.volume = 0.8;
    await audio.play();
  } catch {
    // Navegador bloqueou autoplay ou arquivo não encontrado
  }
}

export type SoundEffect = "notification" | "success" | "error" | "message";

const soundPaths: Record<SoundEffect, string> = {
  notification: SOUND_PATH,
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
  message: "/sounds/message.mp3",
};

export async function playSoundEffect(type: SoundEffect = "notification"): Promise<void> {
  if (!isNotificationSoundEnabled()) return;
  const path = soundPaths[type];
  if (!path) return;
  try {
    const audio = new Audio(path);
    audio.volume = 0.8;
    await audio.play();
  } catch {
    // Silenciosamente ignora se o áudio não puder ser tocado
  }
}
