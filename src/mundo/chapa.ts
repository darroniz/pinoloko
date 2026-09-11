// Chapa y pintura: un taller por barrio donde, por 100 €, la Local se olvida de ti y el vehículo
// sale como nuevo. En Los Remedios son los talleres de verdad de OSM (car_repair); donde no hay,
// un taller de barrio en una calle rodada a unos cien metros de la parada. Un anillo azul en la
// puerta y un cartel: párate dentro un segundo con el vehículo.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import type { Nivel } from './tipos';

export const PRECIO_CHAPA = 100;
export const RADIO_CHAPA = 4.5;
export const NOMBRE_CHAPA_BARRIO = 'Chapa y pintura Manolo';

export interface TallerChapa { nombre: string; x: number; z: number }

/** Dónde está el taller: el `car_repair` / `motorcycle` con nombre más cercano a la parada, o uno inventado. */
export function elegirTaller(nivel: Nivel, grafo: GrafoBarrio, arranque: { x: number; z: number }): TallerChapa | null {
  const reales = nivel.pois.filter((p) => (p.clase === 'car_repair' || p.clase === 'motorcycle' || p.clase === 'repair') && p.nombre);
  const puerta = (x: number, z: number): [number, number] => grafo.nodos[grafo.masCercano(x, z, 'rodada')] ?? [x, z];
  if (reales.length) {
    const p = reales.sort((a, b) => Math.hypot(a.x - arranque.x, a.z - arranque.z) - Math.hypot(b.x - arranque.x, b.z - arranque.z))[0]!;
    const [x, z] = puerta(p.x, p.z);
    return { nombre: p.nombre, x, z };
  }
  // Inventado: el nodo rodado a entre 80 y 160 m de la parada que más cerca esté de 120.
  let mejor = -1, mejorD = Infinity;
  for (let i = 0; i < grafo.nodos.length; i++) {
    if (!grafo.vecinos(i, 'rodada').length) continue;
    const [x, z] = grafo.nodos[i]!;
    const d = Math.hypot(x - arranque.x, z - arranque.z);
    if (d < 80 || d > 160) continue;
    if (Math.abs(d - 120) < mejorD) { mejorD = Math.abs(d - 120); mejor = i; }
  }
  if (mejor < 0) return null;
  const [x, z] = grafo.nodos[mejor]!;
  return { nombre: NOMBRE_CHAPA_BARRIO, x, z };
}

/** El sitio: anillo azul en el suelo, poste con cartel pintado en un canvas y una lata de spray gigante. */
export class Chapa {
  readonly grupo = new THREE.Group();
  private anillo: THREE.Mesh;
  private tiempo = 0;
  /** Segundos seguidos parado dentro del anillo con el vehículo. */
  private dentro = 0;
  private enfriamiento = 0;

  constructor(readonly taller: TallerChapa | null) {
    this.grupo.name = 'chapa';
    this.anillo = new THREE.Mesh(new THREE.TorusGeometry(RADIO_CHAPA - 0.6, 0.28, 6, 28).rotateX(Math.PI / 2).translate(0, 0.12, 0), new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.8 }));
    if (!taller) { this.anillo.visible = false; return; }
    this.anillo.position.set(taller.x, 0, taller.z);
    this.grupo.add(this.anillo);
    const gris = new THREE.MeshLambertMaterial({ color: '#8a8f99' });
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 6).translate(0, 2.1, 0), gris);
    const lienzo = document.createElement('canvas');
    lienzo.width = 256; lienzo.height = 96;
    const ctx = lienzo.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CHAPA Y', 128, 30); ctx.fillText('PINTURA', 128, 66);
    }
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshBasicMaterial({ map: textura, side: THREE.DoubleSide }));
    cartel.position.set(0, 4.0, 0);
    cartel.rotation.x = -THREE.MathUtils.degToRad(32);
    const lata = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.3, 10).translate(0, 0.65, 0), new THREE.MeshLambertMaterial({ color: '#ef4444' }));
    lata.position.set(1.4, 0, 0.6);
    lata.castShadow = true;
    const boquilla = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8).translate(0, 1.4, 0), gris);
    boquilla.position.copy(lata.position);
    const g = new THREE.Group();
    g.add(poste, cartel, lata, boquilla);
    g.position.set(taller.x + 2.6, 0, taller.z + 2.4);
    this.grupo.add(g);
  }

  /**
   * Un paso: devuelve 'servicio' cuando llevas un segundo parado dentro del anillo en vehículo
   * (con enfriamiento de diez segundos), 'llegas' al entrar y null si nada.
   */
  actualizar(jugador: { x: number; z: number; rapidez: number; enVehiculo: boolean }, dt: number): 'servicio' | 'llegas' | null {
    this.tiempo += dt;
    this.enfriamiento = Math.max(0, this.enfriamiento - dt);
    if (this.taller) { this.anillo.rotation.y = this.tiempo * 0.6; (this.anillo.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(this.tiempo * 4) * 0.2; }
    if (!this.taller || !jugador.enVehiculo) { this.dentro = 0; return null; }
    const d2 = (jugador.x - this.taller.x) ** 2 + (jugador.z - this.taller.z) ** 2;
    if (d2 > RADIO_CHAPA * RADIO_CHAPA || jugador.rapidez > 1) { this.dentro = 0; return null; }
    if (this.enfriamiento > 0) return null;
    const antes = this.dentro;
    this.dentro += dt;
    if (antes === 0) return 'llegas';
    if (this.dentro >= 1) { this.dentro = 0; this.enfriamiento = 10; return 'servicio'; }
    return null;
  }
}
