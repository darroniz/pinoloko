// El tiempo: en Sevilla también llueve (poco, pero cuando cae, cae). Un día de cada dos o tres,
// a una hora cualquiera, se nubla y llueve unas horas de juego; la intensidad sube y baja con
// rampa para que no sea un interruptor. Lógica pura con tests; `?lluvia=1` la fuerza, `?lluvia=0` la quita.
export const PROBABILIDAD_POR_HORA = 0.4 / 24;
export const DURACION_LLUVIA = { min: 3, max: 6 };
/** Segundos reales que tarda en pasar de seco a lluvia (y al revés). */
export const RAMPA = 14;

export type Forzado = 'si' | 'no' | null;
/** La ola de calor: los días calurosos (uno de cada dos, el primero seguro), de dos a seis y media de la tarde. */
export const HORA_CALOR = { desde: 14, hasta: 18.5 };
export const PROBABILIDAD_DIA_CALUROSO = 0.5;

export class Tiempo {
  /** Cuánto llueve ahora, de 0 a 1 (con rampa). */
  intensidad = 0;
  /** Si está lloviendo (aunque la rampa vaya por detrás). */
  lloviendo = false;
  /** Horas de juego de lluvia que quedan. */
  restante = 0;
  /** Lo mojado que está el suelo (sube con la lluvia, se seca despacio): para los charcos. */
  mojado = 0;
  /** La calor, de 0 a 1 (con rampa): calima, abanicos y el chapuzón al doble. */
  calor = 0;
  /** Hoy hace calor (se decide cada día; el primero, sí). */
  diaCaluroso = true;
  private horaPrevia = -1;

  constructor(private readonly forzado: Forzado = null, private readonly rnd: () => number = Math.random, private readonly forzadoCalor: Forzado = null) {
    if (forzado === 'si') { this.lloviendo = true; this.restante = 1e9; }
    if (forzadoCalor === 'no') this.diaCaluroso = false;
  }

  get haceCalor(): boolean { return this.calor > 0.5; }

  /** Un frame: `hora` del juego en [0, 24), `dt` en segundos reales, `horasPorSegundo` lo que corre el reloj. Devuelve si empieza o escampa. */
  actualizar(hora: number, dt: number, horasPorSegundo: number): 'empieza' | 'escampa' | null {
    let evento: 'empieza' | 'escampa' | null = null;
    const h = Math.floor(hora);
    const horaNueva = this.horaPrevia >= 0 && h !== this.horaPrevia;
    if (this.horaPrevia >= 0 && h < this.horaPrevia - 12 && this.forzadoCalor === null) this.diaCaluroso = this.rnd() < PROBABILIDAD_DIA_CALUROSO;
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
    const tocaCalor = this.forzadoCalor === 'si' || (this.forzadoCalor !== 'no' && this.diaCaluroso && hora >= HORA_CALOR.desde && hora < HORA_CALOR.hasta && !this.lloviendo);
    const objetivoCalor = tocaCalor ? 1 : 0;
    this.calor = objetivoCalor > this.calor ? Math.min(1, this.calor + paso) : Math.max(0, this.calor - paso);
    // Con la calor el suelo se seca en la mitad de tiempo.
    if (this.calor > 0.5 && !this.lloviendo) this.mojado = Math.max(0, this.mojado - dt / 90);
    return evento;
  }

  /** Arrancar lloviendo ya (la sonda y las pruebas). */
  empezar(horas = 4): void {
    this.lloviendo = true;
    this.restante = horas;
  }
}
