// El taller: en qué gastar el dinero. Mejoras por moto (escape, variador, neumáticos, frenos)
// en tres niveles que multiplican los ajustes del modelo. Lógica pura con tests; se guarda en
// localStorage con las demás cosas de la partida (NUEVA PARTIDA lo borra).
import type { AjustesScooter } from './fisica/scooter';

export type Mejora = 'escape' | 'variador' | 'neumaticos' | 'frenos' | 'claxon';

export interface FichaMejora {
  id: Mejora;
  nombre: string;
  descripcion: string;
  /** Precio de cada nivel (tres). */
  precios: [number, number, number];
}

export const MEJORAS: FichaMejora[] = [
  { id: 'escape', nombre: 'Tubarro', descripcion: 'Escape de carreras: más punta y más ruido', precios: [150, 300, 600] },
  { id: 'variador', nombre: 'Variador y rodillos', descripcion: 'Sale como un tiro', precios: [120, 250, 500] },
  { id: 'neumaticos', nombre: 'Neumáticos', descripcion: 'Más agarre y giro más nervioso', precios: [100, 200, 400] },
  { id: 'frenos', nombre: 'Frenos', descripcion: 'Para en seco y derrapa mejor', precios: [80, 160, 320] },
  { id: 'claxon', nombre: 'Claxon musical', descripcion: 'La Cucaracha, Cumpleaños feliz y el Toreador', precios: [200, 300, 400] },
];

export const NIVEL_MAXIMO = 3;
const CLAVE = 'pinoloko.taller.v1';

type Niveles = Partial<Record<Mejora, number>>;

/** Ajustes del modelo con las mejoras aplicadas. */
export function aplicarMejoras(base: AjustesScooter, niveles: Niveles): AjustesScooter {
  const n = (m: Mejora): number => Math.min(NIVEL_MAXIMO, Math.max(0, niveles[m] ?? 0));
  return {
    ...base,
    velocidadMaxima: base.velocidadMaxima * (1 + 0.07 * n('escape')),
    aceleracion: base.aceleracion * (1 + 0.1 * n('variador')),
    agarre: base.agarre * (1 + 0.08 * n('neumaticos')),
    giroMaximo: base.giroMaximo * (1 + 0.05 * n('neumaticos')),
    frenado: base.frenado * (1 + 0.12 * n('frenos')),
    agarreDerrape: base.agarreDerrape * (1 + 0.06 * n('frenos')),
  };
}

export class Taller {
  private datos: Record<number, Niveles>;

  constructor(inicial?: Record<number, Niveles>) {
    this.datos = inicial ?? Taller.leer();
  }

  private static leer(): Record<number, Niveles> {
    try { return JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Record<number, Niveles>; } catch { return {}; }
  }

  nivel(modelo: number, mejora: Mejora): number {
    return this.datos[modelo]?.[mejora] ?? 0;
  }

  niveles(modelo: number): Niveles {
    return { ...(this.datos[modelo] ?? {}) };
  }

  /** Precio del siguiente nivel, o null si ya está al máximo. */
  precio(modelo: number, mejora: Mejora): number | null {
    const n = this.nivel(modelo, mejora);
    if (n >= NIVEL_MAXIMO) return null;
    return MEJORAS.find((m) => m.id === mejora)!.precios[n]!;
  }

  /** Compra el siguiente nivel si el dinero llega; devuelve lo que ha costado o -1. */
  comprar(modelo: number, mejora: Mejora, dinero: number): number {
    const p = this.precio(modelo, mejora);
    if (p === null || dinero < p) return -1;
    const m = this.datos[modelo] ?? (this.datos[modelo] = {});
    m[mejora] = this.nivel(modelo, mejora) + 1;
    try { localStorage.setItem(CLAVE, JSON.stringify(this.datos)); } catch { /* sin almacenamiento */ }
    return p;
  }
}
