// Las palomas de las plazas: bandadas picoteando en las zonas verdes y delante del Mercado. Al
// pasar cerca despegan todas a la vez (aleteo), dan una vuelta por el aire y vuelven a posarse
// donde estaban. Lógica pura testeable; el dibujo es una malla instanciada por color.
import * as THREE from 'three';
import type { Nivel, Zona } from './tipos';
import type { GrafoBarrio } from './grafo';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PALOMAS_POR_BANDADA = 9;
export const BANDADAS_MAXIMAS = 6;
/** A menos de esto, con algo de velocidad, la bandada despega. */
export const RADIO_ESPANTO = 6.5;
export const PREMIO_BANDADA = 3;
const COLORES_PALOMA = ['#8d8d96', '#5a5a63', '#e6e6ea', '#a3877a'];

export interface Paloma {
  x: number;
  y: number;
  z: number;
  rumbo: number;
  /** Punto donde picotea (alrededor de la casa de la bandada). */
  meta: { x: number; z: number };
  fase: number;
  color: number;
}

export interface Bandada {
  casa: { x: number; z: number };
  palomas: Paloma[];
  estado: 'suelo' | 'vuelo' | 'vuelta';
  tiempo: number;
  /** Sentido del giro en el aire. */
  giro: number;
}

/** Centroide y área (con signo) de un polígono. */
function centroide(p: [number, number][]): { area: number; x: number; z: number } {
  let area = 0, cx = 0, cz = 0;
  for (let i = 0; i < p.length; i++) {
    const [ax, az] = p[i]!, [bx, bz] = p[(i + 1) % p.length]!;
    const c = ax * bz - bx * az;
    area += c; cx += (ax + bx) * c; cz += (az + bz) * c;
  }
  area /= 2;
  if (Math.abs(area) < 1e-6) return { area: 0, x: 0, z: 0 };
  return { area: Math.abs(area), x: cx / (6 * area), z: cz / (6 * area) };
}

/** Dónde hay palomas: las zonas verdes y plazas más grandes y la puerta del mercado (si hay), como mucho BANDADAS_MAXIMAS. */
export function elegirBandadas(nivel: Pick<Nivel, 'zonas' | 'edificios'>, grafo: GrafoBarrio): { x: number; z: number }[] {
  const sitios: { x: number; z: number; peso: number }[] = [];
  const mercado = nivel.edificios.find((e) => e.tipo === 'mercado');
  if (mercado) {
    const c = centroide(mercado.poligono);
    const nodo = grafo.masCercano(c.x, c.z, 'peatonal');
    if (nodo >= 0) { const [x, z] = grafo.nodos[nodo]!; if (Math.hypot(x - c.x, z - c.z) < 60) sitios.push({ x, z, peso: 1e9 }); }
  }
  const verdes = (nivel.zonas as Zona[]).filter((z) => z.clase === 'park' || z.clase === 'garden' || z.clase === 'pitch' || z.clase === 'grass' || z.clase === 'square' || z.clase === 'pedestrian');
  for (const zona of verdes) {
    const c = centroide(zona.poligono);
    if (c.area < 150) continue;
    sitios.push({ x: c.x, z: c.z, peso: c.area });
  }
  sitios.sort((a, b) => b.peso - a.peso);
  const elegidos: { x: number; z: number }[] = [];
  for (const s of sitios) {
    if (elegidos.length >= BANDADAS_MAXIMAS) break;
    if (elegidos.some((e) => Math.hypot(e.x - s.x, e.z - s.z) < 40)) continue;
    elegidos.push({ x: s.x, z: s.z });
  }
  return elegidos;
}

export function crearBandada(casa: { x: number; z: number }, rnd: () => number): Bandada {
  const palomas: Paloma[] = [];
  for (let i = 0; i < PALOMAS_POR_BANDADA; i++) {
    const a = rnd() * Math.PI * 2, r = 0.6 + rnd() * 2.6;
    palomas.push({ x: casa.x + Math.sin(a) * r, y: 0, z: casa.z + Math.cos(a) * r, rumbo: rnd() * Math.PI * 2, meta: { x: casa.x + Math.sin(a) * r, z: casa.z + Math.cos(a) * r }, fase: rnd() * 6, color: Math.floor(rnd() * COLORES_PALOMA.length) });
  }
  return { casa, palomas, estado: 'suelo', tiempo: 0, giro: rnd() < 0.5 ? 1 : -1 };
}

/** Un paso de una bandada. Devuelve true si acaba de despegar. */
export function pasoBandada(b: Bandada, jugador: { x: number; z: number; rapidez: number }, dt: number, rnd: () => number): boolean {
  b.tiempo -= dt;
  const dx = jugador.x - b.casa.x, dz = jugador.z - b.casa.z;
  const d2 = dx * dx + dz * dz;
  let despega = false;
  if (b.estado === 'suelo') {
    const susto = d2 < RADIO_ESPANTO * RADIO_ESPANTO && jugador.rapidez > 1.5;
    if (susto) {
      b.estado = 'vuelo';
      b.tiempo = 3.5 + rnd() * 2;
      despega = true;
      const d = Math.sqrt(d2) || 1;
      for (const p of b.palomas) {
        // Cada una sale hacia fuera del jugador, con su abanico.
        p.rumbo = Math.atan2(-dx / d, dz / d) + (rnd() - 0.5) * 1.4;
      }
    } else {
      // Picotean: pasitos hacia su meta, y de vez en cuando una meta nueva.
      for (const p of b.palomas) {
        p.fase += dt * 3;
        const ex = p.meta.x - p.x, ez = p.meta.z - p.z;
        const dist = Math.hypot(ex, ez);
        if (dist < 0.1) {
          if (rnd() < dt * 0.4) { const a = rnd() * Math.PI * 2, r = 0.5 + rnd() * 2.8; p.meta = { x: b.casa.x + Math.sin(a) * r, z: b.casa.z + Math.cos(a) * r }; }
        } else {
          p.rumbo = Math.atan2(ex, -ez);
          const paso = Math.min(dist, 0.45 * dt);
          p.x += Math.sin(p.rumbo) * paso; p.z -= Math.cos(p.rumbo) * paso;
        }
      }
    }
    return despega;
  }
  if (b.estado === 'vuelo') {
    for (const p of b.palomas) {
      p.fase += dt * 18;
      p.rumbo += b.giro * dt * 0.9;
      const v = 7;
      p.x += Math.sin(p.rumbo) * v * dt; p.z -= Math.cos(p.rumbo) * v * dt;
      p.y = Math.min(9, p.y + 5 * dt);
    }
    if (b.tiempo <= 0) { b.estado = 'vuelta'; b.tiempo = 12; }
    return false;
  }
  // Vuelta: cada una hacia su meta bajando; la bandada se posa cuando todas han llegado (o se acaba el tiempo).
  let posadas = 0;
  for (const p of b.palomas) {
    p.fase += dt * 14;
    const ex = p.meta.x - p.x, ez = p.meta.z - p.z;
    const dist = Math.hypot(ex, ez);
    if (dist < 0.3 && p.y < 0.05) { p.y = 0; posadas++; continue; }
    const objetivo = Math.atan2(ex, -ez);
    let dif = objetivo - p.rumbo;
    while (dif > Math.PI) dif -= Math.PI * 2;
    while (dif < -Math.PI) dif += Math.PI * 2;
    p.rumbo += dif * Math.min(1, dt * 3);
    const v = Math.min(6, 1.5 + dist);
    const paso = Math.min(dist, v * dt);
    p.x += Math.sin(p.rumbo) * paso; p.z -= Math.cos(p.rumbo) * paso;
    p.y = Math.max(0, p.y - Math.max(1.5, p.y / Math.max(0.3, dist / v)) * dt);
  }
  if (posadas === b.palomas.length || b.tiempo <= 0) {
    b.estado = 'suelo';
    b.tiempo = 1.5;
    for (const p of b.palomas) { p.y = 0; p.x = p.meta.x; p.z = p.meta.z; }
  }
  return false;
}

export class Palomas {
  readonly grupo = new THREE.Group();
  readonly lista: Bandada[] = [];
  private mallas: THREE.InstancedMesh[] = [];
  private rnd = azar(2718);
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private s = new THREE.Vector3(1, 1, 1);
  private eje = new THREE.Vector3(0, 1, 0);
  private ejeZ = new THREE.Vector3(0, 0, 1);

  constructor(sitios: { x: number; z: number }[]) {
    this.grupo.name = 'palomas';
    for (const s of sitios) this.lista.push(crearBandada(s, this.rnd));
    if (!this.lista.length) return;
    // Paloma de juguete: cuerpo ovalado, cabeza, alas planas y la cola.
    const geo = mergeGeometries([
      new THREE.SphereGeometry(0.13, 6, 5).scale(1, 0.8, 1.5).translate(0, 0.14, 0),
      new THREE.SphereGeometry(0.07, 6, 5).translate(0, 0.25, -0.17),
      new THREE.BoxGeometry(0.62, 0.02, 0.2).translate(0, 0.18, 0.02),
      new THREE.BoxGeometry(0.12, 0.02, 0.16).translate(0, 0.16, 0.24),
    ]).scale(1.6, 1.6, 1.6); // de juguete: desde arriba, a tamaño real no se ven
    const total = this.lista.length * PALOMAS_POR_BANDADA;
    for (const c of COLORES_PALOMA) {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: c }), total);
      im.count = 0;
      im.frustumCulled = false;
      this.mallas.push(im);
      this.grupo.add(im);
    }
  }

  /** Mueve las bandadas y las dibuja. Devuelve cuántas han despegado este frame. */
  /** `asustadores`: los perros; uno a menos de 4 m de la bandada la espanta igual que la moto. */
  actualizar(jugador: { x: number; z: number; rapidez: number }, dt: number, asustadores: { x: number; z: number }[] = []): { despegues: number } {
    let despegues = 0;
    const cuentas = this.mallas.map(() => 0);
    for (const b of this.lista) {
      const perro = b.estado === 'suelo' ? asustadores.find((a) => (a.x - b.casa.x) ** 2 + (a.z - b.casa.z) ** 2 < 16) : undefined;
      if (pasoBandada(b, perro ? { x: perro.x, z: perro.z, rapidez: 5 } : jugador, dt, this.rnd)) despegues++;
      if ((b.casa.x - jugador.x) ** 2 + (b.casa.z - jugador.z) ** 2 > 120 * 120) continue;
      for (const p of b.palomas) {
        this.p.set(p.x, p.y, p.z);
        this.q.setFromAxisAngle(this.eje, -p.rumbo);
        if (b.estado !== 'suelo') {
          // Aleteo: la paloma se balancea sobre su eje y las alas "baten" estirando la anchura.
          this.q2.setFromAxisAngle(this.ejeZ, Math.sin(p.fase) * 0.35);
          this.q.multiply(this.q2);
          this.s.set(0.75 + Math.abs(Math.cos(p.fase)) * 0.45, 1, 1);
        } else this.s.set(1, 1, 1);
        this.m.compose(this.p, this.q, this.s);
        this.mallas[p.color]!.setMatrixAt(cuentas[p.color]!++, this.m);
      }
    }
    this.mallas.forEach((im, i) => { im.count = cuentas[i]!; im.instanceMatrix.needsUpdate = true; });
    return { despegues };
  }
}
