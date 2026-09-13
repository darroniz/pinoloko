// La procesión: las tardes de salida (una de cada tres), de la parroquia sale la cofradía y va
// despacio por los pasajes: la cruz de guía, dos filas de nazarenos con capirote, el paso con sus
// cirios meciéndose y la banda de cornetas y tambores detrás. Todos siguen el rastro de la cabeza
// (una cola de puntos), así que la fila serpentea por el grafo como una procesión de verdad.
// Lógica pura testeable; el dibujo, instancias.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import type { Nivel } from './tipos';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const HORA_SALIDA = { desde: 19, hasta: 23.5 };
/** Sale una tarde de cada tantas (el primer día sí, para que se vea). */
export const CADA_DIAS = 3;
export const PASO_PROCESION = 0.9;
export const RADIO_MUSICA = 90;
/** Parado a menos de esto del paso el rato de RESPETO_SEGUNDOS, Wifly se quita la gorra (y paga). */
export const RADIO_RESPETO = 13;
export const RESPETO_SEGUNDOS = 3.5;
export const PREMIO_RESPETO = 25;
/** Largo de la fila (metros de rastro que hace falta guardar). */
const LARGO_FILA = 40;

export type TipoMiembro = 'cruz' | 'nazareno' | 'paso' | 'banda';
export interface Miembro { tipo: TipoMiembro; d: number; lado: number; x: number; z: number; rumbo: number }

export function formarCofradia(): Miembro[] {
  const m: Miembro[] = [{ tipo: 'cruz', d: 0, lado: 0, x: 0, z: 0, rumbo: 0 }];
  for (let i = 0; i < 8; i++) for (const lado of [-0.95, 0.95]) m.push({ tipo: 'nazareno', d: 2.2 + i * 1.9, lado, x: 0, z: 0, rumbo: 0 });
  m.push({ tipo: 'paso', d: 21.5, lado: 0, x: 0, z: 0, rumbo: 0 });
  for (let f = 0; f < 4; f++) for (const lado of [-1.1, 0, 1.1]) m.push({ tipo: 'banda', d: 27 + f * 1.5, lado, x: 0, z: 0, rumbo: 0 });
  return m;
}

/** La parroquia del barrio: su centro y el nodo peatonal más cercano (null si no hay iglesia). */
export function elegirParroquia(nivel: Pick<Nivel, 'edificios'>, grafo: GrafoBarrio): { x: number; z: number; nodo: number } | null {
  const e = nivel.edificios.find((ed) => ed.tipo === 'iglesia');
  if (!e) return null;
  let cx = 0, cz = 0;
  for (const [x, z] of e.poligono) { cx += x; cz += z; }
  cx /= e.poligono.length; cz /= e.poligono.length;
  const nodo = grafo.masCercano(cx, cz, 'peatonal');
  if (nodo < 0) return null;
  const [nx, nz] = grafo.nodos[nodo]!;
  if (Math.hypot(nx - cx, nz - cz) > 80) return null;
  return { x: cx, z: cz, nodo };
}

export function esTardeDeSalida(dia: number, hora: number): boolean {
  return dia % CADA_DIAS === 0 && hora >= HORA_SALIDA.desde && hora < HORA_SALIDA.hasta;
}

export interface EventosProcesion {
  sale: boolean;
  seRecoge: boolean;
  /** Te has colado por medio con el vehículo a velocidad. */
  cruzada: boolean;
  /** Te has quedado parado viendo pasar el paso (una vez por salida). */
  respeto: boolean;
  /** De 0 a 1, para la banda. */
  cercania: number;
  /** A pie junto a un nazareno: te da un caramelo. */
  caramelo: boolean;
}
export const CARAMELO_SEGUNDOS = 2.5;

export class Procesion {
  activa = false;
  readonly miembros = formarCofradia();
  /** Rastro de la cabeza: puntos (x, z) del más viejo al más nuevo. */
  private rastro: number[] = [];
  private largos: number[] = [];
  private cabeza = { x: 0, z: 0, nodo: -1, anterior: -1, destino: -1 };
  private dia = 0;
  private horaPrevia = -1;
  private respetoHecho = false;
  private tiempoParado = 0;
  private enfriamientoCruce = 0;
  private forzada = false;
  private enfriamientoCaramelo = 0;
  /** Fase de la mecida del paso. */
  fase = 0;

  constructor(readonly parroquia: { x: number; z: number; nodo: number } | null, private readonly grafo: GrafoBarrio, private readonly rnd: () => number = azar(1521)) {}

  get paso(): Miembro { return this.miembros.find((m) => m.tipo === 'paso')!; }

  /** Sacarla ahora mismo (la sonda). */
  salir(): void {
    if (!this.parroquia) return;
    this.forzada = true;
    this.empezar();
  }

  private empezar(): void {
    const p = this.parroquia!;
    this.activa = true;
    this.respetoHecho = false;
    this.tiempoParado = 0;
    this.cabeza = { x: this.grafo.nodos[p.nodo]![0], z: this.grafo.nodos[p.nodo]![1], nodo: p.nodo, anterior: -1, destino: this.grafo.siguienteAlAzar(p.nodo, -1, 'peatonal', this.rnd) };
    // El rastro arranca "dentro" de la parroquia: la fila sale ya formada por la puerta.
    let ax = p.x - this.cabeza.x, az = p.z - this.cabeza.z;
    const l = Math.hypot(ax, az) || 1;
    if (l < 1) { ax = 0; az = 1; } else { ax /= l; az /= l; }
    this.rastro = [];
    for (let d = LARGO_FILA + 4; d >= 0; d -= 0.5) this.rastro.push(this.cabeza.x + ax * d, this.cabeza.z + az * d);
    this.colocar();
  }

  private recoger(): void {
    this.activa = false;
    this.forzada = false;
    this.rastro = [];
  }

  actualizar(hora: number, jugador: { x: number; z: number; rapidez: number; enVehiculo: boolean }, dt: number): EventosProcesion {
    const r: EventosProcesion = { sale: false, seRecoge: false, cruzada: false, respeto: false, cercania: 0, caramelo: false };
    if (!this.parroquia) return r;
    if (this.horaPrevia >= 0 && hora < this.horaPrevia - 12) this.dia++;
    this.horaPrevia = hora;
    const toca = this.forzada || esTardeDeSalida(this.dia, hora);
    if (toca && !this.activa) { this.empezar(); r.sale = true; }
    else if (!toca && this.activa) { this.recoger(); r.seRecoge = true; return r; }
    if (!this.activa) return r;
    if (this.forzada && hora >= HORA_SALIDA.hasta && hora < HORA_SALIDA.hasta + 0.2) { this.recoger(); r.seRecoge = true; return r; }

    // La cabeza anda por el grafo peatonal, despacio y sin volver atrás.
    const c = this.cabeza;
    const [tx, tz] = this.grafo.nodos[c.destino] ?? [c.x, c.z];
    const ex = tx - c.x, ez = tz - c.z;
    const dist = Math.hypot(ex, ez);
    if (dist < 0.4) {
      c.anterior = c.nodo; c.nodo = c.destino;
      c.destino = this.grafo.siguienteAlAzar(c.nodo, c.anterior, 'peatonal', this.rnd);
      if (c.destino === c.nodo) c.anterior = -1;
    } else {
      const paso = Math.min(dist, PASO_PROCESION * dt);
      c.x += (ex / dist) * paso; c.z += (ez / dist) * paso;
    }
    const n = this.rastro.length;
    if (n < 2 || Math.hypot(c.x - this.rastro[n - 2]!, c.z - this.rastro[n - 1]!) >= 0.5) {
      this.rastro.push(c.x, c.z);
      if (this.rastro.length > (LARGO_FILA + 12) * 2 * 2) this.rastro.splice(0, 2);
    }
    this.fase += dt * 1.6;
    this.colocar();

    // El jugador: colarse por medio a velocidad, o pararse a ver pasar el paso.
    this.enfriamientoCruce = Math.max(0, this.enfriamientoCruce - dt);
    const paso = this.paso;
    const dPaso = Math.hypot(jugador.x - paso.x, jugador.z - paso.z);
    r.cercania = Math.max(0, 1 - dPaso / RADIO_MUSICA);
    if (jugador.enVehiculo && jugador.rapidez > 3 && this.enfriamientoCruce <= 0) {
      for (const m of this.miembros) {
        const radio = m.tipo === 'paso' ? 2.6 : 1.1;
        if ((m.x - jugador.x) ** 2 + (m.z - jugador.z) ** 2 < radio * radio) { r.cruzada = true; this.enfriamientoCruce = 3; break; }
      }
    }
    this.enfriamientoCaramelo = Math.max(0, this.enfriamientoCaramelo - dt);
    if (!jugador.enVehiculo && this.enfriamientoCaramelo <= 0) {
      for (const m of this.miembros) {
        if (m.tipo !== 'nazareno') continue;
        if ((m.x - jugador.x) ** 2 + (m.z - jugador.z) ** 2 < 1.7 * 1.7) { r.caramelo = true; this.enfriamientoCaramelo = CARAMELO_SEGUNDOS; break; }
      }
    }
    if (!this.respetoHecho && dPaso < RADIO_RESPETO && jugador.rapidez < 0.6) {
      this.tiempoParado += dt;
      if (this.tiempoParado >= RESPETO_SEGUNDOS) { this.respetoHecho = true; r.respeto = true; }
    } else this.tiempoParado = 0;
    return r;
  }

  /** Cada miembro a su distancia `d` por detrás de la cabeza, siguiendo el rastro. */
  private colocar(): void {
    const n = this.rastro.length / 2;
    if (n < 2) return;
    // Largos acumulados desde el final (la cabeza) hacia atrás.
    this.largos.length = n;
    this.largos[n - 1] = 0;
    for (let i = n - 2; i >= 0; i--) {
      this.largos[i] = this.largos[i + 1]! + Math.hypot(this.rastro[i * 2]! - this.rastro[i * 2 + 2]!, this.rastro[i * 2 + 1]! - this.rastro[i * 2 + 3]!);
    }
    let i = n - 1;
    for (const m of this.miembros) {
      while (i > 0 && this.largos[i]! < m.d) i--;
      // Entre i (más lejos) e i+1 (más cerca de la cabeza).
      const j = Math.min(n - 1, i + 1);
      const la = this.largos[i]!, lb = this.largos[j]!;
      const t = la === lb ? 0 : (la - m.d) / (la - lb);
      const ax = this.rastro[i * 2]!, az = this.rastro[i * 2 + 1]!, bx = this.rastro[j * 2]!, bz = this.rastro[j * 2 + 1]!;
      const x = ax + (bx - ax) * Math.max(0, Math.min(1, t)), z = az + (bz - az) * Math.max(0, Math.min(1, t));
      const rumbo = Math.atan2(bx - ax, -(bz - az));
      m.rumbo = rumbo;
      m.x = x + Math.cos(rumbo) * m.lado;
      m.z = z + Math.sin(rumbo) * m.lado;
    }
  }
}

const COLOR_TUNICA = '#4a2a6b';
const COLOR_BANDA = '#1f2a44';

/** El dibujo de la cofradía: nazarenos, banda (instancias), la cruz de guía y el paso (mallas). */
export class ProcesionVista {
  readonly grupo = new THREE.Group();
  private nazarenos: THREE.InstancedMesh;
  private banda: THREE.InstancedMesh;
  private cruz: THREE.Mesh;
  private paso: THREE.Group;
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private s = new THREE.Vector3(1, 1, 1);
  private eje = new THREE.Vector3(0, 1, 0);
  private ejeZ = new THREE.Vector3(0, 0, 1);

  constructor(private readonly logica: Procesion) {
    this.grupo.name = 'procesion';
    const cuantosNaz = logica.miembros.filter((x) => x.tipo === 'nazareno').length;
    const cuantosBanda = logica.miembros.filter((x) => x.tipo === 'banda').length;
    // Nazareno: túnica (cápsula) y capirote (cono alto) del mismo color; el cirio, un palo claro.
    const geoNaz = mergeGeometries([
      new THREE.CapsuleGeometry(0.28, 0.6, 3, 8).translate(0, 0.72, 0),
      new THREE.ConeGeometry(0.26, 1.1, 8).translate(0, 1.85, 0),
      new THREE.CylinderGeometry(0.03, 0.03, 1.1, 4).translate(0.35, 1.0, -0.1),
    ]);
    this.nazarenos = new THREE.InstancedMesh(geoNaz, new THREE.MeshLambertMaterial({ color: COLOR_TUNICA }), cuantosNaz);
    this.nazarenos.castShadow = true;
    this.nazarenos.frustumCulled = false;
    this.nazarenos.count = 0;
    // Músico: uniforme azul marino, cabeza y la gorra de plato con la visera.
    const geoBanda = mergeGeometries([
      new THREE.CapsuleGeometry(0.28, 0.6, 3, 8).translate(0, 0.72, 0),
      new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.42, 0),
      new THREE.CylinderGeometry(0.27, 0.27, 0.12, 8).translate(0, 1.64, 0),
      new THREE.BoxGeometry(0.34, 0.04, 0.2).translate(0, 1.58, -0.28),
      new THREE.CylinderGeometry(0.22, 0.22, 0.24, 8).rotateX(Math.PI / 2).translate(0.1, 0.95, -0.4),
    ]);
    this.banda = new THREE.InstancedMesh(geoBanda, new THREE.MeshLambertMaterial({ color: COLOR_BANDA }), cuantosBanda);
    this.banda.castShadow = true;
    this.banda.frustumCulled = false;
    this.banda.count = 0;
    // La cruz de guía: una cruz alta de madera con el que la lleva.
    this.cruz = new THREE.Mesh(mergeGeometries([
      new THREE.CapsuleGeometry(0.28, 0.6, 3, 8).translate(0, 0.72, 0),
      new THREE.BoxGeometry(0.08, 2.6, 0.08).translate(0.3, 1.6, 0),
      new THREE.BoxGeometry(0.9, 0.08, 0.08).translate(0.3, 2.4, 0),
    ]), new THREE.MeshLambertMaterial({ color: '#6b4423' }));
    this.cruz.castShadow = true;
    // El paso: la canastilla de caoba con el respiradero dorado, los candelabros con los cirios y la
    // imagen (una figura alta bajo el palio; el palio, un techo con las bambalinas).
    this.paso = new THREE.Group();
    const canastilla = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 4.4).translate(0, 1.3, 0), new THREE.MeshLambertMaterial({ color: '#5a341b' }));
    const respiradero = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 4.6).translate(0, 1.9, 0), new THREE.MeshLambertMaterial({ color: '#d8a83a' }));
    const faldon = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 4.3).translate(0, 0.45, 0), new THREE.MeshLambertMaterial({ color: '#3a1f12' }));
    const cirios: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) for (const lado of [-0.8, 0.8]) cirios.push(new THREE.CylinderGeometry(0.05, 0.05, 0.9 - i * 0.12, 5).translate(lado, 2.5 - i * 0.06, -1.7 + i * 0.5));
    const cera = new THREE.Mesh(mergeGeometries(cirios), new THREE.MeshLambertMaterial({ color: '#fff0c4', emissive: '#ffb347', emissiveIntensity: 0.5 }));
    const imagen = new THREE.Mesh(mergeGeometries([
      new THREE.CylinderGeometry(0.5, 0.65, 1.5, 8).translate(0, 2.8, 0.6),
      new THREE.SphereGeometry(0.22, 8, 6).translate(0, 3.75, 0.6),
      new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4).translate(0, 4.2, 0.6),
    ]), new THREE.MeshLambertMaterial({ color: '#e8d9b8' }));
    const corona = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 12).rotateX(Math.PI / 2).translate(0, 4.05, 0.6), new THREE.MeshLambertMaterial({ color: '#f2c14e', emissive: '#a07a1e', emissiveIntensity: 0.3 }));
    const varales: THREE.BufferGeometry[] = [];
    for (const x of [-1.1, 1.1]) for (const z of [-2.1, -0.7, 0.7, 2.1]) varales.push(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 5).translate(x, 3.5, z));
    const varal = new THREE.Mesh(mergeGeometries(varales), new THREE.MeshLambertMaterial({ color: '#d8a83a' }));
    // El techo de palio, granate, y las bambalinas bordadas en oro alrededor (desde arriba es lo que se ve del paso).
    const palio = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 4.7).translate(0, 5.1, 0), new THREE.MeshLambertMaterial({ color: '#6b1e2e' }));
    const bambalinas = new THREE.Mesh(mergeGeometries([
      new THREE.BoxGeometry(2.6, 0.45, 0.1).translate(0, 4.9, -2.35),
      new THREE.BoxGeometry(2.6, 0.45, 0.1).translate(0, 4.9, 2.35),
      new THREE.BoxGeometry(0.1, 0.45, 4.8).translate(-1.25, 4.9, 0),
      new THREE.BoxGeometry(0.1, 0.45, 4.8).translate(1.25, 4.9, 0),
      new THREE.BoxGeometry(2.7, 0.06, 4.9).translate(0, 5.16, 0),
    ]), new THREE.MeshLambertMaterial({ color: '#d8a83a', emissive: '#7a5a10', emissiveIntensity: 0.25 }));
    const gloria = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12).translate(0, 5.2, 0.3), new THREE.MeshLambertMaterial({ color: '#f5e6a3' }));
    this.paso.add(faldon, canastilla, respiradero, cera, imagen, corona, varal, palio, bambalinas, gloria);
    for (const o of this.paso.children) o.castShadow = true;
    this.paso.visible = false;
    this.cruz.visible = false;
    this.grupo.add(this.nazarenos, this.banda, this.cruz, this.paso);
  }

  actualizar(): void {
    const l = this.logica;
    this.grupo.visible = l.activa;
    if (!l.activa) return;
    let nNaz = 0, nBanda = 0;
    const paso = Math.sin(l.fase);
    for (const m of l.miembros) {
      if (m.tipo === 'paso') {
        this.paso.visible = true;
        this.paso.position.set(m.x, 0.05 + Math.abs(paso) * 0.06, m.z);
        this.paso.rotation.set(0, -m.rumbo, 0);
        this.paso.rotateZ(paso * 0.05); // la mecida
        continue;
      }
      if (m.tipo === 'cruz') {
        this.cruz.visible = true;
        this.cruz.position.set(m.x, 0, m.z);
        this.cruz.rotation.set(0, -m.rumbo, 0);
        continue;
      }
      this.p.set(m.x, Math.abs(Math.sin(l.fase * 4 + m.d)) * 0.03, m.z);
      this.q.setFromAxisAngle(this.eje, -m.rumbo);
      if (m.tipo === 'banda') { this.q2.setFromAxisAngle(this.ejeZ, Math.sin(l.fase * 4 + m.lado) * 0.04); this.q.multiply(this.q2); }
      this.s.setScalar(1.15);
      this.m.compose(this.p, this.q, this.s);
      if (m.tipo === 'nazareno') this.nazarenos.setMatrixAt(nNaz++, this.m);
      else this.banda.setMatrixAt(nBanda++, this.m);
    }
    this.nazarenos.count = nNaz; this.nazarenos.instanceMatrix.needsUpdate = true;
    this.banda.count = nBanda; this.banda.instanceMatrix.needsUpdate = true;
  }
}
