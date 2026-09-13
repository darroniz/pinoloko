// El tiempo: en Sevilla también llueve (poco, pero cuando cae, cae). Un día de cada dos o tres,
// a una hora cualquiera, se nubla y llueve unas horas de juego; la intensidad sube y baja con
// rampa para que no sea un interruptor. Lógica pura con tests; `?lluvia=1` la fuerza, `?lluvia=0` la quita.
export const PROBABILIDAD_POR_HORA = 0.4 / 24;
export const DURACION_LLUVIA = { min: 3, max: 6 };
/** Segundos reales que tarda en pasar de seco a lluvia (y al revés). */
export const RAMPA = 14;

export type Forzado = 'si' | 'no' | null;

export class Tiempo {
  /** Cuánto llueve ahora, de 0 a 1 (con rampa). */
  intensidad = 0;
  /** Si está lloviendo (aunque la rampa vaya por detrás). */
  lloviendo = false;
  /** Horas de juego de lluvia que quedan. */
  restante = 0;
  /** Lo mojado que está el suelo (sube con la lluvia, se seca despacio): para los charcos. */
  mojado = 0;
  private horaPrevia = -1;

  constructor(private readonly forzado: Forzado = null, private readonly rnd: () => number = Math.random) {
    if (forzado === 'si') { this.lloviendo = true; this.restante = 1e9; }
  }

  /** Un frame: `hora` del juego en [0, 24), `dt` en segundos reales, `horasPorSegundo` lo que corre el reloj. Devuelve si empieza o escampa. */
  actualizar(hora: number, dt: number, horasPorSegundo: number): 'empieza' | 'escampa' | null {
    let evento: 'empieza' | 'escampa' | null = null;
    const h = Math.floor(hora);
    const horaNueva = this.horaPrevia >= 0 && h !== this.horaPrevia;
    this.horaPrevia = h;
    if (this.forzado !== 'si') {
      if (this.lloviendo) {
        this.restante -= dt * horasPorSegundo;
        if (this.restante <= 0) { this.lloviendo = false; evento = 'escampa'; }
      } else if (this.forzado !== 'no' && horaNueva && this.rnd() < PROBABILIDAD_POR_HORA) {
        // Cada hora en punto se tira el dado.
        this.lloviendo = true;
        this.restante = DURACION_LLUVIA.min + this.rnd() * (DURACION_LLUVIA.max - DURACION_LLUVIA.min);
        evento = 'empieza';
      }
    }
    const objetivo = this.lloviendo ? 1 : 0;
    const paso = dt / RAMPA;
    this.intensidad = objetivo > this.intensidad ? Math.min(objetivo, this.intensidad + paso) : Math.max(objetivo, this.intensidad - paso);
    this.mojado = Math.max(this.intensidad, this.mojado - dt / 90);
    return evento;
  }

  /** Arrancar lloviendo ya (la sonda y las pruebas). */
  empezar(horas = 4): void {
    this.lloviendo = true;
    this.restante = horas;
  }
}
