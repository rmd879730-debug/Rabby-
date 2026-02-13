
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  
  private isInitialized = false;
  private currentStep = 0;
  private sequenceTimer: any = null;
  private isPlaying = false;

  constructor() {}

  private init() {
    if (this.isInitialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    // Master FX Chain: Lowpass -> Master
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 3000;
    this.filterNode.connect(this.masterGain);

    // Delay Chain for the Melody
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.375; // Dotted 8th delay
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.value = 0.3;
    
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode); // Feedback loop
    this.delayGain.connect(this.filterNode);

    this.isInitialized = true;
  }

  // --- SYNTH HELPERS ---

  private playKick(time: number) {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  private playHat(time: number) {
    if (!this.ctx || !this.filterNode) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.filterNode);
    source.start(time);
  }

  private playFMLead(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.filterNode || !this.delayNode) return;

    // Carrier (The main sound)
    const carrier = this.ctx.createOscillator();
    carrier.type = 'square';
    
    // Modulator (Creates the metallic "Been" character)
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modulator.frequency.value = freq * 2; // Harmonic ratio
    modGain.gain.value = 500; // Modulation depth

    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.value = 6;
    vibratoGain.gain.value = 5;

    const gain = this.ctx.createGain();
    
    // Connect FM chain
    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(gain);
    
    // Connect to FX and Delay
    gain.connect(this.filterNode);
    gain.connect(this.delayNode);

    // Envelopes
    carrier.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    vibrato.start(time);
    modulator.start(time);
    carrier.start(time);
    
    vibrato.stop(time + duration);
    modulator.stop(time + duration);
    carrier.stop(time + duration);
  }

  private getNoteFreq(note: string): number {
    const notes: Record<string, number> = {
      'E4': 329.63, 'F4': 349.23, 'G#4': 415.30, 'A4': 440.00, 
      'B4': 493.88, 'C5': 523.25, 'D#5': 622.25, 'E5': 659.25
    };
    return notes[note] || 440;
  }

  public async startMusic() {
    this.init();
    if (!this.ctx || this.isPlaying) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.isPlaying = true;
    this.currentStep = 0;

    const stepDuration = 0.15; // 150ms steps (fast, driving tempo)
    const melody = ['E4', 'F4', 'G#4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G#4', 'F4', 'E4', null, 'E4', 'F4', 'G#4', null];

    const scheduler = () => {
      if (!this.isPlaying || !this.ctx) return;

      const startTime = this.ctx.currentTime + 0.1;

      // Kick on 1 and 3 (simple EDM beat)
      if (this.currentStep % 4 === 0) {
        this.playKick(startTime);
      }

      // Hats on the off-beat
      if (this.currentStep % 2 === 1) {
        this.playHat(startTime);
      }

      // Melody logic
      const note = melody[this.currentStep];
      if (note) {
        this.playFMLead(this.getNoteFreq(note), startTime, 0.4);
      }

      this.currentStep = (this.currentStep + 1) % 16;
      this.sequenceTimer = setTimeout(scheduler, stepDuration * 1000);
    };

    scheduler();
  }

  public stopMusic() {
    this.isPlaying = false;
    if (this.sequenceTimer) clearTimeout(this.sequenceTimer);
  }

  public setMuted(muted: boolean) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx?.currentTime || 0, 0.1);
    }
  }

  public setPaused(paused: boolean) {
    if (this.filterNode) {
      // Professional "underwater" effect on pause
      this.filterNode.frequency.setTargetAtTime(paused ? 400 : 3000, this.ctx?.currentTime || 0, 0.3);
    }
  }

  // --- SFX (Clean and sharp) ---

  public playEat() {
    if (!this.ctx || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, time);
    osc.frequency.exponentialRampToValueAtTime(2000, time + 0.1);
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  public playCrash() {
    if (!this.ctx || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.linearRampToValueAtTime(40, time + 0.8);
    
    noiseGain.gain.setValueAtTime(0.2, time);
    noiseGain.gain.linearRampToValueAtTime(0.001, time + 0.8);
    
    osc.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.8);
  }

  public playStart() {
    if (!this.ctx || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(880, time + 0.5);
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.5);
  }
}

export const audio = new AudioEngine();
