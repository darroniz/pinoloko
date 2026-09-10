// Pintadas: seis puntos de spray por barrio en las plazas y cruces de los pasajes (marcados con un
// bote de spray que flota). A pie y con E, Wifly se pone a firmar durante dos segundos y en el
// suelo queda la pintada ("PINO MONTANO", "WIFLY"...), que se guarda por barrio. En territorio
// pijo vale el doble y calienta más a la Local.
import * as THREE from 'three';
import type { GrafoBarrio } from './grafo';
import type { Nivel, Punto } from './tipos';
import { azar, dentroDePoligono } from './geometria';

export const TOTAL_PINTADAS = 6;
export const DURACION_PINTADA = 2.0;
export const RADIO_PINTADA = 2.8;
const SEPARACION = 70;

export const TEXTOS = ['PINO MONTANO', 'WIFLY', 'CANIS RULE', 'PM NORTE', 'WIFLY ESTUVO AQUÍ', 'JOG RR 4 EVER'];
const COLORES = ['#e63946', '#2b6cd9', '#f2c14e', '#2a9d8f', '#f4732b', '#7b2cbf'];
const CELDA_ANCHO = 256, CELDA_ALTO = 64;

/**
 * Elige los puntos de spray: cruces del grafo peatonal con tres o más salidas (plazas y encuentros
 * de pasajes), fuera de los edificios y a más de 70 m entre sí. Determinista con la semilla.
 */
export function elegirPuntos(nivel: Pick<Nivel, 'edificios'>, grafo: GrafoBarrio, cuantos: number, rnd: () => number): Punto[] {
  const candidatos: number[] = [];
  for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'peatonal').length >= 3) candidatos.push(i);
  // Si el barrio es de calles y no de pasajes, valen los cruces de dos salidas.
  if (candidatos.length < cuantos * 3) for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'peatonal').length === 2) candidatos.push(i);
  const barajados = candidatos.slice().sort(() => rnd() - 0.5);
  const puntos: Punto[] = [];
  for (const n of barajados) {
    if (puntos.length >= cuantos) break;
    const [x, z] = grafo.nodos[n]!;
    if (nivel.edificios.some((e) => dentroDePoligono(x, z, e.poligono))) continue;
    if (puntos.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < SEPARACION * SEPARACION)) continue;
    puntos.push([x, z]);
  }
  return puntos;
}

/** Estado de una pintada en marcha: avanza mientras Wifly siga al lado; si se aleja, se pierde. */
export class Firma {
  progreso = 0;
  constructor(readonly indice: number, readonly x: number, readonly z: number) {}

  /** Devuelve 'hecha' al terminar, 'perdida' si se aleja, o null. */
  actualizar(jx: number, jz: number, dt: number): 'hecha' | 'perdida' | null {
    if ((jx - this.x) ** 2 + (jz - this.z) ** 2 > RADIO_PINTADA * RADIO_PINTADA) return 'perdida';
    this.progreso += dt / DURACION_PINTADA;
    return this.progreso >= 1 ? 'hecha' : null;
  }
}

export class Pintadas {
  readonly grupo = new THREE.Group();
  readonly posiciones: Punto[];
  readonly hechas = new Set<number>();
  firma: Firma | null = null;
  private botes: THREE.Group[] = [];
  private decales: THREE.Mesh[] = [];
  private tiempo = 0;
  private readonly clave: string;

  constructor(nivel: Nivel, grafo: GrafoBarrio, barrio: string) {
    this.grupo.name = 'pintadas';
    this.clave = `pinoloko.pintadas.${barrio}.v1`;
    this.posiciones = elegirPuntos(nivel, grafo, TOTAL_PINTADAS, azar(3030 + barrio.length));
    try {
      const guardado = JSON.parse(localStorage.getItem(this.clave) ?? '[]') as number[];
      for (const i of guardado) if (i < this.posiciones.length) this.hechas.add(i);
    } catch { /* sin guardado */ }

    // Atlas con los textos de las pintadas, pintados a mano alzada (letra gorda inclinada con borde).
    const lienzo = document.createElement('canvas');
    lienzo.width = CELDA_ANCHO;
    lienzo.height = CELDA_ALTO * TEXTOS.length;
    const ctx = lienzo.getContext('2d');
    if (ctx) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      TEXTOS.forEach((texto, i) => {
        const y = i * CELDA_ALTO + CELDA_ALTO / 2;
        let tam = 40;
        ctx.font = `italic 900 ${tam}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        while (ctx.measureText(texto).width > CELDA_ANCHO - 16 && tam > 18) { tam -= 2; ctx.font = `italic 900 ${tam}px system-ui, -apple-system, "Segoe UI", sans-serif`; }
        ctx.lineWidth = 7;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#111111';
        ctx.strokeText(texto, CELDA_ANCHO / 2, y);
        ctx.fillStyle = COLORES[i % COLORES.length]!;
        ctx.fillText(texto, CELDA_ANCHO / 2, y);
      });
    }
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.minFilter = THREE.LinearFilter;
    textura.generateMipmaps = false;
    const material = new THREE.MeshBasicMaterial({ map: textura, transparent: true, alphaTest: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

    const bote = new THREE.CylinderGeometry(0.22, 0.22, 0.7, 8).translate(0, 0.35, 0);
    const tapa = new THREE.CylinderGeometry(0.1, 0.12, 0.16, 6).translate(0, 0.78, 0);
    const aro = new THREE.RingGeometry(1.6, 1.85, 4).rotateZ(Math.PI / 4).rotateX(-Math.PI / 2);
    const materialAro = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 });
    this.posiciones.forEach(([x, z], i) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(bote, new THREE.MeshLambertMaterial({ color: COLORES[i % COLORES.length] })));
      g.add(new THREE.Mesh(tapa, new THREE.MeshLambertMaterial({ color: '#111111' })));
      const marco = new THREE.Mesh(aro, materialAro);
      marco.position.y = -0.9;
      g.add(marco);
      g.position.set(x, 1.0, z);
      g.scale.setScalar(1.3);
      g.visible = !this.hechas.has(i);
      this.grupo.add(g);
      this.botes.push(g);

      const celda = i % TEXTOS.length;
      const plano = new THREE.PlaneGeometry(6.5, 6.5 * (CELDA_ALTO / CELDA_ANCHO));
      const uv = plano.getAttribute('uv') as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k), 1 - (celda + 1 - uv.getY(k)) / TEXTOS.length);
      plano.rotateX(-Math.PI / 2).rotateY((i * 0.7) % 1.2 - 0.6);
      const decal = new THREE.Mesh(plano, material);
      decal.position.set(x, 0.05, z);
      decal.renderOrder = 2;
      decal.visible = this.hechas.has(i);
      this.grupo.add(decal);
      this.decales.push(decal);
    });
  }

  private guardar(): void {
    try { localStorage.setItem(this.clave, JSON.stringify([...this.hechas])); } catch { /* nada */ }
  }

  /** Índice del punto sin pintar a menos de RADIO_PINTADA, o -1. */
  cercano(x: number, z: number): number {
    let mejor = -1, mejorD = RADIO_PINTADA * RADIO_PINTADA;
    this.posiciones.forEach(([px, pz], i) => {
      if (this.hechas.has(i)) return;
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < mejorD) { mejorD = d; mejor = i; }
    });
    return mejor;
  }

  empezar(indice: number): Firma {
    const [x, z] = this.posiciones[indice] ?? [0, 0];
    this.firma = new Firma(indice, x, z);
    return this.firma;
  }

  /** Anima los botes y avanza la firma en marcha. Devuelve el índice terminado este frame, o -1. */
  actualizar(x: number, z: number, dt: number): { hecha: number; perdida: boolean } {
    this.tiempo += dt;
    let hecha = -1, perdida = false;
    this.botes.forEach((g, i) => {
      if (this.hechas.has(i)) return;
      const [px, pz] = this.posiciones[i]!;
      if ((px - x) ** 2 + (pz - z) ** 2 > 90 * 90) { g.visible = false; return; }
      g.visible = true;
      g.rotation.y = this.tiempo * 1.5 + i;
      g.position.y = 1.0 + Math.sin(this.tiempo * 3 + i) * 0.2;
    });
    if (this.firma) {
      const r = this.firma.actualizar(x, z, dt);
      if (r === 'hecha') {
        hecha = this.firma.indice;
        this.hechas.add(hecha);
        this.botes[hecha]!.visible = false;
        this.decales[hecha]!.visible = true;
        this.guardar();
        this.firma = null;
      } else if (r === 'perdida') { perdida = true; this.firma = null; }
    }
    return { hecha, perdida };
  }

  get cuantas(): number {
    return this.hechas.size;
  }

  texto(indice: number): string {
    return TEXTOS[indice % TEXTOS.length]!;
  }
}
