export type NotifType = 'new_lead' | 'pix_paid' | 'pix_generated'

const SOUND_MAP: Record<NotifType, string> = {
  pix_paid: '/sounds/pix-paid.wav',
  pix_generated: '/sounds/pix-received.wav',
  new_lead: '/sounds/new-lead.wav',
}

let audioCtx: AudioContext | null = null

export function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new(window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function playSound(type: NotifType) {
  const enabled = localStorage.getItem("notificationSoundEnabled") === "true"
  if (!enabled) return
  try {
    const ctx = ensureAudioCtx()
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = 0.8
    source.connect(gain).connect(ctx.destination)

    fetch(SOUND_MAP[type])
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(audioBuf => {
        source.buffer = audioBuf
        source.start(0)
      })
      .catch(() => {
        const fallback = new Audio(SOUND_MAP[type])
        fallback.volume = 0.8
        fallback.play().catch(() => {})
      })
  } catch {
    // falha silenciosa
  }
}

export const NOTIFICATION_INFO: Record<NotifType, { label: string; description: string; icon: string; soundLabel: string }> = {
  new_lead: { label: 'Novo Lead', description: 'Quando um novo usuário se cadastra', icon: '🆕', soundLabel: 'new-lead.wav' },
  pix_paid: { label: 'Pix Pago', description: 'Quando um PIX é pago', icon: '💰', soundLabel: 'pix-paid.wav' },
  pix_generated: { label: 'Pix Gerado', description: 'Quando um PIX é gerado', icon: '📄', soundLabel: 'pix-received.wav' },
}
