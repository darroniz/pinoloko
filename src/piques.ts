// Piques: en cada carrera salen contigo tres canis en scooter que siguen la misma ruta por el
// camino más corto del grafo peatonal. Lógica pura (sin Three): posiciones, quién ha llegado y en
// qué puesto acabas. Lo visible está en mundo/rivales.ts.
import type { GrafoBarrio } from './mundo/grafo';
import type { RutaCarrera } from './carreras';

export interface Rival {
  nombre: string;
  modelo: number;
  /** Nodos del grafo que recorre, de la salida a la meta, con los puntos de control por medio. */
  camino: number[];
  /** Tramo actual (índice en `camino`) y avance dentro de él (0-1). */
  tramo: number;
  t: number;
  velocidad: number;
  x: number;
  z: number;
  rumbo: number;
  /** Segundos que tardó en llegar, o -1 si sigue corriendo. */
  tiempo: number;
}

export const NOMBRES_RIVALES = ['el Kevin', 'el Jonathan', 'la Vanessa'];
/** Factores sobre el tiempo "bueno" de la carrera (12 s por punto): uno rápido, uno justo y uno
 *  lento. Van por el camino más corto sin frenar en las curvas, así que con 1,15 el Kevin ya
 *  aprieta; por encima de 11 m/s en los pasajes no hay quien les gane con el joystick. */
export const RITMOS = [1.15, 1.35, 1.6];
const VELOCIDAD_TOPE = 11;
export const BONUS_PIQUE = 60;

/** Camino completo de la ruta: el más corto entre cada par de puntos de control, por los pasajes. */
export function caminoDeRuta(grafo: GrafoBarrio, ruta: RutaCarrera): number[] {
  const camino: number[] = [ruta.salida];
  let actual = ruta.salida;
  for (const punto of ruta.puntos) {
    const tramo = grafo.camino(actual, punto, 'peatonal');
    // Sin camino peatonal (no debería pasar: la ruta se genera sobre lo alcanzable): en línea recta.
    camino.push(...(tramo.length > 1 ? tramo.slice(1) : [punto]));
    actual = punto;
  }
  return camino;
}

export function largoCamino(grafo: GrafoBarrio, camino: number[]): number {
  let l = 0;
  for (let i = 0; i + 1 < camino.length; i++) l += grafo.distancia(camino[i]!, camino[i + 1]!);
  return l;
}

/** Tres rivales en la salida, cada uno a su ritmo (algo de azar para que no sea siempre el mismo orden). */
export function crearRivales(grafo: GrafoBarrio, ruta: RutaCarrera, rnd: () => number): Rival[] {
  const camino = caminoDeRuta(grafo, ruta);
  const largo = largoCamino(grafo, camino);
  const objetivo = ruta.puntos.length * 12;
  const [sx, sz] = grafo.nodos[ruta.salida] ?? [0, 0];
  return NOMBRES_RIVALES.map((nombre, i) => ({
    nombre,
    modelo: i,
    camino,
    tramo: 0,
    t: 0,
    velocidad: Math.min(VELOCIDAD_TOPE, Math.max(3, largo / (objetivo * RITMOS[i]! * (0.92 + rnd() * 0.16)))),
    x: sx + (i - 1) * 1.4,
    z: sz,
    rumbo: 0,
    tiempo: -1,
  }));
}

/** Un paso de un rival. Devuelve true justo cuando cruza la meta. */
export function pasoRival(r: Rival, grafo: GrafoBarrio, dt: number, reloj: number): boolean {
  if (r.tiempo >= 0) return false;
  let avance = r.velocidad * dt;
  while (avance > 0) {
    const a = r.camino[r.tramo], b = r.camino[r.tramo + 1];
    if (a === undefined || b === undefined) break;
    const largo = grafo.distancia(a, b) || 0.01;
    const resto = (1 - r.t) * largo;
    if (avance < resto) { r.t += avance / largo; avance = 0; }
    else { avance -= resto; r.tramo++; r.t = 0; }
  }
  const a = r.camino[r.tramo], b = r.camino[r.tramo + 1];
  if (a === undefined) return false;
  const [ax, az] = grafo.nodos[a] ?? [0, 0];
  if (b === undefined) { r.x = ax; r.z = az; r.tiempo = reloj; return true; }
  const [bx, bz] = grafo.nodos[b] ?? [0, 0];
  r.x = ax + (bx - ax) * r.t;
  r.z = az + (bz - az) * r.t;
  r.rumbo = Math.atan2(bx - ax, -(bz - az));
  return false;
}

/** Puesto del jugador si llega ahora: 1 + rivales que ya han terminado. */
export function puesto(rivales: Rival[]): number {
  return 1 + rivales.filter((r) => r.tiempo >= 0).length;
}

/** Progreso de un rival sobre su camino (0-1), para saber si va por delante del jugador. */
export function progreso(r: Rival, grafo: GrafoBarrio): number {
  const total = largoCamino(grafo, r.camino) || 1;
  let hecho = 0;
  for (let i = 0; i < r.tramo && i + 1 < r.camino.length; i++) hecho += grafo.distancia(r.camino[i]!, r.camino[i + 1]!);
  const a = r.camino[r.tramo], b = r.camino[r.tramo + 1];
  if (a !== undefined && b !== undefined) hecho += grafo.distancia(a, b) * r.t;
  return Math.min(1, hecho / total);
}

export function ordinal(n: number): string {
  return `${n}º`;
}
