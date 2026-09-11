// Taxista: minijuego de llevar clientes. Al robar un taxi, salen clientes con la mano levantada
// en las aceras; paras a su lado, suben y te dicen un local con nombre real. Llegar a tiempo
// paga según la distancia y lo que sobre de reloj, y encadenar sube el premio. Lógica pura
// (sin Three ni DOM) con tests; lo visible está en mundo/clientes.ts.
import type { Local } from './recados';
import { elegirDestino, tiempoPara } from './recados';

export interface Cliente {
  x: number;
  z: number;
  rumbo: number;
  /** Segundos que lleva esperando: a los 45 se cansa y se va. */
  espera: number;
}

export const RADIO_RECOGIDA = 4.5;
export const RADIO_DESTINO = 6;
export const MAXIMO_CLIENTES = 2;
export const ESPERA_MAXIMA = 45;
/** Velocidad por debajo de la cual el taxi cuenta como parado (m/s). */
export const PARADO = 1.2;

export type EventoTaxi = 'sube' | 'entregado' | 'tiempo' | 'se_va' | null;

/** Dinero por una carrera: banderazo más distancia, con más si sobra reloj y si encadenas. */
export function premioTaxi(distancia: number, restante: number, total: number, cadena: number): number {
  const rapidez = Math.max(0, Math.min(1, restante / Math.max(1, total)));
  return Math.round((10 + distancia / 6) * (0.6 + 0.6 * rapidez) * (1 + 0.15 * Math.min(6, cadena)));
}

export class Taxista {
  /** `fuera`: no llevas taxi. `libre`: buscando clientes. `ocupado`: con uno dentro. */
  estado: 'fuera' | 'libre' | 'ocupado' = 'fuera';
  readonly clientes: Cliente[] = [];
  destino: Local | null = null;
  total = 0;
  restante = 0;
  distancia = 0;
  /** Carreras seguidas sin bajarte ni fallar (la actual sería la `cadena + 1`). */
  cadena = 0;
  private tiempoNuevo = 0;

  /** Te subes a un taxi: a buscar clientes. */
  empezar(): void {
    if (this.estado === 'fuera') { this.estado = 'libre'; this.tiempoNuevo = 1.5; }
  }

  /** Te bajas, te trincan o el taxi revienta: todo fuera y los clientes se esfuman. */
  abandonar(): void {
    this.estado = 'fuera';
    this.clientes.length = 0;
    this.destino = null;
    this.cadena = 0;
  }

  /**
   * Un paso. `nuevoCliente` da un sitio en la acera (a 40-140 m del taxi) o null; `locales`
   * son los destinos posibles. Devuelve lo que ha pasado en este paso, si algo.
   */
  actualizar(taxi: { x: number; z: number; rapidez: number }, dt: number, nuevoCliente: () => { x: number; z: number; rumbo: number } | null, locales: Local[], rnd: () => number): EventoTaxi {
    if (this.estado === 'fuera') return null;
    // Los que esperan se cansan; y aparecen nuevos mientras vas libre.
    for (let i = this.clientes.length - 1; i >= 0; i--) {
      const c = this.clientes[i]!;
      c.espera += dt;
      if (c.espera > ESPERA_MAXIMA || (c.x - taxi.x) ** 2 + (c.z - taxi.z) ** 2 > 220 * 220) { this.clientes.splice(i, 1); return 'se_va'; }
    }
    if (this.estado === 'libre') {
      this.tiempoNuevo -= dt;
      if (this.clientes.length < MAXIMO_CLIENTES && this.tiempoNuevo <= 0) {
        this.tiempoNuevo = 4 + rnd() * 4;
        const sitio = nuevoCliente();
        if (sitio) this.clientes.push({ ...sitio, espera: 0 });
      }
      if (taxi.rapidez > PARADO) return null;
      const i = this.clientes.findIndex((c) => (c.x - taxi.x) ** 2 + (c.z - taxi.z) ** 2 < RADIO_RECOGIDA * RADIO_RECOGIDA);
      if (i < 0) return null;
      const c = this.clientes[i]!;
      const destino = elegirDestino(locales, { nombre: '', x: c.x, z: c.z }, rnd, 80, 320);
      if (!destino) return null;
      this.clientes.splice(i, 1);
      this.destino = destino;
      this.distancia = Math.hypot(destino.x - c.x, destino.z - c.z);
      this.total = tiempoPara(this.distancia) + 8;
      this.restante = this.total;
      this.estado = 'ocupado';
      return 'sube';
    }
    // Ocupado: reloj y llegada (parado junto a la puerta).
    this.restante -= dt;
    if (this.restante <= 0) { this.destino = null; this.cadena = 0; this.estado = 'libre'; this.tiempoNuevo = 2; return 'tiempo'; }
    const d = this.destino!;
    if (taxi.rapidez <= PARADO * 1.5 && Math.hypot(d.x - taxi.x, d.z - taxi.z) < RADIO_DESTINO) {
      this.cadena++;
      this.destino = null;
      this.estado = 'libre';
      this.tiempoNuevo = 2;
      return 'entregado';
    }
    return null;
  }
}
