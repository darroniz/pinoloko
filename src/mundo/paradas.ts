// Paradas del 13 de Tussam: poste con cartel en cada `highway=bus_stop` del nivel.
import * as THREE from 'three';
import type { Nivel, Poi } from './tipos';

export class Paradas {
  readonly grupo = new THREE.Group();
  readonly lista: Poi[];

  constructor(nivel: Nivel) {
    this.lista = nivel.pois.filter((p) => p.clase === 'bus_stop');
    const poste = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6).translate(0, 1.6, 0);
    const cartel = new THREE.BoxGeometry(0.9, 0.6, 0.08).translate(0, 3.0, 0);
    const franja = new THREE.BoxGeometry(0.9, 0.2, 0.09).translate(0, 3.15, 0);
    const marquesina = new THREE.BoxGeometry(3.4, 0.12, 1.4).translate(0, 2.6, -0.6);
    const gris = new THREE.MeshLambertMaterial({ color: '#8a8f99' });
    const blanco = new THREE.MeshLambertMaterial({ color: '#f7f7f7' });
    const rojo = new THREE.MeshLambertMaterial({ color: '#d7263d' });
    const cristal = new THREE.MeshLambertMaterial({ color: '#9fd3e8', transparent: true, opacity: 0.6 });
    for (const p of this.lista) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(poste, gris), new THREE.Mesh(cartel, blanco), new THREE.Mesh(franja, rojo), new THREE.Mesh(marquesina, cristal));
      for (const lado of [-1.5, 1.5]) {
        const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6).translate(lado, 1.3, -1.2), gris);
        g.add(pata);
      }
      g.position.set(p.x, 0, p.z);
      g.scale.setScalar(1.3);
      g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
      this.grupo.add(g);
    }
  }

  /** Parada a menos de `radio` metros, o null. */
  cercana(x: number, z: number, radio = 5): Poi | null {
    let mejor: Poi | null = null, mejorD = radio * radio;
    for (const p of this.lista) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < mejorD) { mejorD = d; mejor = p; }
    }
    return mejor;
  }

  /** La parada más cercana a un punto, sin límite (para bajarse del bus). */
  masCercana(x: number, z: number): Poi | null {
    return this.cercana(x, z, Infinity);
  }
}
