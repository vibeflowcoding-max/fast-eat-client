class AudioManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private lastBidSoundAt = 0;
  private readonly bidCooldownMs = 1200;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return null;
      }
    }

    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async unlock() {
    const context = this.getContext();
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        return;
      }
    }
  }

  playBidNotification() {
    if (!this.enabled) {
      return;
    }

    const nowMs = Date.now();
    if (nowMs - this.lastBidSoundAt < this.bidCooldownMs) {
      return;
    }

    const context = this.getContext();
    if (!context) {
      return;
    }

    this.lastBidSoundAt = nowMs;

    const now = context.currentTime;

    const osc1 = context.createOscillator();
    const gain1 = context.createGain();
    osc1.connect(gain1);
    gain1.connect(context.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(820, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.24, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = context.createOscillator();
    const gain2 = context.createGain();
    osc2.connect(gain2);
    gain2.connect(context.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(620, now + 0.14);
    gain2.gain.setValueAtTime(0, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.5);
  }
}

export const audioManager = new AudioManager();
