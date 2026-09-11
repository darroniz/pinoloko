// Lo visible de los piques: los tres canis que corren contigo en cada carrera. Una malla por
// rival (scooter de juguete con el color de su modelo y ropa chillona para distinguirlos), que
// solo existe mientras dura la carrera.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import type { RutaCarrera } from '../carreras';
import { MODELOS } from '../fisica/scooter';
import { geometriaMotero } from './motosCalle';
import { azar } from './geometria';
import { crearRivales, pasoRival, type Rival } from '../piques';

const ROPA = ['#e63946', '#f4a261', '#2a9d8f'];

export class Rivales {
  readonly grupo = new THREE.Group();
  lista: Rival[] = [];
  private mallas: THREE.Mesh[] = [];
  private rnd = azar(4242);

  constructor(private readonly grafo: GrafoBarrio) {
    this.grupo.name = 'rivales';
    for (let i = 0; i < 3; i++) {
      const modelo = MODELOS[(i * 2 + 1) % MODELOS.length] ?? MODELOS[0]!;
      const m = new THREE.Mesh(geometriaMotero(modelo.color, ROPA[i]), new THREE.MeshLambertMaterial({ vertexColors: true }));
      m.scale.setScalar(1.3);
      m.castShadow = true;
      m.visible = false;
      this.mallas.push(m);
      this.grupo.add(m);
    }
  }

  get activos(): boolean {
    return this.lista.length > 0;
  }

  /** Arranca los rivales por la ruta; `cuantos` para los piques callejeros (solo el Kevin). */
  empezar(ruta: RutaCarrera, cuantos = 3): void {
    this.lista = crearRivales(this.grafo, ruta, this.rnd).slice(0, cuantos);
    this.colocar();
    this.mallas.forEach((m, i) => { m.visible = i < this.lista.length; });
  }

  parar(): void {
    this.lista = [];
    for (const m of this.mallas) m.visible = false;
  }

  /** Avanza los rivales; devuelve los que acaban de cruzar la meta. */
  actualizar(dt: number, reloj: number): Rival[] {
    const llegados: Rival[] = [];
    for (const r of this.lista) if (pasoRival(r, this.grafo, dt, reloj)) llegados.push(r);
    this.colocar();
    return llegados;
  }

  private colocar(): void {
    this.lista.forEach((r, i) => {
      const m = this.mallas[i];
      if (!m) return;
      m.position.set(r.x, 0, r.z);
      m.rotation.y = -r.rumbo;
    });
  }
}
