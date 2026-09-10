// Registro de barrios. Añadir uno = generar su nivel con tools/genera_nivel.py en
// public/barrios/<id>/ y dar de alta aquí su nombre y a dónde lleva el 13.
// Ver docs/COMO_ANADIR_UN_BARRIO.md.

export type Tribu = 'canis' | 'modernos' | 'trianeros';

export interface FichaBarrio {
  id: string;
  nombre: string;
  /** A dónde lleva el 13 desde aquí. Con varios, cada parada del barrio va a uno (por turnos). */
  destinos13: string[];
  /** Cuántos vecinos, coches de tráfico, autobuses del 13, motos y coches aparcados. */
  poblacion: { vecinos: number; trafico: number; buses: number; motos: number; coches: number; sevici: number; perros: number; motosCalle: number };
  /** Quién vive aquí: cambia la pinta de los vecinos y lo que te gritan. */
  tribu: Tribu;
  /** Frase de bienvenida al bajar del bus. */
  bienvenida: string;
  /** Trozo del nombre de la parada (`bus_stop` de OSM) donde te deja el 13 y donde reapareces. */
  paradaLlegada: string;
}

export const BARRIOS: Record<string, FichaBarrio> = {
  'pino-montano': {
    id: 'pino-montano',
    nombre: 'Pino Montano · Mercado',
    destinos13: ['alameda', 'triana'],
    poblacion: { vecinos: 110, trafico: 14, buses: 1, motos: 14, coches: 12, sevici: 8, perros: 7, motosCalle: 10 },
    tribu: 'canis',
    bienvenida: 'Pino Montano. En casa.',
    paradaLlegada: 'Mercado',
  },
  alameda: {
    id: 'alameda',
    nombre: 'La Alameda',
    destinos13: ['pino-montano', 'triana'],
    poblacion: { vecinos: 160, trafico: 10, buses: 1, motos: 18, coches: 10, sevici: 0, perros: 6, motosCalle: 6 },
    tribu: 'modernos',
    bienvenida: 'La Alameda. Territorio de modernos.',
    paradaLlegada: 'Alameda de Hércules',
  },
  triana: {
    id: 'triana',
    nombre: 'Triana',
    destinos13: ['pino-montano', 'alameda'],
    poblacion: { vecinos: 150, trafico: 12, buses: 1, motos: 16, coches: 12, sevici: 8, perros: 7, motosCalle: 10 },
    tribu: 'trianeros',
    bienvenida: 'Triana. La otra orilla.',
    paradaLlegada: 'San Jacinto',
  },
};

export const BARRIO_INICIAL = 'pino-montano';

export function rutaNivel(id: string): string {
  return `/barrios/${id}/nivel.json`;
}
