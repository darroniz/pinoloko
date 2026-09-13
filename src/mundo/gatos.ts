// Los gatos del barrio: sentados en el techo de los coches aparcados y en los bancos, con la
// cola moviéndose. Al acercarte saltan, salen corriendo y, cuando te vas, vuelven a su sitio de
// un brinco. Si el coche en el que estaban arranca, saltan también. Lógica pura testeable.
import * as THREE from 'three';
import type { Coche } from '../fisica/coche';
import { ALTO } from '../fisica/coche';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const GATOS_MAXIMOS = 14;
export const RADIO_SUSTO = 4.5;
const COLORES_GATO = ['#3a3a3f', '#d98a3a', '#e9e4d8'];

export interface Gato {
  x: number;
  y: number;
  z: number;
  rumbo: number;
  estado: 'sentado' | 'huyendo' | 'vuelta';
  tiempo: number;
  fase: number;
  color: number;
  /** Su sitio: un punto fijo (banco) o el techo de un coche aparcado (se mueve con él). */
  casa: { x: number; z: number; y: number };
  coche: Coche | null;
}

export function crearGato(casa: { x: number; z: number; y: number }, coche: Coche | null, rnd: () => number): Gato {
  return { x: casa.x, y: casa.y, z: casa.z, rumbo: rnd() * Math.PI * 2, estado: 'sentado', tiempo: 0, fase: rnd() * 6, color: Math.floor(rnd() * COLORES_GATO.length), casa, coche };
}

/** Un paso de un gato. Devuelve true si acaba de asustarse (maullido). */
export function pasoGato(g: Gato, jugador: { x: number; z: number; rapidez: number }, dt: number, rnd: () => number): boolean {
  g.fase += dt * 4;
  g.tiempo -= dt;
  // El sitio se mueve si es un coche.
  if (g.coche) { g.casa.x = g.coche.estado.x; g.casa.z = g.coche.estado.z; }
  const dx = jugador.x - g.x, dz = jugador.z - g.z;
  const d2 = dx * dx + dz * dz;
  if (g.estado === 'sentado') {
    g.x = g.casa.x; g.z = g.casa.z; g.y = g.casa.y;
    const cocheEnMarcha = !!g.coche && Math.abs(g.coche.estado.velocidad) > 0.8;
    if ((d2 < RADIO_SUSTO * RADIO_SUSTO && jugador.rapidez > 0.8) || d2 < 4 || cocheEnMarcha) {
      g.estado = 'huyendo';
      g.tiempo = 1.4 + rnd() * 1.2;
      const d = Math.sqrt(d2) || 1;
      g.rumbo = Math.atan2(-dx / d, dz / d) + (rnd() - 0.5) * 0.8;
      return true;
    }
    return false;
  }
  if (g.estado === 'huyendo') {
    g.y = Math.max(0, g.y - 6 * dt);
    g.x += Math.sin(g.rumbo) * 6.5 * dt;
    g.z -= Math.cos(g.rumbo) * 6.5 * dt;
    g.fase += dt * 10;
    if (g.tiempo <= 0) { g.estado = 'vuelta'; g.tiempo = 20; }
    return false;
  }
  // Vuelta: anda a su sitio cuando el jugador no está encima; al llegar, salta arriba.
  if (d2 < RADIO_SUSTO * RADIO_SUSTO && jugador.rapidez > 0.8) { g.estado = 'huyendo'; g.tiempo = 1 + rnd(); const d = Math.sqrt(d2) || 1; g.rumbo = Math.atan2(-dx / d, dz / d); return false; }
  const ex = g.casa.x - g.x, ez = g.casa.z - g.z;
  const dist = Math.hypot(ex, ez);
  if (dist < 0.4 || g.tiempo <= 0) { g.estado = 'sentado'; g.x = g.casa.x; g.z = g.casa.z; g.y = g.casa.y; return false; }
  g.rumbo = Math.atan2(ex, -ez);
  const paso = Math.min(dist, 2.2 * dt);
  g.x += Math.sin(g.rumbo) * paso; g.z -= Math.cos(g.rumbo) * paso;
  g.fase += dt * 5;
  return false;
}

export class Gatos {
  readonly grupo = new THREE.Group();
  readonly lista: Gato[] = [];
  private mallas: THREE.InstancedMesh[] = [];
  private rnd = azar(9090);
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3(1.4, 1.4, 1.4);
  private eje = new THREE.Vector3(0, 1, 0);

  constructor(coches: Coche[], bancos: { x: number; z: number }[]) {
    this.grupo.name = 'gatos';
    // Uno de cada tres coches aparcados y uno de cada dos bancos, hasta el máximo.
    coches.forEach((c, i) => { if (i % 3 === 0 && this.lista.length < GATOS_MAXIMOS) this.lista.push(crearGato({ x: c.estado.x, z: c.estado.z, y: ALTO }, c, this.rnd)); });
    bancos.forEach((b, i) => { if (i % 2 === 0 && this.lista.length < GATOS_MAXIMOS) this.lista.push(crearGato({ x: b.x, z: b.z, y: 0.5 }, null, this.rnd)); });
    if (!this.lista.length) return;
    // Gato de juguete: cuerpo, cabeza con orejas y la cola levantada.
    const geo = mergeGeometries([
      new THREE.BoxGeometry(0.22, 0.2, 0.5).translate(0, 0.16, 0),
      new THREE.SphereGeometry(0.13, 6, 5).translate(0, 0.3, -0.28),
      new THREE.ConeGeometry(0.04, 0.1, 4).translate(-0.07, 0.42, -0.28),
      new THREE.ConeGeometry(0.04, 0.1, 4).translate(0.07, 0.42, -0.28),
      new THREE.CylinderGeometry(0.025, 0.02, 0.36, 4).rotateX(-0.5).translate(0, 0.32, 0.3),
    ]);
    for (const c of COLORES_GATO) {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: c }), this.lista.length);
      im.count = 0;
      im.castShadow = true;
      im.frustumCulled = false;
      this.mallas.push(im);
      this.grupo.add(im);
    }
  }

  actualizar(jugador: { x: number; z: number; rapidez: number }, dt: number): { sustos: number } {
    let sustos = 0;
    const cuentas = this.mallas.map(() => 0);
    for (const g of this.lista) {
      if (pasoGato(g, jugador, dt, this.rnd)) sustos++;
      if ((g.x - jugador.x) ** 2 + (g.z - jugador.z) ** 2 > 110 * 110) continue;
      this.p.set(g.x, g.y + (g.estado === 'huyendo' ? Math.abs(Math.sin(g.fase)) * 0.15 : 0), g.z);
      // Sentado, la cola (y el cuerpo entero, que es una malla) se balancea un pelín.
      this.q.setFromAxisAngle(this.eje, -g.rumbo + (g.estado === 'sentado' ? Math.sin(g.fase) * 0.08 : 0));
      this.m.compose(this.p, this.q, this.s);
      this.mallas[g.color]!.setMatrixAt(cuentas[g.color]!++, this.m);
    }
    this.mallas.forEach((im, i) => { im.count = cuentas[i]!; im.instanceMatrix.needsUpdate = true; });
    return { sustos };
  }
}
