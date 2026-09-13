// Conducir con estilo: lo que da dinero por cómo llevas la moto, no por lo que rompes.
// Derrapadas largas, caballitos largos, pasar "por los pelos" junto a coches y vecinos sin
// tocarlos, y tirar en contramano por una calle de sentido único. Lógica pura con tests; el
// juego le da cada frame lo que ve (velocidad, derrape, caballito, qué tiene cerca) y recoge
// los eventos con sus euros.
import type { Via } from './mundo/tipos';

export type TipoEstilo = 'derrapada' | 'caballito' | 'stoppie' | 'pelos' | 'contramano';

export interface EventoEstilo {
  tipo: TipoEstilo;
  /** Segundos que ha durado (derrapada, caballito, contramano) o 0 (por los pelos). */
  segundos: number;
  euros: number;
}

export interface EntradaEstilo {
  /** Solo en moto: en coche o a pie no hay estilo que valga. */
  enMoto: boolean;
  rapidez: number;
  derrapando: boolean;
  /** Ángulo del caballito en radianes (0 = ruedas en el suelo). */
  caballito: number;
  /** Ángulo del stoppie (el trasero en el aire al frenar). */
  stoppie: number;
  /** Cosas (coches del tráfico, vecinos) a distancia de rozar este frame. Claves estables. */
  cerca: Iterable<unknown>;
  /** Ha habido un golpe este frame: los que estaban cerca ya no cuentan como "por los pelos". */
  golpe: boolean;
  contramano: boolean;
}

/** Umbrales: por debajo no hay premio (una curva normal no es una derrapada). */
export const MINIMO_DERRAPADA = 0.8;
export const MINIMO_CABALLITO = 0.8;
/** El stoppie es corto por naturaleza (se acaba la velocidad): con un tercio de segundo ya vale. */
export const MINIMO_STOPPIE = 0.35;
export const ANGULO_STOPPIE = 0.1;
export const RAPIDEZ_DERRAPADA = 4;
export const RAPIDEZ_PELOS = 7;
export const RAPIDEZ_CONTRAMANO = 4;
/** Cada tantos segundos en contramano cae un premio. */
export const TRAMO_CONTRAMANO = 3;
export const EUROS_PELOS = 8;
/** El caballito cuenta a partir de este ángulo (el morro claramente en el aire). */
export const ANGULO_CABALLITO = 0.15;

export function eurosDerrapada(segundos: number): number { return 5 + Math.round(segundos * 15); }
export function eurosCaballito(segundos: number): number { return 10 + Math.round(segundos * 15); }
export function eurosStoppie(segundos: number): number { return 8 + Math.round(segundos * 20); }
export function eurosContramano(tramos: number): number { return 15 * Math.min(4, tramos); }

export class Estilo {
  private derrape = 0;
  private sinDerrape = 0;
  private caballito = 0;
  private stoppie = 0;
  private contramano = 0;
  private tramosContramano = 0;
  private enfriamientoPelos = 0;
  /** Lo que ahora mismo tienes a distancia de rozar, con si se ha tocado algo mientras estaba ahí. */
  private rozando = new Map<unknown, { rapidez: number; tocado: boolean }>();

  /** Segundos de derrapada, caballito y contramano en curso (para el HUD). */
  get enCurso(): { derrape: number; caballito: number; stoppie: number; contramano: number } {
    return { derrape: this.derrape, caballito: this.caballito, stoppie: this.stoppie, contramano: this.contramano };
  }

  /** Cierra lo que hubiera en curso sin premiar (al bajarte, al trincarte). */
  cortar(): void {
    this.derrape = 0;
    this.sinDerrape = 0;
    this.caballito = 0;
    this.stoppie = 0;
    this.contramano = 0;
    this.tramosContramano = 0;
    this.rozando.clear();
  }

  actualizar(e: EntradaEstilo, dt: number): EventoEstilo[] {
    const eventos: EventoEstilo[] = [];
    if (!e.enMoto) {
      // Sin moto, lo que hubiera en curso se paga si ya llegaba al mínimo (te has bajado justo después).
      if (this.derrape >= MINIMO_DERRAPADA) eventos.push({ tipo: 'derrapada', segundos: this.derrape, euros: eurosDerrapada(this.derrape) });
      if (this.caballito >= MINIMO_CABALLITO) eventos.push({ tipo: 'caballito', segundos: this.caballito, euros: eurosCaballito(this.caballito) });
      if (this.stoppie >= MINIMO_STOPPIE) eventos.push({ tipo: 'stoppie', segundos: this.stoppie, euros: eurosStoppie(this.stoppie) });
      this.cortar();
      return eventos;
    }
    this.enfriamientoPelos = Math.max(0, this.enfriamientoPelos - dt);

    // Derrapada: se acumula mientras dura; un cuarto de segundo sin derrapar la cierra.
    if (e.derrapando && e.rapidez > RAPIDEZ_DERRAPADA) { this.derrape += dt; this.sinDerrape = 0; }
    else if (this.derrape > 0) {
      this.sinDerrape += dt;
      if (this.sinDerrape > 0.25 || e.rapidez < 1) {
        if (this.derrape >= MINIMO_DERRAPADA) eventos.push({ tipo: 'derrapada', segundos: this.derrape, euros: eurosDerrapada(this.derrape) });
        this.derrape = 0;
        this.sinDerrape = 0;
      }
    }

    // Caballito: mientras el morro esté arriba.
    if (e.caballito > ANGULO_CABALLITO) this.caballito += dt;
    else if (this.caballito > 0) {
      if (this.caballito >= MINIMO_CABALLITO) eventos.push({ tipo: 'caballito', segundos: this.caballito, euros: eurosCaballito(this.caballito) });
      this.caballito = 0;
    }

    // Stoppie: mientras el trasero esté en el aire.
    if (e.stoppie > ANGULO_STOPPIE) this.stoppie += dt;
    else if (this.stoppie > 0) {
      if (this.stoppie >= MINIMO_STOPPIE) eventos.push({ tipo: 'stoppie', segundos: this.stoppie, euros: eurosStoppie(this.stoppie) });
      this.stoppie = 0;
    }

    // Por los pelos: algo entra en el radio a velocidad y sale sin que hayas tocado nada.
    const ahora = new Set<unknown>();
    for (const c of e.cerca) {
      ahora.add(c);
      const r = this.rozando.get(c);
      if (!r) this.rozando.set(c, { rapidez: e.rapidez, tocado: e.golpe });
      else if (e.golpe) r.tocado = true;
    }
    for (const [c, r] of this.rozando) {
      if (ahora.has(c)) continue;
      this.rozando.delete(c);
      if (!r.tocado && !e.golpe && r.rapidez > RAPIDEZ_PELOS && e.rapidez > RAPIDEZ_PELOS && this.enfriamientoPelos <= 0) {
        this.enfriamientoPelos = 0.8;
        eventos.push({ tipo: 'pelos', segundos: 0, euros: EUROS_PELOS });
      }
    }

    // Contramano: cada tramo de tres segundos paga, y cada vez más (hasta cuatro).
    if (e.contramano && e.rapidez > RAPIDEZ_CONTRAMANO) {
      this.contramano += dt;
      if (this.contramano >= TRAMO_CONTRAMANO) {
        this.contramano -= TRAMO_CONTRAMANO;
        this.tramosContramano++;
        eventos.push({ tipo: 'contramano', segundos: TRAMO_CONTRAMANO * this.tramosContramano, euros: eurosContramano(this.tramosContramano) });
      }
    } else if (this.contramano > 0 || this.tramosContramano > 0) {
      this.contramano = Math.max(0, this.contramano - dt * 2);
      if (this.contramano <= 0) this.tramosContramano = 0;
    }
    return eventos;
  }
}

/** Dirección unitaria del tramo de la vía más cercano al punto (el sentido en que está dibujada). */
export function sentidoVia(via: Pick<Via, 'puntos'>, x: number, z: number): { x: number; z: number } | null {
  const p = via.puntos;
  if (p.length < 2) return null;
  let mejor = Infinity, mejorI = 0;
  for (let i = 0; i + 1 < p.length; i++) {
    const [ax, az] = p[i]!, [bx, bz] = p[i + 1]!;
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2;
    if (d < mejor) { mejor = d; mejorI = i; }
  }
  const [ax, az] = p[mejorI]!, [bx, bz] = p[mejorI + 1]!;
  const l = Math.hypot(bx - ax, bz - az) || 1;
  return { x: (bx - ax) / l, z: (bz - az) / l };
}

/**
 * ¿Vas en contramano? Solo en vías rodadas de sentido único, si estás sobre ella (a menos de
 * medio ancho) y tu dirección va claramente contra la suya.
 */
export function vaEnContramano(via: Pick<Via, 'puntos' | 'clase' | 'unico' | 'ancho'> | null, x: number, z: number, dirX: number, dirZ: number): boolean {
  if (!via || !via.unico || via.clase !== 'rodada') return false;
  const s = sentidoVia(via, x, z);
  if (!s) return false;
  return s.x * dirX + s.z * dirZ < -0.6;
}
