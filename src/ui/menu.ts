// Menú: garaje (elegir moto entre las robadas), estadísticas y créditos. Se abre desde la
// portada y, en partida, con Escape / botón ☰ (el juego se pausa mientras está abierto).
import type { ModeloScooter } from '../fisica/scooter';
import { Contador, Garaje, resumen } from '../estadisticas';
import type { Calidad } from '../juego';
import { MEJORAS, NIVEL_MAXIMO, type Mejora, type Taller } from '../taller';
import { LOGROS, type Logros } from '../logros';

export type Pestana = 'garaje' | 'logros' | 'estadisticas' | 'ayuda' | 'creditos';

export interface OpcionesMenu {
  modelos: ModeloScooter[];
  garaje: Garaje;
  contador: Contador;
  logros: Logros;
  alElegirMoto: (indice: number) => void;
  alNuevaPartida: () => void;
  alCerrar: () => void;
  calidad: Calidad;
  alElegirCalidad: (c: Calidad) => void;
  taller: Taller;
  dinero: () => number;
  /** Compra una mejora para la moto elegida; devuelve si ha podido. */
  alComprar: (mejora: Mejora) => boolean;
}

const AYUDA = `
<div class="fila"><span>Moverse</span><strong>WASD / flechas · joystick</strong></div>
<div class="fila"><span>Frenar y derrapar</span><strong>ESPACIO · FRENO</strong></div>
<div class="fila"><span>Subir, bajar, coger el 13</span><strong>E · SUBIR / BAJAR / EL 13</strong></div>
<div class="fila"><span>Claxon (asusta a la gente)</span><strong>H · PIII</strong></div>
<div class="fila"><span>Volver a la parada</span><strong>R</strong></div>
<div class="fila"><span>Menú y pausa</span><strong>ESC · ☰</strong></div>
<div class="fila"><span>Plegar el minimapa</span><strong>M · tocarlo</strong></div>
<div class="fila"><span>Foto para compartir</span><strong>P · 📷</strong></div>
<p class="peque" style="margin-top:10px">Roba motos aparcadas y coches en marcha (¡y el 13!). Derriba conos, macetas, terrazas y cajas del
mercado para ganar dinero y armar lío. Las estrellas son la Policía Local: los coches patrulla no entran en los
pasajes, las motos sí. Pasa en moto por una pancarta a cuadros para correr contra el reloj. Las rampas de los
pasajes son para volar. Las bolsas de papel en la puerta de los bares son encargos: cógelas en moto y llévalas a
otro bar antes de que se acabe el tiempo; cada entrega encadena la siguiente con más premio. Busca los 20 mecheros de cada barrio. A pie y en una parada, el 13 te lleva al otro barrio.</p>`;

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
    for (const [id, texto] of [['garaje', 'GARAJE'], ['logros', 'LOGROS'], ['estadisticas', 'STATS'], ['ayuda', 'AYUDA'], ['creditos', 'CRÉDITOS']] as const) {
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
      const c = (e.target as HTMLElement).closest<HTMLElement>('[data-calidad]');
      if (c && c.dataset['calidad'] !== this.op.calidad) { this.op.alElegirCalidad(c.dataset['calidad'] as Calidad); return; }
      const compra = (e.target as HTMLElement).closest<HTMLElement>('[data-mejora]');
      if (compra) { if (this.op.alComprar(compra.dataset['mejora'] as Mejora)) this.mostrar('garaje'); return; }
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
    else if (pestana === 'logros') this.cuerpo.innerHTML = this.htmlLogros();
    else if (pestana === 'estadisticas') this.cuerpo.innerHTML = this.htmlEstadisticas();
    else if (pestana === 'ayuda') this.cuerpo.innerHTML = AYUDA + this.htmlCalidad();
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
    return `<p class="peque">Las motos que robas se quedan en el garaje. Elige con cuál sales.</p>${filas.join('')}${this.htmlTaller()}`;
  }

  /** El taller: mejoras de la moto elegida, con su nivel y el precio del siguiente. */
  private htmlTaller(): string {
    const g = this.op.garaje;
    const modelo = this.op.modelos[g.elegida];
    if (!modelo) return '';
    const dinero = this.op.dinero();
    const filas = MEJORAS.map((m) => {
      const nivel = this.op.taller.nivel(g.elegida, m.id);
      const precio = this.op.taller.precio(g.elegida, m.id);
      const puntos = Array.from({ length: NIVEL_MAXIMO }, (_, i) => `<i class="${i < nivel ? 'lleno' : ''}"></i>`).join('');
      const boton = precio === null ? '<span class="tope">AL MÁXIMO</span>' : `<button type="button" data-mejora="${m.id}" ${dinero >= precio ? '' : 'disabled'}>${precio} €</button>`;
      return `<div class="mejora"><span><strong>${m.nombre}</strong><br><span class="peque">${m.descripcion}</span></span><span class="niveles">${puntos}</span>${boton}</div>`;
    });
    return `<h3>El taller · ${modelo.nombre}</h3><p class="peque">Tienes ${dinero} €. Las mejoras son de cada moto.</p>${filas.join('')}`;
  }

  /** Selector de calidad gráfica: cambiarla recarga el juego (el barrio se construye según ella). */
  private htmlCalidad(): string {
    const botones = (['alta', 'media', 'baja'] as const).map((c) => `<button type="button" class="calidad ${c === this.op.calidad ? 'elegida' : ''}" data-calidad="${c}">${c.toUpperCase()}</button>`);
    return `<div class="fila" style="margin-top:12px;align-items:center"><span>Gráficos<br><span class="peque">Si va a tirones, baja</span></span><span class="calidades">${botones.join('')}</span></div>`;
  }

  private htmlLogros(): string {
    const tiene = this.op.logros.desbloqueados;
    const filas = LOGROS.map((l) => `<div class="logro ${tiene.has(l.id) ? 'hecho' : ''}"><span class="sello">${tiene.has(l.id) ? '★' : '☆'}</span><span><strong>${l.nombre}</strong><br><span class="peque">${l.descripcion}</span></span></div>`);
    return `<p class="peque">${tiene.size} de ${LOGROS.length}. Se consiguen haciendo el cafre por el barrio.</p>${filas.join('')}`;
  }

  private htmlEstadisticas(): string {
    const filas = resumen(this.op.contador.datos).map(([k, v]) => `<div class="fila"><span>${k}</span><strong>${v}</strong></div>`);
    return filas.join('');
  }
}
