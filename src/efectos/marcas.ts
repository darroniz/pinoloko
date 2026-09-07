// Marcas de neumático: un anillo de cuadriláteros oscuros a ras de suelo que se va
// pintando bajo la rueda trasera cuando la moto derrapa o frena fuerte.
import * as THREE from 'three';

const MAXIMO = 900;

export class MarcasNeumatico {
  readonly malla: THREE.Mesh;
  private posiciones: Float32Array;
  private alfas: Float32Array;
  private indice = 0;
  private ultima: { x: number; z: number } | null = null;

  constructor() {
    const geo = new THREE.BufferGeometry();
    this.posiciones = new Float32Array(MAXIMO * 6 * 3);
    this.alfas = new Float32Array(MAXIMO * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(this.posiciones, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alfa', new THREE.BufferAttribute(this.alfas, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      vertexShader: 'attribute float alfa; varying float vAlfa; void main(){ vAlfa = alfa; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying float vAlfa; void main(){ gl_FragColor = vec4(0.12, 0.1, 0.09, vAlfa * 0.55); }',
    });
    this.malla = new THREE.Mesh(geo, mat);
    this.malla.frustumCulled = false;
    this.malla.renderOrder = 2;
  }

  /** Añade un tramo de marca desde la última posición hasta (x, z). */
  pintar(x: number, z: number, intensidad: number): void {
    if (!this.ultima) { this.ultima = { x, z }; return; }
    const dx = x - this.ultima.x, dz = z - this.ultima.z;
    const l = Math.hypot(dx, dz);
    if (l < 0.15) return;
    if (l > 3) { this.ultima = { x, z }; return; }
    const nx = (-dz / l) * 0.13, nz = (dx / l) * 0.13;
    const y = 0.06;
    const a = this.ultima;
    const v = [
      a.x + nx, y, a.z + nz, x + nx, y, z + nz, x - nx, y, z - nz,
      a.x + nx, y, a.z + nz, x - nx, y, z - nz, a.x - nx, y, a.z - nz,
    ];
    const base = this.indice * 18;
    for (let i = 0; i < 18; i++) this.posiciones[base + i] = v[i]!;
    for (let i = 0; i < 6; i++) this.alfas[this.indice * 6 + i] = Math.min(1, intensidad);
    this.indice = (this.indice + 1) % MAXIMO;
    this.ultima = { x, z };
    const geo = this.malla.geometry;
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('alfa') as THREE.BufferAttribute).needsUpdate = true;
    geo.setDrawRange(0, MAXIMO * 6);
  }

  cortar(): void {
    this.ultima = null;
  }
}
