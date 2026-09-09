// Pachangas: niños jugando al fútbol en los pasajes y los campitos del barrio. El balón es un
// cuerpo de Rapier de verdad (lo chutas con la moto o a pie), la portería tiene postes y red, y
// los niños persiguen el balón, lo chutan hacia la portería y se apartan si vienes lanzado.
// La lógica de los niños es pura (testeable); los cuerpos y las mallas van aparte.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { MundoFisico, RAPIER as R } from '../fisica/mundo';
import type { Nivel, Punto } from './tipos';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Nino {
  x: number;
  z: number;
  rumbo: number;
  estado: 'jugar' | 'apartarse';
  tiempo: number;
  enfriamiento: number;
  fase: number;
  equipo: 0 | 1;
}

export interface Chut {
  vx: number;
  vz: number;
}

const VELOCIDAD_NINO = 2.6;
const RADIO_APARTARSE = 7;
/** Más grande que uno de verdad: desde 66 m un balón de 22 cm es un píxel. */
export const RADIO_BALON = 0.55;

/**
 * Un paso de un niño: corre al balón, lo chuta hacia la portería (con desvío) cuando lo tiene a
 * mano, y se aparta corriendo si el jugador viene lanzado. Devuelve el chut si lo ha habido.
 */
export function pasoNino(n: Nino, balon: { x: number; z: number; rapidez: number }, porteria: { x: number; z: number }, jugador: { x: number; z: number; rapidez: number }, dt: number, rnd: () => number): Chut | null {
  n.enfriamiento -= dt;
  n.tiempo -= dt;
  const djx = n.x - jugador.x, djz = n.z - jugador.z;
  const dj2 = djx * djx + djz * djz;
  if (n.estado === 'jugar' && dj2 < RADIO_APARTARSE * RADIO_APARTARSE && jugador.rapidez > 3) { n.estado = 'apartarse'; n.tiempo = 1.5 + rnd(); }
  if (n.estado === 'apartarse') {
    const d = Math.sqrt(dj2) || 1;
    n.rumbo = Math.atan2(djx / d, -djz / d);
    n.x += Math.sin(n.rumbo) * 4 * dt;
    n.z += -Math.cos(n.rumbo) * 4 * dt;
    n.fase += dt * 12;
    if (n.tiempo <= 0) n.estado = 'jugar';
    return null;
  }
  const bx = balon.x - n.x, bz = balon.z - n.z;
  const db = Math.hypot(bx, bz);
  // No se amontonan: si el balón está lejos y va rápido, esperan a que pare.
  if (db > 1.1 && !(balon.rapidez > 6 && db > 6)) {
    const objetivo = Math.atan2(bx, -bz);
    let dif = objetivo - n.rumbo;
    while (dif > Math.PI) dif -= Math.PI * 2;
    while (dif < -Math.PI) dif += Math.PI * 2;
    n.rumbo += dif * Math.min(1, dt * 8);
    n.x += Math.sin(n.rumbo) * VELOCIDAD_NINO * dt;
    n.z += -Math.cos(n.rumbo) * VELOCIDAD_NINO * dt;
    n.fase += dt * 9;
    return null;
  }
  if (db > 1.1 || n.enfriamiento > 0 || balon.rapidez > 3) return null;
  n.enfriamiento = 1.2 + rnd() * 0.8;
  // Chut hacia la portería con desvío: los niños fallan mucho, que para eso son niños.
  const px = porteria.x - balon.x, pz = porteria.z - balon.z;
  const dp = Math.hypot(px, pz) || 1;
  const angulo = Math.atan2(px / dp, -pz / dp) + (rnd() - 0.5) * 0.9;
  const fuerza = 4 + rnd() * 4;
  return { vx: Math.sin(angulo) * fuerza, vz: -Math.cos(angulo) * fuerza };
}

/** ¿El balón está dentro de la portería (entre los postes y pasada la línea)? */
export function esGol(balon: { x: number; z: number }, porteria: { x: number; z: number; rumbo: number }, ancho = 4, fondo = 1.4): boolean {
  const fx = Math.sin(porteria.rumbo), fz = -Math.cos(porteria.rumbo);
  const dx = balon.x - porteria.x, dz = balon.z - porteria.z;
  const profundo = dx * fx + dz * fz;
  const lateral = Math.abs(-dx * fz + dz * fx);
  return profundo > 0.1 && profundo < fondo && lateral < ancho / 2;
}

interface Pachanga {
  x: number;
  z: number;
  porteria: { x: number; z: number; rumbo: number };
  balon: RAPIER.RigidBody;
  malla: THREE.Mesh;
  ninos: Nino[];
  /** Segundos desde que el jugador tocó el balón (para saber de quién es el gol). */
  desdeJugador: number;
  reinicio: number;
  goles: number;
}

/** Centros de campos y pasajes anchos donde cabe una pachanga, lejos entre sí. */
export function sitiosPachanga(nivel: Pick<Nivel, 'zonas' | 'vias'>, cuantos: number, evitar: Punto[]): { x: number; z: number; rumbo: number }[] {
  const sitios: { x: number; z: number; rumbo: number }[] = [];
  const lejos = (x: number, z: number, minimo: number): boolean =>
    sitios.every((s) => Math.hypot(s.x - x, s.z - z) > minimo) && evitar.every(([ex, ez]) => Math.hypot(ex - x, ez - z) > 25);
  for (const clase of ['pitch', 'playground']) {
    for (const zona of nivel.zonas) {
      if (zona.clase !== clase || sitios.length >= cuantos) continue;
      const n = zona.poligono.length;
      const cx = zona.poligono.reduce((a, p) => a + p[0], 0) / n, cz = zona.poligono.reduce((a, p) => a + p[1], 0) / n;
      // Orientación: el lado más largo del polígono.
      let mejor = { l: 0, rumbo: 0 };
      for (let i = 0; i < n; i++) {
        const [ax, az] = zona.poligono[i]!, [bx, bz] = zona.poligono[(i + 1) % n]!;
        const l = Math.hypot(bx - ax, bz - az);
        if (l > mejor.l) mejor = { l, rumbo: Math.atan2(bx - ax, -(bz - az)) };
      }
      if (mejor.l >= 12 && lejos(cx, cz, 80)) sitios.push({ x: cx, z: cz, rumbo: mejor.rumbo });
    }
  }
  for (const via of nivel.vias) {
    if (sitios.length >= cuantos) break;
    if (via.clase !== 'peatonal' || via.tipo !== 'pedestrian' || via.ancho < 5) continue;
    for (let i = 0; i + 1 < via.puntos.length; i++) {
      const [ax, az] = via.puntos[i]!, [bx, bz] = via.puntos[i + 1]!;
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 30) continue;
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      if (!lejos(cx, cz, 120)) continue;
      sitios.push({ x: cx, z: cz, rumbo: Math.atan2(bx - ax, -(bz - az)) });
      break;
    }
  }
  return sitios;
}

function geometriaBalon(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(RADIO_BALON, 10, 8).toNonIndexed();
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 3) {
    const negro = (Math.floor(uv.getX(i) * 5) + Math.floor(uv.getY(i) * 4)) % 3 === 0;
    for (let k = 0; k < 3; k++) { const v = negro ? 0.12 : 0.97; col[(i + k) * 3] = v; col[(i + k) * 3 + 1] = v; col[(i + k) * 3 + 2] = v; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export class Pachangas {
  readonly grupo = new THREE.Group();
  readonly lista: Pachanga[] = [];
  private ninos: THREE.InstancedMesh[] = [];
  private rnd = azar(777);
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3(0.68, 0.68, 0.68);
  private eje = new THREE.Vector3(0, 1, 0);

  constructor(fisica: MundoFisico, nivel: Pick<Nivel, 'zonas' | 'vias'>, cuantas: number, evitar: Punto[]) {
    this.grupo.name = 'pachangas';
    const sitios = sitiosPachanga(nivel, cuantas, evitar);
    if (!sitios.length) return;
    const geoBalon = geometriaBalon();
    const matBalon = new THREE.MeshLambertMaterial({ vertexColors: true });
    const blanco = new THREE.MeshLambertMaterial({ color: '#f7f7f7' });
    const poste = new THREE.CylinderGeometry(0.07, 0.07, 2, 6);
    const geoPorteria = mergeGeometries([
      poste.clone().translate(-2, 1, 0), poste.clone().translate(2, 1, 0),
      new THREE.CylinderGeometry(0.07, 0.07, 4.14, 6).rotateZ(Math.PI / 2).translate(0, 2, 0),
      new THREE.BoxGeometry(4.2, 0.02, 1.4).translate(0, 0.02, 0.7),
    ]);
    const red = new THREE.Mesh(new THREE.BoxGeometry(4.14, 2, 0.04).translate(0, 1, 1.4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    for (const s of sitios) {
      // La portería a 9 m del centro por el eje largo, mirando al centro.
      const fx = Math.sin(s.rumbo), fz = -Math.cos(s.rumbo);
      const porteria = { x: s.x + fx * 9, z: s.z + fz * 9, rumbo: s.rumbo };
      const mp = new THREE.Mesh(geoPorteria, blanco);
      mp.castShadow = true;
      mp.position.set(porteria.x, 0, porteria.z);
      mp.rotation.y = -s.rumbo + Math.PI; // el fondo (la red) queda detrás de la línea
      mp.add(red.clone());
      this.grupo.add(mp);
      // Postes y red con cuerpo fijo para que el balón rebote y se quede dentro.
      const fijo = fisica.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(porteria.x, 0, porteria.z).setRotation({ x: 0, y: Math.sin((-s.rumbo + Math.PI) / 2), z: 0, w: Math.cos((-s.rumbo + Math.PI) / 2) }));
      for (const px of [-2.07, 2.07]) fisica.world.createCollider(R.ColliderDesc.cylinder(1, 0.07).setTranslation(px, 1, 0).setRestitution(0.8), fijo);
      fisica.world.createCollider(R.ColliderDesc.cuboid(2.07, 1, 0.05).setTranslation(0, 1, 1.4).setRestitution(0.1), fijo);
      for (const lado of [-1, 1]) fisica.world.createCollider(R.ColliderDesc.cuboid(0.05, 1, 0.7).setTranslation(lado * 2.07, 1, 0.7).setRestitution(0.1), fijo);
      const balon = fisica.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(s.x, RADIO_BALON + 0.05, s.z).setLinearDamping(0.6).setAngularDamping(0.9).setCcdEnabled(true));
      fisica.world.createCollider(R.ColliderDesc.ball(RADIO_BALON).setDensity(1.2).setRestitution(0.65).setFriction(0.8), balon);
      const malla = new THREE.Mesh(geoBalon, matBalon);
      malla.castShadow = true;
      this.grupo.add(malla);
      const ninos: Nino[] = [];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + this.rnd();
        ninos.push({ x: s.x + Math.cos(a) * 4, z: s.z + Math.sin(a) * 4, rumbo: 0, estado: 'jugar', tiempo: 0, enfriamiento: this.rnd() * 2, fase: this.rnd() * 6, equipo: (i % 2) as 0 | 1 });
      }
      this.lista.push({ x: s.x, z: s.z, porteria, balon, malla, ninos, desdeJugador: 99, reinicio: 0, goles: 0 });
    }
    // Los niños: cápsulas pequeñas, dos camisetas.
    const geoNino = mergeGeometries([new THREE.CapsuleGeometry(0.28, 0.6, 3, 8).translate(0, 0.72, 0), new THREE.SphereGeometry(0.26, 8, 6).translate(0, 1.42, 0)]);
    for (const color of ['#d62828', '#1d3fa8']) {
      const im = new THREE.InstancedMesh(geoNino, new THREE.MeshLambertMaterial({ color }), this.lista.length * 4);
      im.count = 0;
      im.castShadow = true;
      im.frustumCulled = false;
      this.ninos.push(im);
      this.grupo.add(im);
    }
  }

  /** Mueve niños y balones (llamar tras el paso de física). Devuelve los goles del jugador y de los niños. */
  actualizar(jugador: { x: number; z: number; rapidez: number }, dt: number): { golesJugador: number; golesNinos: number; chuts: number } {
    let golesJugador = 0, golesNinos = 0, chuts = 0;
    const cuentas = [0, 0];
    for (const pa of this.lista) {
      const t = pa.balon.translation();
      const v = pa.balon.linvel();
      const rapidez = Math.hypot(v.x, v.z);
      pa.malla.position.set(t.x, t.y, t.z);
      const r = pa.balon.rotation();
      pa.malla.quaternion.set(r.x, r.y, r.z, r.w);
      pa.desdeJugador += dt;
      if (Math.hypot(t.x - jugador.x, t.z - jugador.z) < 2.2) pa.desdeJugador = 0;
      // Muy lejos del jugador la pachanga se congela (y el balón duerme solo).
      const cerca = (pa.x - jugador.x) ** 2 + (pa.z - jugador.z) ** 2 < 120 * 120;
      if (pa.reinicio > 0) {
        pa.reinicio -= dt;
        if (pa.reinicio <= 0) {
          pa.balon.setTranslation({ x: pa.x, y: RADIO_BALON + 0.05, z: pa.z }, true);
          pa.balon.setLinvel({ x: 0, y: 0, z: 0 }, true);
          pa.balon.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      } else if (esGol({ x: t.x, z: t.z }, pa.porteria)) {
        pa.reinicio = 1.6;
        pa.goles++;
        if (pa.desdeJugador < 4) golesJugador++; else golesNinos++;
      } else if (Math.hypot(t.x - pa.x, t.z - pa.z) > 45 || t.y < -2) {
        // Se ha ido muy lejos (o se ha caído del mundo): vuelve al centro.
        pa.reinicio = 0.1;
      }
      if (cerca && pa.reinicio <= 0) {
        for (const n of pa.ninos) {
          const chut = pasoNino(n, { x: t.x, z: t.z, rapidez }, pa.porteria, jugador, dt, this.rnd);
          if (chut) {
            chuts++;
            const masa = pa.balon.mass();
            pa.balon.applyImpulse({ x: chut.vx * masa, y: 1.5 * masa, z: chut.vz * masa }, true);
          }
        }
      }
      for (const n of pa.ninos) {
        if (!cerca) continue;
        this.p.set(n.x, Math.abs(Math.sin(n.fase)) * 0.06, n.z);
        this.q.setFromAxisAngle(this.eje, -n.rumbo);
        this.m.compose(this.p, this.q, this.s);
        this.ninos[n.equipo]!.setMatrixAt(cuentas[n.equipo]!++, this.m);
      }
    }
    this.ninos.forEach((im, i) => { im.count = cuentas[i]!; im.instanceMatrix.needsUpdate = true; });
    return { golesJugador, golesNinos, chuts };
  }
}
