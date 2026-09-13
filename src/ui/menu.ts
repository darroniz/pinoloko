// Menú: garaje (elegir moto entre las robadas), estadísticas y créditos. Se abre desde la
// portada y, en partida, con Escape / botón ☰ (el juego se pausa mientras está abierto).
import type { ModeloScooter } from '../fisica/scooter';
import { Contador, ESTADISTICAS_VACIAS, Garaje, resumen, type Estadisticas } from '../estadisticas';
import type { Calidad } from '../juego';
import { MEJORAS, NIVEL_MAXIMO, type Mejora, type Taller } from '../taller';
import { LOGROS, type Logros } from '../logros';
import { PREMIO_RETO, type Reto } from '../retos';

export type Pestana = 'mapa' | 'garaje' | 'logros' | 'estadisticas' | 'ayuda' | 'creditos';

/** Lo que el mapa del menú pinta encima del barrio. */
export interface DatosMapa {
  lienzo: HTMLCanvasElement | null;
  nombre: string;
  jugador: { x: number; z: number };
  paradas: { x: number; z: number; nombre: string }[];
  bolsas: { x: number; z: number }[];
  pancartas: { x: number; z: number }[];
  pachangas: { x: number; z: number }[];
  rampas: { x: number; z: number }[];
  pintadas: { x: number; z: number; hecha: boolean }[];
  mecheros: { recogidos: number; total: number };
}

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
  mapa: () => DatosMapa;
  /** Compra una mejora para la moto elegida; devuelve si ha podido. */
  alComprar: (mejora: Mejora) => boolean;
  /** Los tres retos de hoy con su progreso. */
  retos: () => { reto: Reto; progreso: number; hecho: boolean }[];
  /** Lo hecho desde que se abrió el juego (diferencia de estadísticas). */
  sesion: () => Estadisticas;
}

const AYUDA = `
<div class="fila"><span>Moverse</span><strong>WASD / flechas · joystick</strong></div>
<div class="fila"><span>Frenar y derrapar (a pie: correr)</span><strong>ESPACIO · FRENO</strong></div>
<div class="fila"><span>Subir, bajar, coger el 13</span><strong>E · SUBIR / BAJAR / EL 13</strong></div>
<div class="fila"><span>Claxon (asusta a la gente)</span><strong>H · PIII</strong></div>
<div class="fila"><span>Volver a la parada</span><strong>R</strong></div>
<div class="fila"><span>El altavoz de la moto</span><strong>Q · 🔊</strong></div>
<p class="peque"><strong>Nuevo (14 de septiembre):</strong> el altavoz y la comitiva, las palomas, la lluvia, la procesión (una tarde de cada tres,
la primera sí, desde las siete), la minimoto, el pilla-pilla con el claxon, el colega de paquete, el stoppie y las bolsas de basura. Todo
explicado abajo.</p>
<div class="fila"><span>Menú y pausa</span><strong>ESC · ☰</strong></div>
<div class="fila"><span>Plegar el minimapa</span><strong>M · tocarlo</strong></div>
<div class="fila"><span>Foto para compartir</span><strong>P · 📷</strong></div>
<p class="peque" style="margin-top:10px"><strong>Robar.</strong> Motos aparcadas y motos en marcha (a pie, E cuando pase un cani), coches, furgonetas,
el camión de Lipasam, el 13 y el Sevici (a pie, E junto a un ciclista: sin motor, silencioso y cabe por todo; no se guarda en el garaje). Las motos que robas se quedan en el garaje; el taller las mejora con lo que ganes.</p>
<p class="peque"><strong>Lío.</strong> Conos, macetas, contenedores, terrazas, cajas del mercado y los puestos del mercadillo dan dinero y
racha. Saltarse un semáforo en rojo, atropellar vecinos, ciclistas del Sevici o moteros calienta a la Policía Local.</p>
<p class="peque"><strong>Estilo.</strong> Conducir bien también paga: una derrapada larga (frenar girando), un caballito largo (a fondo desde
parado), un stoppie (frenazo recto a velocidad: el trasero se levanta, y mientras dura frenas peor), pasar rozando coches y vecinos sin tocarlos ("por los pelos") y tirar en contramano por una calle de sentido único (cada tres
segundos más, y calienta un poco a la Local).</p>
<p class="peque"><strong>La Local.</strong> Sus coches no entran en los pasajes; a tres estrellas salen motos que sí, y a cinco el
helicóptero: su foco te sigue con retraso, así que a fondo y cambiando de dirección lo pierdes.</p>
<p class="peque"><strong>Salida de semáforo.</strong> Parado en rojo con un coche del tráfico al lado: al ponerse verde, sal a fondo y le ganas la salida (15 €).</p>
<p class="peque"><strong>Radares.</strong> Poste con cámara y raya blanca en las avenidas: pasarla a más de 50 km/h es foto multa, 50 € menos.</p>
<p class="peque"><strong>A pie.</strong> ESPACIO / FRENO es patada: el cono, la maceta o el balón que tengas delante salen volando (y cuentan
para la racha). Manteniéndolo, Wifly corre.</p>
<p class="peque"><strong>Minijuegos.</strong> Pancarta a cuadros: pique por los pasajes contra el reloj y contra tres canis en moto (el Kevin, el Jonathan y la Vanessa); ganarles vale 60 € más; si haces récord, la próxima vez corre contigo tu fantasma (una moto translúcida que repite esa vuelta). Si un motero rueda a tu lado dos segundos, te reta: pique callejero de tres anillos. Bolsa naranja en un bar: encargo
para llevar a otro local, y cada entrega encadena la siguiente. Rampas para volar. Balón de los niños: gol son 40 €. Los 20
mecheros de cada barrio se buscan (el MAPA del menú no los chiva). Bote de spray en un cruce de pasajes: a pie y con E, Wifly firma
la pintada (en territorio pijo vale el doble y la Local se calienta).</p>
<p class="peque"><strong>Oficios.</strong> Roba un taxi (blanco con la franja amarilla): los que levantan la mano en la acera son clientes;
para a su lado y llévalos al local que te digan antes de que se acabe el reloj. Con el 13 robado, para despacio en las marquesinas:
los que esperan suben y pagan el billete. Con el camión de Lipasam, párate junto a un contenedor: lo recoge y son 5 €.</p>
<p class="peque"><strong>El barrio responde.</strong> Si armas lío pegado a un bloque, la vecina del quinto sale a la azotea y tira macetas
(de noche, más). Si dejas la moto sola un rato, un cani se la lleva: sale en el minimapa, alcánzalo y a pie con E la recuperas. Con
estrellas o la moto tocada, párate en el anillo azul de <strong>chapa y pintura</strong> con el vehículo: por 100 € la Local te olvida y sale como nueva.
En los saltos, mueve el joystick a los lados para girar en el aire: cada 360 son 40 € más. Si revientas un vehículo vienen los
bomberos, y si tiras a tres vecinos seguidos, el 061; y siempre se forma el corro de mirones. Si rompes la terraza de un bar, el camarero
sale con la escoba y te persigue a pie (si te pilla parado, escobazo y 20 €); y el motero al que le quitas la moto te corre detrás: si te
pilla, se la lleva de vuelta. Y el dueño del coche que robas también sale detrás: si te pilla parado, te saca.</p>
<p class="peque"><strong>De paquete.</strong> En scooter, de vez en cuando un colega levanta la mano en la acera: para a su lado, se sube detrás y te dice
un bar; llévalo antes de que se acabe el reloj. Paga menos que el taxi (es un colega), pero encadena igual.</p>
<p class="peque"><strong>Pilla-pilla.</strong> Pita (H / PIII) junto a un cani en moto y te reta: "¡A que no me pillas!". Sale disparado por calles y
pasajes durante 35 s; alcánzalo y pégate a él un segundo (o tíralo) y son 50 €. Sale en el minimapa.</p>
<p class="peque"><strong>La minimoto.</strong> La pocket bike naranja aparcada por el barrio (y algún cani la lleva por los pasajes): diminuta,
sale disparada, gira como una peonza y no agarra nada. Entra en el garaje y en el taller como las demás.</p>
<p class="peque"><strong>La procesión.</strong> Una tarde de cada tres (la primera, sí), de siete a once y media, la cofradía sale de la parroquia
del barrio: la cruz de guía, los nazarenos, el paso con sus cirios y la banda detrás, despacio por los pasajes (se oye desde lejos). Colarte
por medio con la moto calienta a la Local y escandaliza al barrio; párate junto al paso unos segundos y Wifly se quita la gorra: 25 €. A pie
junto a un nazareno, te da un caramelo. El tráfico se para a su paso.</p>
<p class="peque"><strong>La lluvia.</strong> De vez en cuando se nubla y llueve unas horas: menos agarre (los derrapes se alargan y se frena
peor), charcos en las calles que salpican al pisarlos a velocidad (si mojas a un vecino, 4 €) y el barrio con paraguas.</p>
<p class="peque"><strong>La calor.</strong> Un día de cada dos (el primero, sí), de dos a seis y media de la tarde, ola de calor: calima, medio
barrio con abanico, y el chapuzón en piscinas y fuentes vale el doble. Con la comitiva detrás (tres o más), los trucos de estilo valen la mitad más.</p>
<p class="peque"><strong>Las palomas.</strong> Picotean en las plazas y delante del Mercado; al pasar cerca despegan todas (3 € la bandada), dan
una vuelta y se vuelven a posar.</p>
<p class="peque"><strong>El altavoz.</strong> Q (o el 🔊) enciende el reggaetón de la moto. En Pino Montano, los canis que pasan se te ponen detrás
bailando (5 € cada uno, hasta cinco): ve despacio o los pierdes. En los demás barrios protestan, y de noche pegado a los bloques despierta a la
vecina y la Local se va calentando.</p>
<p class="peque"><strong>El botellón.</strong> De diez de la noche a cuatro, un corro de vecinos con litronas y reggaetón en la plaza del barrio.
Pasar por medio a toda pastilla lo disuelve: 40 € y un poco de calor.</p>
<p class="peque"><strong>Día de partido.</strong> En Nervión, de ocho y media a diez y media, la afición se junta a la puerta del Sánchez-Pizjuán
(se oyen los cánticos desde lejos). Pasar por medio la dispersa: 30 €. Y las escaleras de OSM se bajan con la moto: escalerazo, 20 €.</p>
<p class="peque"><strong>Ambulantes.</strong> El camión naranja es el del butano: cada golpe le tira bombonas que ruedan (y pagan). La furgoneta con el
colchón en la baca es la del chatarrero, megáfono incluido. Y de día, por los pasajes, a veces se oye el chiflo del afilador. Los dos vehículos se roban.</p>
<p class="peque"><strong>Territorio pijo.</strong> En Los Remedios y Nervión, los de azul marino sin jersey son vigilantes de seguridad: si te ven liarla, la Local
se entera al momento. Y entre las tres y las cinco y media es la siesta: medio barrio en casa.</p>
<p class="peque"><strong>Barrios.</strong> A pie y en una parada, el 13 te lleva a la Alameda, a Triana, a Los Remedios o a Nervión (territorio pijo) y al Centro (guiris), y de vuelta. Cuidado con el
Guadalquivir. Los perros del pasaje ladran pero no muerden.</p>`;

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
    for (const [id, texto] of [['mapa', 'MAPA'], ['garaje', 'GARAJE'], ['logros', 'LOGROS'], ['estadisticas', 'STATS'], ['ayuda', 'AYUDA'], ['creditos', 'CRÉDITOS']] as const) {
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
    if (pestana === 'mapa') this.pintarMapa();
    else if (pestana === 'garaje') this.cuerpo.innerHTML = this.htmlGaraje();
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

  /** El mapa del barrio entero con lo que hay que encontrar (menos los mecheros, que se buscan). */
  private pintarMapa(): void {
    const d = this.op.mapa();
    this.cuerpo.innerHTML = `<p class="peque">${d.nombre} · Mecheros ${d.mecheros.recogidos}/${d.mecheros.total} (esos se buscan). Norte arriba.</p><canvas class="mapa"></canvas>
      <div class="leyenda"><span><i style="background:#d7263d"></i>Parada del 13</span><span><i style="background:#ff8c42"></i>Encargo</span><span><i style="background:#2b2320"></i>Carrera</span><span><i style="background:#3fd36b"></i>Pachanga</span><span><i style="background:#f2c14e"></i>Rampa</span><span><i style="background:#1f6feb"></i>Tú</span></div>`;
    const c = this.cuerpo.querySelector<HTMLCanvasElement>('canvas.mapa')!;
    const lado = Math.min(this.cuerpo.clientWidth - 4, 420);
    c.width = lado * 2;
    c.height = lado * 2;
    c.style.width = `${lado}px`;
    c.style.height = `${lado}px`;
    const ctx = c.getContext('2d');
    if (!ctx || !d.lienzo) return;
    ctx.drawImage(d.lienzo, 0, 0, c.width, c.height);
    const k = c.width / d.lienzo.width;
    const X = (x: number): number => (x + d.lienzo!.width / 2) * k;
    const Z = (z: number): number => (z + d.lienzo!.height / 2) * k;
    const punto = (x: number, z: number, color: string, r: number): void => {
      ctx.beginPath();
      ctx.arc(X(x), Z(z), r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fffaf0';
      ctx.stroke();
    };
    for (const r of d.rampas) punto(r.x, r.z, '#f2c14e', 5);
    for (const p of d.pintadas) punto(p.x, p.z, p.hecha ? '#7b2cbf' : '#e63946', 5);
    for (const p of d.pachangas) punto(p.x, p.z, '#3fd36b', 7);
    for (const p of d.pancartas) punto(p.x, p.z, '#2b2320', 7);
    for (const b of d.bolsas) punto(b.x, b.z, '#ff8c42', 7);
    for (const p of d.paradas) punto(p.x, p.z, '#d7263d', 8);
    punto(d.jugador.x, d.jugador.z, '#1f6feb', 9);
  }

  /** Selector de calidad gráfica: cambiarla recarga el juego (el barrio se construye según ella). */
  private htmlCalidad(): string {
    const botones = (['alta', 'media', 'baja'] as const).map((c) => `<button type="button" class="calidad ${c === this.op.calidad ? 'elegida' : ''}" data-calidad="${c}">${c.toUpperCase()}</button>`);
    return `<div class="fila" style="margin-top:12px;align-items:center"><span>Gráficos<br><span class="peque">Si va a tirones, baja</span></span><span class="calidades">${botones.join('')}</span></div>`;
  }

  private htmlLogros(): string {
    const tiene = this.op.logros.desbloqueados;
    const e = this.op.contador.datos;
    const progreso = (l: typeof LOGROS[number]): string => {
      if (tiene.has(l.id) || !l.medida || l.objetivo === undefined) return '';
      const v = l.medida(e);
      return ` · ${Number.isInteger(l.objetivo) ? Math.min(l.objetivo, Math.floor(v)) : Math.min(l.objetivo, Math.round(v * 10) / 10)} / ${l.objetivo}`;
    };
    const filas = LOGROS.map((l) => `<div class="logro ${tiene.has(l.id) ? 'hecho' : ''}"><span class="sello">${tiene.has(l.id) ? '★' : '☆'}</span><span><strong>${l.nombre}</strong><br><span class="peque">${l.descripcion}${progreso(l)}</span></span></div>`);
    const retos = this.op.retos().map((r) => `<div class="logro ${r.hecho ? 'hecho' : ''}"><span class="sello">${r.hecho ? '★' : '☆'}</span><span><strong>${r.reto.texto}</strong><br><span class="peque">${r.hecho ? `Hecho · +${PREMIO_RETO} €` : `${r.progreso} / ${r.reto.objetivo} · ${PREMIO_RETO} €`}</span></span></div>`);
    return `<h3>Retos de hoy</h3><p class="peque">Cambian cada día. Cuentan desde que has arrancado hoy.</p>${retos.join('')}<h3>Logros</h3><p class="peque">${tiene.size} de ${LOGROS.length}. Se consiguen haciendo el cafre por el barrio.</p>${filas.join('')}`;
  }

  private htmlEstadisticas(): string {
    // Esta sesión: solo las filas que han cambiado desde que se abrió el juego.
    const vacias = new Map(resumen({ ...ESTADISTICAS_VACIAS }));
    const hoy = resumen(this.op.sesion()).filter(([k, v]) => vacias.get(k) !== v).map(([k, v]) => `<div class="fila"><span>${k}</span><strong>${v}</strong></div>`);
    const filas = resumen(this.op.contador.datos).map(([k, v]) => `<div class="fila"><span>${k}</span><strong>${v}</strong></div>`);
    return `${hoy.length ? `<h3>Esta sesión</h3>${hoy.join('')}` : ''}<h3>De siempre</h3>${filas.join('')}`;
  }
}
