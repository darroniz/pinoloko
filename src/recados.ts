// Recadero: minijuego de encargos entre bares con nombre real. Coges el encargo en la puerta de
// un local y lo llevas a otro contra el reloj; entregar encadena el siguiente con más premio.
// Lógica pura (sin Three ni DOM) con tests; lo visible está en mundo/encargos.ts.
import type { Poi } from './mundo/tipos';

export interface Local {
  nombre: string;
  /** La puerta: el nodo del grafo más cercano al local (el POI suele caer dentro del edificio). */
  x: number;
  z: number;
}

const CLASES_LOCAL = new Set(['bar', 'cafe', 'restaurant', 'pub', 'fast_food', 'ice_cream', 'bakery', 'confectionery', 'kiosk', 'convenience', 'supermarket', 'pharmacy', 'marketplace']);

/** Locales con nombre real, sin repetir nombre. `puerta` traduce el POI a su punto en la calle. */
export function localesConNombre(pois: Poi[], puerta: (p: Poi) => [number, number]): Local[] {
  const vistos = new Set<string>();
  const locales: Local[] = [];
  for (const p of pois) {
    if (!CLASES_LOCAL.has(p.clase) || !p.nombre || vistos.has(p.nombre)) continue;
    vistos.add(p.nombre);
    const [x, z] = puerta(p);
    locales.push({ nombre: p.nombre, x, z });
  }
  return locales;
}

/** Destino para un encargo: otro local a una distancia razonable (o el más lejano si no hay). */
export function elegirDestino(locales: Local[], origen: Local, rnd: () => number, minimo = 90, maximo = 320): Local | null {
  const otros = locales.filter((l) => l !== origen && l.nombre !== origen.nombre);
  if (!otros.length) return null;
  const dist = (l: Local): number => Math.hypot(l.x - origen.x, l.z - origen.z);
  const buenos = otros.filter((l) => { const d = dist(l); return d >= minimo && d <= maximo; });
  if (buenos.length) return buenos[Math.floor(rnd() * buenos.length)]!;
  return otros.sort((a, b) => dist(b) - dist(a))[0]!;
}

/** Segundos para un encargo: un margen fijo más la distancia en línea recta a ~5 m/s de media. */
export function tiempoPara(distancia: number): number {
  return Math.round(12 + distancia / 5);
}

/** Dinero por entregar: más si sobra tiempo y más cuanto más larga la cadena de encargos seguidos. */
export function premioRecado(restante: number, total: number, cadena: number): number {
  const rapidez = Math.max(0, Math.min(1, restante / Math.max(1, total)));
  return Math.round((20 + 60 * rapidez) * (1 + 0.25 * Math.min(8, cadena)));
}

export const RADIO_ENTREGA = 5;

export class Recadero {
  estado: 'fuera' | 'en_curso' = 'fuera';
  origen: Local | null = null;
  destino: Local | null = null;
  total = 0;
  restante = 0;
  /** Encargos entregados seguidos (el actual sería el `cadena + 1`). */
  cadena = 0;

  empezar(origen: Local, destino: Local): void {
    this.origen = origen;
    this.destino = destino;
    this.total = tiempoPara(Math.hypot(destino.x - origen.x, destino.z - origen.z));
    this.restante = this.total;
    this.estado = 'en_curso';
  }

  abandonar(): void {
    this.estado = 'fuera';
    this.origen = null;
    this.destino = null;
    this.cadena = 0;
  }

  /** Avanza el reloj; 'entregado' al llegar a la puerta del destino, 'tiempo' si se agota. */
  actualizar(x: number, z: number, dt: number): 'entregado' | 'tiempo' | null {
    if (this.estado !== 'en_curso' || !this.destino) return null;
    this.restante -= dt;
    if (this.restante <= 0) { this.abandonar(); return 'tiempo'; }
    if (Math.hypot(this.destino.x - x, this.destino.z - z) > RADIO_ENTREGA) return null;
    this.cadena++;
    this.estado = 'fuera';
    return 'entregado';
  }
}
