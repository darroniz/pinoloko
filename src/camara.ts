// Cámara alta fija en perspectiva: FOV estrecho, unos 58° sobre el horizonte, sin rotar
// nunca (el norte siempre arriba). Sigue al jugador con un pelín de adelanto y se
// retira un poco cuando va rápido.
import * as THREE from 'three';

export class CamaraAlta {
  readonly camara: THREE.PerspectiveCamera;
  private objetivo = new THREE.Vector3();
  private sacudida = 0;
  private distancia = 0;
  readonly anguloAltura = THREE.MathUtils.degToRad(58);
  readonly distanciaBase = 66;
  /** Distancia base según lo que lleves: a pie más cerca, en coche más lejos. */
  distanciaObjetivo = 66;
  private readonly retrocesoMaximo = 16;

  constructor(aspecto: number) {
    this.camara = new THREE.PerspectiveCamera(32, aspecto, 2, 600);
    this.distancia = this.distanciaBase;
  }

  redimensionar(aspecto: number): void {
    this.camara.aspect = aspecto;
    // En vertical (móvil) el FOV vertical fijo encoge lo que cabe a lo ancho: se abre un poco.
    this.camara.fov = aspecto < 0.8 ? 42 : 32;
    this.camara.updateProjectionMatrix();
  }

  colocar(x: number, z: number): void {
    this.objetivo.set(x, 0, z);
    this.aplicar();
  }

  sacudir(fuerza: number): void {
    this.sacudida = Math.min(1.5, this.sacudida + fuerza);
  }

  seguir(posicion: THREE.Vector3, velocidad: THREE.Vector3, dt: number): void {
    const rapidez = velocidad.length();
    const adelanto = Math.min(9, rapidez * 0.55);
    const deseado = new THREE.Vector3(posicion.x, 0, posicion.z);
    if (rapidez > 0.5) deseado.addScaledVector(velocidad.clone().setY(0).normalize(), adelanto);
    const k = 1 - Math.exp(-dt * 4.5);
    this.objetivo.lerp(deseado, k);
    const distanciaDeseada = this.distanciaObjetivo + Math.min(1, rapidez / 16) * this.retrocesoMaximo;
    this.distancia += (distanciaDeseada - this.distancia) * (1 - Math.exp(-dt * 2));
    this.sacudida = Math.max(0, this.sacudida - dt * 3);
    this.aplicar();
  }

  private aplicar(): void {
    const alto = Math.sin(this.anguloAltura) * this.distancia;
    const atras = Math.cos(this.anguloAltura) * this.distancia;
    const s = this.sacudida * this.sacudida * 0.8;
    const jx = s ? (Math.random() - 0.5) * s : 0;
    const jz = s ? (Math.random() - 0.5) * s : 0;
    this.camara.position.set(this.objetivo.x + jx, alto, this.objetivo.z + atras + jz);
    this.camara.lookAt(this.objetivo.x + jx, 0, this.objetivo.z + jz);
  }
}
