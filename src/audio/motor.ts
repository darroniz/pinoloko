// Sonido sintetizado con Web Audio: motor de dos tiempos, derrape y golpes.
// Arranca con el primer gesto del usuario (el botón JUGAR).
export class AudioJuego {
  private ctx: AudioContext | null = null;
  private motor: OscillatorNode | null = null;
  private motorGanancia: GainNode | null = null;
  private motorFiltro: BiquadFilterNode | null = null;
  private derrape: AudioBufferSourceNode | null = null;
  private derrapeGanancia: GainNode | null = null;
  private maestro: GainNode | null = null;
  private rpm = 0;

  arrancar(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.maestro = ctx.createGain();
    this.maestro.gain.value = 0.5;
    this.maestro.connect(ctx.destination);

    // Motor: sierra + cuadrada por un filtro paso bajo; el "ring-ding" del dos tiempos.
    this.motor = ctx.createOscillator();
    this.motor.type = 'sawtooth';
    this.motor.frequency.value = 40;
    const armonico = ctx.createOscillator();
    armonico.type = 'square';
    armonico.frequency.value = 80;
    const gArmonico = ctx.createGain();
    gArmonico.gain.value = 0.25;
    this.motorFiltro = ctx.createBiquadFilter();
    this.motorFiltro.type = 'lowpass';
    this.motorFiltro.frequency.value = 400;
    this.motorGanancia = ctx.createGain();
    this.motorGanancia.gain.value = 0.0;
    this.motor.connect(this.motorFiltro);
    armonico.connect(gArmonico).connect(this.motorFiltro);
    this.motorFiltro.connect(this.motorGanancia).connect(this.maestro);
    this.motor.start();
    armonico.start();
    this.armonico = armonico;

    // Derrape: ruido blanco filtrado.
    const largo = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
    this.derrape = ctx.createBufferSource();
    this.derrape.buffer = buffer;
    this.derrape.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 1800;
    filtro.Q.value = 0.8;
    this.derrapeGanancia = ctx.createGain();
    this.derrapeGanancia.gain.value = 0;
    this.derrape.connect(filtro).connect(this.derrapeGanancia).connect(this.maestro);
    this.derrape.start();
  }

  private armonico: OscillatorNode | null = null;

  actualizar(velocidad: number, acelerando: boolean, derrapando: boolean, dt: number, coche = false): void {
    if (!this.ctx || !this.motor || !this.motorGanancia || !this.motorFiltro || !this.derrapeGanancia) return;
    const objetivo = 0.15 + Math.min(1, Math.abs(velocidad) / (coche ? 21 : 16)) * 0.85 + (acelerando ? 0.12 : 0);
    this.rpm += (objetivo - this.rpm) * Math.min(1, dt * 5);
    const t = this.ctx.currentTime;
    // El coche suena más grave y más redondo que el dos tiempos.
    const grave = coche ? 0.55 : 1;
    this.motor.frequency.setTargetAtTime((38 + this.rpm * 95) * grave, t, 0.05);
    this.armonico?.frequency.setTargetAtTime((76 + this.rpm * 190) * grave, t, 0.05);
    this.motorFiltro.frequency.setTargetAtTime((300 + this.rpm * 900) * (coche ? 0.7 : 1), t, 0.05);
    if (!this.silenciado) this.motorGanancia.gain.setTargetAtTime(0.10 + this.rpm * 0.14, t, 0.1);
    this.derrapeGanancia.gain.setTargetAtTime(derrapando ? 0.16 : 0, t, 0.08);
  }

  private silenciado = false;

  /** A pie no hay motor que oír. */
  silenciarMotor(si: boolean): void {
    if (si === this.silenciado || !this.ctx || !this.motorGanancia) return;
    this.silenciado = si;
    if (si) this.motorGanancia.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  golpe(fuerza: number): void {
    if (!this.ctx || !this.maestro) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.9, 0.2 + fuerza * 0.05), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g).connect(this.maestro);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  claxon(): void {
    if (!this.ctx || !this.maestro) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.setValueAtTime(0.18, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g).connect(this.maestro);
    osc.start(t);
    osc.stop(t + 0.4);
  }
}
