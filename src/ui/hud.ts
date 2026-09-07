// HUD mínimo: calle actual, velocidad, dinero y avisos cortos.
export class Hud {
  private calle: HTMLElement;
  private kmh: HTMLElement;
  private dinero: HTMLElement;
  private aviso: HTMLElement;
  private temporizadorAviso = 0;
  private ultimaCalle = '';

  constructor() {
    this.calle = document.getElementById('hud-calle')!;
    this.kmh = document.getElementById('hud-kmh')!;
    this.dinero = document.getElementById('hud-dinero')!;
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

  avisar(texto: string, segundos = 2): void {
    this.aviso.textContent = texto;
    this.aviso.classList.add('visible');
    window.clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = window.setTimeout(() => this.aviso.classList.remove('visible'), segundos * 1000);
  }
}
