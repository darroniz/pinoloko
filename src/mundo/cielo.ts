// Ciclo día/noche: un día de juego dura DURACION_DIA segundos reales. Cambian el color
// del cielo, la intensidad y el color del sol y de la luz ambiente. De noche, las farolas
// son un tinte cálido en el ambiente: sin luces puntuales, que en móvil cuestan.
import * as THREE from 'three';

export const DURACION_DIA = 10 * 60;

interface Tramo { hora: number; cielo: string; sol: string; solIntensidad: number; ambiente: number; suelo: string }

const TRAMOS: Tramo[] = [
  { hora: 0, cielo: '#1b2440', sol: '#7f8fc9', solIntensidad: 0.25, ambiente: 0.35, suelo: '#5a5f7a' },
  { hora: 5, cielo: '#2e3a63', sol: '#9aa4d4', solIntensidad: 0.35, ambiente: 0.45, suelo: '#7a7a8f' },
  { hora: 7, cielo: '#f5b98a', sol: '#ffb875', solIntensidad: 1.1, ambiente: 0.7, suelo: '#c9a98a' },
  { hora: 10, cielo: '#bfe0f2', sol: '#fff3dc', solIntensidad: 1.6, ambiente: 0.85, suelo: '#c9b69a' },
  { hora: 15, cielo: '#b8dcf0', sol: '#fff6e5', solIntensidad: 1.7, ambiente: 0.9, suelo: '#cbb89c' },
  { hora: 19.5, cielo: '#f3a276', sol: '#ff9f5a', solIntensidad: 1.0, ambiente: 0.7, suelo: '#c49478' },
  { hora: 21, cielo: '#3a3560', sol: '#8f86c9', solIntensidad: 0.4, ambiente: 0.5, suelo: '#7a6f8f' },
  { hora: 24, cielo: '#1b2440', sol: '#7f8fc9', solIntensidad: 0.25, ambiente: 0.35, suelo: '#5a5f7a' },
];

export class Cielo {
  /** Hora del día en [0, 24). Arranca a media tarde, que es cuando el barrio está vivo. */
  hora = 17.5;
  private cCielo = new THREE.Color();
  private cSol = new THREE.Color();
  private cSuelo = new THREE.Color();
  private tmpA = new THREE.Color();
  private tmpB = new THREE.Color();

  constructor(
    private readonly escena: THREE.Scene,
    private readonly sol: THREE.DirectionalLight,
    private readonly ambiente: THREE.HemisphereLight,
  ) {}

  get esDeNoche(): boolean {
    return this.hora < 6.5 || this.hora > 20.5;
  }

  actualizar(dt: number): void {
    this.hora = (this.hora + (dt * 24) / DURACION_DIA) % 24;
    let i = 0;
    while (i + 1 < TRAMOS.length && TRAMOS[i + 1]!.hora <= this.hora) i++;
    const a = TRAMOS[i]!, b = TRAMOS[Math.min(i + 1, TRAMOS.length - 1)]!;
    const t = b.hora === a.hora ? 0 : (this.hora - a.hora) / (b.hora - a.hora);
    this.cCielo.copy(this.tmpA.set(a.cielo)).lerp(this.tmpB.set(b.cielo), t);
    this.cSol.copy(this.tmpA.set(a.sol)).lerp(this.tmpB.set(b.sol), t);
    this.cSuelo.copy(this.tmpA.set(a.suelo)).lerp(this.tmpB.set(b.suelo), t);
    (this.escena.background as THREE.Color).copy(this.cCielo);
    this.sol.color.copy(this.cSol);
    this.sol.intensity = THREE.MathUtils.lerp(a.solIntensidad, b.solIntensidad, t);
    this.ambiente.intensity = THREE.MathUtils.lerp(a.ambiente, b.ambiente, t);
    this.ambiente.groundColor.copy(this.cSuelo);
    this.ambiente.color.copy(this.cCielo).lerp(this.tmpA.set('#ffffff'), 0.6);
  }

  /** Posición del sol relativa al jugador: gira con la hora para que las sombras se muevan. */
  colocarSol(x: number, z: number): void {
    const ang = ((this.hora - 6) / 12) * Math.PI; // 6h → este, 18h → oeste
    const altura = Math.max(0.25, Math.sin(ang));
    this.sol.position.set(x + Math.cos(ang) * 90, 40 + altura * 90, z + 40);
    this.sol.target.position.set(x, 0, z);
  }

  get textoHora(): string {
    const h = Math.floor(this.hora), m = Math.floor((this.hora - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
