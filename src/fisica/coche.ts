// El coche: secundario, más pesado que la moto y con derrape más largo. Mismo modelo
// arcade que la scooter pero sobre un cuboide que gira con el rumbo.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { MundoFisico } from './mundo';
import { RAPIER as R } from './mundo';
import type { Entrada } from '../control/entrada';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const LARGO = 3.9, ANCHO = 1.75, ALTO = 1.35;
const ESCALA_VISUAL = 1.35;

export const COLORES_COCHE = ['#e5e5e5', '#c0392b', '#2c3e50', '#95a5a6', '#f1c40f', '#1f6feb', '#27ae60', '#7f8c8d', '#8e44ad', '#f39c12'];

const geometriasCoche = new Map<string, THREE.BufferGeometry>();

/** Carrocería de utilitario de barrio (un Ibiza, un Corsa), fundida en una geometría con colores. */
export function geometriaCoche(color: string): THREE.BufferGeometry {
  const cache = geometriasCoche.get(color);
  if (cache) return cache;
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
  piezas.push(pintar(new THREE.BoxGeometry(ANCHO, 0.55, LARGO).translate(0, 0.5, 0), color));
  piezas.push(pintar(new THREE.BoxGeometry(ANCHO * 0.9, 0.5, LARGO * 0.5).translate(0, 1.02, 0.15), color));
  piezas.push(pintar(new THREE.BoxGeometry(ANCHO * 0.86, 0.34, LARGO * 0.46).translate(0, 1.05, 0.15), '#9fd3e8'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.15, 0.1).translate(-0.6, 0.55, -LARGO / 2), '#fff4c2'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.15, 0.1).translate(0.6, 0.55, -LARGO / 2), '#fff4c2'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.12, 0.1).translate(-0.6, 0.55, LARGO / 2), '#e0443b'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.12, 0.1).translate(0.6, 0.55, LARGO / 2), '#e0443b'));
  for (const [x, z] of [[-0.8, -1.25], [0.8, -1.25], [-0.8, 1.25], [0.8, 1.25]]) {
    piezas.push(pintar(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 10).rotateZ(Math.PI / 2).translate(x!, 0.3, z!), '#2b2b2f'));
  }
  const g = mergeGeometries(piezas, false);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  for (const p of piezas) p.dispose();
  geometriasCoche.set(color, g);
  return g;
}

export const MATERIAL_COCHE = new THREE.MeshLambertMaterial({ vertexColors: true });

export interface AjustesCoche {
  aceleracion: number;
  velocidadMaxima: number;
  velocidadMarchaAtras: number;
  frenado: number;
  rozamiento: number;
  giroParado: number;
  giroMaximo: number;
  agarre: number;
  agarreDerrape: number;
}

export const UTILITARIO: AjustesCoche = {
  aceleracion: 8,
  velocidadMaxima: 21,
  velocidadMarchaAtras: 4,
  frenado: 16,
  rozamiento: 0.6,
  giroParado: 1.2,
  giroMaximo: 2.3,
  agarre: 7,
  agarreDerrape: 1.3,
};

export interface EstadoCoche {
  x: number;
  z: number;
  rumbo: number;
  velocidad: number;
  velocidadLateral: number;
  derrapando: boolean;
  golpe: number;
}

function diferenciaAngulo(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Coche {
  readonly malla: THREE.Mesh;
  readonly cuerpo: RAPIER.RigidBody;
  readonly estado: EstadoCoche = { x: 0, z: 0, rumbo: 0, velocidad: 0, velocidadLateral: 0, derrapando: false, golpe: 0 };
  readonly color: string;
  conducida = false;
  private rumbo = 0;
  private giroActual = 0;
  private velocidadPrevia = new THREE.Vector3();

  constructor(fisica: MundoFisico, x: number, z: number, rumbo: number, color: string, readonly ajustes: AjustesCoche = UTILITARIO) {
    this.color = color;
    this.rumbo = rumbo;
    this.cuerpo = fisica.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(x, ALTO / 2 + 0.05, z).lockRotations().setLinearDamping(0.1).setCcdEnabled(true),
    );
    fisica.world.createCollider(
      R.ColliderDesc.cuboid(ANCHO / 2, ALTO / 2, LARGO / 2).setRestitution(0.4).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setDensity(3),
      this.cuerpo,
    );
    this.malla = new THREE.Mesh(geometriaCoche(color), MATERIAL_COCHE);
    this.malla.scale.setScalar(ESCALA_VISUAL);
    this.malla.castShadow = true;
    this.aplicarRotacion();
    this.cuerpo.sleep();
    this.sincronizar();
  }

  get posicion(): THREE.Vector3 {
    const t = this.cuerpo.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  get direccion(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.rumbo), 0, -Math.cos(this.rumbo));
  }

  montar(si: boolean): void {
    this.conducida = si;
    if (si) this.cuerpo.wakeUp();
  }

  private aplicarRotacion(): void {
    this.cuerpo.setRotation({ x: 0, y: Math.sin(-this.rumbo / 2), z: 0, w: Math.cos(-this.rumbo / 2) }, true);
  }

  actualizar(entrada: Entrada, dt: number): void {
    const a = this.ajustes;
    const v = this.cuerpo.linvel();
    const fx = Math.sin(this.rumbo), fz = -Math.cos(this.rumbo);
    const rx = -fz, rz = fx;
    let vf = v.x * fx + v.z * fz;
    let vl = v.x * rx + v.z * rz;
    const rapidez = Math.abs(vf);
    const sx = entrada.eje.x, sy = entrada.eje.y;
    const magnitud = Math.min(1, Math.hypot(sx, sy));
    const quiereIr = magnitud > 0.12;
    let acelerador = 0;
    let giroObjetivo = 0;
    if (quiereIr) {
      const rumboObjetivo = Math.atan2(sx, sy);
      const dif = diferenciaAngulo(this.rumbo, rumboObjetivo);
      // Un coche parado no gira sobre sí mismo: necesita rodar para girar.
      const factorGiro = rapidez < 1 ? 0.35 : Math.max(0.5, 1 - rapidez / (a.velocidadMaxima * 2.2));
      const velocidadGiro = (rapidez < 0.8 ? a.giroParado : a.giroMaximo) * factorGiro;
      giroObjetivo = Math.max(-1, Math.min(1, dif / 0.4));
      const paso = Math.min(Math.abs(dif), velocidadGiro * dt * Math.min(1, Math.abs(dif) / 0.3 + 0.3));
      this.rumbo += Math.sign(dif) * paso;
      const alineado = Math.cos(dif);
      acelerador = alineado > 0.1 ? magnitud * Math.max(0.3, alineado) : 0;
      if (alineado < -0.3 && rapidez > 1.5) vf -= Math.sign(vf) * a.frenado * 0.6 * dt;
    }
    this.giroActual += (giroObjetivo - this.giroActual) * Math.min(1, dt * 8);
    if (entrada.freno) {
      if (rapidez > 0.6) vf -= Math.sign(vf) * Math.min(rapidez, a.frenado * dt);
      else if (quiereIr) vf = Math.max(-a.velocidadMarchaAtras, vf - a.aceleracion * 0.5 * dt);
      else vf = 0;
      acelerador = 0;
    }
    if (acelerador > 0) {
      vf += a.aceleracion * acelerador * dt;
      if (vf > a.velocidadMaxima) vf = a.velocidadMaxima;
    } else if (!entrada.freno) {
      vf -= vf * a.rozamiento * dt;
      if (Math.abs(vf) < 0.05) vf = 0;
    }
    const derrapando = (entrada.freno && rapidez > 4 && Math.abs(this.giroActual) > 0.3) || Math.abs(vl) > 3;
    const agarre = derrapando ? a.agarreDerrape : a.agarre;
    vl -= vl * Math.min(1, agarre * dt);
    if (rapidez > 5 && Math.abs(this.giroActual) > 0.2) vl -= this.giroActual * rapidez * (derrapando ? 1.1 : 0.35) * dt;
    const nfx = Math.sin(this.rumbo), nfz = -Math.cos(this.rumbo);
    const nrx = -nfz, nrz = nfx;
    this.cuerpo.setLinvel({ x: vf * nfx + vl * nrx, y: v.y, z: vf * nfz + vl * nrz }, true);
    this.aplicarRotacion();
    this.estado.velocidad = vf;
    this.estado.velocidadLateral = vl;
    this.estado.derrapando = derrapando && rapidez > 2;
  }

  despuesDelPaso(): void {
    const v = this.cuerpo.linvel();
    const golpe = Math.hypot(v.x - this.velocidadPrevia.x, v.z - this.velocidadPrevia.z);
    this.estado.golpe = golpe > 5 ? golpe : 0;
    this.velocidadPrevia.set(v.x, v.y, v.z);
    this.sincronizar();
  }

  reposo(): void {
    if (this.cuerpo.isSleeping()) return;
    const v = this.cuerpo.linvel();
    this.cuerpo.setLinvel({ x: v.x * 0.95, y: v.y, z: v.z * 0.95 }, true);
    this.estado.velocidad = Math.hypot(v.x, v.z);
    this.sincronizar();
  }

  sincronizar(): void {
    const t = this.cuerpo.translation();
    this.estado.x = t.x;
    this.estado.z = t.z;
    this.estado.rumbo = this.rumbo;
    this.malla.position.set(t.x, t.y - ALTO / 2, t.z);
    this.malla.rotation.set(0, -this.rumbo, 0);
  }
}
