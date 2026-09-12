// El barrio se venga: gente que sale a por ti a pie. El camarero del bar con la escoba si le
// rompes la terraza, y el motero al que le has quitado la moto, que te corre detrás gritando.
// Van por el grafo peatonal como la Local a pie (misma persecución), pero se cansan: pasado su
// tiempo se vuelven por donde vinieron. Lógica pura testeable; lo visible en la clase de abajo.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import { pasoAgente, type Agente } from '../policia/agentes';

export type TipoPerseguidor = 'camarero' | 'motero' | 'dueno';

export interface Perseguidor {
  tipo: TipoPerseguidor;
  agente: Agente;
  /** Segundos que le quedan de aguante antes de rendirse. */
  tiempo: number;
  /** Nombre del bar (camarero) o de la moto (motero), para los gritos. */
  nombre: string;
  grito: number;
}

export const VELOCIDAD: Record<TipoPerseguidor, number> = { camarero: 4.2, motero: 4.9, dueno: 4.4 };
export const AGUANTE: Record<TipoPerseguidor, number> = { camarero: 16, motero: 22, dueno: 18 };
/** Multa del escobazo. */
export const ESCOBAZO = 20;

export const GRITOS: Record<TipoPerseguidor, string[]> = {
  camarero: ['¡Mi terraza, desgraciao!', '¡Ven aquí, que te vas a enterar!', '¡Las sillas las pagas tú!', '¡Que te doy con la escoba!', '¡Niñato, ven pa acá!'],
  motero: ['¡Mi moto, ladrón!', '¡Que es de mi primo, illo!', '¡Bájate de mi Zip!', '¡Te voy a pillar, chaval!', '¡Esa moto tiene mi nombre!'],
  dueno: ['¡Mi coche! ¡Que lo estoy pagando!', '¡Para, desgraciao, que es de leasing!', '¡Fuera de mi coche!', '¡Que llevo el carrito del niño en el maletero!', '¡Te he visto la cara, chaval!'],
};

export function crearPerseguidor(tipo: TipoPerseguidor, grafo: GrafoBarrio, x: number, z: number, nombre: string): Perseguidor {
  const nodo = grafo.masCercano(x, z, 'peatonal');
  return { tipo, agente: { x, z, rumbo: 0, camino: [], nodo, t: 0, encima: 0, recalculo: 0, fase: 0 }, tiempo: AGUANTE[tipo], nombre, grito: 1.2 };
}

/** Un paso: 'alcanza' si te ha echado el guante, 'rendido' si se cansa (o te has ido muy lejos), 'grita' si toca un grito. */
export function pasoPerseguidor(p: Perseguidor, grafo: GrafoBarrio, jugador: { x: number; z: number }, dt: number): 'alcanza' | 'rendido' | 'grita' | null {
  p.tiempo -= dt;
  if (p.tiempo <= 0 || (p.agente.x - jugador.x) ** 2 + (p.agente.z - jugador.z) ** 2 > 140 * 140) return 'rendido';
  if (pasoAgente(p.agente, grafo, jugador, dt, VELOCIDAD[p.tipo]) === 'trinca') return 'alcanza';
  p.grito -= dt;
  if (p.grito <= 0) { p.grito = 4 + Math.random() * 3; return 'grita'; }
  return null;
}

export class Perseguidores {
  readonly grupo = new THREE.Group();
  readonly lista: Perseguidor[] = [];
  private mallas: { grupo: THREE.Group; piernaIz: THREE.Mesh; piernaDe: THREE.Mesh; escoba: THREE.Group; gorra: THREE.Group; delantal: THREE.Mesh; camisa: THREE.Mesh }[] = [];

  constructor(private readonly grafo: GrafoBarrio, maximo = 2) {
    this.grupo.name = 'perseguidores';
    const blanco = new THREE.MeshLambertMaterial({ color: '#f4f4f4' });
    const negro = new THREE.MeshLambertMaterial({ color: '#232323' });
    const piel = new THREE.MeshLambertMaterial({ color: '#e0ac8b' });
    const madera = new THREE.MeshLambertMaterial({ color: '#b98a4f' });
    const paja = new THREE.MeshLambertMaterial({ color: '#d9c266' });
    const chandal = new THREE.MeshLambertMaterial({ color: '#1d3fa8' });
    for (let i = 0; i < maximo; i++) {
      const g = new THREE.Group();
      const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 3, 8), blanco);
      tronco.position.set(0, 0.95, 0);
      const delantal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.06), negro);
      delantal.position.set(0, 0.82, -0.17);
      const piernaIz = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.14), negro);
      piernaIz.position.set(-0.12, 0.62, 0);
      const piernaDe = piernaIz.clone();
      piernaDe.position.x = 0.12;
      const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), piel);
      cabeza.position.set(0, 1.36, 0);
      // La escoba: palo en diagonal hacia delante y el cepillo al final, en alto (viene a darte).
      const escoba = new THREE.Group();
      const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5), madera);
      palo.rotation.x = -1.1;
      palo.position.set(0.22, 1.2, -0.35);
      const cepillo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.24), paja);
      cepillo.position.set(0.22, 1.72, -0.82);
      escoba.add(palo, cepillo);
      // La gorra del motero (y el chándal): se enseña una cosa u otra según el tipo.
      const gorra = new THREE.Group();
      const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10), negro);
      copa.position.set(0, 1.47, 0);
      const visera = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.18), negro);
      visera.position.set(0, 1.44, -0.18);
      const chaqueta = new THREE.Mesh(new THREE.CapsuleGeometry(0.175, 0.3, 3, 8), chandal);
      chaqueta.position.set(0, 0.95, 0);
      gorra.add(copa, visera, chaqueta);
      // El dueño del coche: camisa de cuadros (a rayas de color) y sin nada más.
      const camisa = new THREE.Mesh(new THREE.CapsuleGeometry(0.175, 0.3, 3, 8), new THREE.MeshLambertMaterial({ color: '#c94f3d' }));
      camisa.position.set(0, 0.95, 0);
      g.add(tronco, delantal, piernaIz, piernaDe, cabeza, escoba, gorra, camisa);
      g.scale.setScalar(1.6);
      g.visible = false;
      g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
      this.grupo.add(g);
      this.mallas.push({ grupo: g, piernaIz, piernaDe, escoba, gorra, delantal, camisa });
    }
  }

  /** Sale uno a por ti desde (x, z). Si ya hay uno de ese tipo, no sale otro. */
  aparecer(tipo: TipoPerseguidor, x: number, z: number, nombre: string): Perseguidor | null {
    if (this.lista.length >= this.mallas.length || this.lista.some((p) => p.tipo === tipo)) return null;
    const p = crearPerseguidor(tipo, this.grafo, x, z, nombre);
    this.lista.push(p);
    return p;
  }

  retirarTodos(): void {
    this.lista.length = 0;
    for (const m of this.mallas) m.grupo.visible = false;
  }

  /** Devuelve quién te ha alcanzado (y se retira), y los gritos que tocan este frame. */
  actualizar(jugador: { x: number; z: number }, dt: number): { alcanzan: Perseguidor[]; gritos: Perseguidor[] } {
    const alcanzan: Perseguidor[] = [], gritos: Perseguidor[] = [];
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const p = this.lista[i]!;
      const r = pasoPerseguidor(p, this.grafo, jugador, dt);
      if (r === 'alcanza') { alcanzan.push(p); this.lista.splice(i, 1); }
      else if (r === 'rendido') this.lista.splice(i, 1);
      else if (r === 'grita') gritos.push(p);
    }
    this.mallas.forEach((m, i) => {
      const p = this.lista[i];
      m.grupo.visible = !!p;
      if (!p) return;
      const a = p.agente;
      m.grupo.position.set(a.x, 0, a.z);
      m.grupo.rotation.y = -a.rumbo;
      m.escoba.visible = p.tipo === 'camarero';
      m.gorra.visible = p.tipo === 'motero';
      m.delantal.visible = p.tipo === 'camarero';
      m.camisa.visible = p.tipo === 'dueno';
      const paso = Math.sin(a.fase) * 0.6;
      m.piernaIz.rotation.x = paso;
      m.piernaDe.rotation.x = -paso;
      m.escoba.rotation.x = Math.sin(a.fase * 0.5) * 0.25;
    });
    return { alcanzan, gritos };
  }
}
