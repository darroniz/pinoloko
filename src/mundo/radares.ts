// Radares de tráfico en las avenidas: un poste con cámara junto a la calzada y una raya blanca
// cruzando la calle. Pasar la raya en vehículo a más de 50 km/h es foto multa: flash, 50 € menos
// y la Local al tanto. Dos o tres por barrio, en los tramos largos de las calles anchas.
import * as THREE from 'three';
import type { Nivel } from './tipos';
import { azar } from './geometria';

export const LIMITE = 50 / 3.6;
export const MULTA = 50;
const ENFRIAMIENTO = 8;

export interface Radar {
  x: number;
  z: number;
  /** Tangente de la calle (unitaria) y su ancho: la raya cruza la calzada por aquí. */
  tx: number;
  tz: number;
  ancho: number;
  calle: string;
  enfriamiento: number;
}

/** Tramos largos de calles anchas (primary, secondary, tertiary), separados entre sí. */
export function elegirRadares(nivel: Pick<Nivel, 'vias'>, cuantos: number, rnd: () => number): Radar[] {
  const buscar = (tipos: string[] | null, minimo: number): Radar[] => {
    const lista: Radar[] = [];
    for (const via of nivel.vias) {
      if (via.clase !== 'rodada' || (tipos && !tipos.includes(via.tipo))) continue;
      for (let i = 0; i + 1 < via.puntos.length; i++) {
        const [ax, az] = via.puntos[i]!, [bx, bz] = via.puntos[i + 1]!;
        const l = Math.hypot(bx - ax, bz - az);
        if (l < minimo) continue;
        const f = 0.35 + rnd() * 0.3;
        lista.push({ x: ax + (bx - ax) * f, z: az + (bz - az) * f, tx: (bx - ax) / l, tz: (bz - az) / l, ancho: via.ancho, calle: via.nombre, enfriamiento: 0 });
      }
    }
    return lista;
  };
  // Avenidas con tramos largos; en un casco antiguo sin avenidas, cualquier calle rodada de 40 m.
  let candidatos = buscar(['primary', 'secondary', 'tertiary'], 50);
  if (!candidatos.length) candidatos = buscar(null, 40);
  const barajados = candidatos.slice().sort(() => rnd() - 0.5);
  const elegidos: Radar[] = [];
  for (const c of barajados) {
    if (elegidos.length >= cuantos) break;
    if (elegidos.some((r) => (r.x - c.x) ** 2 + (r.z - c.z) ** 2 < 120 * 120)) continue;
    elegidos.push(c);
  }
  return elegidos;
}

/**
 * Comprueba un paso del jugador por el radar: dentro de la banda de 2,5 m alrededor de la raya,
 * a menos de medio ancho de calle (más margen) del eje, y más rápido que el límite.
 */
export function pasoRadar(r: Radar, jugador: { x: number; z: number; rapidez: number; enVehiculo: boolean }, dt: number): boolean {
  r.enfriamiento = Math.max(0, r.enfriamiento - dt);
  if (!jugador.enVehiculo || jugador.rapidez <= LIMITE || r.enfriamiento > 0) return false;
  const dx = jugador.x - r.x, dz = jugador.z - r.z;
  const alLargo = dx * r.tx + dz * r.tz;
  const alAncho = -dx * r.tz + dz * r.tx;
  if (Math.abs(alLargo) > 2.5 || Math.abs(alAncho) > r.ancho / 2 + 2) return false;
  r.enfriamiento = ENFRIAMIENTO;
  return true;
}

export class Radares {
  readonly grupo = new THREE.Group();
  readonly lista: Radar[];
  private flash: THREE.Mesh;
  private tiempoFlash = 0;

  constructor(nivel: Nivel, cuantos: number) {
    this.grupo.name = 'radares';
    this.lista = elegirRadares(nivel, cuantos, azar(5150));
    const gris = new THREE.MeshLambertMaterial({ color: '#8a8f99' });
    const oscuro = new THREE.MeshLambertMaterial({ color: '#2b2b2f' });
    const poste = new THREE.CylinderGeometry(0.09, 0.11, 4.2, 6).translate(0, 2.1, 0);
    const caja = new THREE.BoxGeometry(0.6, 0.5, 0.7).translate(0, 4.2, 0);
    const lente = new THREE.BoxGeometry(0.2, 0.2, 0.1).translate(0, 4.2, 0.4);
    const blanco = new THREE.MeshBasicMaterial({ color: '#f7f3ea' });
    for (const r of this.lista) {
      // El poste, en la acera; la raya, cruzando la calzada.
      const lado = r.ancho / 2 + 0.9;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(poste, gris), new THREE.Mesh(caja, gris), new THREE.Mesh(lente, oscuro));
      g.position.set(r.x - r.tz * lado, 0, r.z + r.tx * lado);
      g.rotation.y = -Math.atan2(r.tz, r.tx) - Math.PI / 2;
      g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
      const raya = new THREE.Mesh(new THREE.PlaneGeometry(0.5, r.ancho).rotateX(-Math.PI / 2), blanco);
      raya.position.set(r.x, 0.04, r.z);
      raya.rotation.y = -Math.atan2(r.tz, r.tx);
      this.grupo.add(g, raya);
    }
    // El flash: un disco blanco sobre el jugador que dura un suspiro.
    this.flash = new THREE.Mesh(new THREE.CircleGeometry(9, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthTest: false }));
    this.flash.renderOrder = 25;
    this.flash.visible = false;
    this.grupo.add(this.flash);
  }

  /** Devuelve el radar que te acaba de hacer la foto, o null. */
  actualizar(jugador: { x: number; z: number; rapidez: number; enVehiculo: boolean }, dt: number): Radar | null {
    if (this.tiempoFlash > 0) {
      this.tiempoFlash -= dt;
      this.flash.position.set(jugador.x, 0.6, jugador.z);
      (this.flash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, this.tiempoFlash / 0.25) * 0.85;
      if (this.tiempoFlash <= 0) this.flash.visible = false;
    }
    for (const r of this.lista) {
      if (pasoRadar(r, jugador, dt)) {
        this.tiempoFlash = 0.25;
        this.flash.visible = true;
        this.flash.position.set(jugador.x, 0.6, jugador.z);
        return r;
      }
    }
    return null;
  }
}
