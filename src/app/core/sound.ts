import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BUILTIN_TRACKS, type Track } from './catalog.model';

const KEY = 'souk-sound';
const TRACK_KEY = 'souk-track';
type Cue = 'nav' | 'tap' | 'open' | 'close';

/** One entry of the playlist: a generated track, or an audio file added in the admin. */
export interface PlaylistItem {
  key: string;
  title: string;
  subtitle: string;
  kind: 'builtin' | 'file';
  url?: string;
}

/** Patterns of the generated tracks (original compositions). */
interface Pattern {
  bpm: number;
  chords: number[][];
  roots: number[];
  kick: number[];
  snare: number[];
  hat: 'eighths' | 'sixteenths' | 'offbeat';
  bassEvery: number;
  arp: boolean;
  padVol: number;
}

const PATTERNS: Record<string, Pattern> = {
  // Driving, A minor: Am F C G.
  elan: { bpm: 100, chords: [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]], roots: [45, 41, 48, 43], kick: [0, 8], snare: [4, 12], hat: 'eighths', bassEvery: 2, arp: true, padVol: 0.035 },
  // Calm, C major sevenths: Cmaj7 Am7 Fmaj7 G6.
  lagune: { bpm: 84, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 52]], roots: [36, 33, 41, 43], kick: [0], snare: [8], hat: 'offbeat', bassEvery: 8, arp: true, padVol: 0.05 },
  // Energetic, E minor: Em C G D.
  plateau: { bpm: 116, chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]], roots: [40, 36, 43, 38], kick: [0, 6, 8, 14], snare: [4, 12], hat: 'sixteenths', bassEvery: 2, arp: false, padVol: 0.03 },
};

/**
 * Showroom sound, synthesised with Web Audio (no audio files, no licensing):
 * a quiet driving loop and short interface cues. Off until the visitor turns it on.
 */
@Injectable({ providedIn: 'root' })
export class Sound {
  private readonly win = inject(DOCUMENT).defaultView;
  readonly enabled = signal(false);
  /** Tracks added by the team (audio files they hold the rights for). */
  private readonly files = signal<Track[]>([]);
  readonly playlist = computed<PlaylistItem[]>(() => [
    ...BUILTIN_TRACKS.map((t) => ({ key: t.id, title: t.title, subtitle: `${t.mood} · Selys Africa`, kind: 'builtin' as const })),
    ...this.files().map((t) => ({ key: `f${t.id}`, title: t.title, subtitle: t.artist || 'Morceau ajouté', kind: 'file' as const, url: t.url })),
  ]);
  readonly current = signal<string>('elan');
  readonly currentItem = computed(() => this.playlist().find((t) => t.key === this.current()) ?? this.playlist()[0]);
  private audio: HTMLAudioElement | null = null;
  private loaded = false;
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
      const saved = this.win.localStorage.getItem(TRACK_KEY);
      if (saved) this.current.set(saved);
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

  /** Loads the team's tracks once; a saved choice that no longer exists falls back to the first track. */
  async loadPlaylist() {
    if (this.loaded || !this.win) return;
    this.loaded = true;
    try {
      const res = await fetch('/api/tracks');
      if (res.ok) this.files.set(await res.json());
    } catch {
      /* offline: generated tracks only */
    }
    if (!this.playlist().some((t) => t.key === this.current())) this.current.set('elan');
  }

  choose(key: string) {
    if (!this.playlist().some((t) => t.key === key)) return;
    this.current.set(key);
    try {
      this.win?.localStorage.setItem(TRACK_KEY, key);
    } catch {
      /* ignore */
    }
    if (!this.enabled()) {
      this.toggle();
      return;
    }
    this.switchMusic();
  }

  step(delta: number) {
    const list = this.playlist();
    const i = list.findIndex((t) => t.key === this.current());
    this.choose(list[(i + delta + list.length) % list.length].key);
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
    void this.loadPlaylist().then(() => this.enabled() && this.switchMusic());
  }

  /** Starts the selected track: the sequencer for a generated one, the audio element for a file. */
  private switchMusic() {
    if (!this.ctx || !this.musicBus || !this.win) return;
    const item = this.currentItem();
    const t = this.ctx.currentTime;
    this.win.clearInterval(this.timer);
    this.timer = 0;
    this.audio?.pause();
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(0.0001, t);
    if (item.kind === 'file' && item.url) {
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';
        this.audio.loop = true;
        this.audio.preload = 'auto';
        this.ctx.createMediaElementSource(this.audio).connect(this.musicBus);
      }
      if (!this.audio.src.endsWith(item.url)) this.audio.src = item.url;
      this.audio.currentTime = 0;
      void this.audio.play().catch(() => undefined);
      this.musicBus.gain.setTargetAtTime(0.55, t, 0.8);
    } else {
      this.pattern = PATTERNS[item.key] ?? PATTERNS['elan'];
      this.beat = 0;
      this.nextBeat = t + 0.1;
      this.timer = this.win.setInterval(() => this.schedule(), 50);
      this.musicBus.gain.setTargetAtTime(0.32, t, 1.2);
    }
  }

  private pattern: Pattern = PATTERNS['elan'];

  private stop() {
    if (!this.ctx || !this.musicBus || !this.win) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(0.0001, t, 0.25);
    this.win.clearInterval(this.timer);
    this.timer = 0;
    this.win.setTimeout(() => {
      if (!this.enabled()) this.audio?.pause();
      if (!this.enabled()) void this.ctx?.suspend();
    }, 1200);
  }

  /** Look-ahead sequencer, 16th-note steps over a 4-bar progression. */
  private schedule() {
    const c = this.ctx!;
    const p = this.pattern;
    const step = 60 / p.bpm / 4;
    while (this.nextBeat < c.currentTime + 0.15) {
      const t = this.nextBeat;
      const s = this.beat % 16;
      const bar = Math.floor(this.beat / 16) % 4;
      const chord = p.chords[bar];
      if (p.kick.includes(s)) this.kick(t);
      if (p.snare.includes(s)) this.snare(t);
      if (p.hat === 'sixteenths') this.hat(t, s % 2 ? 0.02 : 0.045);
      else if (p.hat === 'eighths') { if (s % 4 === 2) this.hat(t, 0.05); else if (s % 2 === 1) this.hat(t, 0.018); }
      else if (s % 4 === 2) this.hat(t, 0.035);
      if (s % p.bassEvery === 0)
        this.tone(this.hz(p.roots[bar] - 12 + (s === 14 && p.bassEvery === 2 ? 12 : 0)), t, step * Math.max(1.6, p.bassEvery * 0.9), 0.16, 'sawtooth', 420, this.musicBus!);
      if (s === 0) for (const n of chord) this.tone(this.hz(n), t, step * 16, p.padVol, 'triangle', 1400, this.musicBus!, 0.35);
      if (p.arp && s % 4 === 0) this.tone(this.hz(chord[(s / 4) % chord.length] + 12), t, step * 2, 0.045, 'sine', 2200, this.musicBus!);
      if (!p.arp && s % 2 === 0) this.tone(this.hz(chord[(s / 2) % chord.length] + 12), t, step * 0.9, 0.04, 'square', 1600, this.musicBus!);
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
