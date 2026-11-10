import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

const KEY = 'souk-sound';
type Cue = 'nav' | 'tap' | 'open' | 'close';

/**
 * Showroom sound, synthesised with Web Audio (no audio files, no licensing):
 * a quiet driving loop and short interface cues. Off until the visitor turns it on.
 */
@Injectable({ providedIn: 'root' })
export class Sound {
  private readonly win = inject(DOCUMENT).defaultView;
  readonly enabled = signal(false);
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private timer = 0;
  private nextBeat = 0;
  private beat = 0;

  constructor() {
    if (!this.win) return;
    try {
      if (this.win.localStorage.getItem(KEY) === 'on') this.enabled.set(true);
    } catch {
      /* storage unavailable */
    }
    // Browsers only allow sound after a gesture: resume on the first one.
    if (this.enabled()) {
      const resume = () => {
        this.start();
        this.win?.removeEventListener('pointerdown', resume);
        this.win?.removeEventListener('keydown', resume);
      };
      this.win.addEventListener('pointerdown', resume, { once: true });
      this.win.addEventListener('keydown', resume, { once: true });
    }
    this.win.document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (this.win!.document.hidden) void this.ctx.suspend();
      else if (this.enabled()) void this.ctx.resume();
    });
  }

  toggle() {
    const on = !this.enabled();
    this.enabled.set(on);
    try {
      this.win?.localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    if (on) {
      this.start();
      this.play('open');
    } else this.stop();
  }

  /** Short interface cue; silent while sound is off. */
  play(cue: Cue) {
    if (!this.enabled() || !this.ctx || !this.master) return;
    const c = this.ctx;
    const t = c.currentTime + 0.005;
    if (cue === 'tap') {
      this.tone(1760, t, 0.06, 0.18, 'sine', 2400);
      this.tone(2637, t + 0.012, 0.05, 0.08, 'sine', 3200);
    } else if (cue === 'nav') {
      // Soft filtered whoosh, then a two-note chime.
      const src = c.createBufferSource();
      src.buffer = this.noise(0.45);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(3200, t + 0.32);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      src.connect(f).connect(g).connect(this.master);
      src.start(t);
      this.tone(659.25, t + 0.2, 0.32, 0.12, 'triangle', 2600);
      this.tone(987.77, t + 0.27, 0.36, 0.1, 'triangle', 3000);
    } else if (cue === 'open') {
      this.tone(523.25, t, 0.22, 0.12, 'triangle', 2200);
      this.tone(783.99, t + 0.07, 0.3, 0.1, 'triangle', 2600);
    } else {
      this.tone(783.99, t, 0.18, 0.1, 'triangle', 2200);
      this.tone(523.25, t + 0.06, 0.24, 0.09, 'triangle', 1800);
    }
  }

  // ─── Engine ───────────────────────────────────────────────────────────

  private start() {
    if (!this.win) return;
    const AC = this.win.AudioContext ?? (this.win as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.0001;
      this.musicBus.connect(this.master);
    }
    void this.ctx.resume();
    const t = this.ctx.currentTime;
    this.musicBus!.gain.cancelScheduledValues(t);
    this.musicBus!.gain.setTargetAtTime(0.32, t, 1.2);
    if (!this.timer) {
      this.nextBeat = t + 0.1;
      this.timer = this.win.setInterval(() => this.schedule(), 50);
    }
  }

  private stop() {
    if (!this.ctx || !this.musicBus || !this.win) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(0.0001, t, 0.25);
    this.win.clearInterval(this.timer);
    this.timer = 0;
    this.win.setTimeout(() => {
      if (!this.enabled()) void this.ctx?.suspend();
    }, 1200);
  }

  /** Look-ahead sequencer: 100 bpm, 16th-note steps, 4-bar progression in A minor (Am F C G). */
  private schedule() {
    const c = this.ctx!;
    const step = 60 / 100 / 4;
    const chords = [
      [57, 60, 64],
      [53, 57, 60],
      [48, 55, 64],
      [55, 59, 62],
    ];
    const roots = [45, 41, 48, 43];
    while (this.nextBeat < c.currentTime + 0.15) {
      const t = this.nextBeat;
      const s = this.beat % 16;
      const bar = Math.floor(this.beat / 16) % 4;
      if (s % 8 === 0) this.kick(t);
      if (s % 4 === 2) this.hat(t, 0.05);
      else if (s % 2 === 1) this.hat(t, 0.018);
      if (s === 4 || s === 12) this.snare(t);
      // Driving eighth-note bass.
      if (s % 2 === 0) this.tone(this.hz(roots[bar] - 12 + (s === 14 ? 12 : 0)), t, step * 1.6, 0.16, 'sawtooth', 420, this.musicBus!);
      // Warm pad on each bar, a pluck arpeggio on top.
      if (s === 0) for (const n of chords[bar]) this.tone(this.hz(n), t, step * 16, 0.035, 'triangle', 1400, this.musicBus!, 0.35);
      if (s % 4 === 0) this.tone(this.hz(chords[bar][(s / 4) % 3] + 12), t, step * 1.5, 0.05, 'square', 1800, this.musicBus!);
      this.nextBeat += step;
      this.beat++;
    }
  }

  private hz(midi: number) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private tone(freq: number, t: number, dur: number, vol: number, type: OscillatorType, cutoff: number, out: AudioNode = this.master!, attack = 0.005) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(this.musicBus!);
    o.start(t);
    o.stop(t + 0.3);
  }

  private hat(t: number, vol: number) {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise(0.06);
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f).connect(g).connect(this.musicBus!);
    src.start(t);
  }

  private snare(t: number) {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise(0.2);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(f).connect(g).connect(this.musicBus!);
    src.start(t);
  }

  private noiseBuf: AudioBuffer | null = null;
  private noise(seconds: number) {
    const c = this.ctx!;
    if (!this.noiseBuf) {
      this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (seconds >= 1) return this.noiseBuf;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
    b.getChannelData(0).set(this.noiseBuf.getChannelData(0).subarray(0, b.length));
    return b;
  }
}
