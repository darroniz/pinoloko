// Patrullas de la Policía Local. Coches por el grafo rodado y, a partir de tres estrellas,
// motos que sí entran por los pasajes. Cuerpos dinámicos pesados guiados por velocidad
// (como el tráfico): te embisten, pero un contenedor las frena. Persiguen por el grafo
// (Dijkstra hasta el nodo más cercano al jugador) y, cuando lo tienen a tiro sin edificios
// en medio, van a por él en línea recta.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { MundoFisico } from '../fisica/mundo';
import { RAPIER as R } from '../fisica/mundo';
import { ALTO, ANCHO, LARGO, MATERIAL_COCHE, geometriaCoche } from '../fisica/coche';
import type { GrafoBarrio } from '../mundo/grafo';
import type { ClaseVia } from '../mundo/tipos';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type TipoPatrulla = 'coche' | 'moto';

export interface Patrulla {
  tipo: TipoPatrulla;
  cuerpo: RAPIER.RigidBody;
  malla: THREE.Group;
  luz: THREE.Mesh;
  x: number;
  z: number;
  rumbo: number;
  velocidad: number;
  ruta: number[];
  tiempoRuta: number;
  directo: boolean;
  tiempoEncima: number;
  vida: number;
  /** Segundos acumulados sin encontrar ruta hasta el jugador: se retira y vuelve por otro lado. */
  sinRuta: number;
  /** Segundos seguidos con un edificio entre medias (histéresis para no parpadear entre modos). */
  tiempoBloqueado: number;
}

const VELOCIDAD: Record<TipoPatrulla, number> = { coche: 11.5, moto: 13.5 };
const RADIO_VISTA = 55;
const RADIO_DIRECTO = 26;
const RADIO_TRINCAR = 3.2;

let geoMoto: THREE.BufferGeometry | null = null;
function geometriaMotoPatrulla(): THREE.BufferGeometry {
  if (geoMoto) return geoMoto;
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
  piezas.push(pintar(new THREE.BoxGeometry(0.5, 0.4, 1.4).translate(0, 0.5, 0), '#f4f4f4'));
  piezas.push(pintar(new THREE.BoxGeometry(0.5, 0.16, 0.7).translate(0, 0.78, 0.2), '#1f4fd8'));
  piezas.push(pintar(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 10).rotateZ(Math.PI / 2).translate(0, 0.26, -0.7), '#2b2b2f'));
  piezas.push(pintar(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 10).rotateZ(Math.PI / 2).translate(0, 0.26, 0.7), '#2b2b2f'));
  piezas.push(pintar(new THREE.CapsuleGeometry(0.18, 0.3, 3, 8).translate(0, 1.05, 0.15), '#1f4fd8'));
  piezas.push(pintar(new THREE.SphereGeometry(0.17, 8, 6).translate(0, 1.42, 0.1), '#f4f4f4'));
  geoMoto = mergeGeometries(piezas, false);
  geoMoto.computeVertexNormals();
  return geoMoto;
}

export class Patrullas {
  readonly grupo = new THREE.Group();
  readonly lista: Patrulla[] = [];
  private materialLuz = new THREE.MeshLambertMaterial({ color: '#2b5cff', emissive: '#2b5cff', emissiveIntensity: 1 });
  private materialLuzRoja = new THREE.MeshLambertMaterial({ color: '#ff3b3b', emissive: '#ff3b3b', emissiveIntensity: 1 });
  private tiempoLuz = 0;
  private q = new THREE.Quaternion();
  private eje = new THREE.Vector3(0, 1, 0);

  constructor(private readonly fisica: MundoFisico, private readonly grafo: GrafoBarrio) {}

  /** Aparece una patrulla en un nodo del grafo lejos del jugador pero no demasiado. */
  aparecer(tipo: TipoPatrulla, jugador: { x: number; z: number }, rnd: () => number): Patrulla | null {
    const clase: ClaseVia | undefined = tipo === 'coche' ? 'rodada' : undefined;
    // Solo nodos desde los que se llega al jugador: la caja corta calles en el borde y deja
    // trozos de grafo sueltos donde una patrulla se quedaría dando vueltas.
    const objetivo = this.grafo.masCercano(jugador.x, jugador.z, clase);
    const alcanzables = this.grafo.alcanzables(objetivo, clase, true);
    const candidatos: number[] = [];
    for (let i = 0; i < this.grafo.nodos.length; i++) {
      if (!alcanzables.has(i)) continue;
      const [x, z] = this.grafo.nodos[i]!;
      const d = Math.hypot(x - jugador.x, z - jugador.z);
      if (d > 70 && d < 160) candidatos.push(i);
    }
    if (!candidatos.length) for (const i of alcanzables) { const [x, z] = this.grafo.nodos[i]!; if (Math.hypot(x - jugador.x, z - jugador.z) > 40) candidatos.push(i); }
    if (!candidatos.length) return null;
    const nodo = candidatos[Math.floor(rnd() * candidatos.length)]!;
    const [x, z] = this.grafo.nodos[nodo]!;
    const cuerpo = this.fisica.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(x, ALTO / 2, z).lockRotations().setLinearDamping(2),
    );
    const malla = new THREE.Group();
    let luz: THREE.Mesh;
    if (tipo === 'coche') {
      this.fisica.world.createCollider(
        R.ColliderDesc.cuboid(ANCHO / 2, ALTO / 2, LARGO / 2).setDensity(6).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setRestitution(0.2),
        cuerpo,
      );
      const carroceria = new THREE.Mesh(geometriaCoche('#f4f4f4'), MATERIAL_COCHE);
      const franja = new THREE.Mesh(new THREE.BoxGeometry(ANCHO + 0.02, 0.2, LARGO * 0.7), new THREE.MeshLambertMaterial({ color: '#1f4fd8' }));
      franja.position.set(0, 0.62, 0.1);
      luz = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.3), this.materialLuz);
      luz.position.set(0, 1.35, 0.1);
      malla.add(carroceria, franja, luz);
      malla.scale.setScalar(1.35);
    } else {
      this.fisica.world.createCollider(
        R.ColliderDesc.cuboid(0.35, 0.6, 0.8).setDensity(4).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setRestitution(0.2),
        cuerpo,
      );
      const moto = new THREE.Mesh(geometriaMotoPatrulla(), MATERIAL_COCHE);
      luz = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), this.materialLuz);
      luz.position.set(0, 0.95, -0.5);
      malla.add(moto, luz);
      malla.scale.setScalar(1.6);
    }
    malla.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    this.grupo.add(malla);
    const p: Patrulla = { tipo, cuerpo, malla, luz, x, z, rumbo: 0, velocidad: 0, ruta: [nodo], tiempoRuta: 0, directo: false, tiempoEncima: 0, vida: 0, sinRuta: 0, tiempoBloqueado: 0 };
    this.lista.push(p);
    this.colocar(p);
    return p;
  }

  retirar(p: Patrulla): void {
    this.fisica.world.removeRigidBody(p.cuerpo);
    this.grupo.remove(p.malla);
    const i = this.lista.indexOf(p);
    if (i >= 0) this.lista.splice(i, 1);
  }

  retirarTodas(): void {
    for (const p of [...this.lista]) this.retirar(p);
  }

  /** Coloca de golpe (al nacer). */
  private colocar(p: Patrulla): void {
    this.q.setFromAxisAngle(this.eje, -p.rumbo);
    p.cuerpo.setTranslation({ x: p.x, y: p.tipo === 'coche' ? ALTO / 2 + 0.02 : 0.62, z: p.z }, true);
    p.cuerpo.setRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w }, true);
    p.malla.position.set(p.x, 0.02, p.z);
    p.malla.rotation.y = -p.rumbo;
  }

  /** Velocidad hacia donde quiere ir; la física decide dónde acaba. */
  private guiar(p: Patrulla, vx: number, vz: number): void {
    const v = p.cuerpo.linvel();
    p.cuerpo.setLinvel({ x: vx, y: v.y, z: vz }, true);
    this.q.setFromAxisAngle(this.eje, -p.rumbo);
    p.cuerpo.setRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w }, true);
  }

  /** Tras el paso de física: lee las posiciones reales. */
  despuesDelPaso(): void {
    for (const p of this.lista) {
      const t = p.cuerpo.translation();
      p.x = t.x;
      p.z = t.z;
      p.malla.position.set(p.x, 0.02, p.z);
      p.malla.rotation.y = -p.rumbo;
    }
  }

  /** ¿Hay línea recta sin edificios entre la patrulla y el jugador? */
  private despejado(p: Patrulla, jugador: { x: number; z: number }): boolean {
    const dx = jugador.x - p.x, dz = jugador.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) return true;
    const rayo = new R.Ray({ x: p.x, y: 1.0, z: p.z }, { x: dx / d, y: 0, z: dz / d });
    const golpe = this.fisica.world.castRay(rayo, d, true, undefined, undefined, undefined, undefined, (c) => c.parent()?.bodyType() === R.RigidBodyType.Fixed);
    return golpe === null;
  }

  /**
   * Mueve las patrullas. Devuelve si alguna ve al jugador y si lo han trincado.
   * `esquivable`: el jugador está donde un coche patrulla no entra (pasaje); solo las motos siguen.
   */
  actualizar(jugador: { x: number; z: number; rapidez: number; enPasaje: boolean }, dt: number): { visto: boolean; trincado: boolean; choques: number } {
    let visto = false, trincado = false, choques = 0;
    this.tiempoLuz += dt;
    const rojo = Math.floor(this.tiempoLuz * 4) % 2 === 0;
    for (const p of [...this.lista]) {
      if (p.sinRuta > 4) { this.retirar(p); continue; }
      p.vida += dt;
      p.luz.material = rojo ? this.materialLuzRoja : this.materialLuz;
      const dx = jugador.x - p.x, dz = jugador.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < RADIO_VISTA) visto = true;
      const clase: ClaseVia | undefined = p.tipo === 'coche' ? 'rodada' : undefined;

      // Modo directo: cerca (o con el grafo agotado) y sin nada en medio; si es coche, solo si
      // el jugador no está en un pasaje. Ahí es donde la moto de la Local marca la diferencia.
      const rutaAgotada = p.ruta.length <= 1 && (() => { const [nx, nz] = this.grafo.nodos[p.ruta[0] ?? 0]!; return Math.hypot(nx - p.x, nz - p.z) < 3; })();
      const puedeDirecto = (d < RADIO_DIRECTO || (rutaAgotada && d < 70) || (p.directo && d < 80)) && (p.tipo === 'moto' || !jugador.enPasaje);
      const despejado = puedeDirecto && this.despejado(p, jugador);
      p.tiempoBloqueado = despejado ? 0 : p.tiempoBloqueado + dt;
      const eraDirecto = p.directo;
      p.directo = puedeDirecto && (despejado || (p.directo && p.tiempoBloqueado < 0.6));
      // Al volver al grafo desde la persecución directa, se reengancha por el nodo más cercano.
      if (eraDirecto && !p.directo) { p.ruta = [this.grafo.masCercano(p.x, p.z, clase)]; p.tiempoRuta = 0; }

      let objetivoX: number, objetivoZ: number;
      if (p.directo) {
        objetivoX = jugador.x;
        objetivoZ = jugador.z;
      } else {
        p.tiempoRuta -= dt;
        if (p.tiempoRuta <= 0 || p.ruta.length <= 1) {
          p.tiempoRuta = 1.5;
          // Se recalcula desde el nodo al que ya iba: recalcular desde "el más cercano" hacía
          // que en las aristas largas diera media vuelta cada segundo y medio.
          const desde = p.ruta[0] ?? this.grafo.masCercano(p.x, p.z, clase);
          const hasta = this.grafo.masCercano(jugador.x, jugador.z, clase);
          const ruta = this.grafo.camino(desde, hasta, clase, true);
          if (ruta.length) { p.ruta = ruta; p.sinRuta = 0; }
          else { p.ruta = [desde]; p.sinRuta += 1.5; }
        }
        const [nx, nz] = this.grafo.nodos[p.ruta[0]!]!;
        if (Math.hypot(nx - p.x, nz - p.z) < 2.5 && p.ruta.length > 1) p.ruta.shift();
        const [tx, tz] = this.grafo.nodos[p.ruta[0]!]!;
        objetivoX = tx;
        objetivoZ = tz;
      }

      const ex = objetivoX - p.x, ez = objetivoZ - p.z;
      const dist = Math.hypot(ex, ez);
      if (dist > 0.3) {
        const objetivo = Math.atan2(ex, -ez);
        let dif = objetivo - p.rumbo;
        while (dif > Math.PI) dif -= Math.PI * 2;
        while (dif < -Math.PI) dif += Math.PI * 2;
        const giro = p.tipo === 'moto' ? 4 : 2.6;
        p.rumbo += Math.max(-giro * dt, Math.min(giro * dt, dif));
        const objetivoVel = p.directo && d < 6 ? Math.max(2, jugador.rapidez) : VELOCIDAD[p.tipo] * (Math.abs(dif) > 1.2 ? 0.45 : 1);
        p.velocidad += (objetivoVel - p.velocidad) * Math.min(1, dt * 3);
      } else p.velocidad *= 0.8;
      const vel = Math.min(p.velocidad, dist / Math.max(dt, 1e-3));
      this.guiar(p, Math.sin(p.rumbo) * vel, -Math.cos(p.rumbo) * vel);

      // Trincar: encima del jugador y él casi parado durante un rato.
      if (d < RADIO_TRINCAR) {
        if (jugador.rapidez < 3.5) p.tiempoEncima += dt; else { choques += p.vida > 1 && jugador.rapidez > 8 ? 1 : 0; p.tiempoEncima = 0; }
        if (p.tiempoEncima > 1.1) trincado = true;
      } else p.tiempoEncima = Math.max(0, p.tiempoEncima - dt);
    }
    return { visto, trincado, choques };
  }
}
