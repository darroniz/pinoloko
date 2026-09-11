// Vecinos del barrio: pasean por los pasajes siguiendo el grafo peatonal, huyen de la moto
// cuando viene lanzada, se caen si los atropellas e insultan en sevillano. Sin física:
// posiciones propias e instancias para dibujarlos. Lógica testeable sin Three.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import { azar } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type EstadoPeaton = 'pasear' | 'huir' | 'caido' | 'levantarse' | 'sentado' | 'esperando';

export interface Vecino {
  x: number;
  z: number;
  rumbo: number;
  estado: EstadoPeaton;
  nodo: number;
  anterior: number;
  destino: number;
  tiempo: number;
  fase: number;
  color: number;
  velocidad: number;
  insultado: number;
  /** Parada del 13 a la que va o en la que espera (-1 si ninguna). */
  parada: number;
  /** Punto fuera del grafo al que anda (la marquesina); al llegar se queda esperando. */
  objetivo: { x: number; z: number; rumbo: number } | null;
}

export const INSULTOS = [
  '¡Illo, mira por dónde vas!', '¡Quillo, que me matas!', '¡Ozú, qué fatiga!', '¡Niñooo!',
  '¡A ver si te compras un semáforo!', '¡Mi arma, que casi me llevas!', '¡Ojú, la moto!',
  '¡Ay mi madre!', '¡Pisha, frena un poco!', '¡Que te veo, Wifly!', '¡Eso se lo digo yo a tu madre!',
  '¡Vaya tela con el niño!', '¡Ni un respeto, ni un respeto!',
];

export type Tribu = 'canis' | 'modernos' | 'trianeros' | 'pijos' | 'guiris';

/** Cada tribu tiene su ropa, su gorro (o ninguno) y sus gritos. Los canis son los del barrio de Wifly. */
export const TRIBUS: Record<Tribu, { ropa: string[]; gorro: 'gorra' | 'gorro' | 'jersey' | 'sombrero' | null; insultos: string[] }> = {
  canis: {
    ropa: ['#1d3fa8', '#e63946', '#f5f5f5', '#111111', '#2a9d8f', '#f4a261'],
    gorro: 'gorra',
    insultos: INSULTOS,
  },
  modernos: {
    ropa: ['#3d405b', '#e07a5f', '#81b29a', '#f2cc8f', '#2b2b2b', '#a8dadc'],
    gorro: 'gorro',
    insultos: [
      '¡Tío, que casi me tiras el café de especialidad!', '¡Mi bici de piñón fijo!', '¡Que llevo la tote bag llena!',
      '¡Uy, qué agresividad!', '¡Esto lo subo a stories!', '¡Aquí no se viene con moto, se viene en patinete!',
      '¡Vuélvete a Pino Montano, illo!', '¡Qué poco cívico!', '¡Estaba en un podcast!',
    ],
  },
  trianeros: {
    ropa: ['#f8f1e4', '#8ecae6', '#d62828', '#0b3d91', '#f7b267', '#5c8a3c'],
    gorro: null,
    insultos: [
      '¡Que esto es Triana, chiquillo!', '¡Al otro lado del puente, anda!', '¡Mi niño, que me matas!',
      '¡Uy, uy, uy, que viene el cani!', '¡Ojú, qué susto, mi alma!', '¡Ni en Feria se ve esto!',
      '¡Que tengo la cera puesta!', '¡A tu barrio, canijo!', '¡Vaya un tarambana!',
    ],
  },
  pijos: {
    // Polos pastel, náuticos y el jersey a los hombros: Los Remedios y Nervión.
    ropa: ['#f8c8d4', '#a7d8f0', '#fff8e7', '#c7e8c0', '#f5e6a3', '#1f2a5a'],
    gorro: 'jersey',
    insultos: [
      '¡Papá, que me han rayado el Mini!', '¡Esto en Los Remedios no pasa!', '¡Llamo a seguridad, ¿eh?!',
      '¡Qué horror, un cani!', '¡Borja, al club, corre!', '¡Que llevo los náuticos nuevos!',
      '¡Perdona, ¿tú de quién eres?!', '¡Ay, mi jersey de los hombros!', '¡Esto lo sabe mi padre y te empapela!',
      '¡Vuélvete a Pino Montano, chaval!', '¡Cayetana, no mires!',
    ],
  },
  guiris: {
    // El Centro: turistas con sombrero de paja, camiseta blanca, pantalón corto y la piel roja.
    ropa: ['#ffffff', '#f2c8a0', '#e0503c', '#8fb8de', '#f5e9c8', '#c9a86a'],
    gorro: 'sombrero',
    insultos: [
      '¡Oh my God!', 'Excuse me, ¿la Giralda?', '¡Una cerveza, por favore!', '¿Esto es el flamenco?',
      '¡Mamma mia, che pazzo!', '¡No corras, que es la siesta!', '¡Wow, so authentic!', '¡Que me tiras la sangría!',
      '¿Dónde está la Plaza de España, señor?', '¡Photo, photo!', '¡Achtung, motorrad!',
    ],
  },
};

const RADIO_HUIDA = 9;
const RADIO_ATROPELLO = 1.1;

/** Actualiza un vecino; devuelve 'atropello' o 'insulto' si ha pasado algo con el jugador. */
export function pasoVecino(
  v: Vecino,
  grafo: GrafoBarrio,
  jugador: { x: number; z: number; rapidez: number },
  dt: number,
  rnd: () => number,
): 'atropello' | 'insulto' | null {
  const dx = v.x - jugador.x, dz = v.z - jugador.z;
  const d2 = dx * dx + dz * dz;
  let evento: 'atropello' | 'insulto' | null = null;
  v.tiempo -= dt;

  if (v.estado !== 'caido' && d2 < RADIO_ATROPELLO * RADIO_ATROPELLO && jugador.rapidez > 3) {
    v.estado = 'caido';
    v.tiempo = 2.2 + rnd();
    v.rumbo = Math.atan2(dx, -dz);
    return 'atropello';
  }
  if (v.estado === 'caido') {
    if (v.tiempo <= 0) { v.estado = 'levantarse'; v.tiempo = 0.6; }
    return null;
  }
  if (v.estado === 'levantarse') {
    if (v.tiempo <= 0) { v.estado = 'huir'; v.tiempo = 3; }
    return null;
  }
  // Sentado en la terraza (o esperando el 13): no se mueve hasta que la moto viene lanzada;
  // entonces se levanta y corre. Los de la parada aguantan un poco más (el 13 llega despacio).
  if (v.estado === 'sentado' || v.estado === 'esperando') {
    if (d2 < RADIO_HUIDA * RADIO_HUIDA && jugador.rapidez > (v.estado === 'esperando' ? 6 : 4)) {
      v.estado = 'huir';
      v.parada = -1;
      v.tiempo = 2 + rnd() * 2;
      if (v.insultado <= 0 && d2 < 36) { v.insultado = 6; return 'insulto'; }
    }
    return null;
  }
  // Camino de la marquesina: anda en línea recta al punto y al llegar se queda esperando.
  if (v.estado === 'pasear' && v.objetivo) {
    const ex = v.objetivo.x - v.x, ez = v.objetivo.z - v.z;
    const dist = Math.hypot(ex, ez);
    if (dist < 0.5) { v.estado = 'esperando'; v.rumbo = v.objetivo.rumbo; v.objetivo = null; return evento; }
    v.rumbo = Math.atan2(ex, -ez);
    v.x += Math.sin(v.rumbo) * v.velocidad * dt;
    v.z += -Math.cos(v.rumbo) * v.velocidad * dt;
    v.fase += dt * 7;
    return evento;
  }
  if (v.estado === 'pasear' && d2 < RADIO_HUIDA * RADIO_HUIDA && jugador.rapidez > 4) {
    v.estado = 'huir';
    v.parada = -1;
    v.objetivo = null;
    v.tiempo = 2 + rnd() * 2;
    if (v.insultado <= 0 && d2 < 25) { v.insultado = 6; evento = 'insulto'; }
  }
  v.insultado -= dt;

  if (v.estado === 'huir') {
    // Corre en dirección contraria al jugador, con un poco de pánico lateral.
    const d = Math.sqrt(d2) || 1;
    const objetivo = Math.atan2(dx / d, -dz / d) + Math.sin(v.fase * 0.5) * 0.4;
    v.rumbo = objetivo;
    v.velocidad = 4.5;
    v.x += Math.sin(v.rumbo) * v.velocidad * dt;
    v.z += -Math.cos(v.rumbo) * v.velocidad * dt;
    v.fase += dt * 12;
    if (v.tiempo <= 0 || d2 > 400) {
      v.estado = 'pasear';
      v.nodo = grafo.masCercano(v.x, v.z, 'peatonal');
      v.anterior = -1;
      v.destino = grafo.siguienteAlAzar(v.nodo, v.anterior, 'peatonal', rnd);
    }
    return evento;
  }

  // Pasear: hacia el nodo destino; al llegar, elige el siguiente sin volver atrás.
  const [tx, tz] = grafo.nodos[v.destino] ?? [v.x, v.z];
  const ex = tx - v.x, ez = tz - v.z;
  const dist = Math.hypot(ex, ez);
  if (dist < 0.6) {
    v.anterior = v.nodo;
    v.nodo = v.destino;
    v.destino = grafo.siguienteAlAzar(v.nodo, v.anterior, 'peatonal', rnd);
    if (v.destino === v.nodo) v.anterior = -1;
    return evento;
  }
  const objetivo = Math.atan2(ex, -ez);
  let dif = objetivo - v.rumbo;
  while (dif > Math.PI) dif -= Math.PI * 2;
  while (dif < -Math.PI) dif += Math.PI * 2;
  v.rumbo += dif * Math.min(1, dt * 6);
  v.x += Math.sin(v.rumbo) * v.velocidad * dt;
  v.z += -Math.cos(v.rumbo) * v.velocidad * dt;
  v.fase += dt * 7;
  return evento;
}

export function crearVecino(grafo: GrafoBarrio, nodo: number, rnd: () => number): Vecino {
  const [x, z] = grafo.nodos[nodo]!;
  return {
    x: x + (rnd() - 0.5), z: z + (rnd() - 0.5), rumbo: rnd() * Math.PI * 2, estado: 'pasear',
    nodo, anterior: -1, destino: grafo.siguienteAlAzar(nodo, -1, 'peatonal', rnd), tiempo: 0,
    fase: rnd() * 10, color: Math.floor(rnd() * 6), velocidad: 1.1 + rnd() * 0.6, insultado: 0, parada: -1, objetivo: null,
  };
}

/** Los vecinos dibujados como instancias: cuerpo (cápsula) y cabeza, por color de ropa. */
export class Vecinos {
  readonly grupo = new THREE.Group();
  readonly lista: Vecino[] = [];
  private cuerpos: THREE.InstancedMesh[] = [];
  private cabezas: THREE.InstancedMesh;
  private rnd = azar(99);
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private eje = new THREE.Vector3(0, 1, 0);
  private ejeX = new THREE.Vector3(1, 0, 0);
  private q2 = new THREE.Quaternion();

  private gorros: THREE.InstancedMesh | null = null;
  /** Carritos de la compra: los llevan una de cada cinco (las abuelas del barrio), delante. */
  private carritos: THREE.InstancedMesh;
  private readonly insultos: string[];
  /** Paradas del 13 con su nodo peatonal más cercano: aquí se espera el bus. */
  private readonly paradas: { x: number; z: number; nodo: number }[];
  private tiempoReponer = 0;

  constructor(private readonly grafo: GrafoBarrio, cuantos: number, asientos: { x: number; z: number; rumbo: number }[] = [], tribu: Tribu = 'canis', paradas: { x: number; z: number }[] = []) {
    this.paradas = paradas.map((p) => ({ x: p.x, z: p.z, nodo: grafo.masCercano(p.x, p.z, 'peatonal') }));
    const geoCuerpo = new THREE.CapsuleGeometry(0.28, 0.6, 3, 8).translate(0, 0.72, 0);
    const geoCabeza = new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.42, 0);
    const t = TRIBUS[tribu];
    this.insultos = t.insultos;
    if (t.gorro === 'gorra') {
      // Gorra plana: disco encima de la cabeza y visera hacia delante.
      const copa = new THREE.CylinderGeometry(0.25, 0.26, 0.1, 8).translate(0, 1.62, 0);
      const visera = new THREE.BoxGeometry(0.34, 0.04, 0.22).translate(0, 1.58, -0.3);
      this.gorros = new THREE.InstancedMesh(mergeGeometries([copa, visera]), new THREE.MeshLambertMaterial({ color: '#111111' }), cuantos);
    } else if (t.gorro === 'gorro') {
      this.gorros = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 8, 6).scale(1, 0.7, 1).translate(0, 1.5, 0), new THREE.MeshLambertMaterial({ color: '#c8a24a' }), cuantos);
    } else if (t.gorro === 'sombrero') {
      // Sombrero de paja de guiri: ala ancha y copa baja.
      const ala = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 10).translate(0, 1.56, 0);
      const copa = new THREE.CylinderGeometry(0.22, 0.24, 0.16, 10).translate(0, 1.64, 0);
      this.gorros = new THREE.InstancedMesh(mergeGeometries([ala, copa]), new THREE.MeshLambertMaterial({ color: '#e8d39a' }), cuantos);
    } else if (t.gorro === 'jersey') {
      // Jersey a los hombros: un aro sobre el cuello y las dos mangas anudadas colgando por delante.
      const aro = new THREE.TorusGeometry(0.3, 0.07, 6, 10).rotateX(Math.PI / 2).translate(0, 1.22, 0);
      const mangas = new THREE.BoxGeometry(0.28, 0.32, 0.1).translate(0, 1.02, -0.3);
      this.gorros = new THREE.InstancedMesh(mergeGeometries([aro, mangas]), new THREE.MeshLambertMaterial({ color: '#f3e2b8' }), cuantos);
    }
    if (this.gorros) { this.gorros.count = 0; this.gorros.frustumCulled = false; this.grupo.add(this.gorros); }
    const geoCarrito = mergeGeometries([
      new THREE.BoxGeometry(0.36, 0.55, 0.3).translate(0, 0.5, -0.5),
      new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5).translate(0, 0.45, -0.32).rotateX(0.25),
      new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6).rotateZ(Math.PI / 2).translate(0, 0.07, -0.5),
    ]);
    this.carritos = new THREE.InstancedMesh(geoCarrito, new THREE.MeshLambertMaterial({ color: '#b03a48' }), cuantos);
    this.carritos.count = 0;
    this.carritos.frustumCulled = false;
    this.grupo.add(this.carritos);
    for (const c of t.ropa) {
      const im = new THREE.InstancedMesh(geoCuerpo, new THREE.MeshLambertMaterial({ color: c }), cuantos);
      im.count = 0;
      im.castShadow = true;
      im.frustumCulled = false;
      this.cuerpos.push(im);
      this.grupo.add(im);
    }
    this.cabezas = new THREE.InstancedMesh(geoCabeza, new THREE.MeshLambertMaterial({ color: '#e0ac8b' }), cuantos);
    this.cabezas.frustumCulled = false;
    this.cabezas.castShadow = true;
    this.grupo.add(this.cabezas);

    const candidatos: number[] = [];
    for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'peatonal').length > 0) candidatos.push(i);
    // Una parte del barrio está sentada en las terrazas (como mucho un tercio).
    const sentados = Math.min(asientos.length, Math.floor(cuantos / 3));
    for (let i = 0; i < sentados; i++) {
      const a = asientos[i]!;
      const nodo = grafo.masCercano(a.x, a.z, 'peatonal');
      const v = crearVecino(grafo, Math.max(0, nodo), this.rnd);
      v.x = a.x; v.z = a.z; v.rumbo = a.rumbo; v.estado = 'sentado';
      this.lista.push(v);
    }
    // Y en cada marquesina hay uno o dos esperando el 13 desde el principio.
    let colocados = sentados;
    this.paradas.forEach((p, i) => {
      for (let k = 0; k < 1 + (i % 2) && colocados < cuantos; k++, colocados++) {
        const v = crearVecino(grafo, Math.max(0, p.nodo), this.rnd);
        const sitio = this.sitioEspera(i, k);
        v.x = sitio.x; v.z = sitio.z; v.rumbo = sitio.rumbo; v.estado = 'esperando'; v.parada = i;
        this.lista.push(v);
      }
    });
    for (let i = colocados; i < cuantos && candidatos.length; i++) {
      const nodo = candidatos[Math.floor(this.rnd() * candidatos.length)]!;
      this.lista.push(crearVecino(grafo, nodo, this.rnd));
    }
  }

  /** Dónde se pone el que espera número `k` en la parada `i` (delante de la marquesina). */
  private sitioEspera(i: number, k: number): { x: number; z: number; rumbo: number } {
    const p = this.paradas[i]!;
    return { x: p.x + (k - 0.5) * 1.5, z: p.z + 1.1, rumbo: Math.PI };
  }

  /** Los que esperan el 13 en la parada `i` (o van de camino a ella). */
  esperandoEn(i: number): Vecino[] {
    return this.lista.filter((v) => v.parada === i && (v.estado === 'esperando' || v.estado === 'pasear'));
  }

  /** Los que están ya en la parada `i` a menos de `radio` m de un punto (el 13 parado). */
  enLaParada(i: number, x: number, z: number, radio: number): Vecino[] {
    return this.lista.filter((v) => v.parada === i && v.estado === 'esperando' && (v.x - x) ** 2 + (v.z - z) ** 2 < radio * radio);
  }

  /** Se sube al 13: desaparece de la parada y reaparece paseando lejos (se ha bajado en otra). */
  subirAlBus(v: Vecino): void {
    v.parada = -1;
    v.objetivo = null;
    v.estado = 'pasear';
    let mejor = -1, mejorD = 0;
    for (let intento = 0; intento < 8; intento++) {
      const n = Math.floor(this.rnd() * this.grafo.nodos.length);
      if (!this.grafo.vecinos(n, 'peatonal').length) continue;
      const [nx, nz] = this.grafo.nodos[n]!;
      const d = (nx - v.x) ** 2 + (nz - v.z) ** 2;
      if (d > mejorD) { mejorD = d; mejor = n; }
    }
    if (mejor < 0) return;
    const [nx, nz] = this.grafo.nodos[mejor]!;
    v.x = nx; v.z = nz; v.nodo = mejor; v.anterior = -1;
    v.destino = this.grafo.siguienteAlAzar(mejor, -1, 'peatonal', this.rnd);
  }

  /** Cada pocos segundos, si en una parada falta gente, un vecino que pasa por su nodo se acerca a esperar. */
  private reponerParadas(dt: number): void {
    this.tiempoReponer -= dt;
    if (this.tiempoReponer > 0 || !this.paradas.length) return;
    this.tiempoReponer = 2.5;
    this.paradas.forEach((p, i) => {
      if (p.nodo < 0) return;
      const ya = this.esperandoEn(i).length;
      if (ya >= 2) return;
      const v = this.lista.find((c) => c.estado === 'pasear' && c.parada < 0 && !c.objetivo && (c.nodo === p.nodo || c.destino === p.nodo) && (c.x - p.x) ** 2 + (c.z - p.z) ** 2 < 30 * 30);
      if (!v || this.rnd() < 0.4) return;
      v.parada = i;
      v.objetivo = this.sitioEspera(i, ya);
    });
  }

  /** Un bocinazo: los que estén a menos de `radio` salen corriendo. */
  asustar(x: number, z: number, radio: number): void {
    for (const v of this.lista) {
      if (v.estado !== 'pasear' && v.estado !== 'sentado') continue;
      if ((v.x - x) ** 2 + (v.z - z) ** 2 < radio * radio) { v.estado = 'huir'; v.tiempo = 1.5 + this.rnd() * 1.5; }
    }
  }

  /** Mueve a todos y devuelve los eventos con el jugador. */
  actualizar(jugador: { x: number; z: number; rapidez: number }, dt: number): { atropellos: number; insulto: string | null } {
    let atropellos = 0;
    let insulto: string | null = null;
    this.reponerParadas(dt);
    for (const v of this.lista) {
      const e = pasoVecino(v, this.grafo, jugador, dt, this.rnd);
      if (e === 'atropello') atropellos++;
      else if (e === 'insulto' && !insulto) insulto = this.insultos[Math.floor(this.rnd() * this.insultos.length)]!;
    }
    this.dibujar(jugador.x, jugador.z);
    return { atropellos, insulto };
  }

  private dibujar(cx: number, cz: number): void {
    const cuentas = this.cuerpos.map(() => 0);
    let nCabezas = 0, nGorros = 0, nCarritos = 0;
    for (const v of this.lista) {
      if ((v.x - cx) ** 2 + (v.z - cz) ** 2 > 130 * 130) continue;
      this.p.set(v.x, 0, v.z);
      this.q.setFromAxisAngle(this.eje, -v.rumbo);
      if (v.estado === 'caido') {
        this.q2.setFromAxisAngle(this.ejeX, -Math.PI / 2);
        this.q.multiply(this.q2);
        this.p.y = 0.3;
      } else if (v.estado === 'levantarse') {
        this.q2.setFromAxisAngle(this.ejeX, -Math.PI / 4);
        this.q.multiply(this.q2);
      } else if (v.estado === 'sentado') {
        this.p.y = -0.38; // las piernas "dentro" de la silla
      }
      const bote = v.estado === 'pasear' || v.estado === 'huir' ? Math.abs(Math.sin(v.fase)) * 0.06 : 0;
      this.p.y += bote;
      this.s.setScalar(1.15);
      this.m.compose(this.p, this.q, this.s);
      const im = this.cuerpos[v.color]!;
      im.setMatrixAt(cuentas[v.color]!++, this.m);
      this.cabezas.setMatrixAt(nCabezas++, this.m);
      // Dos de cada tres llevan gorro (según el color de la ropa, que es fijo por vecino).
      if (this.gorros && v.color % 3 !== 2) this.gorros.setMatrixAt(nGorros++, this.m);
      if (v.color % 5 === 1 && (v.estado === 'pasear' || v.estado === 'huir')) this.carritos.setMatrixAt(nCarritos++, this.m);
    }
    if (this.gorros) { this.gorros.count = nGorros; this.gorros.instanceMatrix.needsUpdate = true; }
    this.carritos.count = nCarritos;
    this.carritos.instanceMatrix.needsUpdate = true;
    this.cuerpos.forEach((im, i) => { im.count = cuentas[i]!; im.instanceMatrix.needsUpdate = true; });
    this.cabezas.count = nCabezas;
    this.cabezas.instanceMatrix.needsUpdate = true;
  }
}
