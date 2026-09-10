// La Local a pie: a partir de dos estrellas, agentes que te persiguen andando por los pasajes
// (donde el coche patrulla no entra). Van por el grafo peatonal hacia tu nodo más cercano, un
// poco más lentos que Wifly corriendo: escapas si no te paras. Si uno te tiene a mano un rato,
// trincao. Lógica pura testeable; lo visible está en la clase de abajo.
import * as THREE from 'three';
import type { GrafoBarrio } from '../mundo/grafo';
import { azar } from '../mundo/geometria';

export interface Agente {
  x: number;
  z: number;
  rumbo: number;
  /** Camino pendiente (nodos) hacia el jugador y avance sobre el primer tramo. */
  camino: number[];
  nodo: number;
  t: number;
  /** Segundos con el jugador a mano: al llegar a TIEMPO_TRINCAR, trincao. */
  encima: number;
  recalculo: number;
  fase: number;
}

export const VELOCIDAD_AGENTE = 4.6;
export const RADIO_TRINCAR = 1.3;
export const TIEMPO_TRINCAR = 0.9;
const RECALCULO = 1.2;

/** Crea un agente en un nodo peatonal a 35-80 m del jugador (o null si no hay). */
export function crearAgente(grafo: GrafoBarrio, jugador: { x: number; z: number }, rnd: () => number): Agente | null {
  // Solo nodos desde los que se llega andando hasta el jugador (misma componente peatonal).
  const alcanzables = grafo.alcanzables(grafo.masCercano(jugador.x, jugador.z, 'peatonal'), 'peatonal');
  const candidatos: number[] = [];
  for (const i of alcanzables) {
    const [x, z] = grafo.nodos[i]!;
    const d = Math.hypot(x - jugador.x, z - jugador.z);
    if (d >= 35 && d <= 80) candidatos.push(i);
  }
  if (!candidatos.length) return null;
  const nodo = candidatos[Math.floor(rnd() * candidatos.length)]!;
  const [x, z] = grafo.nodos[nodo]!;
  return { x, z, rumbo: 0, camino: [], nodo, t: 0, encima: 0, recalculo: 0, fase: 0 };
}

/** Un paso de un agente. Devuelve 'trinca' si te ha echado el guante. */
export function pasoAgente(a: Agente, grafo: GrafoBarrio, jugador: { x: number; z: number }, dt: number): 'trinca' | null {
  const dx = jugador.x - a.x, dz = jugador.z - a.z;
  const d = Math.hypot(dx, dz);
  a.fase += dt * 9;
  if (d < RADIO_TRINCAR) {
    a.encima += dt;
    a.rumbo = Math.atan2(dx, -dz);
    return a.encima >= TIEMPO_TRINCAR ? 'trinca' : null;
  }
  a.encima = Math.max(0, a.encima - dt * 0.5);
  // Cerca y a la vista: va a por ti en línea recta; si no, por el grafo.
  if (d < 12) {
    a.rumbo = Math.atan2(dx / d, -dz / d);
    a.x += Math.sin(a.rumbo) * VELOCIDAD_AGENTE * dt;
    a.z += -Math.cos(a.rumbo) * VELOCIDAD_AGENTE * dt;
    a.nodo = grafo.masCercano(a.x, a.z, 'peatonal');
    a.camino = [];
    a.t = 0;
    return null;
  }
  a.recalculo -= dt;
  if (a.recalculo <= 0 || !a.camino.length) {
    // El camino empieza siempre por el nodo al que ya se dirige: sin zigzag entre recálculos.
    a.recalculo = RECALCULO;
    const desde = a.camino[0] ?? a.nodo;
    const destino = grafo.masCercano(jugador.x, jugador.z, 'peatonal');
    const camino = grafo.camino(desde, destino, 'peatonal');
    a.camino = camino.length ? camino : [desde];
    a.t = 0;
  }
  const siguiente = a.camino[0];
  if (siguiente === undefined) {
    // Sin camino (no debería pasar): a campo través, despacio.
    a.rumbo = Math.atan2(dx / d, -dz / d);
    a.x += Math.sin(a.rumbo) * VELOCIDAD_AGENTE * 0.6 * dt;
    a.z += -Math.cos(a.rumbo) * VELOCIDAD_AGENTE * 0.6 * dt;
    return null;
  }
  const [sx, sz] = grafo.nodos[siguiente] ?? [a.x, a.z];
  const ex = sx - a.x, ez = sz - a.z;
  const l = Math.hypot(ex, ez);
  if (l < 0.3) { a.nodo = siguiente; a.camino.shift(); return null; }
  const paso = Math.min(l, VELOCIDAD_AGENTE * dt);
  a.rumbo = Math.atan2(ex / l, -ez / l);
  a.x += (ex / l) * paso;
  a.z += (ez / l) * paso;
  return null;
}

export class Agentes {
  readonly grupo = new THREE.Group();
  readonly lista: Agente[] = [];
  private mallas: { grupo: THREE.Group; piernaIz: THREE.Mesh; piernaDe: THREE.Mesh }[] = [];
  private rnd = azar(9090);

  constructor(private readonly grafo: GrafoBarrio, maximo = 3) {
    this.grupo.name = 'agentes';
    const azul = new THREE.MeshLambertMaterial({ color: '#1f3a8a' });
    const piel = new THREE.MeshLambertMaterial({ color: '#e0ac8b' });
    const negro = new THREE.MeshLambertMaterial({ color: '#2b2b2f' });
    const chaleco = new THREE.MeshLambertMaterial({ color: '#f2e94e', emissive: '#6b6520' });
    for (let i = 0; i < maximo; i++) {
      const g = new THREE.Group();
      const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 3, 8), azul);
      tronco.position.set(0, 0.95, 0);
      const banda = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), chaleco);
      banda.position.set(0, 1.0, 0);
      const piernaIz = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.14), azul);
      piernaIz.position.set(-0.12, 0.62, 0);
      const piernaDe = piernaIz.clone();
      piernaDe.position.x = 0.12;
      const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), piel);
      cabeza.position.set(0, 1.36, 0);
      const gorra = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10), negro);
      gorra.position.set(0, 1.47, 0);
      const visera = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.18), negro);
      visera.position.set(0, 1.44, -0.18);
      g.add(tronco, banda, piernaIz, piernaDe, cabeza, gorra, visera);
      g.scale.setScalar(1.6);
      g.visible = false;
      g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
      this.grupo.add(g);
      this.mallas.push({ grupo: g, piernaIz, piernaDe });
    }
  }

  get maximo(): number {
    return this.mallas.length;
  }

  aparecer(jugador: { x: number; z: number }): boolean {
    if (this.lista.length >= this.mallas.length) return false;
    const a = crearAgente(this.grafo, jugador, this.rnd);
    if (!a) return false;
    this.lista.push(a);
    return true;
  }

  retirarTodos(): void {
    this.lista.length = 0;
    for (const m of this.mallas) m.grupo.visible = false;
  }

  /** Quita el más lejano al jugador. */
  retirarLejano(jugador: { x: number; z: number }): void {
    if (!this.lista.length) return;
    let peor = 0, peorD = -1;
    this.lista.forEach((a, i) => { const d = (a.x - jugador.x) ** 2 + (a.z - jugador.z) ** 2; if (d > peorD) { peorD = d; peor = i; } });
    this.lista.splice(peor, 1);
  }

  /** Devuelve true si alguno te ha trincado. */
  actualizar(jugador: { x: number; z: number }, dt: number): boolean {
    let trinca = false;
    for (const a of this.lista) if (pasoAgente(a, this.grafo, jugador, dt) === 'trinca') trinca = true;
    this.mallas.forEach((m, i) => {
      const a = this.lista[i];
      m.grupo.visible = !!a;
      if (!a) return;
      m.grupo.position.set(a.x, 0, a.z);
      m.grupo.rotation.y = -a.rumbo;
      const paso = Math.sin(a.fase) * 0.6;
      m.piernaIz.rotation.x = paso;
      m.piernaDe.rotation.x = -paso;
    });
    return trinca;
  }
}
