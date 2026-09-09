// Trastos de la calle: conos, macetas, contenedores, papeleras, mesas y sillas de bar y
// cajas del mercado. Cuerpos dinámicos de Rapier con malla propia; se sincronizan solo
// los que no están dormidos. Cada uno vale dinero la primera vez que lo derribas.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { MundoFisico, RAPIER as R } from '../fisica/mundo';
import type { Nivel, Punto } from './tipos';
import { azar, dentroDePoligono, distanciaPolilinea, muestrearPolilinea } from './geometria';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type TipoTrasto = 'cono' | 'maceta' | 'contenedor' | 'papelera' | 'mesa' | 'silla' | 'caja' | 'valla' | 'puesto';

export interface Trasto {
  tipo: TipoTrasto;
  /** Roto en trozos: la malla se esconde y el cuerpo desaparece. */
  roto?: boolean;
  /** Solo existe mientras la moto anda cerca; lejos, la pose vive en la malla. */
  cuerpo: RAPIER.RigidBody | null;
  malla: THREE.Object3D;
  valor: number;
  derribado: boolean;
  alturaMedia: number;
}

const RADIO_ACTIVAR = 45;
const RADIO_DORMIR = 60;
const RADIO_VISIBLE = 110;

interface Definicion {
  valor: number;
  masa: number;
  crearMalla: () => THREE.Object3D;
  collider: (desc: typeof R.ColliderDesc) => RAPIER.ColliderDesc;
  alturaMedia: number;
}

const materiales = {
  naranja: new THREE.MeshLambertMaterial({ color: '#f4732b' }),
  blanco: new THREE.MeshLambertMaterial({ color: '#f7f3ea' }),
  terracota: new THREE.MeshLambertMaterial({ color: '#c8683f' }),
  planta: new THREE.MeshLambertMaterial({ color: '#4f9b4a', flatShading: true }),
  flor: new THREE.MeshLambertMaterial({ color: '#e84a7a' }),
  verde: new THREE.MeshLambertMaterial({ color: '#3f7f4a' }),
  gris: new THREE.MeshLambertMaterial({ color: '#7d8087' }),
  metal: new THREE.MeshLambertMaterial({ color: '#b9bcc4' }),
  madera: new THREE.MeshLambertMaterial({ color: '#c99a5b' }),
  rojo: new THREE.MeshLambertMaterial({ color: '#d93b3b' }),
  amarillo: new THREE.MeshLambertMaterial({ color: '#f2c94c' }),
  azul: new THREE.MeshLambertMaterial({ color: '#3b6fd9' }),
};

function malla(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

const DEFINICIONES: Record<TipoTrasto, Definicion> = {
  cono: {
    valor: 5, masa: 2, alturaMedia: 0.38,
    crearMalla: () => {
      const g = new THREE.Group();
      g.add(malla(new THREE.CylinderGeometry(0.1, 0.26, 0.7, 8), materiales.naranja, 0, 0, 0));
      g.add(malla(new THREE.CylinderGeometry(0.16, 0.19, 0.1, 8), materiales.blanco, 0, 0.05, 0));
      g.add(malla(new THREE.BoxGeometry(0.5, 0.05, 0.5), materiales.naranja, 0, -0.33, 0));
      return g;
    },
    collider: (d) => d.cylinder(0.35, 0.22).setDensity(0.4).setRestitution(0.4),
  },
  maceta: {
    valor: 15, masa: 12, alturaMedia: 0.3,
    crearMalla: () => {
      const g = new THREE.Group();
      g.add(malla(new THREE.CylinderGeometry(0.34, 0.26, 0.55, 8), materiales.terracota, 0, 0, 0));
      g.add(malla(new THREE.IcosahedronGeometry(0.42, 1), materiales.planta, 0, 0.55, 0));
      g.add(malla(new THREE.SphereGeometry(0.1, 6, 5), materiales.flor, 0.2, 0.7, 0.15));
      g.add(malla(new THREE.SphereGeometry(0.1, 6, 5), materiales.flor, -0.18, 0.75, -0.1));
      return g;
    },
    collider: (d) => d.cylinder(0.3, 0.34).setDensity(1.4).setRestitution(0.3),
  },
  contenedor: {
    valor: 40, masa: 90, alturaMedia: 0.7,
    crearMalla: () => {
      const g = new THREE.Group();
      g.add(malla(new THREE.BoxGeometry(1.3, 1.2, 1.0), materiales.verde, 0, 0, 0));
      g.add(malla(new THREE.BoxGeometry(1.34, 0.12, 1.04), materiales.gris, 0, 0.66, 0));
      for (const [x, z] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]]) {
        g.add(malla(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8).rotateZ(Math.PI / 2), materiales.gris, x!, -0.65, z!));
      }
      return g;
    },
    collider: (d) => d.cuboid(0.65, 0.65, 0.5).setDensity(0.5).setRestitution(0.2),
  },
  papelera: {
    valor: 8, masa: 6, alturaMedia: 0.45,
    crearMalla: () => {
      const g = new THREE.Group();
      g.add(malla(new THREE.CylinderGeometry(0.22, 0.2, 0.8, 8), materiales.gris, 0, 0, 0));
      g.add(malla(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 8), materiales.metal, 0, 0.4, 0));
      return g;
    },
    collider: (d) => d.cylinder(0.4, 0.22).setDensity(0.8).setRestitution(0.3),
  },
  mesa: {
    valor: 20, masa: 10, alturaMedia: 0.38,
    crearMalla: () => {
      const g = new THREE.Group();
      g.add(malla(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 10), materiales.blanco, 0, 0.35, 0));
      g.add(malla(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), materiales.metal, 0, 0, 0));
      g.add(malla(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 8), materiales.metal, 0, -0.35, 0));
      return g;
    },
    collider: (d) => d.cylinder(0.38, 0.3).setDensity(0.6).setRestitution(0.4),
  },
  silla: {
    valor: 10, masa: 4, alturaMedia: 0.4,
    crearMalla: () => {
      const g = new THREE.Group();
      g.add(malla(new THREE.BoxGeometry(0.42, 0.05, 0.42), materiales.rojo, 0, 0.05, 0));
      g.add(malla(new THREE.BoxGeometry(0.42, 0.45, 0.05), materiales.rojo, 0, 0.3, -0.19));
      for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
        g.add(malla(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 5), materiales.metal, x!, -0.18, z!));
      }
      return g;
    },
    collider: (d) => d.cuboid(0.21, 0.4, 0.21).setDensity(0.4).setRestitution(0.4),
  },
  caja: {
    valor: 6, masa: 5, alturaMedia: 0.2,
    crearMalla: () => {
      const g = new THREE.Group();
      const m = [materiales.madera, materiales.amarillo, materiales.verde, materiales.azul][Math.floor(Math.random() * 4)]!;
      g.add(malla(new THREE.BoxGeometry(0.6, 0.4, 0.4), m, 0, 0, 0));
      g.add(malla(new THREE.SphereGeometry(0.12, 6, 5), materiales.naranja, 0.12, 0.2, 0.05));
      g.add(malla(new THREE.SphereGeometry(0.11, 6, 5), materiales.naranja, -0.14, 0.2, -0.06));
      g.add(malla(new THREE.SphereGeometry(0.1, 6, 5), materiales.rojo, 0, 0.2, 0.1));
      return g;
    },
    collider: (d) => d.cuboid(0.3, 0.2, 0.2).setDensity(0.5).setRestitution(0.5),
  },
  puesto: {
    valor: 30, masa: 25, alturaMedia: 0.9,
    crearMalla: () => {
      // Puesto de mercadillo: tablero con género encima, dos postes y toldo a rayas (tres colores).
      const g = new THREE.Group();
      const toldo = [materiales.rojo, materiales.azul, materiales.verde][Math.floor(Math.random() * 3)]!;
      g.add(malla(new THREE.BoxGeometry(2.0, 0.08, 0.9), materiales.madera, 0, 0, 0));
      g.add(malla(new THREE.BoxGeometry(1.9, 0.5, 0.8), materiales.gris, 0, -0.3, 0));
      for (const [x, c] of [[-0.6, materiales.amarillo], [0, materiales.flor], [0.6, materiales.azul]] as const) g.add(malla(new THREE.BoxGeometry(0.5, 0.25, 0.6), c, x, 0.16, 0));
      for (const x of [-0.95, 0.95]) g.add(malla(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 5), materiales.metal, x, 0.6, -0.4));
      for (let i = 0; i < 5; i++) g.add(malla(new THREE.BoxGeometry(0.44, 0.05, 1.2), i % 2 ? materiales.blanco : toldo, -0.88 + i * 0.44, 1.65, 0));
      return g;
    },
    collider: (d) => d.cuboid(1.0, 0.9, 0.5).setDensity(0.35).setRestitution(0.3),
  },
  valla: {
    valor: 12, masa: 14, alturaMedia: 0.5,
    crearMalla: () => {
      const g = new THREE.Group();
      g.add(malla(new THREE.BoxGeometry(1.5, 0.08, 0.06), materiales.amarillo, 0, 0.45, 0));
      g.add(malla(new THREE.BoxGeometry(1.5, 0.08, 0.06), materiales.amarillo, 0, 0.1, 0));
      g.add(malla(new THREE.BoxGeometry(0.06, 1.0, 0.06), materiales.gris, -0.7, 0, 0));
      g.add(malla(new THREE.BoxGeometry(0.06, 1.0, 0.06), materiales.gris, 0.7, 0, 0));
      g.add(malla(new THREE.BoxGeometry(0.06, 0.06, 0.6), materiales.gris, -0.7, -0.47, 0));
      g.add(malla(new THREE.BoxGeometry(0.06, 0.06, 0.6), materiales.gris, 0.7, -0.47, 0));
      return g;
    },
    collider: (d) => d.cuboid(0.75, 0.5, 0.15).setDensity(0.4).setRestitution(0.3),
  },
};

/** Funde el grupo de mallas de un trasto en una sola geometría con colores por vértice. */
function fundir(grupo: THREE.Object3D): THREE.BufferGeometry {
  grupo.updateMatrixWorld(true);
  const piezas: THREE.BufferGeometry[] = [];
  grupo.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    let g = (o.geometry as THREE.BufferGeometry).clone();
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv');
    g.applyMatrix4(o.matrixWorld);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const color = (o.material as THREE.MeshLambertMaterial).color;
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    piezas.push(g);
  });
  const fundida = mergeGeometries(piezas, false);
  for (const p of piezas) p.dispose();
  fundida.computeBoundingSphere();
  return fundida;
}

const MATERIAL_TRASTOS = new THREE.MeshLambertMaterial({ vertexColors: true });

/** Qué se rompe en trozos y de qué colores salen. */
export const ROMPIBLES: Partial<Record<TipoTrasto, string[]>> = {
  maceta: ['#c8683f', '#c8683f', '#c8683f', '#b85a35', '#4f9b4a', '#4f9b4a', '#3f7f4a', '#e84a7a'],
  caja: ['#c99a5b', '#c99a5b', '#b8894c', '#f4732b', '#f4732b', '#f4732b', '#d93b3b', '#f4732b'],
  silla: ['#d93b3b', '#d93b3b', '#b9bcc4', '#b9bcc4', '#b9bcc4'],
  mesa: ['#f7f3ea', '#f7f3ea', '#f7f3ea', '#b9bcc4', '#b9bcc4'],
  puesto: ['#c99a5b', '#c99a5b', '#f7f3ea', '#d93b3b', '#f2c94c', '#e84a7a', '#3b6fd9', '#b9bcc4'],
};

export class Trastos {
  readonly grupo = new THREE.Group();
  readonly lista: Trasto[] = [];
  /** Sillas de terraza donde puede sentarse un vecino (posición y hacia dónde mira). */
  readonly asientos: { x: number; z: number; rumbo: number }[] = [];
  private tmpQ = new THREE.Quaternion();
  private geometrias = new Map<string, THREE.BufferGeometry[]>();

  /** Geometría cacheada por tipo (las cajas tienen cuatro variantes de color). */
  private geometria(tipo: TipoTrasto): THREE.BufferGeometry {
    let variantes = this.geometrias.get(tipo);
    if (!variantes) {
      variantes = [];
      for (let i = 0; i < (tipo === 'caja' ? 4 : tipo === 'puesto' ? 3 : 1); i++) variantes.push(fundir(DEFINICIONES[tipo].crearMalla()));
      this.geometrias.set(tipo, variantes);
    }
    return variantes[Math.floor(Math.random() * variantes.length)]!;
  }

  constructor(private readonly fisica: MundoFisico) {
    this.grupo.name = 'trastos';
  }

  poner(tipo: TipoTrasto, x: number, z: number, giro = 0): Trasto {
    const def = DEFINICIONES[tipo];
    const m = new THREE.Mesh(this.geometria(tipo), MATERIAL_TRASTOS);
    m.castShadow = true;
    m.position.set(x, def.alturaMedia, z);
    m.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro);
    this.grupo.add(m);
    const t: Trasto = { tipo, cuerpo: null, malla: m, valor: def.valor, derribado: false, alturaMedia: def.alturaMedia };
    this.lista.push(t);
    return t;
  }

  /** Crea el cuerpo físico en la pose actual de la malla. Nace dormido: solo se simula si algo lo toca. */
  private activar(t: Trasto): void {
    const def = DEFINICIONES[t.tipo];
    const p = t.malla.position, q = t.malla.quaternion;
    const cuerpo = this.fisica.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setLinearDamping(0.6).setAngularDamping(0.8).setCanSleep(true).setSleeping(true),
    );
    this.fisica.world.createCollider(def.collider(R.ColliderDesc).setFriction(0.7), cuerpo);
    t.cuerpo = cuerpo;
  }

  private desactivar(t: Trasto): void {
    if (!t.cuerpo) return;
    this.sincronizarUno(t);
    this.fisica.world.removeRigidBody(t.cuerpo);
    t.cuerpo = null;
  }

  /** Rompe un trasto: esconde la malla y quita el cuerpo. Devuelve la velocidad que llevaba. */
  romper(t: Trasto): { vx: number; vz: number } {
    const v = t.cuerpo ? t.cuerpo.linvel() : { x: 0, z: 0 };
    if (t.cuerpo) { this.fisica.world.removeRigidBody(t.cuerpo); t.cuerpo = null; }
    t.malla.visible = false;
    t.roto = true;
    t.derribado = true;
    return { vx: v.x, vz: v.z };
  }

  /** Activa los trastos cercanos a (x, z) y duerme los lejanos. Llamar cada medio segundo. */
  gestionarRadio(x: number, z: number): void {
    const r2a = RADIO_ACTIVAR * RADIO_ACTIVAR, r2d = RADIO_DORMIR * RADIO_DORMIR, r2v = RADIO_VISIBLE * RADIO_VISIBLE;
    for (const t of this.lista) {
      if (t.roto) continue;
      const p = t.malla.position;
      const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
      t.malla.visible = d2 < r2v;
      if (!t.cuerpo && d2 < r2a) this.activar(t);
      else if (t.cuerpo && d2 > r2d && t.cuerpo.isSleeping()) this.desactivar(t);
    }
  }

  get activos(): number {
    let n = 0;
    for (const t of this.lista) if (t.cuerpo) n++;
    return n;
  }

  /** Reparte los trastos por el barrio: conos en cruces y obras, macetas en pasajes,
   *  contenedores en calles rodadas, terrazas en los bares y cajas junto al mercado. */
  poblar(nivel: Nivel, arboles: Punto[]): void {
    const rnd = azar(777);
    const ocupado: Punto[] = [...arboles];
    const agua = nivel.zonas.filter((z) => z.clase === 'water');
    const libre = (x: number, z: number, minimo = 1.2): boolean => {
      for (const e of nivel.edificios) if (dentroDePoligono(x, z, e.poligono)) return false;
      for (const a of agua) if (dentroDePoligono(x, z, a.poligono)) return false;
      for (const [px, pz] of ocupado) if ((px - x) ** 2 + (pz - z) ** 2 < minimo * minimo) return false;
      return true;
    };
    const colocar = (tipo: TipoTrasto, x: number, z: number, giro = 0, minimo = 1.2): boolean => {
      if (!libre(x, z, minimo)) return false;
      this.poner(tipo, x, z, giro);
      ocupado.push([x, z]);
      return true;
    };

    for (const via of nivel.vias) {
      if (via.clase === 'peatonal' && via.tipo === 'pedestrian') {
        // Macetas y papeleras pegadas al lado del pasaje, de vez en cuando una valla de obra.
        for (const m of muestrearPolilinea(via.puntos, 13, rnd() * 13)) {
          const r = rnd();
          if (r > 0.5) continue;
          const lado = (via.ancho / 2 + 0.5) * (rnd() < 0.5 ? 1 : -1);
          const x = m.x + m.nx * lado, z = m.z + m.nz * lado;
          if (r < 0.32) colocar('maceta', x, z, rnd() * Math.PI);
          else if (r < 0.45) colocar('papelera', x, z);
          else colocar('valla', m.x, m.z, -Math.atan2(m.tz, m.tx) + Math.PI / 2, 2.5);
        }
      } else if (via.clase === 'rodada' && via.tipo !== 'service') {
        // Contenedores en el arcén; conos en grupitos como si hubiera obras.
        for (const m of muestrearPolilinea(via.puntos, 40, rnd() * 40)) {
          const lado = (via.ancho / 2 - 0.9) * (rnd() < 0.5 ? 1 : -1);
          const r = rnd();
          if (r < 0.45) colocar('contenedor', m.x + m.nx * lado, m.z + m.nz * lado, -Math.atan2(m.tz, m.tx), 1.8);
          else if (r < 0.75) {
            for (let k = 0; k < 3; k++) colocar('cono', m.x + m.tx * k * 1.4 + m.nx * lado * 0.6, m.z + m.tz * k * 1.4 + m.nz * lado * 0.6, 0, 0.8);
          }
        }
      }
    }

    for (const poi of nivel.pois) {
      if (poi.clase === 'bar' || poi.clase === 'cafe' || poi.clase === 'restaurant') {
        // Terraza: tres mesas con dos sillas cada una, en un semicírculo.
        for (let i = 0; i < 3; i++) {
          const ang = rnd() * Math.PI * 2;
          const mx = poi.x + Math.cos(ang) * (3 + rnd() * 3), mz = poi.z + Math.sin(ang) * (3 + rnd() * 3);
          if (!colocar('mesa', mx, mz, 0, 1.0)) continue;
          if (colocar('silla', mx + 0.8, mz, Math.PI / 2, 0.5)) this.asientos.push({ x: mx + 0.8, z: mz, rumbo: -Math.PI / 2 });
          if (colocar('silla', mx - 0.8, mz, -Math.PI / 2, 0.5)) this.asientos.push({ x: mx - 0.8, z: mz, rumbo: Math.PI / 2 });
        }
      } else if (poi.clase === 'marketplace') {
        // Cajas de fruta amontonadas alrededor del mercado.
        for (let i = 0; i < 18; i++) {
          const ang = rnd() * Math.PI * 2, d = 14 + rnd() * 26;
          colocar('caja', poi.x + Math.cos(ang) * d, poi.z + Math.sin(ang) * d, rnd() * Math.PI, 0.7);
        }
        // El mercadillo: una hilera de puestos con toldo por el pasaje más cercano al mercado.
        const pasaje = nivel.vias.filter((v) => v.clase === 'peatonal' && v.tipo === 'pedestrian' && v.ancho >= 4)
          .sort((a, b) => distanciaPolilinea(poi.x, poi.z, a.puntos) - distanciaPolilinea(poi.x, poi.z, b.puntos))[0];
        if (pasaje) {
          let puestos = 0;
          for (const m of muestrearPolilinea(pasaje.puntos, 3.6, 1.5)) {
            if (puestos >= 10 || Math.hypot(m.x - poi.x, m.z - poi.z) > 80) continue;
            const lado = pasaje.ancho / 2 - 0.9;
            if (colocar('puesto', m.x + m.nx * lado, m.z + m.nz * lado, -Math.atan2(m.tz, m.tx) + Math.PI, 2.2)) puestos++;
          }
        }
      } else if (poi.clase === 'supermarket' || poi.clase === 'convenience' || poi.clase === 'mall') {
        for (let i = 0; i < 5; i++) colocar('caja', poi.x + (rnd() - 0.5) * 16, poi.z + (rnd() - 0.5) * 16, rnd() * Math.PI, 0.7);
      }
    }
  }

  private sincronizarUno(t: Trasto): void {
    if (!t.cuerpo) return;
    const p = t.cuerpo.translation();
    const r = t.cuerpo.rotation();
    t.malla.position.set(p.x, p.y, p.z);
    this.tmpQ.set(r.x, r.y, r.z, r.w);
    t.malla.quaternion.copy(this.tmpQ);
  }

  /** Sincroniza mallas y devuelve los trastos derribados este paso cerca de (x, z). */
  actualizar(x: number, z: number): Trasto[] {
    const derribados: Trasto[] = [];
    for (const t of this.lista) {
      if (!t.cuerpo || t.cuerpo.isSleeping()) continue;
      this.sincronizarUno(t);
      if (t.derribado) continue;
      const p = t.malla.position;
      if ((p.x - x) ** 2 + (p.z - z) ** 2 > 36) continue;
      const v = t.cuerpo.linvel();
      const w = t.cuerpo.angvel();
      if (Math.hypot(v.x, v.z) > 1.5 || Math.hypot(w.x, w.y, w.z) > 2.5 || Math.abs(t.malla.rotation.x) > 0.6 || Math.abs(t.malla.rotation.z) > 0.6) {
        t.derribado = true;
        derribados.push(t);
      }
    }
    return derribados;
  }
}

/** Frases de barrio para el aviso al derribar algo. Cariñosas, nunca crueles. */
export const FRASES: Record<TipoTrasto, string[]> = {
  cono: ['¡Cono al aire!', 'Ese cono era del Ayuntamiento', '¡Toma cono!'],
  maceta: ['¡La maceta de la Loli!', '¡Ozú, los geranios!', 'Ahí van las macetas del pasaje'],
  contenedor: ['¡Contenedor por los aires!', '¡Eso es reciclar!', 'El de la basura va a flipar'],
  papelera: ['¡Papelera al suelo!', 'Menudo estropicio'],
  mesa: ['¡La terraza del bar!', '¡Las cañas por el suelo!', 'El camarero te tiene fichado'],
  silla: ['¡Silla voladora!', 'Eso lo paga el bar'],
  caja: ['¡Fruta del mercado!', '¡Los tomates del puesto!', '¡Cuidado con las cajas!'],
  valla: ['¡Valla de obra al suelo!', 'Las obras llevaban tres años ahí'],
  puesto: ['¡El puesto del mercadillo!', '¡Los calcetines a tres euros por el aire!', '¡Se cae el toldo!', '¡Las bragas del puesto, por el suelo!'],
};
