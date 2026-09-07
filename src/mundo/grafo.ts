// Grafo de waypoints del barrio: lógica pura, sin Three, con tests.
import type { ClaseVia, Grafo, Nivel, Punto, Via } from './tipos';
import { distanciaPolilinea } from './geometria';

export interface Vecino {
  nodo: number;
  clase: ClaseVia;
  via: number;
  largo: number;
}

export class GrafoBarrio {
  readonly nodos: Punto[];
  private readonly adyacencia: Vecino[][];

  constructor(grafo: Grafo) {
    this.nodos = grafo.nodos;
    this.adyacencia = grafo.nodos.map(() => []);
    for (const arista of grafo.aristas) {
      const [a, b, clase, via] = arista;
      const unico = arista[4] === 1;
      const largo = this.distancia(a, b);
      this.adyacencia[a]!.push({ nodo: b, clase, via, largo });
      if (!unico) this.adyacencia[b]!.push({ nodo: a, clase, via, largo });
    }
  }

  distancia(a: number, b: number): number {
    const [ax, az] = this.nodos[a]!;
    const [bx, bz] = this.nodos[b]!;
    return Math.hypot(bx - ax, bz - az);
  }

  vecinos(nodo: number, clase?: ClaseVia): Vecino[] {
    const v = this.adyacencia[nodo] ?? [];
    return clase ? v.filter((e) => e.clase === clase) : v;
  }

  /** Nodo más cercano a un punto, opcionalmente solo entre los que tienen aristas de una clase. */
  masCercano(x: number, z: number, clase?: ClaseVia): number {
    let mejor = -1, mejorD = Infinity;
    for (let i = 0; i < this.nodos.length; i++) {
      if (clase && !this.adyacencia[i]!.some((e) => e.clase === clase)) continue;
      const [nx, nz] = this.nodos[i]!;
      const d = (nx - x) ** 2 + (nz - z) ** 2;
      if (d < mejorD) { mejorD = d; mejor = i; }
    }
    return mejor;
  }

  /** Siguiente nodo al pasear: sigue recto si puede, evita volver por donde vino. */
  siguienteAlAzar(actual: number, anterior: number, clase: ClaseVia, aleatorio: () => number): number {
    const opciones = this.vecinos(actual, clase).filter((v) => v.nodo !== anterior);
    if (opciones.length === 0) {
      const todas = this.vecinos(actual, clase);
      return todas.length ? todas[0]!.nodo : actual;
    }
    return opciones[Math.floor(aleatorio() * opciones.length)]!.nodo;
  }

  /** Camino más corto (Dijkstra) restringido a una clase. Devuelve [] si no hay. */
  camino(origen: number, destino: number, clase?: ClaseVia): number[] {
    const dist = new Map<number, number>([[origen, 0]]);
    const previo = new Map<number, number>();
    const abiertos = new Set<number>([origen]);
    while (abiertos.size) {
      let u = -1, du = Infinity;
      for (const n of abiertos) { const d = dist.get(n)!; if (d < du) { du = d; u = n; } }
      abiertos.delete(u);
      if (u === destino) break;
      for (const v of this.vecinos(u, clase)) {
        const nd = du + v.largo;
        if (nd < (dist.get(v.nodo) ?? Infinity)) {
          dist.set(v.nodo, nd);
          previo.set(v.nodo, u);
          abiertos.add(v.nodo);
        }
      }
    }
    if (!dist.has(destino)) return [];
    const ruta = [destino];
    while (ruta[0] !== origen) ruta.unshift(previo.get(ruta[0]!)!);
    return ruta;
  }

  /** Tamaño de la componente conexa de una clase que contiene al nodo. */
  componente(nodo: number, clase: ClaseVia): number {
    const vistos = new Set<number>([nodo]);
    const pila = [nodo];
    while (pila.length) {
      const u = pila.pop()!;
      for (const v of this.vecinos(u, clase)) {
        if (!vistos.has(v.nodo)) { vistos.add(v.nodo); pila.push(v.nodo); }
      }
    }
    return vistos.size;
  }
}

/** Vía más cercana a un punto (para el HUD), o null si está a más de `maximo` metros. */
export function viaMasCercana(nivel: Pick<Nivel, 'vias'>, x: number, z: number, maximo = 14): Via | null {
  let mejor: Via | null = null, mejorD = maximo;
  for (const via of nivel.vias) {
    const d = distanciaPolilinea(x, z, via.puntos) - via.ancho / 2;
    if (d < mejorD) { mejorD = d; mejor = via; }
  }
  return mejor;
}
