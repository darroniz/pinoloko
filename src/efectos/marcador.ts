// Marcador del jugador: anillo en el suelo y punta sobre la cabeza, dibujados siempre por
// encima. Con la cámara mirando desde el sur, un bloque de diez plantas tapa la calle que
// tiene detrás; el marcador es lo que te dice dónde estás cuando eso pasa.
import * as THREE from 'three';

export class MarcadorJugador {
  readonly grupo = new THREE.Group();
  private anillo: THREE.Mesh;
  private punta: THREE.Mesh;
  private tiempo = 0;

  constructor() {
    const material = new THREE.MeshBasicMaterial({ color: '#fff2a8', transparent: true, opacity: 0.75, depthTest: false, depthWrite: false });
    this.anillo = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 24).rotateX(-Math.PI / 2), material);
    this.anillo.renderOrder = 20;
    this.punta = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4).rotateX(Math.PI), material);
    this.punta.renderOrder = 20;
    this.grupo.add(this.anillo, this.punta);
    this.grupo.renderOrder = 20;
  }

  actualizar(x: number, z: number, alto: number, dt: number): void {
    this.tiempo += dt;
    this.grupo.position.set(x, 0.05, z);
    this.punta.position.y = alto + 0.9 + Math.sin(this.tiempo * 4) * 0.15;
    this.punta.rotation.y = this.tiempo * 1.5;
  }
}
