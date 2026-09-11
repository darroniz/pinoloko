// Lo visible del taxista: los clientes con la mano levantada en la acera (cuerpo, cabeza, brazo
// que saluda y un anillo amarillo en el suelo), y el muestreo de un sitio en la acera de una
// calle rodada a una distancia razonable del taxi.
import * as THREE from 'three';
import { azar, dentroDePoligono } from './geometria';
import type { Nivel } from './tipos';
import type { Cliente } from '../taxista';
import { MAXIMO_CLIENTES } from '../taxista';

export class Clientes {
  readonly grupo = new THREE.Group();
  private figuras: { g: THREE.Group; brazo: THREE.Mesh }[] = [];
  private rnd = azar(3131);
  private tiempo = 0;

  constructor(private readonly nivel: Nivel, ropa: string[]) {
    this.grupo.name = 'clientes';
    const cuerpo = new THREE.CapsuleGeometry(0.28, 0.6, 3, 8).translate(0, 0.72, 0);
    const cabeza = new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.42, 0);
    const brazo = new THREE.CapsuleGeometry(0.08, 0.55, 2, 6).translate(0, 0.3, 0);
    const anillo = new THREE.TorusGeometry(1.6, 0.16, 6, 20).rotateX(Math.PI / 2).translate(0, 0.1, 0);
    const piel = new THREE.MeshLambertMaterial({ color: '#e0ac8b' });
    const amarillo = new THREE.MeshBasicMaterial({ color: '#ffd200', transparent: true, opacity: 0.85 });
    for (let i = 0; i < MAXIMO_CLIENTES; i++) {
      const g = new THREE.Group();
      const c = new THREE.Mesh(cuerpo, new THREE.MeshLambertMaterial({ color: ropa[i % ropa.length] ?? '#1d3fa8' }));
      c.castShadow = true;
      const b = new THREE.Mesh(brazo, piel);
      b.position.set(0.34, 1.05, 0);
      b.rotation.z = -0.5;
      g.add(c, new THREE.Mesh(cabeza, piel), b, new THREE.Mesh(anillo, amarillo));
      g.scale.setScalar(1.15);
      g.visible = false;
      this.grupo.add(g);
      this.figuras.push({ g, brazo: b });
    }
  }

  /** Tramos de calle rodada (sin las de servicio), para muestrear aceras. */
  private tramos: { ax: number; az: number; bx: number; bz: number; ancho: number }[] | null = null;

  /** Un punto en la acera de una calle rodada a entre `minimo` y `maximo` metros del taxi, o null. */
  sitio(x: number, z: number, minimo = 40, maximo = 150): { x: number; z: number; rumbo: number } | null {
    if (!this.tramos) {
      this.tramos = [];
      for (const v of this.nivel.vias) {
        if (v.clase !== 'rodada' || v.tipo === 'service') continue;
        for (let i = 0; i + 1 < v.puntos.length; i++) {
          const [ax, az] = v.puntos[i]!;
          const [bx, bz] = v.puntos[i + 1]!;
          if (Math.hypot(bx - ax, bz - az) < 6) continue;
          this.tramos.push({ ax, az, bx, bz, ancho: v.ancho });
        }
      }
    }
    // Tramos con el punto medio a una distancia razonable; si no hay, se amplía el margen.
    let cerca = this.tramos.filter((t) => { const d = Math.hypot((t.ax + t.bx) / 2 - x, (t.az + t.bz) / 2 - z); return d >= minimo && d <= maximo; });
    if (!cerca.length) cerca = this.tramos.filter((t) => Math.hypot((t.ax + t.bx) / 2 - x, (t.az + t.bz) / 2 - z) <= maximo * 1.6);
    for (let intento = 0; intento < 10 && cerca.length; intento++) {
      const tr = cerca[Math.floor(this.rnd() * cerca.length)]!;
      const dx = tr.bx - tr.ax, dz = tr.bz - tr.az;
      const l = Math.hypot(dx, dz) || 1;
      const t = 0.15 + this.rnd() * 0.7;
      const lado = this.rnd() < 0.5 ? 1 : -1;
      const sep = tr.ancho / 2 + 1.0;
      const px = tr.ax + dx * t + (-dz / l) * sep * lado;
      const pz = tr.az + dz * t + (dx / l) * sep * lado;
      if (Math.hypot(px - x, pz - z) < 20) continue;
      if (this.nivel.edificios.some((e) => dentroDePoligono(px, pz, e.poligono))) continue;
      if (this.nivel.zonas.some((zo) => zo.clase === 'water' && dentroDePoligono(px, pz, zo.poligono))) continue;
      // Mira hacia la calle.
      return { x: px, z: pz, rumbo: Math.atan2(-(-dz / l) * lado, (dx / l) * lado) };
    }
    return null;
  }

  /** Coloca las figuras sobre los clientes que esperan y mueve el brazo. */
  actualizar(clientes: Cliente[], dt: number): void {
    this.tiempo += dt;
    this.figuras.forEach((f, i) => {
      const c = clientes[i];
      f.g.visible = !!c;
      if (!c) return;
      f.g.position.set(c.x, 0, c.z);
      f.g.rotation.y = -c.rumbo;
      f.brazo.rotation.z = -0.5 + Math.sin(this.tiempo * 9 + i) * 0.35;
    });
  }
}
