// Tipos del nivel generado por tools/genera_nivel.py (coordenadas locales en metros,
// x = este, z = sur; el norte apunta a -z).

export type Punto = [number, number];

export type TipoEdificio =
  | 'bloque' | 'mercado' | 'iglesia' | 'colegio' | 'bomberos' | 'sanidad'
  | 'biblioteca' | 'comercio' | 'publico' | 'garaje' | 'nave' | 'estadio';

export interface Edificio {
  id: number;
  tipo: TipoEdificio;
  plantas: number;
  altura: number;
  color: string;
  poligono: Punto[];
  huecos?: Punto[][];
  nombre?: string;
  tejado?: string;
}

export type ClaseVia = 'rodada' | 'peatonal';

export interface Via {
  id: number;
  clase: ClaseVia;
  tipo: string;
  nombre: string;
  ancho: number;
  puntos: Punto[];
  unico?: boolean;
}

/** [origen, destino, clase, idVia, sentidoUnico?] */
export type Arista = [number, number, ClaseVia, number] | [number, number, ClaseVia, number, 1];

export interface Grafo {
  nodos: Punto[];
  aristas: Arista[];
}

export interface Poi {
  nombre: string;
  clase: string;
  x: number;
  z: number;
  ref?: string;
}

export interface Zona {
  clase: string;
  poligono: Punto[];
}

export interface Nivel {
  nombre: string;
  bbox: [number, number, number, number];
  tamano: [number, number];
  edificios: Edificio[];
  vias: Via[];
  grafo: Grafo;
  pois: Poi[];
  arboles: Punto[];
  bancos: Punto[];
  zonas: Zona[];
  semaforos: Punto[];
  pasos: Punto[];
  atribucion: string;
}
