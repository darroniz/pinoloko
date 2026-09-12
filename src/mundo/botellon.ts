// El botellón: de noche (de diez a cuatro) un corro de vecinos de pie en la plaza del barrio,
// con las litronas en el suelo y el reggaetón del altavoz. Pasar por medio a toda pastilla lo
// disuelve (salen corriendo) y paga. Lógica sin renderizado propio: reutiliza vecinos y trastos.
import type { Nivel } from './tipos';
import type { GrafoBarrio } from './grafo';
import type { Vecino, Vecinos } from './peatones';
import type { Trastos } from './trastos';

export const HORA_BOTELLON = { desde: 22, hasta: 4 };
export function esHoraDeBotellon(hora: number): boolean { return entreHoras(hora, HORA_BOTELLON.desde, HORA_BOTELLON.hasta); }
/** ¿Está `hora` en el tramo [desde, hasta), aunque cruce la medianoche? */
export function entreHoras(hora: number, desde: number, hasta: number): boolean {
  return desde <= hasta ? hora >= desde && hora < hasta : hora >= desde || hora < hasta;
}
export const MIEMBROS = 7;
export const RADIO_MUSICA = 65;

export interface OpcionesCorro {
  desde: number;
  hasta: number;
  cuantos: number;
  radio: number;
  /** Litronas por el suelo (el botellón sí; la afición no). */
  litronas: boolean;
  premio: number;
}

export const OPCIONES_BOTELLON: OpcionesCorro = { desde: HORA_BOTELLON.desde, hasta: HORA_BOTELLON.hasta, cuantos: MIEMBROS, radio: 2.6, litronas: true, premio: 40 };
/** La afición a la puerta del estadio, de ocho y media a diez y media. */
export const OPCIONES_AFICION: OpcionesCorro = { desde: 20.5, hasta: 22.5, cuantos: 12, radio: 5, litronas: false, premio: 30 };

/** El estadio del barrio (edificio `estadio`): el nodo peatonal más cercano a su centro, o null si no hay. */
export function elegirEstadio(nivel: Pick<Nivel, 'edificios'>, grafo: GrafoBarrio): { x: number; z: number } | null {
  const e = nivel.edificios.find((ed) => ed.tipo === 'estadio');
  if (!e) return null;
  let cx = 0, cz = 0;
  for (const [x, z] of e.poligono) { cx += x; cz += z; }
  cx /= e.poligono.length; cz /= e.poligono.length;
  const nodo = grafo.masCercano(cx, cz, 'peatonal');
  if (nodo < 0) return null;
  const [x, z] = grafo.nodos[nodo]!;
  return Math.hypot(x - cx, z - cz) < 160 ? { x, z } : null;
}

/** La plaza: el nodo peatonal más cercano al centro de la zona verde más grande, o el cruce de pasajes con más salidas. */
export function elegirSitio(nivel: Pick<Nivel, 'zonas'>, grafo: GrafoBarrio): { x: number; z: number } | null {
  let mejor: { area: number; x: number; z: number } | null = null;
  for (const zona of nivel.zonas) {
    if (zona.clase !== 'park' && zona.clase !== 'garden' && zona.clase !== 'pitch' && zona.clase !== 'grass') continue;
    const p = zona.poligono;
    let area = 0, cx = 0, cz = 0;
    for (let i = 0; i < p.length; i++) {
      const [ax, az] = p[i]!, [bx, bz] = p[(i + 1) % p.length]!;
      const c = ax * bz - bx * az;
      area += c; cx += (ax + bx) * c; cz += (az + bz) * c;
    }
    area /= 2;
    if (Math.abs(area) < 40) continue;
    cx /= 6 * area; cz /= 6 * area;
    if (!mejor || Math.abs(area) > mejor.area) mejor = { area: Math.abs(area), x: cx, z: cz };
  }
  if (mejor) {
    const nodo = grafo.masCercano(mejor.x, mejor.z, 'peatonal');
    if (nodo >= 0) { const [x, z] = grafo.nodos[nodo]!; if (Math.hypot(x - mejor.x, z - mejor.z) < 60) return { x, z }; }
  }
  let mejorNodo = -1, mejorGrado = 2;
  for (let i = 0; i < grafo.nodos.length; i++) {
    const grado = grafo.vecinos(i, 'peatonal').length;
    if (grado > mejorGrado) { mejorGrado = grado; mejorNodo = i; }
  }
  if (mejorNodo < 0) return null;
  const [x, z] = grafo.nodos[mejorNodo]!;
  return { x, z };
}

export class Botellon {
  activo = false;
  /** Ya se ha disuelto esta noche (se paga una vez por noche). */
  disuelto = false;
  private miembros: Vecino[] = [];
  private litronasPuestas = false;

  constructor(readonly sitio: { x: number; z: number } | null, private readonly vecinos: Vecinos, private readonly trastos: Trastos, readonly opciones: OpcionesCorro = OPCIONES_BOTELLON) {}

  /** Estados de los miembros (para la sonda). */
  get estados(): string[] {
    return this.miembros.map((v) => `${v.estado}${v.fiesta ? '' : '-'}`);
  }

  get cuantos(): number {
    return this.miembros.filter((v) => v.fiesta).length;
  }

  /** Un tick (cada 0,3 s vale). Devuelve lo que ha pasado. */
  actualizar(hora: number, jugador: { x: number; z: number }): { empieza: boolean; disuelto: boolean; cercania: number } {
    const r = { empieza: false, disuelto: false, cercania: 0 };
    if (!this.sitio) return r;
    const toca = entreHoras(hora, this.opciones.desde, this.opciones.hasta);
    if (toca && !this.activo) {
      this.activo = true;
      this.disuelto = false;
      this.miembros = this.vecinos.fiesta(this.sitio.x, this.sitio.z, this.opciones.cuantos, this.opciones.radio);
      if (this.opciones.litronas && !this.litronasPuestas) {
        this.litronasPuestas = true;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.4;
          this.trastos.poner('litrona', this.sitio.x + Math.sin(a) * 1.4, this.sitio.z + Math.cos(a) * 1.4, a);
        }
      }
      r.empieza = true;
    } else if (!toca && this.activo) {
      this.activo = false;
      this.vecinos.acabarFiesta(this.miembros);
      this.miembros = [];
    }
    if (!this.activo) return r;
    const d = Math.hypot(jugador.x - this.sitio.x, jugador.z - this.sitio.z);
    r.cercania = this.cuantos >= 3 ? Math.max(0, 1 - d / RADIO_MUSICA) : 0;
    // Disuelto: si la mitad ha salido corriendo, se acabó la fiesta (los demás también se van).
    if (!this.disuelto && this.miembros.length && this.miembros.filter((v) => !v.fiesta).length >= Math.ceil(this.miembros.length / 2)) {
      this.disuelto = true;
      this.vecinos.acabarFiesta(this.miembros);
      r.disuelto = true;
    }
    return r;
  }
}
