// Chispas y polvo: puntos que salen despedidos en los golpes y al derrapar.
import * as THREE from 'three';

const MAXIMO = 400;

export class Particulas {
  readonly puntos: THREE.Points;
  private posiciones = new Float32Array(MAXIMO * 3);
  private colores = new Float32Array(MAXIMO * 3);
  private velocidades = new Float32Array(MAXIMO * 3);
  private vidas = new Float32Array(MAXIMO);
  private siguiente = 0;

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.posiciones, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colores, 3).setUsage(THREE.DynamicDrawUsage));
    this.puntos = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true }));
    this.puntos.frustumCulled = false;
    this.vidas.fill(0);
    this.posiciones.fill(-1000);
  }

  emitir(x: number, y: number, z: number, cuantas: number, color: THREE.Color, fuerza: number): void {
    for (let k = 0; k < cuantas; k++) {
      const i = this.siguiente;
      this.siguiente = (this.siguiente + 1) % MAXIMO;
      this.posiciones[i * 3] = x;
      this.posiciones[i * 3 + 1] = y;
      this.posiciones[i * 3 + 2] = z;
      const ang = Math.random() * Math.PI * 2;
      const r = fuerza * (0.4 + Math.random() * 0.8);
      this.velocidades[i * 3] = Math.cos(ang) * r;
      this.velocidades[i * 3 + 1] = fuerza * (0.6 + Math.random() * 0.9);
      this.velocidades[i * 3 + 2] = Math.sin(ang) * r;
      this.colores[i * 3] = color.r;
      this.colores[i * 3 + 1] = color.g;
      this.colores[i * 3 + 2] = color.b;
      this.vidas[i] = 0.5 + Math.random() * 0.5;
    }
  }

  actualizar(dt: number): void {
    let alguna = false;
    for (let i = 0; i < MAXIMO; i++) {
      if (this.vidas[i]! <= 0) continue;
      alguna = true;
      this.vidas[i]! -= dt;
      this.velocidades[i * 3 + 1]! -= 18 * dt;
      this.posiciones[i * 3]! += this.velocidades[i * 3]! * dt;
      this.posiciones[i * 3 + 1]! += this.velocidades[i * 3 + 1]! * dt;
      this.posiciones[i * 3 + 2]! += this.velocidades[i * 3 + 2]! * dt;
      if (this.posiciones[i * 3 + 1]! < 0.05) { this.posiciones[i * 3 + 1] = 0.05; this.velocidades[i * 3 + 1] = 0; this.vidas[i]! -= dt * 2; }
      if (this.vidas[i]! <= 0) this.posiciones[i * 3 + 1] = -1000;
    }
    if (alguna) {
      (this.puntos.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.puntos.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
  }
}
