// Carreras por los pasajes contra el reloj: lógica pura (ruta de puntos de control sobre el
// grafo peatonal, máquina de estados y premios). Lo visual está en mundo/circuito.ts.
import type { GrafoBarrio } from './mundo/grafo';

export interface RutaCarrera {
  /** Nodo de salida (y de meta: la carrera es un bucle). */
  salida: number;
  /** Puntos de control en orden; el último es la meta. */
  puntos: number[];
}

export const RADIO_PUNTO = 5.5;
export const TIEMPO_MAXIMO = 150;
const MINIMO_ENTRE_PUNTOS = 45;

/**
 * Ruta de `cuantos` puntos por el grafo peatonal a partir de un nodo de salida: cada punto a
 * 60-130 m del anterior y lejos de los ya elegidos, cerrando el bucle en la salida. Determinista
 * con la semilla que le den, para que los récords tengan sentido.
 */
export function generarRuta(grafo: GrafoBarrio, salida: number, cuantos: number, rnd: () => number): RutaCarrera | null {
  const alcanzables = grafo.alcanzables(salida, 'peatonal');
  if (alcanzables.size < cuantos * 3) return null;
  const nodos = [...alcanzables];
  const pos = (n: number): [number, number] => grafo.nodos[n] ?? [0, 0];
  const puntos: number[] = [];
  let actual = salida;
  for (let i = 0; i < cuantos - 1; i++) {
    const [ax, az] = pos(actual);
    const [sx, sz] = pos(salida);
    const candidatos = nodos.filter((n) => {
      if (n === actual || n === salida || puntos.includes(n)) return false;
      const [x, z] = pos(n);
      const d = Math.hypot(x - ax, z - az);
      if (d < 60 || d > 130) return false;
      // Que los últimos vayan volviendo hacia la salida.
      if (i >= cuantos - 3 && Math.hypot(x - sx, z - sz) > 150) return false;
      return puntos.every((p) => { const [px, pz] = pos(p); return Math.hypot(x - px, z - pz) >= MINIMO_ENTRE_PUNTOS; });
    });
    if (!candidatos.length) break;
    actual = candidatos[Math.floor(rnd() * candidatos.length)]!;
    puntos.push(actual);
  }
  if (puntos.length < 2) return null;
  puntos.push(salida);
  return { salida, puntos };
}

export type EstadoCarrera = 'fuera' | 'en_curso';

export class Carrera {
  estado: EstadoCarrera = 'fuera';
  indice = 0;
  tiempo = 0;
  ruta: RutaCarrera | null = null;

  empezar(ruta: RutaCarrera): void {
    this.ruta = ruta;
    this.estado = 'en_curso';
    this.indice = 0;
    this.tiempo = 0;
  }

  abandonar(): void {
    this.estado = 'fuera';
    this.ruta = null;
  }

  /** Nodo del siguiente punto de control, o -1. */
  get siguiente(): number {
    return this.ruta && this.estado === 'en_curso' ? this.ruta.puntos[this.indice] ?? -1 : -1;
  }

  /** Avanza el reloj y comprueba el paso por el punto. */
  actualizar(x: number, z: number, dt: number, grafo: GrafoBarrio): 'punto' | 'meta' | 'tiempo' | null {
    if (this.estado !== 'en_curso' || !this.ruta) return null;
    this.tiempo += dt;
    if (this.tiempo > TIEMPO_MAXIMO) { this.abandonar(); return 'tiempo'; }
    const [px, pz] = grafo.nodos[this.siguiente] ?? [Infinity, Infinity];
    if (Math.hypot(px - x, pz - z) > RADIO_PUNTO) return null;
    this.indice++;
    if (this.indice >= this.ruta.puntos.length) { this.estado = 'fuera'; return 'meta'; }
    return 'punto';
  }
}

/** Dinero por terminar: mucho si vas rápido, algo siempre. */
export function premio(segundos: number, puntos: number): number {
  const objetivo = puntos * 12; // segundos "buenos" por punto
  return Math.max(30, Math.round(40 * puntos * Math.max(0.25, Math.min(2, objetivo / segundos))));
}

export function formatearTiempo(segundos: number): string {
  return `${segundos.toFixed(1)} s`;
}

const CLAVE = 'pinoloko.carreras.v1';

/** Récords por barrio y carrera. */
export class Records {
  private datos: Record<string, number>;

  constructor(inicial?: Record<string, number>) {
    this.datos = inicial ?? Records.leer();
  }

  private static leer(): Record<string, number> {
    try { return JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Record<string, number>; } catch { return {}; }
  }

  mejor(barrio: string, carrera: number): number | null {
    return this.datos[`${barrio}/${carrera}`] ?? null;
  }

  /** Devuelve true si es récord nuevo. */
  registrar(barrio: string, carrera: number, segundos: number): boolean {
    const clave = `${barrio}/${carrera}`;
    const anterior = this.datos[clave];
    if (anterior !== undefined && anterior <= segundos) return false;
    this.datos[clave] = segundos;
    try { localStorage.setItem(CLAVE, JSON.stringify(this.datos)); } catch { /* sin almacenamiento */ }
    return true;
  }
}
