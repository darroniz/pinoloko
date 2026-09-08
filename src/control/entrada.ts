// Entrada unificada: teclado, joystick táctil y mando. Todo en el plano de pantalla:
// eje.x = derecha (+), eje.y = arriba (+). El juego lo traduce a este/norte.
export interface Entrada {
  eje: { x: number; y: number };
  freno: boolean;
  accion: boolean;
  reaparecer?: boolean;
  claxon?: boolean;
}

export class Controles implements Entrada {
  eje = { x: 0, y: 0 };
  freno = false;
  accion = false;
  /** Eje forzado por la sonda de verificación (null en el juego normal). */
  forzado: { x: number; y: number } | null = null;
  reaparecer = false;
  claxon = false;
  private claxonTactil = false;
  readonly tactil: boolean;
  private reaparecerPulsado = false;
  private teclas = new Set<string>();
  private joystick: { x: number; y: number; activo: boolean; id: number } = { x: 0, y: 0, activo: false, id: -1 };
  private frenoTactil = false;
  private frenoMando = false;
  private ejeMando = { x: 0, y: 0 };
  private accionPulsada = false;
  private claxonMando = false;

  constructor(zonaJoystick: HTMLElement, bola: HTMLElement, botonFreno: HTMLElement, botonAccion: HTMLElement, botonClaxon: HTMLElement) {
    this.tactil = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (this.tactil) document.body.classList.add('tactil');

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.teclas.add(e.code);
      if (e.code === 'KeyE' || e.code === 'Enter') this.accionPulsada = true;
      if (e.code === 'KeyR') this.reaparecerPulsado = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    window.addEventListener('blur', () => this.teclas.clear());

    const radio = 50;
    const mover = (e: PointerEvent): void => {
      const r = zonaJoystick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > radio) { dx *= radio / d; dy *= radio / d; }
      this.joystick.x = dx / radio;
      this.joystick.y = -dy / radio;
      bola.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    zonaJoystick.addEventListener('pointerdown', (e) => {
      this.joystick.activo = true;
      this.joystick.id = e.pointerId;
      zonaJoystick.setPointerCapture(e.pointerId);
      mover(e);
    });
    zonaJoystick.addEventListener('pointermove', (e) => { if (this.joystick.activo && e.pointerId === this.joystick.id) mover(e); });
    const soltar = (e: PointerEvent): void => {
      if (e.pointerId !== this.joystick.id) return;
      this.joystick.activo = false;
      this.joystick.x = 0;
      this.joystick.y = 0;
      bola.style.transform = '';
    };
    zonaJoystick.addEventListener('pointerup', soltar);
    zonaJoystick.addEventListener('pointercancel', soltar);

    botonFreno.addEventListener('pointerdown', (e) => { e.preventDefault(); this.frenoTactil = true; });
    botonFreno.addEventListener('pointerup', () => { this.frenoTactil = false; });
    botonFreno.addEventListener('pointercancel', () => { this.frenoTactil = false; });
    botonFreno.addEventListener('pointerleave', () => { this.frenoTactil = false; });
    botonFreno.addEventListener('contextmenu', (e) => e.preventDefault());
    botonAccion.addEventListener('pointerdown', (e) => { e.preventDefault(); this.accionPulsada = true; });
    botonAccion.addEventListener('contextmenu', (e) => e.preventDefault());
    botonClaxon.addEventListener('pointerdown', (e) => { e.preventDefault(); this.claxonTactil = true; });
    botonClaxon.addEventListener('pointerup', () => { this.claxonTactil = false; });
    botonClaxon.addEventListener('pointercancel', () => { this.claxonTactil = false; });
    botonClaxon.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private leerMando(): void {
    const mandos = navigator.getGamepads ? navigator.getGamepads() : [];
    this.ejeMando.x = 0;
    this.ejeMando.y = 0;
    this.frenoMando = false;
    this.claxonMando = false;
    for (const m of mandos) {
      if (!m) continue;
      const x = m.axes[0] ?? 0, y = -(m.axes[1] ?? 0);
      if (Math.hypot(x, y) > 0.15) { this.ejeMando.x = x; this.ejeMando.y = y; }
      const dpad = { x: (m.buttons[15]?.pressed ? 1 : 0) - (m.buttons[14]?.pressed ? 1 : 0), y: (m.buttons[12]?.pressed ? 1 : 0) - (m.buttons[13]?.pressed ? 1 : 0) };
      if (dpad.x || dpad.y) { this.ejeMando.x = dpad.x; this.ejeMando.y = dpad.y; }
      if (m.buttons[0]?.pressed || m.buttons[6]?.pressed || m.buttons[1]?.pressed) this.frenoMando = true;
      if (m.buttons[2]?.pressed) this.accionPulsada = true;
      if (m.buttons[3]?.pressed) this.claxonMando = true;
    }
  }

  /** Recalcula el estado combinado; llamar una vez por frame. */
  actualizar(): void {
    this.leerMando();
    const t = this.teclas;
    let x = (t.has('KeyD') || t.has('ArrowRight') ? 1 : 0) - (t.has('KeyA') || t.has('ArrowLeft') ? 1 : 0);
    let y = (t.has('KeyW') || t.has('ArrowUp') ? 1 : 0) - (t.has('KeyS') || t.has('ArrowDown') ? 1 : 0);
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    if (this.joystick.activo) { x = this.joystick.x; y = this.joystick.y; }
    else if (!x && !y) { x = this.ejeMando.x; y = this.ejeMando.y; }
    this.eje.x = this.forzado ? this.forzado.x : x;
    this.eje.y = this.forzado ? this.forzado.y : y;
    this.freno = t.has('Space') || t.has('ShiftLeft') || t.has('ShiftRight') || this.frenoTactil || this.frenoMando;
    this.accion = this.accionPulsada;
    this.accionPulsada = false;
    this.claxon = t.has('KeyH') || this.claxonTactil || this.claxonMando;
    this.reaparecer = this.reaparecerPulsado;
    this.reaparecerPulsado = false;
  }
}
