// El altavoz de la moto: Wifly enciende el reggaetón (Q / 🔊) y los canis que pasan se le ponen
// detrás bailando, la comitiva. Fuera del barrio protestan, y de noche pegado a los bloques
// despierta a la vecina y calienta a la Local. Lógica pura sobre los vecinos, sin renderizado.
import type { Vecino, Vecinos, Tribu } from './peatones';

export const COMITIVA_MAXIMA = 5;
/** A menos de esto se apunta un cani que pasea. */
export const RADIO_COMITIVA = 11;
/** Más lejos que esto durante un rato y la comitiva se pierde. */
export const RADIO_PERDIDA = 24;
export const PREMIO_POR_CANI = 5;
/** Lo que trota un cani de la comitiva para no perder la moto (los vecinos pasean a 1,1-1,7). */
export const PASO_COMITIVA = 2.4;

/** Lo que dicen los que no son de la tribu de Wifly cuando pasa con el altavoz a tope. */
export const QUEJAS: Record<Tribu, string[]> = {
  canis: ['¡Súbelo, Wifly!', '¡Ese es mi tema, illo!', '¡Perreo en la plaza!'],
  modernos: ['¡Tío, eso no es lo-fi!', '¡Baja eso, que estoy grabando el podcast!', '¡Qué agresión sonora!', '¿Eso es reggaetón irónico o qué?'],
  trianeros: ['¡Baja eso, niño, que está el abuelo durmiendo!', '¡Aquí lo que suena es la Esperanza!', '¡Ozú, qué escándalo!'],
  pijos: ['¡Papá, que hay un cani con altavoz!', '¡Esto en Los Remedios no se oye!', '¡Borja, llama a seguridad!', '¡Qué horror de música!'],
  guiris: ['¡Oh, flamenco moderno!', '¡Too loud, amigo!', '¿Is this the Feria?'],
};

export interface ResultadoAltavoz {
  /** Canis que se han apuntado este tick. */
  unidos: number;
  /** La comitiva entera se ha perdido (te has ido lejos o rápido). */
  perdida: boolean;
  /** Una queja de un vecino de otra tribu, si toca. */
  queja: string | null;
  /** Toca un aviso de ruido (cada pocos segundos con el altavoz encendido): la vecina y la Local. */
  ruido: boolean;
}

export class Altavoz {
  encendido = false;
  readonly comitiva: Vecino[] = [];
  private tiempoUnion = 0;
  private tiempoQueja = 0;
  private tiempoRuido = 0;
  private lejos = 0;

  constructor(private readonly rnd: () => number = Math.random) {}

  get cuantos(): number { return this.comitiva.length; }

  /** Encender o apagar. Al apagar, la comitiva se queda donde está y se va cada uno a lo suyo. */
  alternar(): boolean {
    this.encendido = !this.encendido;
    if (!this.encendido) this.disolver();
    this.tiempoRuido = 6;
    return this.encendido;
  }

  disolver(): void {
    for (const v of this.comitiva) this.soltar(v);
    this.comitiva.length = 0;
    this.lejos = 0;
  }

  private soltar(v: Vecino): void {
    v.sequito = false;
    v.velocidad = 1.1 + this.rnd() * 0.6;
    if (v.estado === 'mirando') v.tiempo = 0;
    else if (v.estado === 'pasear' && v.objetivo) v.objetivo = null;
  }

  /**
   * Un tick de `dt` segundos. `jugador` es la moto (o Wifly a pie); `rumbo` en radianes, la dirección
   * de la moto para colocar la comitiva detrás. `tribu`, la del barrio: solo los canis se apuntan.
   */
  actualizar(jugador: { x: number; z: number; rapidez: number; rumbo: number }, vecinos: Vecinos, tribu: Tribu, dt: number): ResultadoAltavoz {
    const r: ResultadoAltavoz = { unidos: 0, perdida: false, queja: null, ruido: false };
    if (!this.encendido) return r;
    this.tiempoUnion -= dt;
    this.tiempoQueja -= dt;
    this.tiempoRuido -= dt;
    if (this.tiempoRuido <= 0) { this.tiempoRuido = 6; r.ruido = true; }

    // Los de la comitiva: cada uno a su sitio detrás de la moto, en dos filas, y bailando al llegar.
    const atrasX = -Math.sin(jugador.rumbo), atrasZ = Math.cos(jugador.rumbo);
    const ladoX = Math.cos(jugador.rumbo), ladoZ = Math.sin(jugador.rumbo);
    let lejano = false;
    for (let i = this.comitiva.length - 1; i >= 0; i--) {
      const v = this.comitiva[i]!;
      if (!v.sequito || (v.estado !== 'pasear' && v.estado !== 'mirando')) {
        // Atropellado, huyendo o asustado: ya no viene.
        v.sequito = false;
        this.comitiva.splice(i, 1);
        continue;
      }
      const fila = 1 + Math.floor(i / 2), lado = (i % 2 ? 1 : -1) * 0.9;
      const ox = jugador.x + atrasX * (2.2 + fila * 1.3) + ladoX * lado;
      const oz = jugador.z + atrasZ * (2.2 + fila * 1.3) + ladoZ * lado;
      const d = Math.hypot(v.x - jugador.x, v.z - jugador.z);
      if (d > RADIO_PERDIDA) lejano = true;
      const dist = Math.hypot(ox - v.x, oz - v.z);
      v.velocidad = PASO_COMITIVA;
      if (v.estado === 'mirando') {
        v.tiempo = 1e9;
        v.fase += dt * 9; // el baile
        if (dist > 1.6) { v.estado = 'pasear'; v.objetivo = { x: ox, z: oz, rumbo: jugador.rumbo }; }
        else v.rumbo = jugador.rumbo;
      } else {
        v.objetivo = { x: ox, z: oz, rumbo: jugador.rumbo };
      }
    }
    if (lejano) {
      this.lejos += dt;
      if (this.lejos > 2.5) { this.disolver(); r.perdida = true; return r; }
    } else this.lejos = 0;

    // Se apunta un cani que pasea cerca (solo en barrio cani); en los demás barrios, protestan.
    if (this.tiempoUnion <= 0) {
      this.tiempoUnion = 1.2;
      const cerca = vecinos.lista.filter((v) => v.estado === 'pasear' && v.parada < 0 && !v.objetivo && !v.fiesta && !v.sequito
        && (v.x - jugador.x) ** 2 + (v.z - jugador.z) ** 2 < RADIO_COMITIVA * RADIO_COMITIVA);
      if (cerca.length) {
        if (tribu === 'canis' && this.comitiva.length < COMITIVA_MAXIMA && jugador.rapidez < 6) {
          const v = cerca[Math.floor(this.rnd() * cerca.length)]!;
          v.sequito = true;
          this.comitiva.push(v);
          r.unidos = 1;
        } else if (tribu !== 'canis' && this.tiempoQueja <= 0) {
          this.tiempoQueja = 7;
          const frases = QUEJAS[tribu];
          r.queja = frases[Math.floor(this.rnd() * frases.length)]!;
        }
      }
    }
    return r;
  }
}
