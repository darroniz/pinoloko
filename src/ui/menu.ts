// Menú: garaje (elegir moto entre las robadas), estadísticas y créditos. Se abre desde la
// portada y, en partida, con Escape / botón ☰ (el juego se pausa mientras está abierto).
import type { ModeloScooter } from '../fisica/scooter';
import { Contador, Garaje, resumen } from '../estadisticas';

export type Pestana = 'garaje' | 'estadisticas' | 'creditos';

export interface OpcionesMenu {
  modelos: ModeloScooter[];
  garaje: Garaje;
  contador: Contador;
  alElegirMoto: (indice: number) => void;
  alNuevaPartida: () => void;
  alCerrar: () => void;
}

const CREDITOS = `
<p><strong>Pinoloko</strong> es un juego personal de Ismael Darroniz, hecho de noche por una
sesión autónoma de Claude en una Raspberry Pi. Sevilla desde arriba, en scooter y haciendo el cafre.</p>
<p><strong>Mapa:</strong> datos de © colaboradores de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>,
bajo licencia ODbL. Calles, edificios, bares, paradas del 13 y árboles salen de ahí.</p>
<p><strong>Motor:</strong> Three.js, Rapier y Vite. Sonido sintetizado con Web Audio. Ningún modelo ni audio de otro juego.</p>
<p><strong>Tono:</strong> humor de barrio, cariñoso y de juguete. Las motos, los bares y el bus son los de verdad porque el barrio es el de verdad.</p>
<p class="peque">Código en <a href="https://github.com/darroniz/pinoloko" target="_blank" rel="noopener">github.com/darroniz/pinoloko</a>.</p>`;

export class Menu {
  readonly panel: HTMLElement;
  private cuerpo: HTMLElement;
  private pestanas: HTMLElement;
  private actual: Pestana = 'garaje';
  abierto = false;

  constructor(private op: OpcionesMenu) {
    this.panel = document.createElement('div');
    this.panel.id = 'menu';
    this.panel.innerHTML = `
      <div class="caja">
        <div class="pestanas"></div>
        <div class="cuerpo"></div>
        <div class="pie">
          <button type="button" class="secundario" data-accion="nueva">NUEVA PARTIDA</button>
          <button type="button" class="principal" data-accion="cerrar">SEGUIR</button>
        </div>
      </div>`;
    document.body.appendChild(this.panel);
    this.cuerpo = this.panel.querySelector('.cuerpo')!;
    this.pestanas = this.panel.querySelector('.pestanas')!;
    for (const [id, texto] of [['garaje', 'GARAJE'], ['estadisticas', 'ESTADÍSTICAS'], ['creditos', 'CRÉDITOS']] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = texto;
      b.dataset['pestana'] = id;
      b.addEventListener('click', () => this.mostrar(id));
      this.pestanas.appendChild(b);
    }
    this.panel.querySelector('[data-accion="cerrar"]')!.addEventListener('click', () => this.cerrar());
    this.panel.querySelector('[data-accion="nueva"]')!.addEventListener('click', () => {
      if (window.confirm('¿Empezar de cero? Se pierden posición, dinero, mecheros y estadísticas. El garaje se queda.')) this.op.alNuevaPartida();
    });
    this.cuerpo.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-moto]');
      if (!b) return;
      const i = Number(b.dataset['moto']);
      if (this.op.garaje.elegir(i)) { this.op.alElegirMoto(i); this.mostrar('garaje'); }
    });
  }

  abrir(pestana: Pestana = this.actual): void {
    this.abierto = true;
    this.panel.classList.add('visible');
    this.mostrar(pestana);
  }

  cerrar(): void {
    if (!this.abierto) return;
    this.abierto = false;
    this.panel.classList.remove('visible');
    this.op.alCerrar();
  }

  private mostrar(pestana: Pestana): void {
    this.actual = pestana;
    for (const b of this.pestanas.children) b.classList.toggle('activa', (b as HTMLElement).dataset['pestana'] === pestana);
    if (pestana === 'garaje') this.cuerpo.innerHTML = this.htmlGaraje();
    else if (pestana === 'estadisticas') this.cuerpo.innerHTML = this.htmlEstadisticas();
    else this.cuerpo.innerHTML = CREDITOS;
  }

  private htmlGaraje(): string {
    const g = this.op.garaje;
    const barra = (v: number, max: number): string => `<i style="width:${Math.round((v / max) * 100)}%"></i>`;
    const filas = this.op.modelos.map((m, i) => {
      const tiene = g.desbloqueadas.has(i);
      const elegida = g.elegida === i;
      const a = m.ajustes;
      return `<button type="button" class="moto ${tiene ? '' : 'bloqueada'} ${elegida ? 'elegida' : ''}" data-moto="${i}" ${tiene ? '' : 'disabled'}>
        <span class="color" style="background:${m.color}"></span>
        <span class="nombre">${m.nombre}${elegida ? ' · la tuya' : ''}${tiene ? '' : ' · róbala por el barrio'}</span>
        <span class="stats">
          <span>Punta ${barra(a.velocidadMaxima, 18)}</span>
          <span>Arranque ${barra(a.aceleracion, 13)}</span>
          <span>Giro ${barra(a.giroMaximo, 3.8)}</span>
        </span>
      </button>`;
    });
    return `<p class="peque">Las motos que robas se quedan en el garaje. Elige con cuál sales.</p>${filas.join('')}`;
  }

  private htmlEstadisticas(): string {
    const filas = resumen(this.op.contador.datos).map(([k, v]) => `<div class="fila"><span>${k}</span><strong>${v}</strong></div>`);
    return filas.join('');
  }
}
