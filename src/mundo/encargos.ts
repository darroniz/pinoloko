// Lo visible del Recadero: una bolsa de papel flotando en la puerta de los locales donde hay
// encargo, y durante el reparto un haz de luz en el destino y una flecha junto al jugador.
import * as THREE from 'three';
import type { Local } from '../recados';

export class Encargos {
  readonly grupo = new THREE.Group();
  private bolsas: THREE.Group[] = [];
  private flecha: THREE.Mesh;
  private haz: THREE.Mesh;
  private tiempo = 0;

  constructor(readonly puntos: Local[]) {
    this.grupo.name = 'encargos';
    const papel = new THREE.MeshLambertMaterial({ color: '#c9955a' });
    const bolsa = new THREE.BoxGeometry(1.1, 1.3, 0.8);
    const asa = new THREE.TorusGeometry(0.32, 0.06, 5, 12).translate(0, 0.75, 0);
    const anillo = new THREE.TorusGeometry(2.6, 0.25, 6, 24).rotateX(Math.PI / 2).translate(0, 0.12, 0);
    const materialAnillo = new THREE.MeshBasicMaterial({ color: '#ff8c42', transparent: true, opacity: 0.85 });
    for (const p of puntos) {
      const g = new THREE.Group();
      const cuerpo = new THREE.Mesh(bolsa, papel);
      cuerpo.position.y = 1.6;
      cuerpo.castShadow = true;
      const a = new THREE.Mesh(asa, papel);
      a.position.y = 1.6;
      g.add(cuerpo, a, new THREE.Mesh(anillo, materialAnillo));
      g.position.set(p.x, 0, p.z);
      this.grupo.add(g);
      this.bolsas.push(g);
    }
    this.flecha = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 3).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff8c42' }));
    this.haz = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 60, 8, 1, true).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: '#ff8c42', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    this.flecha.visible = false;
    this.haz.visible = false;
    this.grupo.add(this.flecha, this.haz);
  }

  /** Punto de encargo a menos de `radio` m, o null. */
  cercano(x: number, z: number, radio: number): Local | null {
    return this.puntos.find((p) => Math.hypot(p.x - x, p.z - z) < radio) ?? null;
  }

  /** Anima las bolsas y, si hay destino, el haz y la flecha (con las bolsas escondidas). */
  actualizar(dt: number, destino: Local | null, jugadorX: number, jugadorZ: number): void {
    this.tiempo += dt;
    this.bolsas.forEach((b, i) => {
      b.visible = !destino;
      if (!destino) { b.children[0]!.position.y = b.children[1]!.position.y = 1.6 + Math.sin(this.tiempo * 3 + i) * 0.2; b.rotation.y = this.tiempo * 0.8; }
    });
    this.haz.visible = !!destino;
    if (!destino) { this.flecha.visible = false; return; }
    this.haz.position.set(destino.x, 0, destino.z);
    const dx = destino.x - jugadorX, dz = destino.z - jugadorZ;
    const d = Math.hypot(dx, dz) || 1;
    this.flecha.position.set(jugadorX + (dx / d) * 5, 1.2, jugadorZ + (dz / d) * 5);
    this.flecha.rotation.y = Math.atan2(dx, dz);
    this.flecha.visible = d > 9;
  }
}
