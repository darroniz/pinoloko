// Dinero que flota donde lo ganas, dentro del WebGL: un puñado de planos con textura de canvas
// (uno por texto) que suben y se desvanecen. Nada en el DOM: sin GPU, componer capas animadas
// por encima del canvas costaba la mitad de los frames (ver DECISIONES del 2026-09-10).
import * as THREE from 'three';

const MAXIMO = 6;
const DURACION = 1.0;
const ANCHO_PX = 160, ALTO_PX = 48;
/** Misma inclinación que los rótulos: la cámara nunca gira, así que el plano mira siempre a ella. */
const INCLINACION = THREE.MathUtils.degToRad(58);

interface Etiqueta {
  malla: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  textura: THREE.CanvasTexture;
  ctx: CanvasRenderingContext2D | null;
  vida: number;
  x: number;
  z: number;
  y0: number;
}

export class DineroFlotante {
  readonly grupo = new THREE.Group();
  private etiquetas: Etiqueta[] = [];
  private siguiente = 0;

  constructor() {
    this.grupo.name = 'dinero-flotante';
    const geo = new THREE.PlaneGeometry(7, 7 * (ALTO_PX / ANCHO_PX)).rotateX(-INCLINACION);
    for (let i = 0; i < MAXIMO; i++) {
      const lienzo = document.createElement('canvas');
      lienzo.width = ANCHO_PX;
      lienzo.height = ALTO_PX;
      const textura = new THREE.CanvasTexture(lienzo);
      textura.colorSpace = THREE.SRGBColorSpace;
      textura.minFilter = THREE.LinearFilter;
      textura.generateMipmaps = false;
      const material = new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
      const malla = new THREE.Mesh(geo, material);
      malla.renderOrder = 30;
      malla.visible = false;
      malla.frustumCulled = false;
      this.grupo.add(malla);
      this.etiquetas.push({ malla, material, textura, ctx: lienzo.getContext('2d'), vida: 0, x: 0, z: 0, y0: 0 });
    }
  }

  /** Suelta un "+30 €" sobre (x, z); con multiplicador va en amarillo y más grande. */
  soltar(cantidad: number, x: number, z: number, y = 1.5, multiplicador = 1): void {
    const e = this.etiquetas[this.siguiente]!;
    this.siguiente = (this.siguiente + 1) % MAXIMO;
    const texto = multiplicador > 1 ? `+${cantidad} € ×${multiplicador}` : `+${cantidad} €`;
    const ctx = e.ctx;
    if (ctx) {
      ctx.clearRect(0, 0, ANCHO_PX, ALTO_PX);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${multiplicador > 1 ? 34 : 28}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a1208';
      ctx.strokeText(texto, ANCHO_PX / 2, ALTO_PX / 2 + 1);
      ctx.fillStyle = multiplicador > 1 ? '#ffd54a' : '#f7f3ea';
      ctx.fillText(texto, ANCHO_PX / 2, ALTO_PX / 2 + 1);
    }
    e.textura.needsUpdate = true;
    e.vida = DURACION;
    e.x = x + (Math.random() - 0.5) * 1.2;
    e.z = z;
    e.y0 = y;
    const escala = multiplicador > 1 ? 1.25 : 1;
    e.malla.scale.setScalar(escala);
    e.malla.position.set(e.x, y, z);
    e.malla.visible = true;
    e.material.opacity = 1;
  }

  actualizar(dt: number): void {
    for (const e of this.etiquetas) {
      if (e.vida <= 0) continue;
      e.vida -= dt;
      if (e.vida <= 0) { e.malla.visible = false; e.material.opacity = 0; continue; }
      const t = 1 - e.vida / DURACION;
      e.malla.position.y = e.y0 + t * 3.2;
      e.material.opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    }
  }

  get activas(): number {
    return this.etiquetas.filter((e) => e.vida > 0).length;
  }
}
