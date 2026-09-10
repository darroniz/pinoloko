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
  /** Multiplicador del tono del motor (el tubarro del taller lo sube). */
  tono = 1;

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
    const grave = coche ? 0.55 : this.tono;
    this.motor.frequency.setTargetAtTime((38 + this.rpm * 95) * grave, t, 0.05);
    this.armonico?.frequency.setTargetAtTime((76 + this.rpm * 190) * grave, t, 0.05);
    this.motorFiltro.frequency.setTargetAtTime((300 + this.rpm * 900) * (coche ? 0.7 : 1), t, 0.05);
    if (!this.silenciado) this.motorGanancia.gain.setTargetAtTime(0.10 + this.rpm * 0.14, t, 0.1);
    this.derrapeGanancia.gain.setTargetAtTime(derrapando ? 0.16 : 0, t, 0.08);
  }

  private silenciado = false;
  private sirena: OscillatorNode | null = null;
  private sirenaGanancia: GainNode | null = null;
  private sirenaFase = 0;

  /** Sirena de la Policía Local: dos tonos alternos, más fuerte cuanto más cerca. */
  actualizarSirena(activa: boolean, cercania: number, dt: number): void {
    if (!this.ctx || !this.maestro) return;
    if (!this.sirena) {
      this.sirena = this.ctx.createOscillator();
      this.sirena.type = 'square';
      this.sirenaGanancia = this.ctx.createGain();
      this.sirenaGanancia.gain.value = 0;
      const filtro = this.ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 1200;
      this.sirena.connect(filtro).connect(this.sirenaGanancia).connect(this.maestro);
      this.sirena.start();
    }
    const t = this.ctx.currentTime;
    this.sirenaFase += dt;
    const alto = Math.floor(this.sirenaFase * 1.6) % 2 === 0;
    this.sirena.frequency.setTargetAtTime(alto ? 740 : 560, t, 0.03);
    this.sirenaGanancia!.gain.setTargetAtTime(activa ? 0.05 + cercania * 0.09 : 0, t, 0.15);
  }

  private rotor: GainNode | null = null;
  private rotorLfo: OscillatorNode | null = null;

  /** Helicóptero: ruido grave con el volumen batido a 13 Hz (las palas). */
  actualizarHelicoptero(activo: boolean, cercania: number): void {
    if (!this.ctx || !this.maestro || !this.derrape?.buffer) return;
    if (!this.rotor) {
      const fuente = this.ctx.createBufferSource();
      fuente.buffer = this.derrape.buffer;
      fuente.loop = true;
      const filtro = this.ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 180;
      const batido = this.ctx.createGain();
      batido.gain.value = 0.5;
      this.rotorLfo = this.ctx.createOscillator();
      this.rotorLfo.type = 'square';
      this.rotorLfo.frequency.value = 13;
      const profundidad = this.ctx.createGain();
      profundidad.gain.value = 0.5;
      this.rotorLfo.connect(profundidad).connect(batido.gain);
      this.rotor = this.ctx.createGain();
      this.rotor.gain.value = 0;
      fuente.connect(filtro).connect(batido).connect(this.rotor).connect(this.maestro);
      fuente.start();
      this.rotorLfo.start();
    }
    this.rotor.gain.setTargetAtTime(activo ? 0.15 + cercania * 0.45 : 0, this.ctx.currentTime, 0.4);
  }

  private bullicio: GainNode | null = null;
  private tiempoPajaro = 1;
  private tiempoGrillo = 0.3;

  /** Ambiente: pájaros de día (blips agudos sueltos), grillos de noche y bullicio junto a los bares. */
  actualizarAmbiente(noche: boolean, cercaBar: boolean, dt: number): void {
    if (!this.ctx || !this.maestro || !this.derrape?.buffer) return;
    const ctx = this.ctx;
    if (!this.bullicio) {
      // Bullicio: ruido por paso banda con el volumen ondulando, como voces lejanas.
      const fuente = ctx.createBufferSource();
      fuente.buffer = this.derrape.buffer;
      fuente.loop = true;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = 600;
      filtro.Q.value = 1.2;
      const onda = ctx.createGain();
      onda.gain.value = 0.7;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.9;
      const profundidad = ctx.createGain();
      profundidad.gain.value = 0.3;
      lfo.connect(profundidad).connect(onda.gain);
      this.bullicio = ctx.createGain();
      this.bullicio.gain.value = 0;
      fuente.connect(filtro).connect(onda).connect(this.bullicio).connect(this.maestro);
      fuente.start();
      lfo.start();
    }
    this.bullicio.gain.setTargetAtTime(cercaBar ? 0.06 : 0, ctx.currentTime, 0.8);
    if (!noche) {
      this.tiempoPajaro -= dt;
      if (this.tiempoPajaro <= 0) {
        this.tiempoPajaro = 1.5 + Math.random() * 4;
        const base = 2200 + Math.random() * 1500;
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.pitido(base * (1 + (Math.random() - 0.5) * 0.2), 0.05, 0.025, ctx.currentTime + i * 0.11);
      }
    } else {
      this.tiempoGrillo -= dt;
      if (this.tiempoGrillo <= 0) {
        this.tiempoGrillo = 0.5 + Math.random() * 0.6;
        for (let i = 0; i < 3; i++) this.pitido(4300, 0.03, 0.012, ctx.currentTime + i * 0.06);
      }
    }
  }

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

  /** Pitido corto (puntos de control, mecheros, meta): seno limpio con caída rápida. */
  pitido(frecuencia = 880, duracion = 0.12, volumen = 0.16, cuando?: number): void {
    if (!this.ctx || !this.maestro) return;
    const ctx = this.ctx;
    const t = cuando ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frecuencia;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volumen, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duracion);
    osc.connect(g).connect(this.maestro);
    osc.start(t);
    osc.stop(t + duracion + 0.02);
  }

  /** Fanfarria corta de tres notas (meta, los 20 mecheros). */
  /** Campanas de la iglesia: `toques` golpes de campana sintetizada (FM), con el volumen que le den. */
  campanas(toques: number, volumen = 0.2): void {
    if (!this.ctx || !this.maestro) return;
    const ctx = this.ctx;
    for (let i = 0; i < toques; i++) {
      const t = ctx.currentTime + i * 0.9;
      const portadora = ctx.createOscillator();
      portadora.type = 'sine';
      portadora.frequency.value = 523;
      const moduladora = ctx.createOscillator();
      moduladora.type = 'sine';
      moduladora.frequency.value = 523 * 1.4;
      const indice = ctx.createGain();
      indice.gain.setValueAtTime(600, t);
      indice.gain.exponentialRampToValueAtTime(20, t + 1.6);
      moduladora.connect(indice).connect(portadora.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(volumen, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      portadora.connect(g).connect(this.maestro);
      moduladora.start(t); portadora.start(t);
      moduladora.stop(t + 2.3); portadora.stop(t + 2.3);
    }
  }

  /** Spray: siseo de ruido agudo, a rachas, mientras dura la pintada. */
  siseo(duracion = 2): void {
    const ctx = this.ctx;
    if (!ctx || !this.maestro) return;
    const largo = Math.floor(ctx.sampleRate * duracion);
    const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < largo; i++) {
      const t = i / ctx.sampleRate;
      const racha = (t % 0.55) < 0.38 ? 1 : 0.15;
      datos[i] = (Math.random() * 2 - 1) * racha;
    }
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = 3800;
    const ganancia = ctx.createGain();
    ganancia.gain.setValueAtTime(0.12, ctx.currentTime);
    ganancia.gain.linearRampToValueAtTime(0, ctx.currentTime + duracion);
    fuente.connect(filtro).connect(ganancia).connect(this.maestro);
    fuente.start();
    fuente.stop(ctx.currentTime + duracion);
  }

  fanfarria(): void {
    if (!this.ctx) return;
    const notas = [660, 880, 1320];
    notas.forEach((f, i) => window.setTimeout(() => this.pitido(f, 0.22, 0.18), i * 110));
  }

  /** Ladrido: dos golpes cortos de onda cuadrada que bajan de tono. */
  ladrido(): void {
    if (!this.ctx || !this.maestro) return;
    const ctx = this.ctx;
    for (const inicio of [0, 0.13]) {
      const t = ctx.currentTime + inicio;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.09);
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(filtro).connect(g).connect(this.maestro);
      osc.start(t);
      osc.stop(t + 0.11);
    }
  }

  /** Melodías del claxon musical (todas tradicionales o de dominio público): [semitonos desde La4, duración]. */
  private static MELODIAS: [number, number][][] = [
    // La Cucaracha
    [[0, 0.15], [0, 0.15], [0, 0.15], [5, 0.4], [9, 0.4], [0, 0.15], [0, 0.15], [0, 0.15], [5, 0.4], [9, 0.5]],
    // Cumpleaños feliz
    [[0, 0.2], [0, 0.15], [2, 0.35], [0, 0.35], [5, 0.35], [4, 0.6]],
    // Toreador (Carmen, Bizet)
    [[4, 0.3], [4, 0.15], [4, 0.15], [4, 0.3], [0, 0.3], [2, 0.3], [4, 0.3], [5, 0.3], [4, 0.3], [2, 0.6]],
  ];

  /** Claxon musical: la melodía `cual` (0-2) con onda cuadrada. Devuelve lo que dura. */
  melodia(cual: number): number {
    if (!this.ctx || !this.maestro) return 0;
    const notas = AudioJuego.MELODIAS[Math.max(0, Math.min(AudioJuego.MELODIAS.length - 1, cual))]!;
    const ctx = this.ctx;
    let t = ctx.currentTime;
    for (const [semi, dur] of notas) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 440 * Math.pow(2, semi / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      g.gain.setValueAtTime(0.16, t + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(this.maestro);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur;
    }
    return t - ctx.currentTime;
  }

  private tiempoZumbido = 0;

  /** Zumbido de una moto que pasa: sierra grave que baja de tono (efecto Doppler de juguete). */
  zumbido(cercania: number): void {
    if (!this.ctx || !this.maestro) return;
    const ctx = this.ctx;
    if (ctx.currentTime < this.tiempoZumbido) return;
    this.tiempoZumbido = ctx.currentTime + 1.2;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.9);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 + cercania * 0.08, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    osc.connect(filtro).connect(g).connect(this.maestro);
    osc.start(t);
    osc.stop(t + 1.05);
  }

  claxon(grave = 1): void {
    if (!this.ctx || !this.maestro) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = grave * 420;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.setValueAtTime(0.18, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g).connect(this.maestro);
    osc.start(t);
    osc.stop(t + 0.4);
  }
}
