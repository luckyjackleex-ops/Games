class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = typeof localStorage !== 'undefined' ? localStorage.getItem('quoridor_muted') === 'true' : false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('quoridor_muted', String(this.isMuted));
    } catch {
      // ignore
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('quoridor_muted', String(this.isMuted));
    } catch {
      // ignore
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public triggerHaptic(type: 'tap' | 'wall' | 'error' | 'victory') {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'tap') navigator.vibrate(12);
        else if (type === 'wall') navigator.vibrate([15, 20, 15]);
        else if (type === 'error') navigator.vibrate([30, 40, 30]);
        else if (type === 'victory') navigator.vibrate([40, 30, 40, 30, 80]);
      } catch {
        // Ignore vibration errors
      }
    }
  }

  public playMove() {
    this.triggerHaptic('tap');
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // AudioContext error ignored
    }
  }

  public playWall() {
    this.triggerHaptic('wall');
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      // Dual resonance wooden snap sound
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc2.start();
      osc.stop(this.ctx.currentTime + 0.12);
      osc2.stop(this.ctx.currentTime + 0.12);
    } catch {
      // AudioContext error ignored
    }
  }

  public playError() {
    this.triggerHaptic('error');
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, this.ctx.currentTime);
      osc.frequency.setValueAtTime(95, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch {
      // AudioContext error ignored
    }
  }

  public playVictory() {
    this.triggerHaptic('victory');
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.3, this.ctx!.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(this.ctx!.currentTime + idx * 0.1);
        osc.stop(this.ctx!.currentTime + idx * 0.1 + 0.35);
      });
    } catch {
      // AudioContext error ignored
    }
  }

  public playJoinRoom() {
    this.triggerHaptic('tap');
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // AudioContext error ignored
    }
  }

  public playGameStart() {
    this.triggerHaptic('wall');
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.25, this.ctx!.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(this.ctx!.currentTime + idx * 0.08);
        osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.2);
      });
    } catch {
      // AudioContext error ignored
    }
  }
}

export const soundManager = new SoundManager();
