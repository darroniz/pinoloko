// Perros callejeros por los pasajes: vagan por el grafo peatonal, te persiguen ladrando un rato
// si pasas cerca con la moto y se apartan de un salto si vas a llevártelos por delante (a los
// perros no se les atropella: es la línea del tono). Lógica pura testeable.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Perro {
  x: number;
  z: number;
  rumbo: number;
  estado: 'vagar' | 'perseguir' | 'cansado' | 'apartarse';
  nodo: number;
  anterior: number;
  destino: number;
  tiempo: number;
  /** Lo que le queda del salto para apartarse (aparte del tiempo de persecución). */
  salto: number;
  ladrido: number;
  fase: number;
  color: number;
}

const RADIO_PERSEGUIR = 14;
const RADIO_APARTARSE = 2.2;
const VELOCIDAD_PERSEGUIR = 7;

/** Un paso de un perro. Devuelve 'ladrido' cuando ladra. */
export function pasoPerro(p: Perro, grafo: GrafoBarrio, jugador: { x: number; z: number; rapidez: number }, dt: number, rnd: () => number): 'ladrido' | null {
  p.tiempo -= dt;
  p.ladrido -= dt;
  const dx = jugador.x - p.x, dz = jugador.z - p.z;
  const d2 = dx * dx + dz * dz;
  // Si va a llevárselo por delante, salta a un lado.
  if (p.estado !== 'apartarse' && d2 < RADIO_APARTARSE * RADIO_APARTARSE && jugador.rapidez > 2) {
    p.estado = 'apartarse';
    p.salto = 0.5;
    if (p.tiempo <= 0) p.tiempo = 3;
    p.rumbo = Math.atan2(-dx, dz) + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2;
  }
  if (p.estado === 'apartarse') {
    p.salto -= dt;
    p.x += Math.sin(p.rumbo) * 8 * dt;
    p.z += -Math.cos(p.rumbo) * 8 * dt;
    p.fase += dt * 14;
    // Sigue persiguiendo con el tiempo que le quedara (no se reinicia: si no, nunca se cansa).
    if (p.salto <= 0) p.estado = 'perseguir';
    return null;
  }
  if (p.estado === 'vagar' && d2 < RADIO_PERSEGUIR * RADIO_PERSEGUIR && jugador.rapidez > 2.5) {
    p.estado = 'perseguir';
    p.tiempo = 4 + rnd() * 2;
  }
  if (p.estado === 'perseguir') {
    const d = Math.sqrt(d2) || 1;
    if (d > 1.8) {
      p.rumbo = Math.atan2(dx / d, -dz / d);
      p.x += Math.sin(p.rumbo) * VELOCIDAD_PERSEGUIR * dt;
      p.z += -Math.cos(p.rumbo) * VELOCIDAD_PERSEGUIR * dt;
    }
    p.fase += dt * 14;
    let evento: 'ladrido' | null = null;
    if (p.ladrido <= 0 && d < 12) { p.ladrido = 0.7 + rnd() * 0.5; evento = 'ladrido'; }
    if (p.tiempo <= 0 || d > 40) {
      p.estado = 'cansado';
      p.tiempo = 6;
      p.nodo = grafo.masCercano(p.x, p.z, 'peatonal');
      p.anterior = -1;
      p.destino = grafo.siguienteAlAzar(p.nodo, -1, 'peatonal', rnd);
    }
    return evento;
  }
  if (p.estado === 'cansado' && p.tiempo <= 0) p.estado = 'vagar';
  // Vagar (y cansado): por el grafo peatonal, despacio.
  const [tx, tz] = grafo.nodos[p.destino] ?? [p.x, p.z];
  const ex = tx - p.x, ez = tz - p.z;
  const dist = Math.hypot(ex, ez);
  if (dist < 0.6) {
    p.anterior = p.nodo;
    p.nodo = p.destino;
    p.destino = grafo.siguienteAlAzar(p.nodo, p.anterior, 'peatonal', rnd);
    if (p.destino === p.nodo) p.anterior = -1;
    return null;
  }
  const objetivo = Math.atan2(ex, -ez);
  let dif = objetivo - p.rumbo;
  while (dif > Math.PI) dif -= Math.PI * 2;
  while (dif < -Math.PI) dif += Math.PI * 2;
  p.rumbo += dif * Math.min(1, dt * 6);
  const v = p.estado === 'cansado' ? 0.8 : 1.4;
  p.x += Math.sin(p.rumbo) * v * dt;
  p.z += -Math.cos(p.rumbo) * v * dt;
  p.fase += dt * 8;
  return null;
}

const COLORES_PERRO = ['#8b5a2b', '#2b2b2b', '#e8dcc4'];

export class Perros {
  readonly grupo = new THREE.Group();
  readonly lista: Perro[] = [];
  private mallas: THREE.InstancedMesh[] = [];
  private rnd = azar(4141);
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3(1, 1, 1);
  private eje = new THREE.Vector3(0, 1, 0);

  constructor(private readonly grafo: GrafoBarrio, cuantos: number) {
    this.grupo.name = 'perros';
    const candidatos: number[] = [];
    for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'peatonal').length > 0) candidatos.push(i);
    if (!candidatos.length) return;
    for (let i = 0; i < cuantos; i++) {
      const nodo = candidatos[Math.floor(this.rnd() * candidatos.length)]!;
      const [x, z] = grafo.nodos[nodo]!;
      this.lista.push({ x, z, rumbo: this.rnd() * Math.PI * 2, estado: 'vagar', nodo, anterior: -1, destino: grafo.siguienteAlAzar(nodo, -1, 'peatonal', this.rnd), tiempo: 0, salto: 0, ladrido: 0, fase: this.rnd() * 6, color: i % COLORES_PERRO.length });
    }
    // Perro de juguete: cuerpo, cabeza, orejas, patas y rabo; tres pelajes.
    const geo = mergeGeometries([
      new THREE.BoxGeometry(0.32, 0.3, 0.7).translate(0, 0.42, 0),
      new THREE.BoxGeometry(0.28, 0.26, 0.3).translate(0, 0.62, -0.45),
      new THREE.BoxGeometry(0.08, 0.14, 0.1).translate(-0.12, 0.8, -0.42),
      new THREE.BoxGeometry(0.08, 0.14, 0.1).translate(0.12, 0.8, -0.42),
      new THREE.BoxGeometry(0.06, 0.3, 0.06).translate(0, 0.55, 0.42).rotateX(-0.6),
      ...[[-0.1, -0.22], [0.1, -0.22], [-0.1, 0.22], [0.1, 0.22]].map(([x, z]) => new THREE.BoxGeometry(0.09, 0.3, 0.09).translate(x!, 0.15, z!)),
    ]);
    for (const c of COLORES_PERRO) {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: c }), cuantos);
      im.count = 0;
      im.castShadow = true;
      im.frustumCulled = false;
      this.mallas.push(im);
      this.grupo.add(im);
    }
  }

  actualizar(jugador: { x: number; z: number; rapidez: number }, dt: number): { ladridos: number } {
    let ladridos = 0;
    const cuentas = this.mallas.map(() => 0);
    for (const p of this.lista) {
      if (pasoPerro(p, this.grafo, jugador, dt, this.rnd) === 'ladrido') ladridos++;
      if ((p.x - jugador.x) ** 2 + (p.z - jugador.z) ** 2 > 130 * 130) continue;
      const trote = p.estado === 'perseguir' || p.estado === 'apartarse' ? Math.abs(Math.sin(p.fase)) * 0.12 : 0;
      this.p.set(p.x, trote, p.z);
      this.q.setFromAxisAngle(this.eje, -p.rumbo);
      this.m.compose(this.p, this.q, this.s);
      this.mallas[p.color]!.setMatrixAt(cuentas[p.color]!++, this.m);
    }
    this.mallas.forEach((im, i) => { im.count = cuentas[i]!; im.instanceMatrix.needsUpdate = true; });
    return { ladridos };
  }
}
