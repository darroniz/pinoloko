// Cinemática del 13: el bus de Tussam recorre unos segundos la calle con la cámara baja
// y cinematográfica (la única excepción a la cámara alta), fundido a negro y cambio de barrio.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DURACION = 4.5;

function geometriaBus(): THREE.BufferGeometry {
  const piezas: THREE.BufferGeometry[] = [];
  const pintar = (g: THREE.BufferGeometry, c: string): THREE.BufferGeometry => {
    const col = new THREE.Color(c);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
    return g.index ? g.toNonIndexed() : g;
  };
  piezas.push(pintar(new THREE.BoxGeometry(2.5, 2.6, 12).translate(0, 1.9, 0), '#f4f4f4'));
  piezas.push(pintar(new THREE.BoxGeometry(2.52, 0.5, 12).translate(0, 1.0, 0), '#d7263d'));
  piezas.push(pintar(new THREE.BoxGeometry(2.54, 0.9, 11).translate(0, 2.4, 0), '#7fb8d6'));
  piezas.push(pintar(new THREE.BoxGeometry(2.2, 0.5, 0.2).translate(0, 3.0, -6), '#f2c14e'));
  for (const z of [-4, 4]) for (const x of [-1.1, 1.1]) piezas.push(pintar(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 10).rotateZ(Math.PI / 2).translate(x, 0.5, z), '#2b2b2f'));
  const g = mergeGeometries(piezas, false);
  g.computeVertexNormals();
  return g;
}

export class Cinematica13 {
  readonly bus: THREE.Mesh;
  private tiempo = 0;
  activa = false;
  private origen = new THREE.Vector3();
  private direccion = new THREE.Vector3(0, 0, -1);
  private velo: HTMLElement;
  private rotulo: HTMLElement;

  constructor() {
    this.bus = new THREE.Mesh(geometriaBus(), new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.bus.castShadow = true;
    this.bus.visible = false;
    this.velo = document.createElement('div');
    this.velo.id = 'velo';
    this.rotulo = document.createElement('div');
    this.rotulo.id = 'rotulo-bus';
    document.body.append(this.velo, this.rotulo);
  }

  /** Arranca el viaje desde la parada, en la dirección de la calle. */
  empezar(x: number, z: number, dirX: number, dirZ: number, texto: string): void {
    this.activa = true;
    this.tiempo = 0;
    this.origen.set(x, 0, z);
    this.direccion.set(dirX, 0, dirZ).normalize();
    this.bus.visible = true;
    this.rotulo.textContent = texto;
    this.rotulo.classList.add('visible');
    this.velo.classList.remove('negro');
    document.body.classList.add('en-bus');
  }

  /** Devuelve true en el frame en que toca cambiar de barrio (pantalla en negro). */
  actualizar(dt: number, camara: THREE.PerspectiveCamera): boolean {
    if (!this.activa) return false;
    this.tiempo += dt;
    const t = this.tiempo;
    const avance = 4 + t * 9;
    const pos = this.origen.clone().addScaledVector(this.direccion, avance);
    this.bus.position.copy(pos);
    this.bus.rotation.y = Math.atan2(this.direccion.x, this.direccion.z) + Math.PI;
    // Cámara baja, a un lado y algo por delante, mirando al bus: el plano de anuncio de Tussam.
    const lado = new THREE.Vector3(-this.direccion.z, 0, this.direccion.x);
    camara.position.copy(pos).addScaledVector(lado, 9).addScaledVector(this.direccion, 6 + t * 0.5).setY(2.2 + t * 0.4);
    camara.lookAt(pos.x, 1.8, pos.z);
    if (t > DURACION - 1.2) this.velo.classList.add('negro');
    if (t >= DURACION) {
      this.activa = false;
      this.bus.visible = false;
      this.rotulo.classList.remove('visible');
      return true;
    }
    return false;
  }

  /** Quita el negro cuando el barrio nuevo ya está cargado. */
  llegar(): void {
    window.setTimeout(() => {
      this.velo.classList.remove('negro');
      document.body.classList.remove('en-bus');
    }, 250);
  }
}
