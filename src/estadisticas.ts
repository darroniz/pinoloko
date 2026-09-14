// Estadísticas de la partida (acumuladas entre sesiones) y garaje de motos desbloqueadas.
// Lógica pura sin DOM para poder testearla; el guardado es localStorage con try/catch.

export interface Estadisticas {
  segundos: number;
  metros: number;
  trastos: number;
  atropellos: number;
  dineroTotal: number;
  trincados: number;
  viajes13: number;
  motosRobadas: number;
  cochesRobados: number;
  reventones: number;
  rachaMaxima: number;
  carreras: number;
  piquesGanados: number;
  pintadas: number;
  pintadasPijas: number;
  pijosAtropellados: number;
  alarmas: number;
  vespas: number;
  patadas: number;
  multas: number;
  propinas: number;
  saltos: number;
  vueloMaximo: number;
  chapuzones: number;
  semaforos: number;
  recados: number;
  cadenaRecados: number;
  mecheros: number;
  barriosCompletos: number;
  goles: number;
  ciclistas: number;
  mejoras: number;
  carrerasTaxi: number;
  pasajeros: number;
  macetazos: number;
  motosLevantadas: number;
  motosRecuperadas: number;
  chapas: number;
  trucos: number;
  bomberos: number;
  ambulancias: number;
  contenedores: number;
  piquesCallejeros: number;
  derrapadas: number;
  derrapeMaximo: number;
  caballitos: number;
  caballitoMaximo: number;
  porLosPelos: number;
  contramanos: number;
  escobazos: number;
  motosDevueltas: number;
  retos: number;
  piscinas: number;
  parquesInfantiles: number;
  bombonas: number;
  botellones: number;
  escaleras: number;
  aficiones: number;
  sevicis: number;
  sacados: number;
  salidas: number;
  comitiva: number;
  comitivaMaximo: number;
  palomas: number;
  metrosLluvia: number;
  charcos: number;
  salpicados: number;
  respetos: number;
  cruzadas: number;
  minimotos: number;
  caramelos: number;
  pillados: number;
  paquetes: number;
  stoppies: number;
  stoppieMaximo: number;
  bolsas: number;
  chapuzonesCalor: number;
  cupones: number;
  premiosOnce: number;
  gatos: number;
  colas: number;
  saetas: number;
}

export const ESTADISTICAS_VACIAS: Estadisticas = {
  segundos: 0, metros: 0, trastos: 0, atropellos: 0, dineroTotal: 0, trincados: 0,
  viajes13: 0, motosRobadas: 0, cochesRobados: 0, reventones: 0, rachaMaxima: 0, carreras: 0, piquesGanados: 0, pintadas: 0, pintadasPijas: 0, pijosAtropellados: 0, alarmas: 0, vespas: 0, patadas: 0, multas: 0, propinas: 0, saltos: 0, vueloMaximo: 0, chapuzones: 0, semaforos: 0, recados: 0, cadenaRecados: 0, mecheros: 0, barriosCompletos: 0, goles: 0, ciclistas: 0, mejoras: 0, carrerasTaxi: 0, pasajeros: 0, macetazos: 0, motosLevantadas: 0, motosRecuperadas: 0, chapas: 0, trucos: 0, bomberos: 0, ambulancias: 0, contenedores: 0, piquesCallejeros: 0, derrapadas: 0, derrapeMaximo: 0, caballitos: 0, caballitoMaximo: 0, porLosPelos: 0, contramanos: 0, escobazos: 0, motosDevueltas: 0, retos: 0, piscinas: 0, parquesInfantiles: 0, bombonas: 0, botellones: 0, escaleras: 0, aficiones: 0, sevicis: 0, sacados: 0, salidas: 0, comitiva: 0, comitivaMaximo: 0, palomas: 0, metrosLluvia: 0, charcos: 0, salpicados: 0, respetos: 0, cruzadas: 0, minimotos: 0, caramelos: 0, pillados: 0, paquetes: 0, stoppies: 0, stoppieMaximo: 0, bolsas: 0, chapuzonesCalor: 0, cupones: 0, premiosOnce: 0, gatos: 0, colas: 0, saetas: 0,
};

const CLAVE_STATS = 'pinoloko.estadisticas.v1';
const CLAVE_GARAJE = 'pinoloko.garaje.v1';

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const bruto = localStorage.getItem(clave);
    return bruto ? { ...porDefecto, ...(JSON.parse(bruto) as Partial<T>) } : porDefecto;
  } catch { return porDefecto; }
}

function escribir(clave: string, valor: unknown): void {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

export class Contador {
  datos: Estadisticas;
  private sucio = false;

  constructor(inicial?: Estadisticas) {
    this.datos = inicial ? { ...inicial } : leer(CLAVE_STATS, { ...ESTADISTICAS_VACIAS });
  }

  sumar(clave: keyof Estadisticas, cuanto = 1): void {
    this.datos[clave] += cuanto;
    this.sucio = true;
  }

  /** Máximos (racha más larga): solo sube. */
  maximo(clave: keyof Estadisticas, valor: number): void {
    if (valor > this.datos[clave]) { this.datos[clave] = valor; this.sucio = true; }
  }

  guardar(): void {
    if (!this.sucio) return;
    this.sucio = false;
    escribir(CLAVE_STATS, this.datos);
  }

  reiniciar(): void {
    this.datos = { ...ESTADISTICAS_VACIAS };
    this.sucio = true;
    this.guardar();
  }
}

/** Texto para la pantalla de estadísticas: etiqueta y valor ya formateado. */
export function resumen(e: Estadisticas): [string, string][] {
  const km = e.metros / 1000;
  const minutos = Math.floor(e.segundos / 60);
  const tiempo = minutos >= 60 ? `${Math.floor(minutos / 60)} h ${minutos % 60} min` : `${minutos} min`;
  return [
    ['Tiempo haciendo el cafre', tiempo],
    ['Recorrido', km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`],
    ['Dinero ganado en total', `${e.dineroTotal} €`],
    ['Trastos derribados', String(e.trastos)],
    ['Vecinos atropellados', String(e.atropellos)],
    ['Lío más grande', `${e.rachaMaxima} trastos seguidos`],
    ['Motos robadas', String(e.motosRobadas)],
    ['Coches robados', String(e.cochesRobados)],
    ['Vehículos reventados', String(e.reventones)],
    ['Veces trincao', String(e.trincados)],
    ['Viajes en el 13', String(e.viajes13)],
    ['Carreras terminadas', String(e.carreras)],
    ['Piques ganados a los canis', String(e.piquesGanados)],
    ['Pintadas', String(e.pintadas)],
    ['Pijos atropellados', String(e.pijosAtropellados)],
    ['Alarmas de coche disparadas', String(e.alarmas)],
    ['Patadas a pie', String(e.patadas)],
    ['Fotos de radar', String(e.multas)],
    ['Propinas de los guiris', `${e.propinas} €`],
    ['Saltos con rampa', String(e.saltos)],
    ['Vuelo más largo', `${e.vueloMaximo.toFixed(1)} s`],
    ['Chapuzones en el río', String(e.chapuzones)],
    ['Chapuzones en piscinas y fuentes', String(e.piscinas)],
    ['Semáforos en rojo', String(e.semaforos)],
    ['Salidas de semáforo ganadas', String(e.salidas)],
    ['Mecheros recogidos', String(e.mecheros)],
    ['Encargos entregados', String(e.recados)],
    ['Goles', String(e.goles)],
    ['Ciclistas del Sevici tirados', String(e.ciclistas)],
    ['Sevicis cogidos sin tarjeta', String(e.sevicis)],
    ['Mejor cadena de encargos', String(e.cadenaRecados)],
    ['Mejoras compradas en el taller', String(e.mejoras)],
    ['Carreras de taxi', String(e.carrerasTaxi)],
    ['Pasajeros del 13', String(e.pasajeros)],
    ['Macetazos de la vecina del quinto', String(e.macetazos)],
    ['Motos que te han levantado', `${e.motosLevantadas} (${e.motosRecuperadas} recuperadas)`],
    ['Pasadas por chapa y pintura', String(e.chapas)],
    ['Trucos en el aire', String(e.trucos)],
    ['Derrapadas largas', `${e.derrapadas} (la más larga, ${e.derrapeMaximo.toFixed(1)} s)`],
    ['Caballitos largos', `${e.caballitos} (el más largo, ${e.caballitoMaximo.toFixed(1)} s)`],
    ['Stoppies', `${e.stoppies} (el más largo, ${e.stoppieMaximo.toFixed(1)} s)`],
    ['Bolsas de basura reventadas', String(e.bolsas)],
    ['Chapuzones con ola de calor', String(e.chapuzonesCalor)],
    ['Cupones de la ONCE', `${e.cupones} (premios, ${e.premiosOnce} €)`],
    ['Pasadas por los pelos', String(e.porLosPelos)],
    ['Tramos en contramano', String(e.contramanos)],
    ['Bombonas tiradas del butanero', String(e.bombonas)],
    ['Botellones disueltos', String(e.botellones)],
    ['Colas de la churrería deshechas', String(e.colas)],
    ['Escalerazos', String(e.escaleras)],
    ['Aficiones dispersadas', String(e.aficiones)],
    ['Retos del día cumplidos', String(e.retos)],
    ['Escobazos del camarero', String(e.escobazos)],
    ['Veces que el dueño te sacó del coche', String(e.sacados)],
    ['Bandadas de palomas espantadas', String(e.palomas)],
    ['Gatos espantados', String(e.gatos)],
    ['Minimotos robadas', String(e.minimotos)],
    ['Pilla-pillas ganados', String(e.pillados)],
    ['Colegas llevados de paquete', String(e.paquetes)],
    ['Caramelos de los nazarenos', String(e.caramelos)],
    ['Pasos vistos pasar con respeto', String(e.respetos)],
    ['Saetas oídas', String(e.saetas)],
    ['Veces colado por medio de la cofradía', String(e.cruzadas)],
    ['Metros bajo la lluvia', String(Math.round(e.metrosLluvia))],
    ['Charcos pisados', `${e.charcos} (vecinos salpicados, ${e.salpicados})`],
    ['Canis en tu comitiva', `${e.comitiva} (la más larga, ${e.comitivaMaximo})`],
    ['Motos que su dueño recuperó', String(e.motosDevueltas)],
    ['Salidas de los bomberos', String(e.bomberos)],
    ['Salidas del 061', String(e.ambulancias)],
    ['Contenedores recogidos con el camión', String(e.contenedores)],
    ['Piques callejeros aceptados', String(e.piquesCallejeros)],
  ];
}

/** Garaje: qué modelos de moto (por índice en MODELOS) has robado ya y con cuál sales. */
export class Garaje {
  desbloqueadas: Set<number>;
  elegida: number;

  constructor(inicial?: { desbloqueadas: number[]; elegida: number }) {
    const g = inicial ?? leer(CLAVE_GARAJE, { desbloqueadas: [0], elegida: 0 });
    this.desbloqueadas = new Set([0, ...g.desbloqueadas]);
    this.elegida = this.desbloqueadas.has(g.elegida) ? g.elegida : 0;
  }

  /** Devuelve true si el modelo era nuevo. */
  desbloquear(modelo: number): boolean {
    if (this.desbloqueadas.has(modelo)) return false;
    this.desbloqueadas.add(modelo);
    this.guardar();
    return true;
  }

  elegir(modelo: number): boolean {
    if (!this.desbloqueadas.has(modelo)) return false;
    this.elegida = modelo;
    this.guardar();
    return true;
  }

  guardar(): void {
    escribir(CLAVE_GARAJE, { desbloqueadas: [...this.desbloqueadas], elegida: this.elegida });
  }
}
