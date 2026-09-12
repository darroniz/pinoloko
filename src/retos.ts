// Retos del día: tres metas que cambian cada día (semilla por fecha) y pagan 150 € cada una.
// Se miden contra las estadísticas acumuladas desde que empezó el día (una foto de las cifras
// al primer arranque de cada fecha), así que valen para cualquier partida y no hay que
// empezar de cero. Lógica pura con tests; el menú los pinta en LOGROS y el juego avisa.
import type { Estadisticas } from './estadisticas';
import { azar } from './mundo/geometria';

export interface Reto {
  clave: keyof Estadisticas;
  objetivo: number;
  texto: string;
}

export const PREMIO_RETO = 150;

/** El catálogo: cada noche salen tres de aquí. Objetivos para una sesión corta en el móvil. */
export const CATALOGO_RETOS: Reto[] = [
  { clave: 'trastos', objetivo: 40, texto: 'Derriba 40 trastos' },
  { clave: 'atropellos', objetivo: 15, texto: 'Atropella a 15 vecinos' },
  { clave: 'saltos', objetivo: 5, texto: 'Cinco saltos con rampa' },
  { clave: 'carreras', objetivo: 2, texto: 'Termina dos carreras' },
  { clave: 'recados', objetivo: 3, texto: 'Entrega tres encargos' },
  { clave: 'carrerasTaxi', objetivo: 3, texto: 'Tres carreras de taxi' },
  { clave: 'pasajeros', objetivo: 10, texto: 'Diez pasajeros en el 13' },
  { clave: 'mecheros', objetivo: 5, texto: 'Recoge cinco mecheros' },
  { clave: 'pintadas', objetivo: 2, texto: 'Firma dos pintadas' },
  { clave: 'goles', objetivo: 2, texto: 'Mete dos goles' },
  { clave: 'derrapadas', objetivo: 5, texto: 'Cinco derrapadas largas' },
  { clave: 'caballitos', objetivo: 5, texto: 'Cinco caballitos largos' },
  { clave: 'porLosPelos', objetivo: 10, texto: 'Diez pasadas por los pelos' },
  { clave: 'contramanos', objetivo: 3, texto: 'Tres tramos en contramano' },
  { clave: 'patadas', objetivo: 10, texto: 'Diez patadas a pie' },
  { clave: 'alarmas', objetivo: 3, texto: 'Dispara tres alarmas de coche' },
  { clave: 'motosRobadas', objetivo: 3, texto: 'Roba tres motos' },
  { clave: 'viajes13', objetivo: 2, texto: 'Dos viajes en el 13' },
  { clave: 'trucos', objetivo: 2, texto: 'Dos trucos en el aire' },
  { clave: 'metros', objetivo: 3000, texto: 'Recorre 3 km' },
  { clave: 'contenedores', objetivo: 5, texto: 'Recoge cinco contenedores con el camión de Lipasam' },
  { clave: 'ciclistas', objetivo: 3, texto: 'Tira a tres del Sevici' },
];

/** Clave del día en hora local: AAAA-MM-DD. */
export function claveDia(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function semilla(clave: string): number {
  let h = 2166136261;
  for (let i = 0; i < clave.length; i++) { h ^= clave.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

/** Los tres retos de un día: los mismos para todo el mundo con la misma fecha. */
export function retosDelDia(clave: string): Reto[] {
  const rnd = azar(semilla(clave));
  const restantes = [...CATALOGO_RETOS];
  const elegidos: Reto[] = [];
  while (elegidos.length < 3 && restantes.length) elegidos.push(restantes.splice(Math.floor(rnd() * restantes.length), 1)[0]!);
  return elegidos;
}

export interface EstadoRetos {
  dia: string;
  /** Cifras al empezar el día, por clave. */
  base: Partial<Record<keyof Estadisticas, number>>;
  hechos: string[];
}

const CLAVE = 'pinoloko.retos.v1';

export class RetosDelDia {
  readonly dia: string;
  readonly lista: Reto[];
  private base: Partial<Record<keyof Estadisticas, number>>;
  readonly hechos: Set<string>;

  /** `hoy` y `guardado` se inyectan en los tests; en el juego se leen del reloj y del localStorage. */
  constructor(stats: Estadisticas, hoy = claveDia(), guardado: EstadoRetos | null = RetosDelDia.leer()) {
    this.dia = hoy;
    this.lista = retosDelDia(hoy);
    if (guardado && guardado.dia === hoy) {
      this.base = guardado.base;
      this.hechos = new Set(guardado.hechos);
    } else {
      // Día nuevo: la foto de las cifras de ahora es el cero de hoy.
      this.base = {};
      for (const r of this.lista) this.base[r.clave] = stats[r.clave];
      this.hechos = new Set();
      this.guardar();
    }
  }

  private static leer(): EstadoRetos | null {
    try { return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as EstadoRetos | null; } catch { return null; }
  }

  private guardar(): void {
    const estado: EstadoRetos = { dia: this.dia, base: this.base, hechos: [...this.hechos] };
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
  }

  progreso(reto: Reto, stats: Estadisticas): number {
    return Math.max(0, Math.min(reto.objetivo, Math.floor(stats[reto.clave] - (this.base[reto.clave] ?? 0))));
  }

  /** Comprueba las cifras y devuelve los retos recién cumplidos (ya guardados como hechos). */
  comprobar(stats: Estadisticas): Reto[] {
    const nuevos = this.lista.filter((r) => !this.hechos.has(r.clave) && this.progreso(r, stats) >= r.objetivo);
    if (nuevos.length) {
      for (const r of nuevos) this.hechos.add(r.clave);
      this.guardar();
    }
    return nuevos;
  }

  /** Para el menú: cada reto con su progreso y si está hecho. */
  resumen(stats: Estadisticas): { reto: Reto; progreso: number; hecho: boolean }[] {
    return this.lista.map((r) => ({ reto: r, progreso: this.progreso(r, stats), hecho: this.hechos.has(r.clave) }));
  }
}
