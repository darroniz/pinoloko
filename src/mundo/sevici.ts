// Sevici: ciclistas de la bici pública por los carriles bici (`cycleway` de OSM). Sin física:
// recorren las aristas de carril bici, tocan el timbre si te tienen delante y se caen si los
// atropellas (y a los tres segundos se levantan y siguen). Lógica pura testeable.
import * as THREE from 'three';
import type { Nivel } from './tipos';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Ciclista {
  origen: number;
  destino: number;
  t: number;
  x: number;
  z: number;
  rumbo: number;
  velocidad: number;
  estado: 'pedalear' | 'caido';
  tiempo: number;
  timbre: number;
}

/** Adyacencia del carril bici: solo las aristas cuya vía es `cycleway`. */
export function carrilesBici(nivel: Pick<Nivel, 'vias' | 'grafo'>): Map<number, number[]> {
  const ciclables = new Set(nivel.vias.filter((v) => v.tipo === 'cycleway').map((v) => v.id));
  const ady = new Map<number, number[]>();
  const meter = (a: number, b: number): void => { let l = ady.get(a); if (!l) { l = []; ady.set(a, l); } l.push(b); };
  for (const [a, b, , via] of nivel.grafo.aristas) {
    if (!ciclables.has(via)) continue;
    meter(a, b);
    meter(b, a);
  }
  return ady;
}

const RADIO_ATROPELLO = 1.3;
const RADIO_TIMBRE = 7;

/** Un paso de un ciclista: avanza por la arista y cambia de arista al llegar; cae si lo atropellas. */
export function pasoCiclista(c: Ciclista, nodos: [number, number][], ady: Map<number, number[]>, jugador: { x: number; z: number; rapidez: number }, dt: number, rnd: () => number): 'atropello' | 'timbre' | null {
  c.tiempo -= dt;
  c.timbre -= dt;
  const dx = jugador.x - c.x, dz = jugador.z - c.z;
  const d2 = dx * dx + dz * dz;
  if (c.estado === 'caido') {
    if (c.tiempo <= 0) c.estado = 'pedalear';
    return null;
  }
  if (d2 < RADIO_ATROPELLO * RADIO_ATROPELLO && jugador.rapidez > 3) {
    c.estado = 'caido';
    c.tiempo = 3;
    return 'atropello';
  }
  const [ax, az] = nodos[c.origen] ?? [0, 0];
  const [bx, bz] = nodos[c.destino] ?? [0, 0];
  const largo = Math.hypot(bx - ax, bz - az) || 1;
  c.t += (c.velocidad * dt) / largo;
  if (c.t >= 1) {
    const opciones = (ady.get(c.destino) ?? []).filter((n) => n !== c.origen);
    const siguiente = opciones.length ? opciones[Math.floor(rnd() * opciones.length)]! : c.origen;
    c.origen = c.destino;
    c.destino = siguiente;
    c.t = 0;
  }
  const [ox, oz] = nodos[c.origen] ?? [0, 0];
  const [px, pz] = nodos[c.destino] ?? [0, 0];
  c.x = ox + (px - ox) * c.t;
  c.z = oz + (pz - oz) * c.t;
  c.rumbo = Math.atan2(px - ox, -(pz - oz));
  // Timbre si el jugador anda cerca y por delante.
  const fx = Math.sin(c.rumbo), fz = -Math.cos(c.rumbo);
  if (d2 < RADIO_TIMBRE * RADIO_TIMBRE && dx * fx + dz * fz > 0 && c.timbre <= 0) { c.timbre = 4; return 'timbre'; }
  return null;
}

export class Sevici {
  readonly grupo = new THREE.Group();
  readonly lista: Ciclista[] = [];
  private malla: THREE.InstancedMesh | null = null;
  private rnd = azar(2323);
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private s = new THREE.Vector3(1, 1, 1);
  private eje = new THREE.Vector3(0, 1, 0);
  private ejeZ = new THREE.Vector3(0, 0, 1);
  private readonly nodos: [number, number][];
  private readonly ady: Map<number, number[]>;

  constructor(nivel: Pick<Nivel, 'vias' | 'grafo'>, cuantos: number) {
    this.grupo.name = 'sevici';
    this.nodos = nivel.grafo.nodos;
    this.ady = carrilesBici(nivel);
    const salidas = [...this.ady.keys()];
    if (!salidas.length) return;
    for (let i = 0; i < cuantos; i++) {
      const origen = salidas[Math.floor(this.rnd() * salidas.length)]!;
      const vecinos = this.ady.get(origen)!;
      const destino = vecinos[Math.floor(this.rnd() * vecinos.length)]!;
      this.lista.push({ origen, destino, t: this.rnd(), x: 0, z: 0, rumbo: 0, velocidad: 4 + this.rnd() * 1.5, estado: 'pedalear', tiempo: 0, timbre: this.rnd() * 3 });
    }
    // La bici (verde Sevici, cesta gris) con el ciclista encima, en una sola geometría con colores.
    const pintar = (g: THREE.BufferGeometry, c: string): THREE.BufferGeometry => {
      const col = new THREE.Color(c);
      const n = g.getAttribute('position').count;
      const arr = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { arr[k * 3] = col.r; arr[k * 3 + 1] = col.g; arr[k * 3 + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.deleteAttribute('uv');
      return g.index ? g.toNonIndexed() : g;
    };
    const piezas = [
      pintar(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 10).rotateZ(Math.PI / 2).translate(0, 0.34, -0.55), '#2b2b2f'),
      pintar(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 10).rotateZ(Math.PI / 2).translate(0, 0.34, 0.55), '#2b2b2f'),
      pintar(new THREE.BoxGeometry(0.12, 0.12, 1.1).translate(0, 0.55, 0), '#3f9f63'),
      pintar(new THREE.BoxGeometry(0.12, 0.5, 0.12).translate(0, 0.75, 0.3), '#3f9f63'),
      pintar(new THREE.BoxGeometry(0.5, 0.25, 0.4).translate(0, 0.85, -0.6), '#9aa0a6'),
      pintar(new THREE.CapsuleGeometry(0.24, 0.5, 3, 8).translate(0, 1.35, 0.15), '#e9c46a'),
      pintar(new THREE.SphereGeometry(0.22, 8, 6).translate(0, 1.95, 0.15), '#e0ac8b'),
    ];
    this.malla = new THREE.InstancedMesh(mergeGeometries(piezas), new THREE.MeshLambertMaterial({ vertexColors: true }), this.lista.length);
    this.malla.castShadow = true;
    this.malla.frustumCulled = false;
    this.grupo.add(this.malla);
  }

  actualizar(jugador: { x: number; z: number; rapidez: number }, dt: number): { atropellos: number; timbre: boolean } {
    let atropellos = 0, timbre = false;
    if (!this.malla) return { atropellos, timbre };
    this.lista.forEach((c, i) => {
      const e = pasoCiclista(c, this.nodos, this.ady, jugador, dt, this.rnd);
      if (e === 'atropello') atropellos++;
      else if (e === 'timbre') timbre = true;
      this.p.set(c.x, 0, c.z);
      this.q.setFromAxisAngle(this.eje, -c.rumbo);
      if (c.estado === 'caido') { this.q2.setFromAxisAngle(this.ejeZ, Math.PI / 2); this.q.multiply(this.q2); this.p.y = 0.3; }
      this.m.compose(this.p, this.q, this.s);
      this.malla!.setMatrixAt(i, this.m);
    });
    this.malla.instanceMatrix.needsUpdate = true;
    return { atropellos, timbre };
  }
}
