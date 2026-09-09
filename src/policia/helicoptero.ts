// El helicóptero de la Local, a cinco estrellas: da vueltas sobre el jugador con un foco que
// lo persigue con retraso. Mientras el foco te tiene, el calor no baja; si vas rápido y cambias
// de dirección, el foco te pierde y puedes escapar. Vive en la escena (no en el barrio).
import * as THREE from 'three';

const ALTURA = 30;
const RADIO_ORBITA = 16;
const VELOCIDAD_FOCO = 9;
const RADIO_FOCO = 5.5;
const RADIO_ILUMINADO = 7;

export class Helicoptero {
  readonly grupo = new THREE.Group();
  activo = false;
  private saliendo = false;
  private tiempo = 0;
  private cuerpo: THREE.Group;
  private rotor: THREE.Mesh;
  private haz: THREE.Mesh;
  private foco: THREE.Mesh;
  private focoPos = new THREE.Vector3();
  private posicion = new THREE.Vector3();

  constructor() {
    this.grupo.name = 'helicoptero';
    this.grupo.visible = false;
    const blanco = new THREE.MeshLambertMaterial({ color: '#f4f4f4' });
    const azul = new THREE.MeshLambertMaterial({ color: '#1f4fd8' });
    const oscuro = new THREE.MeshLambertMaterial({ color: '#2b2b2f' });
    this.cuerpo = new THREE.Group();
    const cabina = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8).scale(1, 0.8, 1.4), blanco);
    const franja = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 2.2), azul);
    franja.position.y = -0.1;
    const cola = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 4.2), blanco);
    cola.position.set(0, 0.2, 3.4);
    const rotorCola = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.2), oscuro);
    rotorCola.position.set(0.3, 0.5, 5.3);
    const patin1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3), oscuro);
    patin1.position.set(-0.9, -1.2, 0);
    const patin2 = patin1.clone();
    patin2.position.x = 0.9;
    this.rotor = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.06, 16), new THREE.MeshBasicMaterial({ color: '#333338', transparent: true, opacity: 0.45 }));
    this.rotor.position.y = 1.3;
    this.cuerpo.add(cabina, franja, cola, rotorCola, patin1, patin2, this.rotor);
    this.cuerpo.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
    this.grupo.add(this.cuerpo);
    // El haz: cono translúcido desde el helicóptero al foco, y el foco: disco claro en el suelo.
    this.haz = new THREE.Mesh(new THREE.ConeGeometry(RADIO_FOCO, 1, 12, 1, true).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    this.foco = new THREE.Mesh(new THREE.CircleGeometry(RADIO_FOCO, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.45, depthWrite: false }));
    this.foco.position.y = 0.06;
    this.grupo.add(this.haz, this.foco);
  }

  /** Llega volando desde lejos hasta la vertical del jugador. */
  aparecer(x: number, z: number): void {
    if (this.activo) { this.saliendo = false; return; }
    this.activo = true;
    this.saliendo = false;
    this.tiempo = 0;
    this.posicion.set(x + 140, ALTURA + 25, z + 90);
    this.focoPos.set(x + 60, 0, z + 40);
    this.grupo.visible = true;
  }

  /** Se va (de golpe si `ya`, si no volando). */
  retirar(ya = false): void {
    if (!this.activo) return;
    if (ya) { this.activo = false; this.grupo.visible = false; return; }
    this.saliendo = true;
  }

  /** Mueve el helicóptero y el foco; dice si el foco tiene al jugador y cómo de cerca suena. */
  actualizar(jugador: { x: number; z: number }, dt: number): { iluminado: boolean; cercania: number } {
    if (!this.activo) return { iluminado: false, cercania: 0 };
    this.tiempo += dt;
    // Órbita alrededor del jugador (o huida si se retira).
    const objetivo = this.saliendo
      ? new THREE.Vector3(this.posicion.x + 40, ALTURA + 60, this.posicion.z - 40)
      : new THREE.Vector3(jugador.x + Math.cos(this.tiempo * 0.55) * RADIO_ORBITA, ALTURA, jugador.z + Math.sin(this.tiempo * 0.55) * RADIO_ORBITA);
    const k = 1 - Math.exp(-dt * (this.saliendo ? 0.8 : 1.6));
    this.posicion.lerp(objetivo, k);
    if (this.saliendo && this.posicion.y > ALTURA + 50) { this.activo = false; this.grupo.visible = false; return { iluminado: false, cercania: 0 }; }
    this.cuerpo.position.copy(this.posicion);
    // Morro hacia donde va.
    const dir = objetivo.clone().sub(this.posicion);
    if (dir.lengthSq() > 0.5) this.cuerpo.rotation.y = Math.atan2(-dir.x, -dir.z);
    this.cuerpo.rotation.z = Math.sin(this.tiempo * 0.55) * 0.12;
    this.rotor.rotation.y += dt * 40;
    // El foco persigue al jugador con velocidad limitada: se le escapa si va rápido.
    const dx = jugador.x - this.focoPos.x, dz = jugador.z - this.focoPos.z;
    const d = Math.hypot(dx, dz);
    const paso = Math.min(d, VELOCIDAD_FOCO * dt);
    if (d > 0.01) this.focoPos.set(this.focoPos.x + (dx / d) * paso, 0, this.focoPos.z + (dz / d) * paso);
    this.foco.position.set(this.focoPos.x, 0.06, this.focoPos.z);
    // Haz: cono desde el helicóptero al foco.
    this.haz.position.copy(this.posicion);
    const alFoco = this.focoPos.clone().sub(this.posicion);
    const largo = alFoco.length() || 1;
    this.haz.scale.set(1, largo, 1);
    this.haz.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), alFoco.normalize());
    const iluminado = !this.saliendo && d < RADIO_ILUMINADO;
    this.foco.visible = !this.saliendo;
    this.haz.visible = !this.saliendo;
    const dist = Math.hypot(this.posicion.x - jugador.x, this.posicion.z - jugador.z, this.posicion.y);
    return { iluminado, cercania: Math.max(0, 1 - dist / 120) };
  }
}
