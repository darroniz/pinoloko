// La scooter: modelo arcade sobre un cuerpo dinámico de Rapier (bola con rotaciones
// bloqueadas). La dirección del stick se interpreta en el plano de pantalla: la moto
// gira hacia donde apunta el stick y acelera cuando ya mira hacia allí.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { MundoFisico } from './mundo';
import { RAPIER as R } from './mundo';
import type { Entrada } from '../control/entrada';
import { crearWifly } from '../mundo/wifly';

export interface AjustesScooter {
  aceleracion: number;
  velocidadMaxima: number;
  velocidadMarchaAtras: number;
  frenado: number;
  rozamiento: number;
  giroParado: number;
  giroMaximo: number;
  agarre: number;
  agarreDerrape: number;
  inclinacionMaxima: number;
}

export interface ModeloScooter {
  nombre: string;
  color: string;
  ajustes: AjustesScooter;
}

export const JOG_RR: AjustesScooter = {
  aceleracion: 11,
  velocidadMaxima: 16,
  velocidadMarchaAtras: 3.5,
  frenado: 22,
  rozamiento: 0.9,
  giroParado: 2.2,
  giroMaximo: 3.4,
  agarre: 11,
  agarreDerrape: 2.2,
  inclinacionMaxima: 0.6,
};

export const MODELOS: ModeloScooter[] = [
  { nombre: 'Yamaha Jog RR', color: '#e63946', ajustes: JOG_RR },
  { nombre: 'Piaggio Zip SP', color: '#2b6cd9', ajustes: { ...JOG_RR, aceleracion: 10, velocidadMaxima: 15, giroMaximo: 3.7, agarre: 12 } },
  { nombre: 'Aprilia Sonic', color: '#f2c14e', ajustes: { ...JOG_RR, aceleracion: 12, velocidadMaxima: 17, giroMaximo: 3.1, agarreDerrape: 1.8 } },
  { nombre: 'Peugeot Speedfight', color: '#2a9d8f', ajustes: { ...JOG_RR, aceleracion: 10.5, velocidadMaxima: 16, frenado: 26 } },
  { nombre: 'Gilera Runner', color: '#7b2cbf', ajustes: { ...JOG_RR, aceleracion: 12.5, velocidadMaxima: 18, giroMaximo: 2.9, agarre: 10 } },
];

export interface EstadoScooter {
  x: number;
  z: number;
  rumbo: number;
  velocidad: number;
  velocidadLateral: number;
  derrapando: boolean;
  golpe: number;
}

const RADIO = 0.55;
/** Desde 66 m de altura una scooter real es un pixel: se dibuja a escala de juguete. */
const ESCALA_VISUAL = 1.6;

function diferenciaAngulo(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Scooter {
  readonly malla: THREE.Group;
  readonly cuerpo: RAPIER.RigidBody;
  readonly estado: EstadoScooter = { x: 0, z: 0, rumbo: 0, velocidad: 0, velocidadLateral: 0, derrapando: false, golpe: 0 };
  ajustes: AjustesScooter;
  private rumbo = 0;
  private inclinacion = 0;
  private velocidadPrevia = new THREE.Vector3();
  private readonly chasis: THREE.Group;
  private readonly ruedaDelantera: THREE.Mesh;
  private readonly ruedaTrasera: THREE.Mesh;
  private readonly manillar: THREE.Group;
  private giroActual = 0;
  private readonly piloto: THREE.Group;
  readonly modelo: ModeloScooter;
  conducida = false;

  constructor(fisica: MundoFisico, x: number, z: number, rumbo: number, modelo: ModeloScooter = MODELOS[0]!) {
    this.modelo = modelo;
    this.ajustes = modelo.ajustes;
    this.rumbo = rumbo;
    this.cuerpo = fisica.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(x, RADIO + 0.1, z).lockRotations().setLinearDamping(0.05).setCcdEnabled(true),
    );
    fisica.world.createCollider(
      R.ColliderDesc.ball(RADIO).setRestitution(0.55).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setDensity(2),
      this.cuerpo,
    );

    // Malla: cuerpo de scooter de dos tiempos, redondeado como un juguete.
    this.malla = new THREE.Group();
    this.chasis = new THREE.Group();
    this.chasis.scale.setScalar(ESCALA_VISUAL);
    this.malla.add(this.chasis);
    const carroceria = new THREE.MeshLambertMaterial({ color: modelo.color });
    const negro = new THREE.MeshLambertMaterial({ color: '#2b2b2f' });
    const cromo = new THREE.MeshLambertMaterial({ color: '#d0d4dc' });

    const cuerpoMoto = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 1.05), carroceria);
    cuerpoMoto.position.set(0, 0.42, 0.1);
    const asiento = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.62), negro);
    asiento.position.set(0, 0.66, 0.22);
    const plataforma = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.5), negro);
    plataforma.position.set(0, 0.26, -0.25);
    const escudo = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.16), carroceria);
    escudo.position.set(0, 0.55, -0.62);
    const escape = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6).rotateX(Math.PI / 2), cromo);
    escape.position.set(0.22, 0.28, 0.3);
    this.chasis.add(cuerpoMoto, asiento, plataforma, escudo, escape);

    const geoRueda = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12).rotateZ(Math.PI / 2);
    this.ruedaTrasera = new THREE.Mesh(geoRueda, negro);
    this.ruedaTrasera.position.set(0, 0.22, 0.58);
    this.ruedaDelantera = new THREE.Mesh(geoRueda, negro);
    this.ruedaDelantera.position.set(0, 0.22, -0.6);
    this.manillar = new THREE.Group();
    this.manillar.position.set(0, 0.88, -0.55);
    const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6).rotateZ(Math.PI / 2), cromo);
    const faro = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshLambertMaterial({ color: '#fff2b0', emissive: '#c9a640' }));
    faro.position.set(0, -0.12, -0.1);
    this.manillar.add(barra, faro);
    this.chasis.add(this.ruedaTrasera, this.ruedaDelantera, this.manillar);

    this.piloto = crearWifly(true).grupo;
    this.piloto.visible = false;
    this.chasis.add(this.piloto);
    // Aparcada: dormida y apoyada en el suelo hasta que alguien la toque o se suba.
    this.cuerpo.sleep();

    this.malla.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    this.sincronizar();
  }

  get posicion(): THREE.Vector3 {
    const t = this.cuerpo.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  get direccion(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.rumbo), 0, -Math.cos(this.rumbo));
  }

  /** Wifly se sube o se baja: el piloto se dibuja y la moto pasa a responder a la entrada. */
  montar(si: boolean): void {
    this.conducida = si;
    this.piloto.visible = si;
    if (si) this.cuerpo.wakeUp();
  }

  /** Paso sin conductor: solo sincroniza la malla (la física sigue por si la empujan). */
  reposo(): void {
    if (!this.cuerpo.isSleeping()) {
      const v = this.cuerpo.linvel();
      const rapidez = Math.hypot(v.x, v.z);
      // Sin nadie encima, se frena sola y no gira.
      this.cuerpo.setLinvel({ x: v.x * 0.96, y: v.y, z: v.z * 0.96 }, true);
      this.estado.velocidad = rapidez;
      this.sincronizar();
    }
  }

  teletransportar(x: number, z: number, rumbo: number): void {
    this.cuerpo.setTranslation({ x, y: RADIO + 0.1, z }, true);
    this.cuerpo.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.rumbo = rumbo;
    this.sincronizar();
  }

  /** Se llama antes de cada paso de física. */
  actualizar(entrada: Entrada, dt: number): void {
    const a = this.ajustes;
    const v = this.cuerpo.linvel();
    const fx = Math.sin(this.rumbo), fz = -Math.cos(this.rumbo);
    const rx = -fz, rz = fx;
    let vf = v.x * fx + v.z * fz;
    let vl = v.x * rx + v.z * rz;
    const rapidez = Math.abs(vf);

    // Dirección deseada en el plano de pantalla: arriba = norte (-z), derecha = este (+x).
    const sx = entrada.eje.x, sy = entrada.eje.y;
    const magnitud = Math.min(1, Math.hypot(sx, sy));
    const quiereIr = magnitud > 0.12;
    let acelerador = 0;
    let giroObjetivo = 0;
    if (quiereIr) {
      const rumboObjetivo = Math.atan2(sx, sy);
      const dif = diferenciaAngulo(this.rumbo, rumboObjetivo);
      const factorGiro = rapidez < 1 ? 1 : Math.max(0.55, 1 - rapidez / (a.velocidadMaxima * 2.4));
      const velocidadGiro = (rapidez < 0.8 ? a.giroParado : a.giroMaximo) * factorGiro;
      giroObjetivo = Math.max(-1, Math.min(1, dif / 0.35));
      const paso = Math.min(Math.abs(dif), velocidadGiro * dt * Math.min(1, Math.abs(dif) / 0.25 + 0.35));
      this.rumbo += Math.sign(dif) * paso;
      const alineado = Math.cos(dif);
      // Si el stick apunta casi al revés, la moto frena y gira sobre sí misma en vez de acelerar.
      acelerador = alineado > 0.15 ? magnitud * Math.max(0.35, alineado) : 0;
      if (alineado < -0.3 && rapidez > 1.5) vf -= Math.sign(vf) * a.frenado * 0.7 * dt;
    }
    this.giroActual += (giroObjetivo - this.giroActual) * Math.min(1, dt * 10);

    // Freno y marcha atrás.
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

    // Agarre lateral: normal en recta, menos cuando frenas girando (derrape del trasero).
    const derrapando = (entrada.freno && rapidez > 3 && Math.abs(this.giroActual) > 0.3) || Math.abs(vl) > 2.6;
    const agarre = derrapando ? a.agarreDerrape : a.agarre;
    vl -= vl * Math.min(1, agarre * dt);
    // Girar a velocidad tira del trasero hacia fuera: eso es lo que luego se ve como derrape.
    if (rapidez > 4 && Math.abs(this.giroActual) > 0.2) vl -= this.giroActual * rapidez * (derrapando ? 0.9 : 0.25) * dt;

    // Nuevas velocidades: la vertical se deja a la física (gravedad, saltitos).
    // Recalcula fx/fz porque el rumbo ha cambiado dentro de este paso.
    const nfx = Math.sin(this.rumbo), nfz = -Math.cos(this.rumbo);
    const nrx = -nfz, nrz = nfx;
    this.cuerpo.setLinvel({ x: vf * nfx + vl * nrx, y: v.y, z: vf * nfz + vl * nrz }, true);

    this.estado.velocidad = vf;
    this.estado.velocidadLateral = vl;
    this.estado.derrapando = derrapando && rapidez > 2;

    // Inclinación visual: girar rápido inclina la moto hacia dentro.
    const objetivo = -this.giroActual * Math.min(1, rapidez / 6) * a.inclinacionMaxima;
    this.inclinacion += (objetivo - this.inclinacion) * Math.min(1, dt * 8);
  }

  /** Se llama después del paso de física: detecta golpes y sincroniza la malla. */
  despuesDelPaso(): void {
    const v = this.cuerpo.linvel();
    const dvx = v.x - this.velocidadPrevia.x, dvz = v.z - this.velocidadPrevia.z;
    const golpe = Math.hypot(dvx, dvz);
    this.estado.golpe = golpe > 5 ? golpe : 0;
    this.velocidadPrevia.set(v.x, v.y, v.z);
    this.sincronizar();
  }

  private sincronizar(): void {
    const t = this.cuerpo.translation();
    this.estado.x = t.x;
    this.estado.z = t.z;
    this.estado.rumbo = this.rumbo;
    this.malla.position.set(t.x, t.y - RADIO, t.z);
    this.malla.rotation.set(0, -this.rumbo, 0, 'YXZ');
    this.chasis.rotation.z = this.inclinacion;
    // Derrape: el chasis gira un poco más que el rumbo para que se vea cruzarse.
    this.chasis.rotation.y = -this.estado.velocidadLateral * 0.06;
    this.manillar.rotation.y = -this.giroActual * 0.5;
    const giroRuedas = this.estado.velocidad * 0.016 / 0.22;
    this.ruedaTrasera.rotation.x += giroRuedas;
    this.ruedaDelantera.rotation.x += giroRuedas;
  }
}
