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
/** Los coches de los pijos: blanco nacarado, verde inglés, azul marino, plata y granate. */
export const COLORES_COCHE_PIJO = ['#f4f1ea', '#1b3a2a', '#0f2a5c', '#c8ccd2', '#f7f7f7', '#7a1f2b', '#e8e2d4'];

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

const geometriasFurgoneta = new Map<string, THREE.BufferGeometry>();

/** Furgoneta de reparto (una Berlingo, una Kangoo): más alta, con caja cerrada detrás. */
export function geometriaFurgoneta(color: string): THREE.BufferGeometry {
  const cache = geometriasFurgoneta.get(color);
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
  piezas.push(pintar(new THREE.BoxGeometry(ANCHO, 0.6, LARGO).translate(0, 0.5, 0), color));
  piezas.push(pintar(new THREE.BoxGeometry(ANCHO, 1.1, LARGO * 0.62).translate(0, 1.3, 0.55), color));
  piezas.push(pintar(new THREE.BoxGeometry(ANCHO * 0.92, 0.7, LARGO * 0.3).translate(0, 1.1, -0.9), color));
  piezas.push(pintar(new THREE.BoxGeometry(ANCHO * 0.9, 0.45, LARGO * 0.26).translate(0, 1.2, -0.9), '#9fd3e8'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.15, 0.1).translate(-0.6, 0.55, -LARGO / 2), '#fff4c2'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.15, 0.1).translate(0.6, 0.55, -LARGO / 2), '#fff4c2'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.12, 0.1).translate(-0.6, 0.55, LARGO / 2), '#e0443b'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.12, 0.1).translate(0.6, 0.55, LARGO / 2), '#e0443b'));
  for (const [x, z] of [[-0.8, -1.25], [0.8, -1.25], [-0.8, 1.25], [0.8, 1.25]]) {
    piezas.push(pintar(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 10).rotateZ(Math.PI / 2).translate(x!, 0.32, z!), '#2b2b2f'));
  }
  const g = mergeGeometries(piezas, false);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  for (const p of piezas) p.dispose();
  geometriasFurgoneta.set(color, g);
  return g;
}

let geoTaxi: THREE.BufferGeometry | null = null;

/** Taxi de Sevilla: utilitario blanco con la franja amarilla en las puertas delanteras y el cartel
 *  luminoso en el techo (verde: libre). */
export function geometriaTaxi(): THREE.BufferGeometry {
  if (geoTaxi) return geoTaxi;
  const pintar = (g: THREE.BufferGeometry, c: string): THREE.BufferGeometry => {
    const col = new THREE.Color(c);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
    return g.index ? g.toNonIndexed() : g;
  };
  const piezas: THREE.BufferGeometry[] = [geometriaCoche('#f7f7f7').clone()];
  // Franja amarilla en diagonal en las dos puertas delanteras.
  for (const lado of [-1, 1]) piezas.push(pintar(new THREE.BoxGeometry(0.05, 0.42, 0.9).rotateX(-0.6 * lado).translate(lado * (ANCHO / 2 + 0.01), 0.55, -0.35), '#ffd200'));
  piezas.push(pintar(new THREE.BoxGeometry(0.62, 0.2, 0.28).translate(0, 1.37, 0.05), '#f7f7f7'));
  piezas.push(pintar(new THREE.BoxGeometry(0.22, 0.14, 0.2).translate(0, 1.42, -0.12), '#39d353'));
  const g = mergeGeometries(piezas, false);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  geoTaxi = g;
  return g;
}

export const CAMION_LARGO = 7.5, CAMION_ANCHO = 2.4;
let geoCamion: THREE.BufferGeometry | null = null;

/** El camión de la basura de Lipasam: cabina blanca y caja verde con la tolva detrás. */
export function geometriaCamion(): THREE.BufferGeometry {
  if (geoCamion) return geoCamion;
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
  piezas.push(pintar(new THREE.BoxGeometry(CAMION_ANCHO, 0.7, CAMION_LARGO).translate(0, 0.55, 0), '#5b5f66'));
  piezas.push(pintar(new THREE.BoxGeometry(CAMION_ANCHO, 1.9, 1.9).translate(0, 1.85, -2.7), '#f4f4f4'));
  piezas.push(pintar(new THREE.BoxGeometry(CAMION_ANCHO * 0.9, 0.7, 0.3).translate(0, 2.2, -3.6), '#9fd3e8'));
  piezas.push(pintar(new THREE.BoxGeometry(CAMION_ANCHO, 2.1, 4.6).translate(0, 1.95, 0.9), '#3f8f4a'));
  piezas.push(pintar(new THREE.BoxGeometry(CAMION_ANCHO * 0.9, 1.4, 0.6).translate(0, 1.4, 3.4), '#2e6e38'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.15, 0.1).translate(-0.8, 0.6, -CAMION_LARGO / 2), '#fff4c2'));
  piezas.push(pintar(new THREE.BoxGeometry(0.3, 0.15, 0.1).translate(0.8, 0.6, -CAMION_LARGO / 2), '#fff4c2'));
  piezas.push(pintar(new THREE.BoxGeometry(0.5, 0.2, 0.3).translate(0, 3.1, -2.7), '#ffa500'));
  for (const [x, z] of [[-1.05, -2.4], [1.05, -2.4], [-1.05, 1.6], [1.05, 1.6], [-1.05, 2.8], [1.05, 2.8]]) {
    piezas.push(pintar(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10).rotateZ(Math.PI / 2).translate(x!, 0.45, z!), '#2b2b2f'));
  }
  const g = mergeGeometries(piezas, false);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  for (const p of piezas) p.dispose();
  geoCamion = g;
  return g;
}

/** El camión: más pesado y lento que el 13, gira como un tráiler. */
export const CAMION: AjustesCoche = {
  aceleracion: 4.5,
  velocidadMaxima: 12,
  velocidadMarchaAtras: 3,
  frenado: 10,
  rozamiento: 0.5,
  giroParado: 0.6,
  giroMaximo: 1.3,
  agarre: 9,
  agarreDerrape: 2.2,
};

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

/** Apariencia alternativa (el bus del 13): geometría, escala visual y caja de colisión. */
export interface AparienciaCoche {
  geometria: THREE.BufferGeometry;
  escala: number;
  largo: number;
  ancho: number;
  nombre: string;
}

/** El 13 de Tussam: pesado, lento de reacción y con un radio de giro de autobús. */
export const BUS: AjustesCoche = {
  aceleracion: 5,
  velocidadMaxima: 14,
  velocidadMarchaAtras: 3,
  frenado: 11,
  rozamiento: 0.5,
  giroParado: 0.7,
  giroMaximo: 1.4,
  agarre: 9,
  agarreDerrape: 2.0,
};

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
  /** Segundos que le quedan a la alarma (solo los aparcados): saltó al golpearlo. */
  alarma = 0;
  private intermitentes: THREE.Group | null = null;
  /** 100 = nueva; por debajo de 30 echa humo; a 0 revienta y ya no arranca. */
  salud = 100;
  get rota(): boolean {
    return this.salud <= 0;
  }
  private rumbo = 0;
  private giroActual = 0;
  private velocidadPrevia = new THREE.Vector3();

  constructor(fisica: MundoFisico, x: number, z: number, rumbo: number, color: string, readonly ajustes: AjustesCoche = UTILITARIO, readonly apariencia: AparienciaCoche | null = null) {
    this.color = color;
    this.rumbo = rumbo;
    this.cuerpo = fisica.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(x, ALTO / 2 + 0.05, z).lockRotations().setLinearDamping(0.1).setCcdEnabled(true),
    );
    const largo = apariencia?.largo ?? LARGO, ancho = apariencia?.ancho ?? ANCHO;
    fisica.world.createCollider(
      R.ColliderDesc.cuboid(ancho / 2, ALTO / 2, largo / 2).setRestitution(0.4).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setDensity(apariencia ? 5 : 3),
      this.cuerpo,
    );
    this.malla = new THREE.Mesh(apariencia?.geometria ?? geometriaCoche(color), MATERIAL_COCHE);
    this.malla.scale.setScalar(apariencia?.escala ?? ESCALA_VISUAL);
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
    // Tope de seguridad: si la física ha disparado la velocidad (un empujón raro), se recorta.
    const tope = a.velocidadMaxima * 1.4;
    if (Math.abs(vf) > tope) vf = Math.sign(vf) * tope;
    if (Math.abs(vl) > tope) vl = Math.sign(vl) * tope;
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
    if (this.rota) acelerador = 0;
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
    if (golpe > 7 && this.conducida) this.salud = Math.max(0, this.salud - (golpe - 6) * 0.9);
    this.velocidadPrevia.set(v.x, v.y, v.z);
    this.sincronizar();
  }

  reposo(): void {
    if (this.cuerpo.isSleeping()) { this.estado.velocidad = 0; return; }
    const v = this.cuerpo.linvel();
    this.cuerpo.setLinvel({ x: v.x * 0.95, y: v.y, z: v.z * 0.95 }, true);
    this.estado.velocidad = Math.hypot(v.x, v.z);
    this.sincronizar();
  }

  /** Salta la alarma: intermitentes naranjas parpadeando en las cuatro esquinas durante `segundos`. */
  saltarAlarma(segundos: number): void {
    this.alarma = segundos;
    if (!this.intermitentes) {
      const g = new THREE.Group();
      const geo = new THREE.BoxGeometry(0.3, 0.16, 0.16);
      const mat = new THREE.MeshBasicMaterial({ color: '#ffb020' });
      for (const [x, z] of [[-ANCHO / 2, -LARGO / 2 + 0.2], [ANCHO / 2, -LARGO / 2 + 0.2], [-ANCHO / 2, LARGO / 2 - 0.2], [ANCHO / 2, LARGO / 2 - 0.2]]) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x!, ALTO * 0.55, z!);
        g.add(m);
      }
      this.intermitentes = g;
      this.malla.add(g);
    }
    this.intermitentes.visible = true;
  }

  /** Cuenta atrás de la alarma y parpadeo a 4 Hz. */
  actualizarAlarma(dt: number, tiempo: number): void {
    if (this.alarma <= 0 || !this.intermitentes) return;
    this.alarma -= dt;
    this.intermitentes.visible = this.alarma > 0 && Math.floor(tiempo * 4) % 2 === 0;
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
