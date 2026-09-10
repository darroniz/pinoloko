// Motos callejeras: canis en scooter que recorren calles y pasajes (todo el grafo). Sin física
// hasta que pasan a ser tuyas: a pie y con E las robas en marcha (la moto se vuelve una Scooter
// de verdad y el motero se queda en tierra), y si las embistes el motero cae y la moto queda
// cuatro segundos en el suelo para cogerla. Lógica pura testeable.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import type { MundoFisico } from '../fisica/mundo';
import { MODELOS, Scooter } from '../fisica/scooter';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Motero {
  origen: number;
  destino: number;
  t: number;
  x: number;
  z: number;
  rumbo: number;
  estado: 'rodar' | 'caido';
  tiempo: number;
  modelo: number;
  /** Segundos desde el último golpe (para no contar dos veces el mismo). */
  golpeado: number;
}

const RADIO_GOLPE = 1.7;
const VELOCIDAD_CALLE = 7;
const VELOCIDAD_PASAJE = 5;

/** Siguiente nodo por cualquier clase de vía, sin volver por donde vino si puede evitarlo. */
function siguiente(grafo: GrafoBarrio, actual: number, anterior: number, rnd: () => number): { nodo: number; clase: 'rodada' | 'peatonal' } {
  const todos = grafo.vecinos(actual);
  const opciones = todos.filter((v) => v.nodo !== anterior);
  const lista = opciones.length ? opciones : todos;
  if (!lista.length) return { nodo: actual, clase: 'peatonal' };
  const v = lista[Math.floor(rnd() * lista.length)]!;
  return { nodo: v.nodo, clase: v.clase };
}

/** Un paso de un motero. 'golpe' si el jugador lo ha embestido. */
export function pasoMotero(m: Motero, grafo: GrafoBarrio, jugador: { x: number; z: number; rapidez: number; enVehiculo: boolean }, dt: number, rnd: () => number): 'golpe' | null {
  m.tiempo -= dt;
  m.golpeado += dt;
  if (m.estado === 'caido') {
    if (m.tiempo <= 0) m.estado = 'rodar';
    return null;
  }
  const dx = jugador.x - m.x, dz = jugador.z - m.z;
  if (jugador.enVehiculo && jugador.rapidez > 4 && dx * dx + dz * dz < RADIO_GOLPE * RADIO_GOLPE && m.golpeado > 1) {
    m.estado = 'caido';
    m.tiempo = 4;
    m.golpeado = 0;
    return 'golpe';
  }
  const [ax, az] = grafo.nodos[m.origen] ?? [0, 0];
  const [bx, bz] = grafo.nodos[m.destino] ?? [0, 0];
  const largo = Math.hypot(bx - ax, bz - az) || 1;
  const clase = grafo.vecinos(m.origen).find((v) => v.nodo === m.destino)?.clase ?? 'peatonal';
  m.t += ((clase === 'rodada' ? VELOCIDAD_CALLE : VELOCIDAD_PASAJE) * dt) / largo;
  if (m.t >= 1) {
    const s = siguiente(grafo, m.destino, m.origen, rnd);
    m.origen = m.destino;
    m.destino = s.nodo;
    m.t = 0;
  }
  const [ox, oz] = grafo.nodos[m.origen] ?? [0, 0];
  const [px, pz] = grafo.nodos[m.destino] ?? [0, 0];
  m.x = ox + (px - ox) * m.t;
  m.z = oz + (pz - oz) * m.t;
  if (m.origen !== m.destino) m.rumbo = Math.atan2(px - ox, -(pz - oz));
  return null;
}

function pintar(g: THREE.BufferGeometry, c: string): THREE.BufferGeometry {
  const col = new THREE.Color(c);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { arr[k * 3] = col.r; arr[k * 3 + 1] = col.g; arr[k * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}

/** Scooter de juguete con un cani encima, con los colores en los vértices (una sola malla). */
export function geometriaMotero(colorMoto: string, colorRopa = '#1d3fa8'): THREE.BufferGeometry {
  return mergeGeometries([
    pintar(new THREE.BoxGeometry(0.45, 0.35, 1.3).translate(0, 0.5, 0), colorMoto),
    pintar(new THREE.BoxGeometry(0.4, 0.5, 0.3).translate(0, 0.75, -0.55), colorMoto),
    pintar(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10).rotateZ(Math.PI / 2).translate(0, 0.22, -0.6), '#2b2b2f'),
    pintar(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10).rotateZ(Math.PI / 2).translate(0, 0.22, 0.6), '#2b2b2f'),
    pintar(new THREE.CapsuleGeometry(0.2, 0.4, 3, 8).translate(0, 1.05, 0.1), colorRopa),
    pintar(new THREE.SphereGeometry(0.19, 8, 6).translate(0, 1.5, 0.1), '#e0ac8b'),
    pintar(new THREE.CylinderGeometry(0.2, 0.21, 0.08, 8).translate(0, 1.66, 0.1), '#111111'),
  ]);
}

export class MotosCalle {
  readonly grupo = new THREE.Group();
  readonly lista: Motero[] = [];
  private mallas: THREE.InstancedMesh[] = [];
  private rnd = azar(6060);
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private s = new THREE.Vector3(1.3, 1.3, 1.3);
  private eje = new THREE.Vector3(0, 1, 0);
  private ejeZ = new THREE.Vector3(0, 0, 1);

  /** `preferido`: índice de MODELOS que llevan dos de cada tres (la Vespa en los barrios pijos). */
  constructor(private readonly grafo: GrafoBarrio, cuantas: number, preferido?: number) {
    this.grupo.name = 'motos-calle';
    const candidatos: number[] = [];
    for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i).length > 0) candidatos.push(i);
    if (!candidatos.length) return;
    for (let i = 0; i < cuantas; i++) {
      const origen = candidatos[Math.floor(this.rnd() * candidatos.length)]!;
      const s = siguiente(grafo, origen, -1, this.rnd);
      this.lista.push({ origen, destino: s.nodo, t: this.rnd(), x: 0, z: 0, rumbo: 0, estado: 'rodar', tiempo: 0, modelo: preferido !== undefined && i % 3 !== 2 ? preferido : i % MODELOS.length, golpeado: 9 });
    }
    // Una malla instanciada por modelo (el color de la moto es el del modelo), con un cani encima.
    for (const modelo of MODELOS) {
      const im = new THREE.InstancedMesh(geometriaMotero(modelo.color), new THREE.MeshLambertMaterial({ vertexColors: true }), cuantas);
      im.count = 0;
      im.castShadow = true;
      im.frustumCulled = false;
      this.mallas.push(im);
      this.grupo.add(im);
    }
  }

  /** Motero a menos de `radio` m (rodando o caído), o null. */
  cercano(x: number, z: number, radio: number): Motero | null {
    let mejor: Motero | null = null, mejorD = radio * radio;
    for (const m of this.lista) {
      const d = (m.x - x) ** 2 + (m.z - z) ** 2;
      if (d < mejorD) { mejorD = d; mejor = m; }
    }
    return mejor;
  }

  /** Wifly se la lleva: la moto pasa a ser una Scooter de verdad y el motero desaparece de la lista. */
  robar(m: Motero, fisica: MundoFisico): Scooter {
    this.lista.splice(this.lista.indexOf(m), 1);
    return new Scooter(fisica, m.x, m.z, m.rumbo, MODELOS[m.modelo] ?? MODELOS[0]);
  }

  actualizar(jugador: { x: number; z: number; rapidez: number; enVehiculo: boolean }, dt: number): { golpes: number } {
    let golpes = 0;
    const cuentas = this.mallas.map(() => 0);
    for (const m of this.lista) {
      if (pasoMotero(m, this.grafo, jugador, dt, this.rnd) === 'golpe') golpes++;
      this.p.set(m.x, 0, m.z);
      this.q.setFromAxisAngle(this.eje, -m.rumbo);
      if (m.estado === 'caido') { this.q2.setFromAxisAngle(this.ejeZ, Math.PI / 2 - 0.2); this.q.multiply(this.q2); this.p.y = 0.25; }
      this.m.compose(this.p, this.q, this.s);
      const im = this.mallas[m.modelo];
      if (im) im.setMatrixAt(cuentas[m.modelo]!++, this.m);
    }
    this.mallas.forEach((im, i) => { im.count = cuentas[i]!; im.instanceMatrix.needsUpdate = true; });
    return { golpes };
  }
}
