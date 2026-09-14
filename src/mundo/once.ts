// El vendedor de la ONCE: "¡Para hoy, para hoy!" en la puerta del Mercado. A pie y con E le
// compras un cupón (5 €, cinco cifras al azar, tres por sorteo como mucho) y a las nueve y cuarto
// de la noche se sortea: el número del día sale de la fecha y del número de sorteo, así que es el
// mismo para todo el mundo. Lógica pura testeable; el vendedor se dibuja aparte.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import type { Nivel } from './tipos';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PRECIO_CUPON = 5;
export const CUPONES_POR_SORTEO = 3;
export const HORA_SORTEO = 21.25;
export const RADIO_COMPRA = 2.6;
/** Premios por cifras finales acertadas (1, 2, 3) y el gordo (las cinco). */
export const PREMIOS = { una: 10, dos: 40, tres: 200, gordo: 3000 };

export const PREGONES = ['¡Para hoy, para hoy!', '¡Llevo el de la suerte, niño!', '¡El gordo lo tengo yo!', '¡Cupón para hoy, que se acaban!', '¡Wifly, que hoy toca!'];

export interface Vendedor { x: number; z: number; rumbo: number }

/** El vendedor: el nodo peatonal a entre 14 y 45 m de la parada de arranque que más cerca esté de 25. */
export function elegirVendedor(nivel: Pick<Nivel, 'grafo'>, grafo: GrafoBarrio, arranque: { x: number; z: number }): Vendedor | null {
  void nivel;
  let mejor = -1, mejorD = Infinity;
  for (let i = 0; i < grafo.nodos.length; i++) {
    if (!grafo.vecinos(i, 'peatonal').length) continue;
    const [x, z] = grafo.nodos[i]!;
    const d = Math.hypot(x - arranque.x, z - arranque.z);
    if (d < 14 || d > 45) continue;
    if (Math.abs(d - 25) < mejorD) { mejorD = Math.abs(d - 25); mejor = i; }
  }
  if (mejor < 0) return null;
  const [x, z] = grafo.nodos[mejor]!;
  // Un poco apartado del nodo (que no esté en medio del paso) y mirando a la parada.
  const rumbo = Math.atan2(arranque.x - x, -(arranque.z - z));
  return { x: x + Math.cos(rumbo) * 1.6, z: z + Math.sin(rumbo) * 1.6, rumbo };
}

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

/** El número premiado de un sorteo: cinco cifras a partir de la fecha y el número de sorteo. */
export function numeroPremiado(claveDia: string, sorteo: number): number {
  return hash(`${claveDia}:${sorteo}`) % 100000;
}

/** Lo que paga un cupón contra el número premiado (cifras finales que coinciden). */
export function premio(cupon: number, premiado: number): number {
  if (cupon === premiado) return PREMIOS.gordo;
  if (cupon % 1000 === premiado % 1000) return PREMIOS.tres;
  if (cupon % 100 === premiado % 100) return PREMIOS.dos;
  if (cupon % 10 === premiado % 10) return PREMIOS.una;
  return 0;
}

export function formatear(n: number): string { return String(n).padStart(5, '0'); }

export class Once {
  /** Cupones comprados para el próximo sorteo. */
  readonly cupones: number[] = [];
  /** Sorteos hechos (entra en la semilla del número). */
  sorteos = 0;
  private horaPrevia = -1;
  private tiempoPregon = 6;

  constructor(readonly vendedor: Vendedor | null, private readonly rnd: () => number = azar(1938)) {}

  /** ¿Se puede comprar ahora desde (x, z) a pie? */
  cerca(x: number, z: number): boolean {
    return !!this.vendedor && (this.vendedor.x - x) ** 2 + (this.vendedor.z - z) ** 2 < RADIO_COMPRA * RADIO_COMPRA;
  }

  /** Compra un cupón; devuelve el número o null si no toca (sin vendedor, lejos o ya llevas tres). */
  comprar(): number | null {
    if (this.cupones.length >= CUPONES_POR_SORTEO) return null;
    const n = Math.floor(this.rnd() * 100000);
    this.cupones.push(n);
    return n;
  }

  /**
   * Un tick. `claveDia` es la fecha real (la semilla del sorteo). Devuelve el sorteo si acaba de
   * hacerse (a las nueve y cuarto, aunque no lleves cupones) y el pregón si el vendedor te ve.
   */
  actualizar(hora: number, dt: number, claveDia: string, jugador: { x: number; z: number }): { sorteo: { premiado: number; premios: { cupon: number; euros: number }[] } | null; pregon: string | null } {
    const r: { sorteo: { premiado: number; premios: { cupon: number; euros: number }[] } | null; pregon: string | null } = { sorteo: null, pregon: null };
    if (!this.vendedor) return r;
    const cruza = this.horaPrevia >= 0 && this.horaPrevia < HORA_SORTEO && hora >= HORA_SORTEO && hora - this.horaPrevia < 1;
    this.horaPrevia = hora;
    if (cruza) r.sorteo = this.sortear(claveDia);
    this.tiempoPregon -= dt;
    if (this.tiempoPregon <= 0 && (this.vendedor.x - jugador.x) ** 2 + (this.vendedor.z - jugador.z) ** 2 < 20 * 20) {
      this.tiempoPregon = 12;
      r.pregon = PREGONES[Math.floor(this.rnd() * PREGONES.length)]!;
    }
    return r;
  }

  /** El sorteo, ahora mismo. */
  sortear(claveDia: string): { premiado: number; premios: { cupon: number; euros: number }[] } {
    const premiado = numeroPremiado(claveDia, this.sorteos++);
    const premios = this.cupones.map((cupon) => ({ cupon, euros: premio(cupon, premiado) }));
    this.cupones.length = 0;
    return { premiado, premios };
  }
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

/** El vendedor dibujado: chaleco verde, gorra y el tablero de cupones colgado del cuello. Una sola malla
 *  con los colores en los vértices (y el brazo aparte, que saluda), sin sombra: dos draw calls y no doce. */
export class VendedorVista {
  readonly grupo = new THREE.Group();
  private tiempo = 0;
  private brazo: THREE.Mesh | null = null;

  constructor(vendedor: Vendedor | null) {
    this.grupo.name = 'once';
    if (!vendedor) return;
    const cuerpo = new THREE.Mesh(mergeGeometries([
      pintar(new THREE.CapsuleGeometry(0.28, 0.6, 3, 8).translate(0, 0.72, 0), '#1b9e4b'),
      pintar(new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.42, 0), '#e0ac8b'),
      pintar(new THREE.CylinderGeometry(0.25, 0.26, 0.1, 8).translate(0, 1.62, 0), '#0f5f2e'),
      pintar(new THREE.BoxGeometry(0.7, 0.5, 0.06).translate(0, 0.95, -0.36), '#f7f3ea'),
      pintar(new THREE.BoxGeometry(0.72, 0.12, 0.07).translate(0, 1.1, -0.36), '#1b9e4b'),
    ]), new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.brazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.55, 2, 6).translate(0, 0.3, 0), new THREE.MeshLambertMaterial({ color: '#e0ac8b' }));
    this.brazo.position.set(0.34, 1.05, 0);
    this.brazo.rotation.z = -0.9;
    this.grupo.add(cuerpo, this.brazo);
    this.grupo.scale.setScalar(1.15);
    this.grupo.position.set(vendedor.x, 0, vendedor.z);
    this.grupo.rotation.y = -vendedor.rumbo;
  }

  actualizar(dt: number): void {
    this.tiempo += dt;
    if (this.brazo) this.brazo.rotation.z = -0.9 + Math.sin(this.tiempo * 3) * 0.25;
  }
}
