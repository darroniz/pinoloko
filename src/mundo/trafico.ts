// Tráfico: coches que recorren el grafo rodado por su derecha, frenan en los cruces y
// se paran si tienen algo delante. Cuerpos dinámicos pesados guiados por velocidad: empujan
// a la moto sin disparar la física, y un contenedor o un bloque los para de verdad.
// Si Wifly les para el coche y se sube, el coche pasa a ser suyo (ver Juego).
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { MundoFisico } from '../fisica/mundo';
import { RAPIER as R } from '../fisica/mundo';
import { ALTO, ANCHO, COLORES_COCHE, LARGO, MATERIAL_COCHE, geometriaCoche } from '../fisica/coche';
import type { GrafoBarrio } from './grafo';
import { azar } from './geometria';
import { geometriaBus } from '../cinematica';
import type { Semaforos } from './semaforos';

export type TipoTrafico = 'coche' | 'bus';

export interface CocheTrafico {
  tipo: TipoTrafico;
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
  /** Con cuerpo físico solo cerca del jugador; lejos, se mueve sobre el carril sin simular. */
  activo: boolean;
  /** Solo el bus: segundos que le quedan parado en la parada, y enfriamiento hasta la siguiente. */
  enParada: number;
  entreParadas: number;
}

/** Caja de colisión y escala del bus del 13 (el coche usa las constantes de coche.ts). */
export const BUS_LARGO = 10.5, BUS_ANCHO = 2.5, BUS_ESCALA = 0.92;

const RADIO_ACTIVO = 120;

const CARRIL = 1.7;
const VELOCIDAD_CRUCERO = 8;
const VELOCIDAD_CRUCE = 3.5;
const VELOCIDAD_BUS = 6.5;

export class Trafico {
  readonly grupo = new THREE.Group();
  readonly lista: CocheTrafico[] = [];
  private rnd = azar(4242);
  private q = new THREE.Quaternion();
  private eje = new THREE.Vector3(0, 1, 0);
  /** Semáforos del barrio: los coches paran en rojo (y en ámbar si aún están lejos). */
  semaforos: Semaforos | null = null;

  constructor(private readonly fisica: MundoFisico, private readonly grafo: GrafoBarrio, cuantos: number, buses = 0, private readonly paradas: { x: number; z: number }[] = []) {
    const candidatos: number[] = [];
    for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'rodada').length > 0) candidatos.push(i);
    for (let i = 0; i < cuantos + buses && candidatos.length; i++) {
      const origen = candidatos[Math.floor(this.rnd() * candidatos.length)]!;
      const destino = grafo.siguienteAlAzar(origen, -1, 'rodada', this.rnd);
      if (destino === origen) continue;
      this.crear(origen, destino, this.rnd() * 0.8, i < buses ? 'bus' : 'coche');
    }
  }

  private crear(origen: number, destino: number, t: number, tipo: TipoTrafico): void {
    const color = tipo === 'bus' ? '#f4f4f4' : COLORES_COCHE[Math.floor(this.rnd() * COLORES_COCHE.length)]!;
    const cuerpo = this.fisica.world.createRigidBody(R.RigidBodyDesc.dynamic().lockRotations().setLinearDamping(2));
    const [ancho, largo] = tipo === 'bus' ? [BUS_ANCHO, BUS_LARGO] : [ANCHO, LARGO];
    this.fisica.world.createCollider(
      R.ColliderDesc.cuboid(ancho / 2, ALTO / 2, largo / 2).setDensity(tipo === 'bus' ? 9 : 6).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setRestitution(0.2),
      cuerpo,
    );
    const malla = new THREE.Mesh(tipo === 'bus' ? geometriaBus() : geometriaCoche(color), MATERIAL_COCHE);
    malla.scale.setScalar(tipo === 'bus' ? BUS_ESCALA : 1.35);
    malla.castShadow = true;
    this.grupo.add(malla);
    const c: CocheTrafico = { tipo, cuerpo, malla, color, origen, destino, t, velocidad: tipo === 'bus' ? VELOCIDAD_BUS : VELOCIDAD_CRUCERO, x: 0, z: 0, rumbo: 0, parado: 0, activo: true, enParada: 0, entreParadas: 5 };
    this.lista.push(c);
    this.colocar(c);
  }

  /** Punto de la arista actual en el carril derecho para el parámetro t. */
  private puntoCarril(c: CocheTrafico, t: number): { x: number; z: number; rumbo: number } {
    const [ax, az] = this.grafo.nodos[c.origen]!;
    const [bx, bz] = this.grafo.nodos[c.destino]!;
    const dx = bx - ax, dz = bz - az;
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l, uz = dz / l;
    const rx = -uz, rz = ux; // derecha respecto a la marcha
    const carril = c.tipo === 'bus' ? CARRIL + 0.4 : CARRIL;
    return { x: ax + dx * t + rx * carril, z: az + dz * t + rz * carril, rumbo: Math.atan2(ux, -uz) };
  }

  /** Coloca el coche de golpe (al nacer o al cambiar de arista). */
  private colocar(c: CocheTrafico): void {
    const p = this.puntoCarril(c, c.t);
    c.x = p.x;
    c.z = p.z;
    c.rumbo = p.rumbo;
    this.q.setFromAxisAngle(this.eje, -c.rumbo);
    c.cuerpo.setTranslation({ x: c.x, y: ALTO / 2 + 0.02, z: c.z }, true);
    c.cuerpo.setRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w }, true);
    c.cuerpo.setLinvel({ x: 0, y: 0, z: 0 }, true);
    c.malla.position.set(c.x, 0.02, c.z);
    c.malla.rotation.y = -c.rumbo;
  }

  /** Empuja el cuerpo hacia el punto objetivo del carril con la velocidad que toca. */
  private guiar(c: CocheTrafico, dt: number): void {
    const objetivo = this.puntoCarril(c, Math.min(1, c.t + (c.velocidad * dt * 2) / this.largoArista(c) + 0.02));
    const ex = objetivo.x - c.x, ez = objetivo.z - c.z;
    const d = Math.hypot(ex, ez) || 1;
    const vel = Math.min(c.velocidad, d / dt);
    const v = c.cuerpo.linvel();
    c.cuerpo.setLinvel({ x: (ex / d) * vel, y: v.y, z: (ez / d) * vel }, true);
    c.rumbo = objetivo.rumbo;
    this.q.setFromAxisAngle(this.eje, -c.rumbo);
    c.cuerpo.setRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w }, true);
  }

  private largoArista(c: CocheTrafico): number {
    const [ax, az] = this.grafo.nodos[c.origen]!;
    const [bx, bz] = this.grafo.nodos[c.destino]!;
    return Math.hypot(bx - ax, bz - az) || 1;
  }

  /** Tras el paso de física: lee dónde ha acabado cada coche y actualiza t y la malla. */
  despuesDelPaso(): void {
    for (const c of this.lista) {
      if (!c.activo) continue;
      const p = c.cuerpo.translation();
      c.x = p.x;
      c.z = p.z;
      const [ax, az] = this.grafo.nodos[c.origen]!;
      const [bx, bz] = this.grafo.nodos[c.destino]!;
      const dx = bx - ax, dz = bz - az;
      const l2 = dx * dx + dz * dz || 1;
      c.t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2));
      c.malla.position.set(c.x, Math.max(0.02, p.y - ALTO / 2), c.z);
      c.malla.rotation.y = -c.rumbo;
      // Si se ha salido mucho del carril (lo han empujado), vuelve a él de golpe.
      const carril = this.puntoCarril(c, c.t);
      if (Math.hypot(carril.x - c.x, carril.z - c.z) > 6) { c.parado = 0; this.colocar(c); }
    }
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
      const crucero = c.tipo === 'bus' ? VELOCIDAD_BUS : VELOCIDAD_CRUCERO;
      let objetivo = c.t > 0.8 || c.t < 0.12 ? VELOCIDAD_CRUCE : crucero;
      // El bus para unos segundos en cada parada que pilla a mano.
      if (c.tipo === 'bus') {
        c.entreParadas -= dt;
        if (c.enParada > 0) { c.enParada -= dt; objetivo = 0; }
        else if (c.entreParadas <= 0 && this.paradas.some((p) => (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < 100)) { c.enParada = 3; c.entreParadas = 20; }
      }
      const bloqueado = (px: number, pz: number, radio: number): boolean => {
        const dx = px - c.x, dz = pz - c.z;
        const adelante = dx * fx + dz * fz;
        const lateral = Math.abs(-dx * fz + dz * fx);
        return adelante > 0 && adelante < radio && lateral < 2.2;
      };
      if (bloqueado(jugador.x, jugador.z, 8)) objetivo = 0;
      // Semáforo en rojo a menos de 7 m: se para (en ámbar solo si aún no ha llegado).
      const luz = this.semaforos?.luzDelante(c.x, c.z, c.rumbo, 7);
      if (luz && luz.distancia > 1.5 && (luz.luz === 'rojo' || (luz.luz === 'ambar' && luz.distancia > 4))) objetivo = 0;
      for (const o of this.lista) if (o !== c && bloqueado(o.x, o.z, 9)) { objetivo = 0; break; }
      const enSemaforo = !!luz && luz.luz !== 'verde' && luz.distancia > 1.5;
      if (objetivo === 0 && c.enParada <= 0 && !enSemaforo) c.parado += dt; else c.parado = 0;
      // Si lleva mucho parado (atasco con otro coche), arranca despacio para deshacerlo.
      if (c.parado > 4) objetivo = 2;

      c.velocidad += (objetivo - c.velocidad) * Math.min(1, dt * (objetivo < c.velocidad ? 6 : 2));
      if (c.t >= 0.995) {
        const siguiente = this.grafo.siguienteAlAzar(c.destino, c.origen, 'rodada', this.rnd);
        c.origen = c.destino;
        c.destino = siguiente === c.origen ? this.grafo.siguienteAlAzar(c.origen, -1, 'rodada', this.rnd) : siguiente;
        c.t = 0;
        if (c.destino === c.origen) { c.t = 0.5; }
        this.colocar(c);
      } else if (c.activo) this.guiar(c, dt);
      else {
        // Lejos: avanza por el carril sin física.
        c.t = Math.min(0.995, c.t + (c.velocidad * dt) / largo);
        const p = this.puntoCarril(c, c.t);
        c.x = p.x; c.z = p.z; c.rumbo = p.rumbo;
        c.malla.position.set(c.x, 0.02, c.z);
        c.malla.rotation.y = -c.rumbo;
      }
    }
  }

  /** Activa o desactiva el cuerpo físico según la distancia al jugador. Llamar cada medio segundo. */
  gestionarRadio(x: number, z: number): void {
    const r2 = RADIO_ACTIVO * RADIO_ACTIVO;
    for (const c of this.lista) {
      const cerca = (c.x - x) ** 2 + (c.z - z) ** 2 < r2;
      if (cerca && !c.activo) {
        c.activo = true;
        c.cuerpo.setEnabled(true);
        this.colocar(c);
      } else if (!cerca && c.activo) {
        c.activo = false;
        c.cuerpo.setEnabled(false);
      }
    }
  }
}
