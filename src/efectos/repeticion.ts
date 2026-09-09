// Repetición corta de un destrozo: dos segundos con cámara baja orbitando el punto (la otra
// excepción, junto al 13, a la cámara alta). El juego sigue corriendo; solo se roba la cámara.
import * as THREE from 'three';

const DURACION = 2.2;

export class Repeticion {
  activa = false;
  private tiempo = 0;
  private centro = new THREE.Vector3();
  private angulo = 0;

  empezar(x: number, z: number, rumbo: number): void {
    this.activa = true;
    this.tiempo = 0;
    this.centro.set(x, 0.8, z);
    this.angulo = rumbo + Math.PI * 0.75;
  }

  /** Coloca la cámara; devuelve false cuando ha terminado. */
  actualizar(dt: number, camara: THREE.Camera): boolean {
    if (!this.activa) return false;
    this.tiempo += dt;
    if (this.tiempo >= DURACION) { this.activa = false; return false; }
    const a = this.angulo + this.tiempo * 0.9;
    const distancia = 11 - this.tiempo * 1.5;
    camara.position.set(this.centro.x + Math.sin(a) * distancia, 3.2 + this.tiempo * 0.6, this.centro.z + Math.cos(a) * distancia);
    camara.lookAt(this.centro);
    return true;
  }
}
