// Lo visible del fantasma del récord: una moto translúcida que repite tu mejor vuelta.
import * as THREE from 'three';
import { geometriaMotero } from './motosCalle';
import { posicionFantasma, type Muestra } from '../fantasma';

export class FantasmaCarrera {
  readonly grupo = new THREE.Group();
  private malla: THREE.Mesh;
  private muestras: Muestra[] | null = null;

  constructor() {
    this.grupo.name = 'fantasma';
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.42, depthWrite: false });
    this.malla = new THREE.Mesh(geometriaMotero('#dfe9ff', '#dfe9ff'), material);
    this.malla.scale.setScalar(1.3);
    this.malla.visible = false;
    this.malla.renderOrder = 5;
    this.grupo.add(this.malla);
  }

  get activo(): boolean {
    return this.muestras !== null;
  }

  empezar(muestras: Muestra[]): void {
    this.muestras = muestras;
    this.malla.visible = true;
    this.actualizar(0);
  }

  parar(): void {
    this.muestras = null;
    this.malla.visible = false;
  }

  actualizar(segundos: number): void {
    if (!this.muestras) return;
    const p = posicionFantasma(this.muestras, segundos);
    if (!p) return;
    this.malla.position.set(p.x, 0.15 + Math.sin(segundos * 5) * 0.06, p.z);
    this.malla.rotation.y = -p.rumbo;
  }
}
