// La vecina del quinto: si armas lío pegado a un bloque, sale a la azotea en bata, te grita y te
// tira una maceta a donde calcula que vas a estar. Si te da, macetazo (la moto se tambalea y
// pierde salud); si no, la maceta se hace cascos en el suelo. Lógica del lanzamiento sin Three
// (testeable); lo visible, en la misma clase.
import * as THREE from 'three';
import { distanciaSegmento2 } from './geometria';
import type { Edificio, Punto } from './tipos';

export const RADIO_MACETAZO = 2.1;
export const ALTURA_MINIMA = 8;
/** Frases al asomarse, siempre de barrio y siempre cariñosas (a su manera). */
export const GRITOS_VECINA = ['¡Niñato, que son las tantas!', '¡Wifly, que se lo digo a tu madre!', '¡Toma maceta, cafre!', '¡A ver si os calláis ya, hombre!', '¡Que estoy viendo la novela!', '¡Esto lo sabe tu abuela!'];

/** Punto de la fachada de `edificio` más cercano a (x, z): dónde se asoma la vecina. */
export function bordeMasCercano(poligono: Punto[], x: number, z: number): { x: number; z: number; d: number } {
  let mejor = { x: 0, z: 0, d: Infinity };
  for (let i = 0; i < poligono.length; i++) {
    const [ax, az] = poligono[i]!;
    const [bx, bz] = poligono[(i + 1) % poligono.length]!;
    const { d2, t } = distanciaSegmento2(x, z, ax, az, bx, bz);
    if (d2 < mejor.d * mejor.d) mejor = { x: ax + (bx - ax) * t, z: az + (bz - az) * t, d: Math.sqrt(d2) };
  }
  return mejor;
}

/** El bloque de más de dos plantas con fachada a menos de `radio` m del jugador, y dónde asomarse. */
export function bloqueCercano(edificios: Edificio[], x: number, z: number, radio: number): { edificio: Edificio; borde: { x: number; z: number } } | null {
  let mejor: { edificio: Edificio; borde: { x: number; z: number }; d: number } | null = null;
  for (const e of edificios) {
    if (e.altura < ALTURA_MINIMA || e.tipo !== 'bloque') continue;
    const b = bordeMasCercano(e.poligono, x, z);
    if (b.d > radio || (mejor && b.d >= mejor.d)) continue;
    mejor = { edificio: e, borde: { x: b.x, z: b.z }, d: b.d };
  }
  return mejor;
}

/** Dónde apunta: a donde va a estar el jugador cuando caiga la maceta (adelanta un poco). */
export function puntoDeCaida(jugador: { x: number; z: number; vx: number; vz: number }, vuelo: number): { x: number; z: number } {
  return { x: jugador.x + jugador.vx * vuelo * 0.75, z: jugador.z + jugador.vz * vuelo * 0.75 };
}

/** Posición de la maceta a la fracción `u` (0 sale, 1 cae): recta con arco por encima. */
export function posicionMaceta(desde: { x: number; y: number; z: number }, hasta: { x: number; z: number }, u: number): { x: number; y: number; z: number } {
  return { x: desde.x + (hasta.x - desde.x) * u, y: desde.y + (0.3 - desde.y) * u + 3 * u * (1 - u), z: desde.z + (hasta.z - desde.z) * u };
}

export class Vecina {
  readonly grupo = new THREE.Group();
  private figura: THREE.Group;
  private brazo: THREE.Mesh;
  private maceta: THREE.Mesh;
  private estado: 'dentro' | 'asomada' | 'lanzada' = 'dentro';
  private tiempo = 0;
  private enfriamiento = 0;
  private desde = { x: 0, y: 0, z: 0 };
  private hasta = { x: 0, z: 0 };
  private vuelo = 1;

  constructor() {
    this.grupo.name = 'vecina';
    const bata = new THREE.MeshLambertMaterial({ color: '#f2b5c4' });
    const piel = new THREE.MeshLambertMaterial({ color: '#e0ac8b' });
    const pelo = new THREE.MeshLambertMaterial({ color: '#d8d8d8' });
    this.figura = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.6, 3, 8).translate(0, 0.75, 0), bata);
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6).translate(0, 1.45, 0), piel);
    const mono = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5).translate(0, 1.72, 0.05), pelo);
    this.brazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.6, 2, 6).translate(0, 0.35, 0), piel);
    this.brazo.position.set(0.36, 1.1, 0);
    this.brazo.rotation.z = -2.6;
    this.figura.add(cuerpo, cabeza, mono, this.brazo);
    this.figura.scale.setScalar(1.2);
    this.figura.visible = false;
    this.maceta = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.4, 7).translate(0, 0.2, 0), new THREE.MeshLambertMaterial({ color: '#d98a5a' }));
    this.maceta.visible = false;
    this.grupo.add(this.figura, this.maceta);
  }

  get activa(): boolean { return this.estado !== 'dentro'; }
  get fase(): string { return this.estado; }

  /** Intenta asomarla: hay bloque a mano y no acaba de hacerlo. Devuelve el grito o null. */
  asomar(edificios: Edificio[], jugador: { x: number; z: number }, rnd: () => number): string | null {
    if (this.estado !== 'dentro' || this.enfriamiento > 0) return null;
    const b = bloqueCercano(edificios, jugador.x, jugador.z, 16);
    if (!b) return null;
    this.estado = 'asomada';
    this.tiempo = 0;
    this.enfriamiento = 22;
    this.desde = { x: b.borde.x, y: b.edificio.altura + 0.05, z: b.borde.z };
    this.figura.position.set(this.desde.x, this.desde.y, this.desde.z);
    this.figura.rotation.y = Math.atan2(jugador.x - this.desde.x, jugador.z - this.desde.z);
    this.figura.visible = true;
    this.brazo.rotation.z = -2.6;
    this.maceta.visible = true;
    return GRITOS_VECINA[Math.floor(rnd() * GRITOS_VECINA.length)]!;
  }

  /** Un paso. Devuelve 'macetazo' si la maceta cae encima del jugador, 'cascos' si cae al suelo. */
  actualizar(jugador: { x: number; z: number; vx: number; vz: number }, dt: number): { evento: 'macetazo' | 'cascos' | null; x: number; z: number } {
    this.enfriamiento = Math.max(0, this.enfriamiento - dt);
    const nada = { evento: null, x: 0, z: 0 };
    if (this.estado === 'dentro') return nada;
    this.tiempo += dt;
    if (this.estado === 'asomada') {
      // La maceta en la mano levantada; al segundo, la suelta hacia donde vas a estar.
      this.maceta.position.set(this.desde.x + Math.sin(this.figura.rotation.y) * 0.3, this.desde.y + 2.1, this.desde.z + Math.cos(this.figura.rotation.y) * 0.3);
      if (this.tiempo < 1.0) return nada;
      const dist = Math.hypot(jugador.x - this.desde.x, jugador.z - this.desde.z);
      this.vuelo = 0.8 + dist / 30;
      this.hasta = puntoDeCaida(jugador, this.vuelo);
      this.desde = { x: this.maceta.position.x, y: this.maceta.position.y, z: this.maceta.position.z };
      this.estado = 'lanzada';
      this.tiempo = 0;
      this.brazo.rotation.z = -0.9;
      return nada;
    }
    const u = Math.min(1, this.tiempo / this.vuelo);
    const p = posicionMaceta(this.desde, this.hasta, u);
    this.maceta.position.set(p.x, p.y, p.z);
    this.maceta.rotation.x = u * 6;
    if (this.tiempo > this.vuelo + 1.6) { this.estado = 'dentro'; this.figura.visible = false; }
    if (u < 1 || this.maceta.visible === false) return nada;
    this.maceta.visible = false;
    const acierto = Math.hypot(jugador.x - this.hasta.x, jugador.z - this.hasta.z) < RADIO_MACETAZO;
    return { evento: acierto ? 'macetazo' : 'cascos', x: this.hasta.x, z: this.hasta.z };
  }

  retirar(): void {
    this.estado = 'dentro';
    this.figura.visible = false;
    this.maceta.visible = false;
  }
}
