// Coleccionables: 20 mecheros repartidos por el barrio (los pasajes, el mercado, los bares).
// Se recogen pasando por encima, giran y flotan; los recogidos se guardan en localStorage.
import * as THREE from 'three';
import type { Nivel, Punto } from './tipos';
import { azar, dentroDePoligono, muestrearPolilinea } from './geometria';

export const TOTAL_MECHEROS = 20;

export class Mecheros {
  readonly grupo = new THREE.Group();
  readonly posiciones: Punto[] = [];
  readonly recogidos = new Set<number>();
  private mallas: THREE.Mesh[] = [];
  private tiempo = 0;
  private readonly clave: string;

  /** Los mecheros se guardan por barrio; Pino Montano conserva la clave de la primera versión. */
  constructor(nivel: Nivel, barrio = 'pino-montano') {
    this.clave = barrio === 'pino-montano' ? 'pinoloko.mecheros.v1' : `pinoloko.mecheros.${barrio}.v1`;
    const rnd = azar(2020);
    const candidatos: Punto[] = [];
    for (const via of nivel.vias) {
      if (via.clase !== 'peatonal') continue;
      for (const m of muestrearPolilinea(via.puntos, 25, rnd() * 25)) candidatos.push([m.x + m.nx * 0.8, m.z + m.nz * 0.8]);
    }
    for (const poi of nivel.pois) if (poi.clase === 'bar' || poi.clase === 'marketplace') candidatos.push([poi.x + 4, poi.z + 4]);
    // Elige 20 repartidos: cada uno a más de 45 m de los anteriores.
    const barajados = candidatos.slice().sort(() => rnd() - 0.5);
    for (const c of barajados) {
      if (this.posiciones.length >= TOTAL_MECHEROS) break;
      if (nivel.edificios.some((e) => dentroDePoligono(c[0], c[1], e.poligono))) continue;
      if (this.posiciones.some(([x, z]) => (x - c[0]) ** 2 + (z - c[1]) ** 2 < 45 * 45)) continue;
      this.posiciones.push(c);
    }
    try {
      const guardado = JSON.parse(localStorage.getItem(this.clave) ?? '[]') as number[];
      for (const i of guardado) this.recogidos.add(i);
    } catch { /* sin guardado */ }

    const cuerpo = new THREE.BoxGeometry(0.5, 1.4, 0.3);
    const cabeza = new THREE.BoxGeometry(0.5, 0.35, 0.3).translate(0, 0.85, 0);
    const colores = ['#e63946', '#2b6cd9', '#f2c14e', '#2a9d8f', '#f4732b'];
    this.posiciones.forEach(([x, z], i) => {
      const g = new THREE.Group();
      const m1 = new THREE.Mesh(cuerpo, new THREE.MeshLambertMaterial({ color: colores[i % colores.length], emissive: colores[i % colores.length], emissiveIntensity: 0.25 }));
      const m2 = new THREE.Mesh(cabeza, new THREE.MeshLambertMaterial({ color: '#d0d4dc' }));
      const llama = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6).translate(0, 1.25, 0), new THREE.MeshBasicMaterial({ color: '#ffb347' }));
      g.add(m1, m2, llama);
      g.position.set(x, 1.2, z);
      g.scale.setScalar(1.3);
      g.visible = !this.recogidos.has(i);
      this.grupo.add(g);
      this.mallas.push(m1);
      m1.userData['grupo'] = g;
    });
  }

  private guardar(): void {
    try { localStorage.setItem(this.clave, JSON.stringify([...this.recogidos])); } catch { /* nada */ }
  }

  /** Anima los visibles y devuelve el índice del mechero recogido este frame, o -1. */
  actualizar(x: number, z: number, dt: number): number {
    this.tiempo += dt;
    let recogido = -1;
    this.posiciones.forEach(([mx, mz], i) => {
      if (this.recogidos.has(i)) return;
      const g = this.mallas[i]!.userData['grupo'] as THREE.Group;
      if ((mx - x) ** 2 + (mz - z) ** 2 > 90 * 90) { g.visible = false; return; }
      g.visible = true;
      g.rotation.y = this.tiempo * 2 + i;
      g.position.y = 1.2 + Math.sin(this.tiempo * 3 + i) * 0.25;
      if ((mx - x) ** 2 + (mz - z) ** 2 < 2.2 * 2.2) {
        this.recogidos.add(i);
        g.visible = false;
        recogido = i;
        this.guardar();
      }
    });
    return recogido;
  }

  get cuantos(): number {
    return this.recogidos.size;
  }
}
