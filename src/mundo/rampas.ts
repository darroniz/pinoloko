// Rampas para saltar con la moto: cuñas fijas en los pasajes anchos, a rayas, orientadas a lo
// largo del pasaje. La moto es una bola con la vertical libre: sube la cuña y vuela sola.
import * as THREE from 'three';
import type { MundoFisico } from '../fisica/mundo';
import { RAPIER as R } from '../fisica/mundo';
import { azar, dentroDePoligono, muestrearPolilinea } from './geometria';
import type { Nivel, Punto } from './tipos';

const LARGO = 4.2, ANCHO = 2.6, ALTO = 1.25;
export const PENDIENTE = ALTO / LARGO;

export class Rampas {
  readonly grupo = new THREE.Group();
  readonly posiciones: Punto[] = [];
  readonly rumbos: number[] = [];

  constructor(fisica: MundoFisico, nivel: Nivel, cuantas: number, evitar: Punto[]) {
    this.grupo.name = 'rampas';
    const rnd = azar(9090);
    const angulo = Math.atan2(ALTO, LARGO);
    const geo = new THREE.BoxGeometry(ANCHO, 0.2, Math.hypot(LARGO, ALTO)).toNonIndexed();
    // Rayas amarillas y negras por vértice a lo largo de la rampa.
    const pos = geo.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const raya = Math.floor((pos.getZ(i) + 2.5) / 0.7) % 2 === 0;
      col[i * 3] = raya ? 1 : 0.12; col[i * 3 + 1] = raya ? 0.8 : 0.12; col[i * 3 + 2] = raya ? 0.15 : 0.12;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const lados = new THREE.MeshLambertMaterial({ color: '#2b2b2f' });
    const candidatos = nivel.vias.filter((v) => v.clase === 'peatonal' && v.ancho >= 4).sort(() => rnd() - 0.5);
    for (const via of candidatos) {
      if (this.posiciones.length >= cuantas) break;
      const muestras = muestrearPolilinea(via.puntos, 30, 12 + rnd() * 10);
      for (const m of muestras) {
        if (this.posiciones.length >= cuantas) break;
        if (nivel.edificios.some((e) => dentroDePoligono(m.x, m.z, e.poligono))) continue;
        if (nivel.zonas.some((z) => z.clase === 'water' && dentroDePoligono(m.x, m.z, z.poligono))) continue;
        if (evitar.some(([x, z]) => Math.hypot(x - m.x, z - m.z) < 6)) continue;
        if (this.posiciones.some(([x, z]) => Math.hypot(x - m.x, z - m.z) < 60)) continue;
        this.colocar(fisica, m.x, m.z, Math.atan2(m.tx, -m.tz), angulo, geo, material, lados);
        this.posiciones.push([m.x, m.z]);
        this.rumbos.push(Math.atan2(m.tx, -m.tz));
        break;
      }
    }
  }

  /**
   * Si (x, z) está sobre una rampa, devuelve su dirección de subida y el avance (0 al pie,
   * 1 en lo alto). La bola de la moto se pelea con la cuña (el solver le quita velocidad cada
   * paso), así que el juego le da la velocidad vertical de la pendiente a mano.
   */
  pendiente(x: number, z: number): { dirX: number; dirZ: number; avance: number } | null {
    for (let i = 0; i < this.posiciones.length; i++) {
      const [rx, rz] = this.posiciones[i]!;
      if (Math.abs(rx - x) > 4 || Math.abs(rz - z) > 4) continue;
      const rumbo = this.rumbos[i]!;
      const dirX = Math.sin(rumbo), dirZ = -Math.cos(rumbo);
      const a = (x - rx) * dirX + (z - rz) * dirZ; // a lo largo
      const l = (x - rx) * -dirZ + (z - rz) * dirX; // de lado
      if (Math.abs(a) > LARGO / 2 + 0.6 || Math.abs(l) > ANCHO / 2 + 0.3) continue;
      return { dirX, dirZ, avance: (a + LARGO / 2) / LARGO };
    }
    return null;
  }

  private colocar(fisica: MundoFisico, x: number, z: number, rumbo: number, angulo: number, geo: THREE.BufferGeometry, material: THREE.Material, lados: THREE.Material): void {
    const g = new THREE.Group();
    const tablero = new THREE.Mesh(geo, material);
    tablero.rotation.x = angulo;
    tablero.position.set(0, ALTO / 2, 0);
    tablero.castShadow = true;
    g.add(tablero);
    // Laterales triangulares para que se lea como una cuña.
    const forma = new THREE.Shape([new THREE.Vector2(-LARGO / 2, 0), new THREE.Vector2(LARGO / 2, 0), new THREE.Vector2(LARGO / 2, ALTO)]);
    const lateral = new THREE.ShapeGeometry(forma).rotateY(Math.PI / 2);
    for (const lado of [-ANCHO / 2, ANCHO / 2]) { const m = new THREE.Mesh(lateral, lados); m.position.set(lado, 0, 0); m.material = lados; g.add(m); }
    g.position.set(x, 0, z);
    g.rotation.y = -rumbo;
    this.grupo.add(g);
    // Colisión: una cuña de verdad (envolvente convexa) con el pie a ras de suelo, sin escalón
    // en la entrada. La parte alta queda "delante" según el rumbo del pasaje (local -z).
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rumbo);
    const cuerpo = fisica.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(x, 0, z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
    const w = ANCHO / 2, l = LARGO / 2;
    const puntos = new Float32Array([-w, -0.05, l, w, -0.05, l, -w, -0.05, -l, w, -0.05, -l, -w, ALTO, -l, w, ALTO, -l]);
    const cuña = R.ColliderDesc.convexHull(puntos);
    if (cuña) fisica.world.createCollider(cuña.setFriction(0).setRestitution(0), cuerpo);
  }
}
