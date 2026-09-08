// Registro de barrios. Añadir uno = generar su nivel con tools/genera_nivel.py en
// public/barrios/<id>/ y dar de alta aquí su nombre y a dónde lleva el 13.
// Ver docs/COMO_ANADIR_UN_BARRIO.md.

export interface FichaBarrio {
  id: string;
  nombre: string;
  /** Texto del cartel de la parada: a dónde te lleva el 13 desde aquí. */
  destino13: string;
  /** Cuántos vecinos, coches de tráfico, motos y coches aparcados. */
  poblacion: { vecinos: number; trafico: number; motos: number; coches: number };
  /** Frase de bienvenida al bajar del bus. */
  bienvenida: string;
  /** Trozo del nombre de la parada (`bus_stop` de OSM) donde te deja el 13 y donde reapareces. */
  paradaLlegada: string;
}

export const BARRIOS: Record<string, FichaBarrio> = {
  'pino-montano': {
    id: 'pino-montano',
    nombre: 'Pino Montano · Mercado',
    destino13: 'alameda',
    poblacion: { vecinos: 110, trafico: 14, motos: 14, coches: 12 },
    bienvenida: 'Pino Montano. En casa.',
    paradaLlegada: 'Mercado',
  },
  alameda: {
    id: 'alameda',
    nombre: 'La Alameda',
    destino13: 'pino-montano',
    poblacion: { vecinos: 160, trafico: 10, motos: 18, coches: 10 },
    bienvenida: 'La Alameda. Territorio de modernos.',
    paradaLlegada: 'Alameda de Hércules',
  },
};

export const BARRIO_INICIAL = 'pino-montano';

export function rutaNivel(id: string): string {
  return `/barrios/${id}/nivel.json`;
}
