// Semáforos: los nodos `traffic_signals` de OSM agrupados por cruce. Cada cruce tiene dos
// ejes (el de la calle del primer semáforo y su perpendicular) que se turnan el verde.
// Lógica pura (estado por tiempo y rumbo) testeable sin Three; las mallas van aparte.
import * as THREE from 'three';
import type { Nivel, Punto } from './tipos';
import { distanciaSegmento2 } from './geometria';

export type Luz = 'verde' | 'ambar' | 'rojo';

export interface Cruce {
  x: number;
  z: number;
  /** Rumbo del eje 0 (dirección de la calle del primer semáforo del grupo). */
  eje: number;
  /** Desfase del ciclo, para que no cambien todos a la vez. */
  desfase: number;
  semaforos: { x: number; z: number; rumbo: number }[];
}

/** Verde 9 s, ámbar 2 s, luego el otro eje: ciclo de 22 s. */
export const VERDE = 9, AMBAR = 2, CICLO = 2 * (VERDE + AMBAR);
const RADIO_CRUCE = 32;
const COLOR_LUZ: Record<Luz, string> = { verde: '#3fd36b', ambar: '#ffb020', rojo: '#ff3b30' };

/** Rumbo de la calle rodada más cercana a un punto (0 = norte, como el resto del juego). */
function rumboCalle(nivel: Pick<Nivel, 'vias'>, x: number, z: number): number {
  let mejor = { d: Infinity, rumbo: 0 };
  for (const via of nivel.vias) {
    if (via.clase !== 'rodada') continue;
    for (let i = 0; i + 1 < via.puntos.length; i++) {
      const [ax, az] = via.puntos[i]!;
      const [bx, bz] = via.puntos[i + 1]!;
      const { d2 } = distanciaSegmento2(x, z, ax, az, bx, bz);
      if (d2 < mejor.d) mejor = { d: d2, rumbo: Math.atan2(bx - ax, -(bz - az)) };
    }
  }
  return mejor.rumbo;
}

/** Agrupa los semáforos por cercanía en cruces. */
export function agruparCruces(nivel: Pick<Nivel, 'vias'>, puntos: Punto[]): Cruce[] {
  const cruces: Cruce[] = [];
  for (const [x, z] of puntos) {
    const rumbo = rumboCalle(nivel, x, z);
    const cruce = cruces.find((c) => Math.hypot(c.x - x, c.z - z) < RADIO_CRUCE);
    if (cruce) {
      cruce.semaforos.push({ x, z, rumbo });
      const n = cruce.semaforos.length;
      cruce.x += (x - cruce.x) / n;
      cruce.z += (z - cruce.z) / n;
    } else cruces.push({ x, z, eje: rumbo, desfase: (cruces.length * 7) % CICLO, semaforos: [{ x, z, rumbo }] });
  }
  return cruces;
}

/** ¿El rumbo va por el eje 0 del cruce (o su contrario) o por el perpendicular? */
export function ejeDe(cruce: Cruce, rumbo: number): 0 | 1 {
  return Math.abs(Math.cos(rumbo - cruce.eje)) >= Math.SQRT1_2 ? 0 : 1;
}

/** Luz que ve quien llega al cruce con ese rumbo en el instante `t`. */
export function luz(cruce: Cruce, t: number, rumbo: number): Luz {
  const fase = ((t + cruce.desfase) % CICLO + CICLO) % CICLO;
  const enEje0 = fase < VERDE + AMBAR;
  const propio = ejeDe(cruce, rumbo) === (enEje0 ? 0 : 1);
  if (!propio) return 'rojo';
  const dentro = enEje0 ? fase : fase - (VERDE + AMBAR);
  return dentro < VERDE ? 'verde' : 'ambar';
}

export class Semaforos {
  readonly grupo = new THREE.Group();
  readonly cruces: Cruce[];
  tiempo = 0;
  private cabezas: { material: THREE.MeshBasicMaterial; cruce: Cruce; rumbo: number }[] = [];
  private colores: Record<Luz, THREE.Color> = { verde: new THREE.Color(COLOR_LUZ.verde), ambar: new THREE.Color(COLOR_LUZ.ambar), rojo: new THREE.Color(COLOR_LUZ.rojo) };

  constructor(nivel: Pick<Nivel, 'vias' | 'semaforos'>) {
    this.cruces = agruparCruces(nivel, nivel.semaforos ?? []);
    if (!this.cruces.length) return;
    const poste = new THREE.CylinderGeometry(0.09, 0.11, 3.4, 6).translate(0, 1.7, 0);
    const brazo = new THREE.BoxGeometry(0.12, 0.12, 1.4).translate(0, 3.3, -0.6);
    const materialPoste = new THREE.MeshLambertMaterial({ color: '#4a4f55' });
    const cabeza = new THREE.BoxGeometry(0.5, 1.0, 0.5).translate(0, 3.05, -1.2);
    for (const cruce of this.cruces) {
      for (const s of cruce.semaforos) {
        // El poste va en la acera de la derecha según se llega, mirando a quien llega.
        const dx = Math.sin(s.rumbo), dz = -Math.cos(s.rumbo);
        const lado = 3.2;
        const pieza = new THREE.Group();
        pieza.position.set(s.x - dz * lado, 0, s.z + dx * lado);
        pieza.rotation.y = -s.rumbo;
        pieza.add(new THREE.Mesh(poste, materialPoste), new THREE.Mesh(brazo, materialPoste));
        const material = new THREE.MeshBasicMaterial({ color: COLOR_LUZ.rojo });
        pieza.add(new THREE.Mesh(cabeza, material));
        this.grupo.add(pieza);
        this.cabezas.push({ material, cruce, rumbo: s.rumbo });
        // El mismo cruce vale para los dos sentidos de la calle: otro poste en la acera de enfrente.
        const espejo = pieza.clone();
        espejo.position.set(s.x + dz * lado, 0, s.z - dx * lado);
        espejo.rotation.y = -s.rumbo + Math.PI;
        const materialEspejo = new THREE.MeshBasicMaterial({ color: COLOR_LUZ.rojo });
        (espejo.children[2] as THREE.Mesh).material = materialEspejo;
        this.grupo.add(espejo);
        this.cabezas.push({ material: materialEspejo, cruce, rumbo: s.rumbo + Math.PI });
      }
    }
  }

  actualizar(dt: number): void {
    this.tiempo += dt;
    for (const c of this.cabezas) c.material.color.copy(this.colores[luz(c.cruce, this.tiempo, c.rumbo)]);
  }

  /** Luz que ve un vehículo con ese rumbo a menos de `alcance` m por delante de un semáforo (o null). */
  luzDelante(x: number, z: number, rumbo: number, alcance: number): { luz: Luz; distancia: number } | null {
    const fx = Math.sin(rumbo), fz = -Math.cos(rumbo);
    let mejor: { luz: Luz; distancia: number } | null = null;
    for (const cruce of this.cruces) {
      if ((cruce.x - x) ** 2 + (cruce.z - z) ** 2 > (RADIO_CRUCE + alcance) ** 2) continue;
      for (const s of cruce.semaforos) {
        // Solo los semáforos de tu calle: rumbo alineado con el del semáforo (en cualquier sentido).
        if (Math.abs(Math.cos(rumbo - s.rumbo)) < Math.SQRT1_2) continue;
        const dx = s.x - x, dz = s.z - z;
        const adelante = dx * fx + dz * fz;
        const lateral = Math.abs(-dx * fz + dz * fx);
        if (adelante < -1 || adelante > alcance || lateral > 4.5) continue;
        if (!mejor || adelante < mejor.distancia) mejor = { luz: luz(cruce, this.tiempo, rumbo), distancia: adelante };
      }
    }
    return mejor;
  }
}
