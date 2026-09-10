// HUD mínimo: calle actual, velocidad, dinero y avisos cortos.
export class Hud {
  private calle: HTMLElement;
  private kmh: HTMLElement;
  private dinero: HTMLElement;
  private aviso: HTMLElement;
  private temporizadorAviso = 0;
  private ultimaCalle = '';

  get calleActual(): string { return this.ultimaCalle; }
  private racha: HTMLElement;

  constructor() {
    this.calle = document.getElementById('hud-calle')!;
    this.kmh = document.getElementById('hud-kmh')!;
    this.dinero = document.getElementById('hud-dinero')!;
    this.racha = document.createElement('div');
    this.racha.id = 'racha';
    document.body.appendChild(this.racha);
    this.aviso = document.createElement('div');
    this.aviso.id = 'aviso';
    document.body.appendChild(this.aviso);
  }

  ponerCalle(nombre: string): void {
    if (nombre === this.ultimaCalle) return;
    this.ultimaCalle = nombre;
    this.calle.textContent = nombre;
  }

  ponerVelocidad(ms: number): void {
    this.kmh.textContent = String(Math.round(Math.abs(ms) * 3.6));
  }

  ponerDinero(cantidad: number): void {
    this.dinero.textContent = `${cantidad} €`;
  }

  private estrellas = document.getElementById('estrellas')!;
  private trincao = document.getElementById('trincao')!;
  private ultimasEstrellas = -1;

  private hora = document.getElementById('hud-hora')!;
  private ultimaHora = '';

  ponerHora(texto: string): void {
    if (texto === this.ultimaHora) return;
    this.ultimaHora = texto;
    this.hora.textContent = texto;
  }

  private mecheros = document.getElementById('hud-mecheros')!;

  ponerMecheros(n: number, total: number): void {
    this.mecheros.textContent = `Mecheros ${n}/${total}`;
  }

  ponerEstrellas(n: number): void {
    if (n === this.ultimasEstrellas) return;
    this.ultimasEstrellas = n;
    this.estrellas.innerHTML = n === 0 ? '' : Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'apagada'}">★</span>`).join('');
    this.estrellas.classList.toggle('alerta', n >= 3);
  }

  mostrarTrincao(si: boolean): void {
    this.trincao.classList.toggle('visible', si);
  }

  private carrera = document.getElementById('hud-carrera')!;

  ponerCarrera(texto: string | null): void {
    this.carrera.textContent = texto ?? '';
    this.carrera.classList.toggle('visible', texto !== null);
  }

  ponerRacha(n: number): void {
    this.racha.textContent = n >= 2 ? `×${n} lío` : '';
    this.racha.classList.toggle('visible', n >= 2);
  }

  private flotantes = 0;

  /** Texto que flota y se desvanece en un punto de la pantalla (dinero ganado, combos). */
  flotar(texto: string, x: number, y: number, clase = ''): void {
    // Pocos a la vez: cada uno es una capa que el navegador compone cada frame (y sin GPU, cuesta).
    if (this.flotantes >= 5) return;
    const d = document.createElement('div');
    d.className = `flota ${clase}`;
    d.textContent = texto;
    d.style.left = `${Math.round(x)}px`;
    d.style.top = `${Math.round(y)}px`;
    document.body.appendChild(d);
    this.flotantes++;
    window.setTimeout(() => { d.remove(); this.flotantes--; }, 900);
  }

  avisar(texto: string, segundos = 2): void {
    this.aviso.textContent = texto;
    this.aviso.classList.add('visible');
    window.clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = window.setTimeout(() => this.aviso.classList.remove('visible'), segundos * 1000);
  }
}
