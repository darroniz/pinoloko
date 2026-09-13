// Los charcos: elipses de agua en las calles rodadas que aparecen con la lluvia y se secan
// despacio. Pasar por uno a velocidad salpica (y si hay un vecino al lado, lo pones perdido).
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import { azar } from './geometria';

export const CHARCOS_POR_BARRIO = 36;
export const RADIO_CHARCO = 1.7;

export interface Charco { x: number; z: number; ancho: number; largo: number; rumbo: number; enfriamiento: number }

export function colocarCharcos(grafo: GrafoBarrio, cuantos: number, rnd: () => number): Charco[] {
  const candidatos: number[] = [];
  for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'rodada').length > 0) candidatos.push(i);
  const lista: Charco[] = [];
  for (let intento = 0; intento < cuantos * 4 && lista.length < cuantos && candidatos.length; intento++) {
    const n = candidatos[Math.floor(rnd() * candidatos.length)]!;
    const [nx, nz] = grafo.nodos[n]!;
    // Un poco apartado del nodo, hacia un vecino: en medio de la calle, no en el cruce justo.
    const vecs = grafo.vecinos(n, 'rodada');
    const [vx, vz] = grafo.nodos[vecs[Math.floor(rnd() * vecs.length)]!.nodo]!;
    const t = 0.2 + rnd() * 0.6;
    const x = nx + (vx - nx) * t + (rnd() - 0.5) * 3, z = nz + (vz - nz) * t + (rnd() - 0.5) * 3;
    if (lista.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < 12 * 12)) continue;
    lista.push({ x, z, ancho: 0.7 + rnd() * 0.7, largo: 1 + rnd() * 1.2, rumbo: Math.atan2(vx - nx, -(vz - nz)), enfriamiento: 0 });
  }
  return lista;
}

export class Charcos {
  readonly malla: THREE.InstancedMesh;
  readonly lista: Charco[];
  private material: THREE.MeshBasicMaterial;
  private rnd = azar(777);

  constructor(grafo: GrafoBarrio) {
    this.lista = colocarCharcos(grafo, CHARCOS_POR_BARRIO, this.rnd);
    const geo = new THREE.CircleGeometry(RADIO_CHARCO, 12).rotateX(-Math.PI / 2);
    this.material = new THREE.MeshBasicMaterial({ color: '#8fa6bb', transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.malla = new THREE.InstancedMesh(geo, this.material, Math.max(1, this.lista.length));
    this.malla.frustumCulled = false;
    this.malla.visible = false;
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), eje = new THREE.Vector3(0, 1, 0);
    this.lista.forEach((c, i) => {
      p.set(c.x, 0.03, c.z);
      q.setFromAxisAngle(eje, -c.rumbo);
      s.set(c.ancho, 1, c.largo);
      m.compose(p, q, s);
      this.malla.setMatrixAt(i, m);
    });
    this.malla.count = this.lista.length;
    this.malla.instanceMatrix.needsUpdate = true;
  }

  /** Opacidad según lo mojado que esté el suelo. Devuelve el charco que acabas de pisar a velocidad, si hay. */
  actualizar(mojado: number, jugador: { x: number; z: number; rapidez: number }, dt: number): Charco | null {
    this.malla.visible = mojado > 0.03;
    this.material.opacity = 0.55 * mojado;
    if (!this.malla.visible) return null;
    let pisado: Charco | null = null;
    for (const c of this.lista) {
      c.enfriamiento = Math.max(0, c.enfriamiento - dt);
      if (pisado || c.enfriamiento > 0 || jugador.rapidez < 3) continue;
      const dx = jugador.x - c.x, dz = jugador.z - c.z;
      if (dx * dx + dz * dz < (RADIO_CHARCO * c.largo) ** 2) { c.enfriamiento = 1.2; pisado = c; }
    }
    return pisado;
  }
}
