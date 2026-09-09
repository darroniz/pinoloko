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
  saltos: number;
  vueloMaximo: number;
  chapuzones: number;
  semaforos: number;
  recados: number;
  cadenaRecados: number;
}

export const ESTADISTICAS_VACIAS: Estadisticas = {
  segundos: 0, metros: 0, trastos: 0, atropellos: 0, dineroTotal: 0, trincados: 0,
  viajes13: 0, motosRobadas: 0, cochesRobados: 0, reventones: 0, rachaMaxima: 0, carreras: 0, saltos: 0, vueloMaximo: 0, chapuzones: 0, semaforos: 0, recados: 0, cadenaRecados: 0,
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
    ['Saltos con rampa', String(e.saltos)],
    ['Vuelo más largo', `${e.vueloMaximo.toFixed(1)} s`],
    ['Chapuzones en el río', String(e.chapuzones)],
    ['Semáforos en rojo', String(e.semaforos)],
    ['Encargos entregados', String(e.recados)],
    ['Mejor cadena de encargos', String(e.cadenaRecados)],
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
