export type NotifType = 'new_lead' | 'pix_paid' | 'pix_generated'

export function playSound(type: NotifType) {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime

    const playNote = (freq: number, duration: number, startTime = 0, gainVal = 0.3) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(gainVal, now + startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, now + startTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + startTime)
      osc.stop(now + startTime + duration)
    }

    switch (type) {
      case 'pix_paid': {
        playNote(523.25, 0.12, 0, 0.35)
        playNote(659.25, 0.12, 0.08, 0.35)
        playNote(783.99, 0.25, 0.16, 0.4)
        playNote(1046.5, 0.35, 0.3, 0.3)
        break
      }
      case 'new_lead': {
        playNote(880, 0.3, 0, 0.3)
        break
      }
      case 'pix_generated': {
        playNote(659.25, 0.1, 0, 0.25)
        playNote(659.25, 0.1, 0.15, 0.25)
        break
      }
    }
  } catch {
  }
}

export const NOTIFICATION_INFO: Record<NotifType, { label: string; description: string; icon: string }> = {
  new_lead: { label: 'Novo Lead', description: 'Quando um novo usuário se cadastra', icon: '🆕' },
  pix_paid: { label: 'Pix Pago', description: 'Quando um PIX é pago', icon: '💰' },
  pix_generated: { label: 'Pix Gerado', description: 'Quando um PIX é gerado', icon: '📄' },
}
