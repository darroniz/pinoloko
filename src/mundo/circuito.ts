// Lo visible de las carreras: pancarta de salida a cuadros en cada punto de salida, anillos en
// los puntos de control (solo durante la carrera) y una flecha que orbita al jugador señalando
// el siguiente punto.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import type { RutaCarrera } from '../carreras';

function geometriaCuadros(ancho: number, alto: number, celdas: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(ancho, alto, celdas, 2).toNonIndexed();
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 6) {
    const cx = Math.floor((pos.getX(i) + ancho / 2) / (ancho / celdas) + 1e-3);
    const cz = Math.floor((pos.getY(i) + alto / 2) / (alto / 2) + 1e-3);
    const negro = (cx + cz) % 2 === 0;
    for (let k = 0; k < 6; k++) { col[(i + k) * 3] = negro ? 0.1 : 1; col[(i + k) * 3 + 1] = negro ? 0.1 : 1; col[(i + k) * 3 + 2] = negro ? 0.1 : 1; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export class Circuito {
  readonly grupo = new THREE.Group();
  private anillos: THREE.Mesh[] = [];
  private flecha: THREE.Mesh;
  private haz: THREE.Mesh;
  private tiempo = 0;
  private materialSiguiente = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9 });
  private materialLuego = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.3 });
  private materialMeta = new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.9 });
  private geoAnillo = new THREE.TorusGeometry(4.5, 0.35, 6, 28).rotateX(Math.PI / 2);

  constructor(private readonly grafo: GrafoBarrio, salidas: number[]) {
    this.grupo.name = 'circuito';
    const poste = new THREE.CylinderGeometry(0.08, 0.08, 5, 6).translate(0, 2.5, 0);
    const pancarta = geometriaCuadros(7, 1.1, 8).translate(0, 4.6, 0);
    const gris = new THREE.MeshLambertMaterial({ color: '#8a8f99' });
    const cuadros = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    for (const nodo of salidas) {
      const [x, z] = grafo.nodos[nodo] ?? [0, 0];
      const g = new THREE.Group();
      const dir = this.direccionPasaje(nodo);
      for (const lado of [-3.5, 3.5]) { const p = new THREE.Mesh(poste, gris); p.position.set(lado, 0, 0); g.add(p); }
      const banda = new THREE.Mesh(pancarta, cuadros);
      banda.rotation.x = -THREE.MathUtils.degToRad(32); // inclinada hacia la cámara
      g.add(banda);
      // Salida pintada en el suelo, bien visible desde arriba.
      const suelo = new THREE.Mesh(geometriaCuadros(7, 2.2, 8).rotateX(-Math.PI / 2).translate(0, 0.03, 0), cuadros);
      g.add(suelo);
      g.position.set(x, 0, z);
      g.rotation.y = -Math.atan2(dir.x, -dir.z);
      this.grupo.add(g);
    }
    this.flecha = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 3).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd23f' }));
    this.flecha.visible = false;
    this.haz = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 60, 8, 1, true).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    this.haz.visible = false;
    this.grupo.add(this.flecha, this.haz);
  }

  /** Dirección de la primera arista peatonal del nodo (para cruzar la pancarta sobre el pasaje). */
  private direccionPasaje(nodo: number): { x: number; z: number } {
    const [x, z] = this.grafo.nodos[nodo] ?? [0, 0];
    const v = this.grafo.vecinos(nodo, 'peatonal')[0];
    if (!v) return { x: 0, z: -1 };
    const [vx, vz] = this.grafo.nodos[v.nodo]!;
    const l = Math.hypot(vx - x, vz - z) || 1;
    return { x: (vx - x) / l, z: (vz - z) / l };
  }

  mostrarRuta(ruta: RutaCarrera | null): void {
    for (const a of this.anillos) { this.grupo.remove(a); }
    this.anillos = [];
    if (!ruta) { this.flecha.visible = false; this.haz.visible = false; return; }
    ruta.puntos.forEach((n, i) => {
      const [x, z] = this.grafo.nodos[n] ?? [0, 0];
      const m = new THREE.Mesh(this.geoAnillo, i === ruta.puntos.length - 1 ? this.materialMeta : this.materialLuego);
      m.position.set(x, 0.4, z);
      this.grupo.add(m);
      this.anillos.push(m);
    });
    this.flecha.visible = true;
    this.haz.visible = true;
  }

  /** Anima anillos, resalta el siguiente y apunta la flecha desde el jugador hacia él. */
  actualizar(dt: number, indice: number, jugadorX: number, jugadorZ: number): void {
    if (!this.anillos.length) return;
    this.tiempo += dt;
    this.anillos.forEach((a, i) => {
      const esMeta = i === this.anillos.length - 1;
      a.visible = i >= indice;
      a.material = i === indice ? (esMeta ? this.materialMeta : this.materialSiguiente) : esMeta ? this.materialMeta : this.materialLuego;
      a.position.y = 0.4 + (i === indice ? Math.sin(this.tiempo * 4) * 0.25 + 0.25 : 0);
      a.scale.setScalar(i === indice ? 1 + Math.sin(this.tiempo * 4) * 0.08 : 0.8);
    });
    const objetivo = this.anillos[indice];
    if (!objetivo) return;
    const dx = objetivo.position.x - jugadorX, dz = objetivo.position.z - jugadorZ;
    const d = Math.hypot(dx, dz) || 1;
    this.flecha.position.set(jugadorX + (dx / d) * 5, 1.2, jugadorZ + (dz / d) * 5);
    this.flecha.rotation.y = Math.atan2(dx, dz);
    this.flecha.visible = d > 9;
    this.haz.position.set(objetivo.position.x, 0, objetivo.position.z);
  }
}
