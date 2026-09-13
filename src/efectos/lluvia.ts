// La cortina de lluvia: rayitas que caen alrededor del jugador (el objeto se mueve con él, los
// vértices son relativos) y se reciclan por arriba. Barata: un LineSegments con posiciones dinámicas.
import * as THREE from 'three';

const GOTAS = 320;
const CAJA = 46;
const ALTO = 26;

export class Lluvia {
  readonly lineas: THREE.LineSegments;
  private posiciones = new Float32Array(GOTAS * 6);
  private material: THREE.LineBasicMaterial;

  constructor() {
    const geo = new THREE.BufferGeometry();
    for (let i = 0; i < GOTAS; i++) {
      const x = (Math.random() - 0.5) * CAJA, z = (Math.random() - 0.5) * CAJA, y = Math.random() * ALTO;
      this.posiciones.set([x, y, z, x + 0.25, y + 1.1, z], i * 6);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.posiciones, 3).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.LineBasicMaterial({ color: '#dbe8f2', transparent: true, opacity: 0 });
    this.lineas = new THREE.LineSegments(geo, this.material);
    this.lineas.frustumCulled = false;
    this.lineas.visible = false;
  }

  actualizar(intensidad: number, x: number, z: number, dt: number): void {
    this.lineas.visible = intensidad > 0.02;
    if (!this.lineas.visible) return;
    this.material.opacity = 0.55 * intensidad;
    this.lineas.position.set(x, 0, z);
    const caida = 24 * dt;
    const p = this.posiciones;
    for (let i = 0; i < GOTAS; i++) {
      let y = p[i * 6 + 1]! - caida;
      if (y < 0) {
        y += ALTO;
        const nx = (Math.random() - 0.5) * CAJA, nz = (Math.random() - 0.5) * CAJA;
        p[i * 6] = nx; p[i * 6 + 2] = nz; p[i * 6 + 3] = nx + 0.25; p[i * 6 + 5] = nz;
      }
      p[i * 6 + 1] = y;
      p[i * 6 + 4] = y + 1.1;
    }
    (this.lineas.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}
