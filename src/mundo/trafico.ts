// Tráfico: coches que recorren el grafo rodado por su derecha, frenan en los cruces y
// se paran si tienen algo delante. Cuerpos cinemáticos de Rapier (empujan, no se empujan).
// Si Wifly les para el coche y se sube, el coche pasa a ser suyo (ver Juego).
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { MundoFisico } from '../fisica/mundo';
import { RAPIER as R } from '../fisica/mundo';
import { ALTO, ANCHO, COLORES_COCHE, LARGO, MATERIAL_COCHE, geometriaCoche } from '../fisica/coche';
import type { GrafoBarrio } from './grafo';
import { azar } from './geometria';

export interface CocheTrafico {
  cuerpo: RAPIER.RigidBody;
  malla: THREE.Mesh;
  color: string;
  origen: number;
  destino: number;
  t: number;
  velocidad: number;
  x: number;
  z: number;
  rumbo: number;
  parado: number;
}

const CARRIL = 1.7;
const VELOCIDAD_CRUCERO = 8;
const VELOCIDAD_CRUCE = 3.5;

export class Trafico {
  readonly grupo = new THREE.Group();
  readonly lista: CocheTrafico[] = [];
  private rnd = azar(4242);
  private q = new THREE.Quaternion();
  private eje = new THREE.Vector3(0, 1, 0);

  constructor(private readonly fisica: MundoFisico, private readonly grafo: GrafoBarrio, cuantos: number) {
    const candidatos: number[] = [];
    for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'rodada').length > 0) candidatos.push(i);
    for (let i = 0; i < cuantos && candidatos.length; i++) {
      const origen = candidatos[Math.floor(this.rnd() * candidatos.length)]!;
      const destino = grafo.siguienteAlAzar(origen, -1, 'rodada', this.rnd);
      if (destino === origen) continue;
      this.crear(origen, destino, this.rnd() * 0.8);
    }
  }

  private crear(origen: number, destino: number, t: number): void {
    const color = COLORES_COCHE[Math.floor(this.rnd() * COLORES_COCHE.length)]!;
    const cuerpo = this.fisica.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    this.fisica.world.createCollider(R.ColliderDesc.cuboid(ANCHO / 2, ALTO / 2, LARGO / 2), cuerpo);
    const malla = new THREE.Mesh(geometriaCoche(color), MATERIAL_COCHE);
    malla.scale.setScalar(1.35);
    malla.castShadow = true;
    this.grupo.add(malla);
    const c: CocheTrafico = { cuerpo, malla, color, origen, destino, t, velocidad: VELOCIDAD_CRUCERO, x: 0, z: 0, rumbo: 0, parado: 0 };
    this.lista.push(c);
    this.colocar(c);
  }

  /** Posición sobre la arista actual, desplazada al carril derecho. */
  private colocar(c: CocheTrafico): void {
    const [ax, az] = this.grafo.nodos[c.origen]!;
    const [bx, bz] = this.grafo.nodos[c.destino]!;
    const dx = bx - ax, dz = bz - az;
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l, uz = dz / l;
    const rx = -uz, rz = ux; // derecha respecto a la marcha
    c.x = ax + dx * c.t + rx * CARRIL;
    c.z = az + dz * c.t + rz * CARRIL;
    c.rumbo = Math.atan2(ux, -uz);
    this.q.setFromAxisAngle(this.eje, -c.rumbo);
    c.cuerpo.setNextKinematicTranslation({ x: c.x, y: ALTO / 2 + 0.02, z: c.z });
    c.cuerpo.setNextKinematicRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w });
    c.malla.position.set(c.x, 0.02, c.z);
    c.malla.rotation.y = -c.rumbo;
  }

  /** Coche más cercano a un punto, o null si no hay ninguno a menos de `maximo` metros. */
  masCercano(x: number, z: number, maximo = 3.5): CocheTrafico | null {
    let mejor: CocheTrafico | null = null, mejorD = maximo * maximo;
    for (const c of this.lista) {
      const d = (c.x - x) ** 2 + (c.z - z) ** 2;
      if (d < mejorD) { mejorD = d; mejor = c; }
    }
    return mejor;
  }

  /** Quita un coche del tráfico (Wifly se lo ha llevado). */
  quitar(c: CocheTrafico): void {
    this.fisica.world.removeRigidBody(c.cuerpo);
    this.grupo.remove(c.malla);
    this.lista.splice(this.lista.indexOf(c), 1);
  }

  actualizar(jugador: { x: number; z: number }, dt: number): void {
    for (const c of this.lista) {
      const [ax, az] = this.grafo.nodos[c.origen]!;
      const [bx, bz] = this.grafo.nodos[c.destino]!;
      const largo = Math.hypot(bx - ax, bz - az) || 1;
      const fx = Math.sin(c.rumbo), fz = -Math.cos(c.rumbo);

      // ¿Algo delante? El jugador o el coche de delante en un cono de 9 m.
      let objetivo = c.t > 0.8 || c.t < 0.12 ? VELOCIDAD_CRUCE : VELOCIDAD_CRUCERO;
      const bloqueado = (px: number, pz: number, radio: number): boolean => {
        const dx = px - c.x, dz = pz - c.z;
        const adelante = dx * fx + dz * fz;
        const lateral = Math.abs(-dx * fz + dz * fx);
        return adelante > 0 && adelante < radio && lateral < 2.2;
      };
      if (bloqueado(jugador.x, jugador.z, 8)) objetivo = 0;
      for (const o of this.lista) if (o !== c && bloqueado(o.x, o.z, 9)) { objetivo = 0; break; }
      if (objetivo === 0) c.parado += dt; else c.parado = 0;
      // Si lleva mucho parado (atasco con otro coche), arranca despacio para deshacerlo.
      if (c.parado > 4) objetivo = 2;

      c.velocidad += (objetivo - c.velocidad) * Math.min(1, dt * (objetivo < c.velocidad ? 6 : 2));
      c.t += (c.velocidad * dt) / largo;
      if (c.t >= 1) {
        const siguiente = this.grafo.siguienteAlAzar(c.destino, c.origen, 'rodada', this.rnd);
        c.origen = c.destino;
        c.destino = siguiente === c.origen ? this.grafo.siguienteAlAzar(c.origen, -1, 'rodada', this.rnd) : siguiente;
        c.t = 0;
        if (c.destino === c.origen) { c.t = 0.5; }
      }
      this.colocar(c);
    }
  }
}
