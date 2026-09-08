// Trozos de lo que se rompe: cascos de maceta, fruta de las cajas, patas de silla. Un
// InstancedMesh de cajitas con color por instancia, balística a mano (gravedad, un bote en el
// suelo, giro) y se encogen hasta desaparecer. Sin Rapier: son adorno, no obstáculo.
import * as THREE from 'three';

const CAPACIDAD = 360;
const GRAVEDAD = -20;

interface Trozo {
  i: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  giro: THREE.Vector3;
  rot: THREE.Euler;
  vida: number;
  escala: number;
}

export class Trozos {
  readonly malla: THREE.InstancedMesh;
  private vivos: Trozo[] = [];
  private libres: number[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private cero = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor() {
    this.malla = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.16, 0.24), new THREE.MeshLambertMaterial({ color: '#ffffff' }), CAPACIDAD);
    this.malla.name = 'trozos';
    this.malla.frustumCulled = false;
    this.malla.castShadow = true;
    for (let i = 0; i < CAPACIDAD; i++) { this.malla.setMatrixAt(i, this.cero); this.libres.push(i); }
    this.malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  get cuantos(): number { return this.vivos.length; }

  /** Estalla `colores.length` trozos desde (x, y, z), empujados por (vx, vz) y hacia arriba. */
  estallar(x: number, y: number, z: number, colores: THREE.Color[], vx: number, vz: number, fuerza = 4): void {
    for (const color of colores) {
      const i = this.libres.pop();
      if (i === undefined) return;
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * fuerza;
      this.vivos.push({
        i,
        pos: new THREE.Vector3(x + (Math.random() - 0.5) * 0.4, y + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.4),
        vel: new THREE.Vector3(vx * 0.5 + Math.cos(ang) * r, 3 + Math.random() * fuerza * 1.2, vz * 0.5 + Math.sin(ang) * r),
        giro: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14),
        rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, 0),
        vida: 2.2 + Math.random() * 1.2,
        escala: 0.6 + Math.random() * 0.8,
      });
      this.malla.setColorAt(i, color);
    }
    if (this.malla.instanceColor) this.malla.instanceColor.needsUpdate = true;
  }

  actualizar(dt: number): void {
    if (!this.vivos.length) return;
    for (let k = this.vivos.length - 1; k >= 0; k--) {
      const t = this.vivos[k]!;
      t.vida -= dt;
      t.vel.y += GRAVEDAD * dt;
      t.pos.addScaledVector(t.vel, dt);
      t.rot.x += t.giro.x * dt; t.rot.y += t.giro.y * dt; t.rot.z += t.giro.z * dt;
      const suelo = 0.08 * t.escala;
      if (t.pos.y < suelo) {
        t.pos.y = suelo;
        if (Math.abs(t.vel.y) > 1.5) { t.vel.y = -t.vel.y * 0.35; t.vel.x *= 0.6; t.vel.z *= 0.6; t.giro.multiplyScalar(0.5); }
        else { t.vel.set(t.vel.x * 0.85, 0, t.vel.z * 0.85); t.giro.multiplyScalar(0.7); }
      }
      const e = t.escala * (t.vida < 0.6 ? Math.max(0, t.vida / 0.6) : 1);
      if (t.vida <= 0) {
        this.malla.setMatrixAt(t.i, this.cero);
        this.libres.push(t.i);
        this.vivos.splice(k, 1);
        continue;
      }
      this.q.setFromEuler(t.rot);
      this.s.set(e, e, e);
      this.m.compose(t.pos, this.q, this.s);
      this.malla.setMatrixAt(t.i, this.m);
    }
    this.malla.instanceMatrix.needsUpdate = true;
  }
}
