// Servicios de emergencia: los bomberos vienen a apagar un vehículo reventado y la ambulancia
// del 061 a recoger atropellados. Llegan por el grafo rodado desde lejos (camino más corto),
// trabajan unos segundos junto al sitio y se vuelven por donde vinieron. Sin cuerpo físico
// (el tráfico y la moto los atraviesan, como a los moteros): son un espectáculo, no un obstáculo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GrafoBarrio } from './grafo';

export type TipoEmergencia = 'bomberos' | 'ambulancia';

export interface Servicio {
  tipo: TipoEmergencia;
  camino: number[];
  indice: number;
  x: number;
  z: number;
  rumbo: number;
  estado: 'viene' | 'trabaja' | 'se_va';
  tiempo: number;
  objetivo: { x: number; z: number };
  grupo: THREE.Group;
  luz: THREE.Mesh;
}

const VELOCIDAD: Record<TipoEmergencia, number> = { bomberos: 11, ambulancia: 13 };
const TRABAJO: Record<TipoEmergencia, number> = { bomberos: 7, ambulancia: 5 };
const RADIO_TRABAJO = 9;

function pintar(g: THREE.BufferGeometry, c: string): THREE.BufferGeometry {
  const col = new THREE.Color(c);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { arr[k * 3] = col.r; arr[k * 3 + 1] = col.g; arr[k * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}

const geometrias = new Map<TipoEmergencia, THREE.BufferGeometry>();

/** Camión de bomberos rojo con escalera encima, o ambulancia blanca con la franja amarilla y la cruz. */
export function geometriaEmergencia(tipo: TipoEmergencia): THREE.BufferGeometry {
  const cache = geometrias.get(tipo);
  if (cache) return cache;
  const piezas: THREE.BufferGeometry[] = [];
  if (tipo === 'bomberos') {
    piezas.push(pintar(new THREE.BoxGeometry(2.4, 0.7, 7.5).translate(0, 0.55, 0), '#b91c1c'));
    piezas.push(pintar(new THREE.BoxGeometry(2.4, 1.9, 1.9).translate(0, 1.85, -2.7), '#dc2626'));
    piezas.push(pintar(new THREE.BoxGeometry(2.2, 0.7, 0.3).translate(0, 2.2, -3.6), '#9fd3e8'));
    piezas.push(pintar(new THREE.BoxGeometry(2.4, 1.6, 4.8).translate(0, 1.7, 1.0), '#dc2626'));
    piezas.push(pintar(new THREE.BoxGeometry(0.5, 0.25, 5.5).translate(0, 2.65, 0.8), '#c0c4cc'));
    piezas.push(pintar(new THREE.BoxGeometry(2.3, 0.2, 0.9).translate(0, 1.3, 3.5), '#c0c4cc'));
    for (const [x, z] of [[-1.05, -2.4], [1.05, -2.4], [-1.05, 1.6], [1.05, 1.6], [-1.05, 2.8], [1.05, 2.8]]) {
      piezas.push(pintar(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10).rotateZ(Math.PI / 2).translate(x!, 0.45, z!), '#2b2b2f'));
    }
  } else {
    piezas.push(pintar(new THREE.BoxGeometry(1.9, 0.6, 4.6).translate(0, 0.5, 0), '#f7f7f7'));
    piezas.push(pintar(new THREE.BoxGeometry(1.9, 1.3, 3.0).translate(0, 1.4, 0.6), '#f7f7f7'));
    piezas.push(pintar(new THREE.BoxGeometry(1.7, 0.7, 1.2).translate(0, 1.1, -1.5), '#f7f7f7'));
    piezas.push(pintar(new THREE.BoxGeometry(1.6, 0.45, 1.0).translate(0, 1.2, -1.5), '#9fd3e8'));
    piezas.push(pintar(new THREE.BoxGeometry(1.92, 0.3, 4.4).translate(0, 0.85, 0), '#facc15'));
    piezas.push(pintar(new THREE.BoxGeometry(0.2, 0.7, 0.7).translate(0.96, 1.5, 0.8), '#dc2626'));
    piezas.push(pintar(new THREE.BoxGeometry(0.2, 0.7, 0.7).translate(-0.96, 1.5, 0.8), '#dc2626'));
    for (const [x, z] of [[-0.85, -1.4], [0.85, -1.4], [-0.85, 1.4], [0.85, 1.4]]) {
      piezas.push(pintar(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10).rotateZ(Math.PI / 2).translate(x!, 0.34, z!), '#2b2b2f'));
    }
  }
  const g = mergeGeometries(piezas, false);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  for (const p of piezas) p.dispose();
  geometrias.set(tipo, g);
  return g;
}

/** Nodo rodado a 110-220 m del objetivo con camino hasta él (o el más lejano que lo tenga). */
export function elegirEntrada(grafo: GrafoBarrio, destino: number, rnd: () => number): number[] | null {
  const [dx, dz] = grafo.nodos[destino] ?? [0, 0];
  const candidatos: number[] = [];
  for (let i = 0; i < grafo.nodos.length; i++) {
    if (!grafo.vecinos(i, 'rodada').length) continue;
    const [x, z] = grafo.nodos[i]!;
    const d = Math.hypot(x - dx, z - dz);
    if (d >= 110 && d <= 220) candidatos.push(i);
  }
  for (let intento = 0; intento < 8 && candidatos.length; intento++) {
    const origen = candidatos[Math.floor(rnd() * candidatos.length)]!;
    const camino = grafo.camino(origen, destino, 'rodada');
    if (camino.length >= 2) return camino;
  }
  // Sin candidatos a esa distancia: el alcanzable más lejano.
  let mejor: number[] | null = null;
  for (const n of grafo.alcanzables(destino, 'rodada')) {
    const [x, z] = grafo.nodos[n]!;
    if (Math.hypot(x - dx, z - dz) < 60) continue;
    const camino = grafo.camino(n, destino, 'rodada');
    if (camino.length >= 2 && (!mejor || camino.length > mejor.length)) mejor = camino;
  }
  return mejor;
}

export class Emergencias {
  readonly grupo = new THREE.Group();
  readonly lista: Servicio[] = [];
  private material = new THREE.MeshLambertMaterial({ vertexColors: true });
  private azul = new THREE.MeshBasicMaterial({ color: '#3b82f6' });
  private tiempo = 0;

  constructor(private readonly grafo: GrafoBarrio) {
    this.grupo.name = 'emergencias';
  }

  /** Llama a un servicio hacia (x, z). Solo uno de cada tipo a la vez. */
  llamar(tipo: TipoEmergencia, x: number, z: number, rnd: () => number): boolean {
    if (this.lista.some((s) => s.tipo === tipo)) return false;
    const destino = this.grafo.masCercano(x, z, 'rodada');
    if (destino < 0) return false;
    const camino = elegirEntrada(this.grafo, destino, rnd);
    if (!camino) return false;
    const grupo = new THREE.Group();
    const malla = new THREE.Mesh(geometriaEmergencia(tipo), this.material);
    malla.castShadow = true;
    const luz = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3).translate(0, tipo === 'bomberos' ? 2.95 : 2.15, tipo === 'bomberos' ? -2.7 : 0.6), this.azul);
    grupo.add(malla, luz);
    const [sx, sz] = this.grafo.nodos[camino[0]!]!;
    const s: Servicio = { tipo, camino, indice: 0, x: sx, z: sz, rumbo: 0, estado: 'viene', tiempo: 0, objetivo: { x, z }, grupo, luz };
    grupo.position.set(sx, 0.02, sz);
    this.grupo.add(grupo);
    this.lista.push(s);
    return true;
  }

  private quitar(s: Servicio): void {
    this.grupo.remove(s.grupo);
    s.luz.geometry.dispose();
    this.lista.splice(this.lista.indexOf(s), 1);
  }

  /** Un paso: devuelve los servicios que acaban de llegar y los que acaban de terminar. */
  actualizar(dt: number): { llegan: Servicio[]; terminan: Servicio[] } {
    this.tiempo += dt;
    const llegan: Servicio[] = [], terminan: Servicio[] = [];
    for (const s of [...this.lista]) {
      s.luz.visible = Math.floor(this.tiempo * 5) % 2 === 0;
      if (s.estado === 'trabaja') {
        s.tiempo -= dt;
        if (s.tiempo <= 0) { s.estado = 'se_va'; s.camino = [...s.camino].reverse(); s.indice = 0; terminan.push(s); }
        continue;
      }
      // Avanza hacia el siguiente nodo del camino.
      const siguiente = s.camino[s.indice + 1];
      if (siguiente === undefined) {
        if (s.estado === 'viene') { s.estado = 'trabaja'; s.tiempo = TRABAJO[s.tipo]; llegan.push(s); }
        else this.quitar(s);
        continue;
      }
      const [tx, tz] = this.grafo.nodos[siguiente]!;
      const ex = tx - s.x, ez = tz - s.z;
      const d = Math.hypot(ex, ez);
      const paso = VELOCIDAD[s.tipo] * dt;
      if (d <= paso) { s.x = tx; s.z = tz; s.indice++; }
      else { s.x += (ex / d) * paso; s.z += (ez / d) * paso; s.rumbo = Math.atan2(ex, -ez); }
      // Viniendo, para en cuanto tiene el sitio a mano aunque queden nodos.
      if (s.estado === 'viene' && Math.hypot(s.objetivo.x - s.x, s.objetivo.z - s.z) < RADIO_TRABAJO) { s.estado = 'trabaja'; s.tiempo = TRABAJO[s.tipo]; llegan.push(s); }
      s.grupo.position.set(s.x, 0.02, s.z);
      s.grupo.rotation.y = -s.rumbo;
    }
    return { llegan, terminan };
  }

  retirarTodos(): void {
    for (const s of [...this.lista]) this.quitar(s);
  }
}
