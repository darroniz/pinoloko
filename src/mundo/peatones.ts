// Vecinos del barrio: pasean por los pasajes siguiendo el grafo peatonal, huyen de la moto
// cuando viene lanzada, se caen si los atropellas e insultan en sevillano. Sin física:
// posiciones propias e instancias para dibujarlos. Lógica testeable sin Three.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import { azar } from './geometria';

export type EstadoPeaton = 'pasear' | 'huir' | 'caido' | 'levantarse' | 'sentado';

export interface Vecino {
  x: number;
  z: number;
  rumbo: number;
  estado: EstadoPeaton;
  nodo: number;
  anterior: number;
  destino: number;
  tiempo: number;
  fase: number;
  color: number;
  velocidad: number;
  insultado: number;
}

export const INSULTOS = [
  '¡Illo, mira por dónde vas!', '¡Quillo, que me matas!', '¡Ozú, qué fatiga!', '¡Niñooo!',
  '¡A ver si te compras un semáforo!', '¡Mi arma, que casi me llevas!', '¡Ojú, la moto!',
  '¡Ay mi madre!', '¡Pisha, frena un poco!', '¡Que te veo, Wifly!', '¡Eso se lo digo yo a tu madre!',
  '¡Vaya tela con el niño!', '¡Ni un respeto, ni un respeto!',
];

const RADIO_HUIDA = 9;
const RADIO_ATROPELLO = 1.1;

/** Actualiza un vecino; devuelve 'atropello' o 'insulto' si ha pasado algo con el jugador. */
export function pasoVecino(
  v: Vecino,
  grafo: GrafoBarrio,
  jugador: { x: number; z: number; rapidez: number },
  dt: number,
  rnd: () => number,
): 'atropello' | 'insulto' | null {
  const dx = v.x - jugador.x, dz = v.z - jugador.z;
  const d2 = dx * dx + dz * dz;
  let evento: 'atropello' | 'insulto' | null = null;
  v.tiempo -= dt;

  if (v.estado !== 'caido' && d2 < RADIO_ATROPELLO * RADIO_ATROPELLO && jugador.rapidez > 3) {
    v.estado = 'caido';
    v.tiempo = 2.2 + rnd();
    v.rumbo = Math.atan2(dx, -dz);
    return 'atropello';
  }
  if (v.estado === 'caido') {
    if (v.tiempo <= 0) { v.estado = 'levantarse'; v.tiempo = 0.6; }
    return null;
  }
  if (v.estado === 'levantarse') {
    if (v.tiempo <= 0) { v.estado = 'huir'; v.tiempo = 3; }
    return null;
  }
  // Sentado en la terraza: no se mueve hasta que la moto viene lanzada; entonces se levanta y corre.
  if (v.estado === 'sentado') {
    if (d2 < RADIO_HUIDA * RADIO_HUIDA && jugador.rapidez > 4) {
      v.estado = 'huir';
      v.tiempo = 2 + rnd() * 2;
      if (v.insultado <= 0 && d2 < 36) { v.insultado = 6; return 'insulto'; }
    }
    return null;
  }
  if (v.estado === 'pasear' && d2 < RADIO_HUIDA * RADIO_HUIDA && jugador.rapidez > 4) {
    v.estado = 'huir';
    v.tiempo = 2 + rnd() * 2;
    if (v.insultado <= 0 && d2 < 25) { v.insultado = 6; evento = 'insulto'; }
  }
  v.insultado -= dt;

  if (v.estado === 'huir') {
    // Corre en dirección contraria al jugador, con un poco de pánico lateral.
    const d = Math.sqrt(d2) || 1;
    const objetivo = Math.atan2(dx / d, -dz / d) + Math.sin(v.fase * 0.5) * 0.4;
    v.rumbo = objetivo;
    v.velocidad = 4.5;
    v.x += Math.sin(v.rumbo) * v.velocidad * dt;
    v.z += -Math.cos(v.rumbo) * v.velocidad * dt;
    v.fase += dt * 12;
    if (v.tiempo <= 0 || d2 > 400) {
      v.estado = 'pasear';
      v.nodo = grafo.masCercano(v.x, v.z, 'peatonal');
      v.anterior = -1;
      v.destino = grafo.siguienteAlAzar(v.nodo, v.anterior, 'peatonal', rnd);
    }
    return evento;
  }

  // Pasear: hacia el nodo destino; al llegar, elige el siguiente sin volver atrás.
  const [tx, tz] = grafo.nodos[v.destino] ?? [v.x, v.z];
  const ex = tx - v.x, ez = tz - v.z;
  const dist = Math.hypot(ex, ez);
  if (dist < 0.6) {
    v.anterior = v.nodo;
    v.nodo = v.destino;
    v.destino = grafo.siguienteAlAzar(v.nodo, v.anterior, 'peatonal', rnd);
    if (v.destino === v.nodo) v.anterior = -1;
    return evento;
  }
  const objetivo = Math.atan2(ex, -ez);
  let dif = objetivo - v.rumbo;
  while (dif > Math.PI) dif -= Math.PI * 2;
  while (dif < -Math.PI) dif += Math.PI * 2;
  v.rumbo += dif * Math.min(1, dt * 6);
  v.x += Math.sin(v.rumbo) * v.velocidad * dt;
  v.z += -Math.cos(v.rumbo) * v.velocidad * dt;
  v.fase += dt * 7;
  return evento;
}

export function crearVecino(grafo: GrafoBarrio, nodo: number, rnd: () => number): Vecino {
  const [x, z] = grafo.nodos[nodo]!;
  return {
    x: x + (rnd() - 0.5), z: z + (rnd() - 0.5), rumbo: rnd() * Math.PI * 2, estado: 'pasear',
    nodo, anterior: -1, destino: grafo.siguienteAlAzar(nodo, -1, 'peatonal', rnd), tiempo: 0,
    fase: rnd() * 10, color: Math.floor(rnd() * 6), velocidad: 1.1 + rnd() * 0.6, insultado: 0,
  };
}

const COLORES_ROPA = ['#e63946', '#2a9d8f', '#e9c46a', '#8ecae6', '#f4a261', '#9b5de5'];

/** Los vecinos dibujados como instancias: cuerpo (cápsula) y cabeza, por color de ropa. */
export class Vecinos {
  readonly grupo = new THREE.Group();
  readonly lista: Vecino[] = [];
  private cuerpos: THREE.InstancedMesh[] = [];
  private cabezas: THREE.InstancedMesh;
  private rnd = azar(99);
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private eje = new THREE.Vector3(0, 1, 0);
  private ejeX = new THREE.Vector3(1, 0, 0);
  private q2 = new THREE.Quaternion();

  constructor(private readonly grafo: GrafoBarrio, cuantos: number, asientos: { x: number; z: number; rumbo: number }[] = []) {
    const geoCuerpo = new THREE.CapsuleGeometry(0.28, 0.6, 3, 8).translate(0, 0.72, 0);
    const geoCabeza = new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.42, 0);
    for (const c of COLORES_ROPA) {
      const im = new THREE.InstancedMesh(geoCuerpo, new THREE.MeshLambertMaterial({ color: c }), cuantos);
      im.count = 0;
      im.castShadow = true;
      im.frustumCulled = false;
      this.cuerpos.push(im);
      this.grupo.add(im);
    }
    this.cabezas = new THREE.InstancedMesh(geoCabeza, new THREE.MeshLambertMaterial({ color: '#e0ac8b' }), cuantos);
    this.cabezas.frustumCulled = false;
    this.cabezas.castShadow = true;
    this.grupo.add(this.cabezas);

    const candidatos: number[] = [];
    for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'peatonal').length > 0) candidatos.push(i);
    // Una parte del barrio está sentada en las terrazas (como mucho un tercio).
    const sentados = Math.min(asientos.length, Math.floor(cuantos / 3));
    for (let i = 0; i < sentados; i++) {
      const a = asientos[i]!;
      const nodo = grafo.masCercano(a.x, a.z, 'peatonal');
      const v = crearVecino(grafo, Math.max(0, nodo), this.rnd);
      v.x = a.x; v.z = a.z; v.rumbo = a.rumbo; v.estado = 'sentado';
      this.lista.push(v);
    }
    for (let i = sentados; i < cuantos && candidatos.length; i++) {
      const nodo = candidatos[Math.floor(this.rnd() * candidatos.length)]!;
      this.lista.push(crearVecino(grafo, nodo, this.rnd));
    }
  }

  /** Un bocinazo: los que estén a menos de `radio` salen corriendo. */
  asustar(x: number, z: number, radio: number): void {
    for (const v of this.lista) {
      if (v.estado !== 'pasear' && v.estado !== 'sentado') continue;
      if ((v.x - x) ** 2 + (v.z - z) ** 2 < radio * radio) { v.estado = 'huir'; v.tiempo = 1.5 + this.rnd() * 1.5; }
    }
  }

  /** Mueve a todos y devuelve los eventos con el jugador. */
  actualizar(jugador: { x: number; z: number; rapidez: number }, dt: number): { atropellos: number; insulto: string | null } {
    let atropellos = 0;
    let insulto: string | null = null;
    for (const v of this.lista) {
      const e = pasoVecino(v, this.grafo, jugador, dt, this.rnd);
      if (e === 'atropello') atropellos++;
      else if (e === 'insulto' && !insulto) insulto = INSULTOS[Math.floor(this.rnd() * INSULTOS.length)]!;
    }
    this.dibujar(jugador.x, jugador.z);
    return { atropellos, insulto };
  }

  private dibujar(cx: number, cz: number): void {
    const cuentas = this.cuerpos.map(() => 0);
    let nCabezas = 0;
    for (const v of this.lista) {
      if ((v.x - cx) ** 2 + (v.z - cz) ** 2 > 130 * 130) continue;
      this.p.set(v.x, 0, v.z);
      this.q.setFromAxisAngle(this.eje, -v.rumbo);
      if (v.estado === 'caido') {
        this.q2.setFromAxisAngle(this.ejeX, -Math.PI / 2);
        this.q.multiply(this.q2);
        this.p.y = 0.3;
      } else if (v.estado === 'levantarse') {
        this.q2.setFromAxisAngle(this.ejeX, -Math.PI / 4);
        this.q.multiply(this.q2);
      } else if (v.estado === 'sentado') {
        this.p.y = -0.38; // las piernas "dentro" de la silla
      }
      const bote = v.estado === 'pasear' || v.estado === 'huir' ? Math.abs(Math.sin(v.fase)) * 0.06 : 0;
      this.p.y += bote;
      this.s.setScalar(1.15);
      this.m.compose(this.p, this.q, this.s);
      const im = this.cuerpos[v.color]!;
      im.setMatrixAt(cuentas[v.color]!++, this.m);
      this.cabezas.setMatrixAt(nCabezas++, this.m);
    }
    this.cuerpos.forEach((im, i) => { im.count = cuentas[i]!; im.instanceMatrix.needsUpdate = true; });
    this.cabezas.count = nCabezas;
    this.cabezas.instanceMatrix.needsUpdate = true;
  }
}
