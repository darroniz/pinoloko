// Minimapa: el barrio pintado UNA vez en un canvas (1 px por metro) y subido como textura de
// un disco en una escena ortográfica que se pinta encima del juego. Cada frame solo se mueve el
// desplazamiento de la textura (para centrar al jugador) y unas mallas de marcadores: nada de
// subir canvas a la GPU en caliente, que sin GPU de verdad cuesta la mitad de los frames.
// Norte arriba, como la cámara.
import * as THREE from 'three';
import type { Nivel } from '../mundo/tipos';

const RADIO = 56; // px en pantalla
const ESCALA = 0.55; // px por metro (se ven ~200 m de lado a lado)
const MAX_PUNTOS = 96;

export interface PuntosMinimapa {
  jugador: { x: number; z: number; rumbo: number };
  paradas: { x: number; z: number }[];
  patrullas: { x: number; z: number }[];
  mecheros: { x: number; z: number }[];
  objetivo: { x: number; z: number } | null;
  rampas: { x: number; z: number }[];
}

const COLOR = { parada: new THREE.Color('#d7263d'), patrulla: new THREE.Color('#1f4fd8'), mechero: new THREE.Color('#ffd23f'), rampa: new THREE.Color('#f2c14e') };

export class Minimapa {
  readonly escena = new THREE.Scene();
  readonly camara = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
  private grupo = new THREE.Group();
  private disco: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private textura: THREE.CanvasTexture | null = null;
  private puntos: THREE.InstancedMesh;
  private jugador: THREE.Mesh;
  private aro: THREE.Mesh;
  private icono: THREE.Mesh;
  private zona: HTMLElement;
  private fondoTam = 580;
  private margen = 40;
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  visible = true;
  private cargado = false;
  private jugando = false;

  constructor() {
    this.disco = new THREE.Mesh(new THREE.CircleGeometry(RADIO, 40), new THREE.MeshBasicMaterial({ color: '#d9d0bb', depthTest: false, depthWrite: false }));
    this.disco.renderOrder = 0;
    const borde = new THREE.Mesh(new THREE.RingGeometry(RADIO - 1, RADIO + 2.5, 40), new THREE.MeshBasicMaterial({ color: '#fffaf0', depthTest: false, depthWrite: false }));
    borde.renderOrder = 4;
    this.puntos = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false }), MAX_PUNTOS);
    this.puntos.renderOrder = 1;
    this.puntos.count = 0;
    this.puntos.frustumCulled = false;
    this.aro = new THREE.Mesh(new THREE.RingGeometry(6, 9, 20), new THREE.MeshBasicMaterial({ color: '#ffd23f', depthTest: false, depthWrite: false }));
    this.aro.renderOrder = 2;
    this.aro.visible = false;
    const tri = new THREE.Shape([new THREE.Vector2(0, 11), new THREE.Vector2(8, -9), new THREE.Vector2(0, -5), new THREE.Vector2(-8, -9)]);
    this.jugador = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, depthWrite: false }));
    this.jugador.renderOrder = 3;
    const sombra = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: '#2b2320', depthTest: false, depthWrite: false }));
    sombra.scale.setScalar(1.35);
    sombra.renderOrder = 2;
    this.jugador.add(sombra);
    this.grupo.add(this.disco, this.puntos, this.aro, this.jugador, borde);
    // Plegado: un botoncito con una brújula.
    this.icono = new THREE.Mesh(new THREE.CircleGeometry(14, 24), new THREE.MeshBasicMaterial({ color: '#fffaf0', depthTest: false, depthWrite: false }));
    const aguja = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 9), new THREE.Vector2(4, 0), new THREE.Vector2(0, -9), new THREE.Vector2(-4, 0)])), new THREE.MeshBasicMaterial({ color: '#d7263d', depthTest: false, depthWrite: false }));
    aguja.renderOrder = 1;
    this.icono.add(aguja);
    this.icono.visible = false;
    this.escena.add(this.grupo, this.icono);
    this.zona = document.createElement('div');
    this.zona.id = 'minimapa';
    document.body.appendChild(this.zona);
    this.zona.addEventListener('pointerdown', (e) => { e.preventDefault(); this.alternar(); });
    this.redimensionar(window.innerWidth, window.innerHeight);
  }

  /** Coloca el disco en píxeles de pantalla (origen abajo a la izquierda), bajo el botón del menú. */
  redimensionar(ancho: number, alto: number): void {
    this.camara.right = ancho;
    this.camara.top = alto;
    this.camara.updateProjectionMatrix();
    const sat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0;
    // Apaisado (móvil tumbado): a la izquierda bajo el nombre de la calle, que a la derecha
    // están los botones de menú y foto y debajo los de acción. En vertical, bajo esos botones.
    const apaisado = ancho > alto;
    const arriba = apaisado ? 92 + sat : Math.max(132, 122 + sat);
    const x = apaisado ? 14 + RADIO : ancho - 12 - RADIO;
    this.grupo.position.set(x, alto - arriba - RADIO, 0);
    this.icono.position.set(apaisado ? 14 + 14 : ancho - 12 - 14, alto - arriba - 14, 0);
    this.zona.classList.toggle('apaisado', apaisado);
  }

  alternar(): void {
    this.visible = !this.visible;
    this.zona.classList.toggle('plegado', !this.visible);
    this.aplicarVisibilidad();
  }

  private aplicarVisibilidad(): void {
    const activo = this.jugando && this.cargado;
    this.grupo.visible = activo && this.visible;
    this.icono.visible = activo && !this.visible;
  }

  /** Se dibuja solo jugando (fuera de la portada y del bus). */
  mostrar(si: boolean): void {
    if (si === this.jugando) return;
    this.jugando = si;
    this.aplicarVisibilidad();
  }

  get activo(): boolean {
    return this.grupo.visible || this.icono.visible;
  }

  /** Pinta el fondo del barrio (suelo, agua, zonas verdes, calles, pasajes, edificios) y lo sube una vez. */
  cargar(nivel: Nivel): void {
    const [ancho, fondo] = nivel.tamano;
    const tam = Math.ceil(Math.max(ancho, fondo) + this.margen * 2);
    this.fondoTam = tam;
    const c = document.createElement('canvas');
    c.width = tam;
    c.height = tam;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const X = (x: number): number => x + tam / 2;
    const Z = (z: number): number => z + tam / 2;
    ctx.fillStyle = '#d9d0bb';
    ctx.fillRect(0, 0, tam, tam);
    const poligono = (pts: [number, number][]): void => {
      ctx.beginPath();
      pts.forEach(([x, z], i) => { if (i === 0) ctx.moveTo(X(x), Z(z)); else ctx.lineTo(X(x), Z(z)); });
      ctx.closePath();
      ctx.fill();
    };
    for (const z of nivel.zonas) {
      ctx.fillStyle = z.clase === 'water' ? '#6fb0d8' : z.clase === 'parking' ? '#b9b9be' : '#a3cf86';
      poligono(z.poligono);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const via of nivel.vias) {
      ctx.strokeStyle = via.clase === 'rodada' ? '#7a7a82' : '#efe6d0';
      ctx.lineWidth = via.clase === 'rodada' ? via.ancho + 2 : Math.max(2, via.ancho);
      ctx.beginPath();
      via.puntos.forEach(([x, z], i) => { if (i === 0) ctx.moveTo(X(x), Z(z)); else ctx.lineTo(X(x), Z(z)); });
      ctx.stroke();
    }
    for (const e of nivel.edificios) {
      ctx.fillStyle = e.tipo === 'bloque' ? '#c9b8a0' : e.color;
      poligono(e.poligono);
    }
    this.textura?.dispose();
    this.textura = new THREE.CanvasTexture(c);
    this.textura.colorSpace = THREE.SRGBColorSpace;
    this.textura.generateMipmaps = false;
    this.textura.minFilter = THREE.LinearFilter;
    this.textura.wrapS = THREE.ClampToEdgeWrapping;
    this.textura.wrapT = THREE.ClampToEdgeWrapping;
    this.disco.material.map = this.textura;
    this.disco.material.color.set('#ffffff');
    this.disco.material.needsUpdate = true;
    this.cargado = true;
    this.aplicarVisibilidad();
  }

  actualizar(_dt: number, puntos: PuntosMinimapa): void {
    if (!this.grupo.visible || !this.textura) return;
    const j = puntos.jugador;
    // Recorte de la textura centrado en el jugador (el canvas tiene el origen arriba a la izquierda).
    const metros = (RADIO * 2) / ESCALA;
    const rep = metros / this.fondoTam;
    this.textura.repeat.set(rep, rep);
    this.textura.offset.set((j.x + this.fondoTam / 2 - metros / 2) / this.fondoTam, 1 - (j.z + this.fondoTam / 2 + metros / 2) / this.fondoTam);
    // Marcadores: círculos de colores por instancia; fuera del disco no se pintan.
    let n = 0;
    const poner = (x: number, z: number, color: THREE.Color, r: number): void => {
      if (n >= MAX_PUNTOS) return;
      const px = (x - j.x) * ESCALA, py = -(z - j.z) * ESCALA;
      if (px * px + py * py > (RADIO - 4) * (RADIO - 4)) return;
      this.p.set(px, py, 0);
      this.s.set(r, r, 1);
      this.m.compose(this.p, this.q, this.s);
      this.puntos.setMatrixAt(n, this.m);
      this.puntos.setColorAt(n, color);
      n++;
    };
    for (const r of puntos.rampas) poner(r.x, r.z, COLOR.rampa, 2.5);
    for (const m of puntos.mecheros) poner(m.x, m.z, COLOR.mechero, 3);
    for (const p of puntos.paradas) poner(p.x, p.z, COLOR.parada, 5);
    for (const p of puntos.patrullas) poner(p.x, p.z, COLOR.patrulla, 5);
    this.puntos.count = n;
    this.puntos.instanceMatrix.needsUpdate = true;
    if (this.puntos.instanceColor) this.puntos.instanceColor.needsUpdate = true;
    // Siguiente punto de la carrera: aro amarillo, en el borde si se sale del disco.
    if (puntos.objetivo) {
      const dx = (puntos.objetivo.x - j.x) * ESCALA, dy = -(puntos.objetivo.z - j.z) * ESCALA;
      const d = Math.hypot(dx, dy) || 1;
      const lim = Math.min(d, RADIO - 11);
      this.aro.position.set((dx / d) * lim, (dy / d) * lim, 0);
      this.aro.visible = true;
    } else this.aro.visible = false;
    this.jugador.rotation.z = -j.rumbo;
  }
}
