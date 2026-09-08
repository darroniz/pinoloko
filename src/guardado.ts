// Guardado en localStorage: posición, rumbo y dinero. Versión en la clave por si cambia el formato.
export interface Partida {
  x: number;
  z: number;
  rumbo: number;
  dinero: number;
  aPie?: boolean;
  modelo?: number;
  hora?: number;
  barrio?: string;
}

const CLAVE = 'pinoloko.partida.v1';

export function cargarPartida(): Partida | null {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (!bruto) return null;
    const p = JSON.parse(bruto) as Partial<Partida>;
    if (typeof p.x !== 'number' || typeof p.z !== 'number') return null;
    return { x: p.x, z: p.z, rumbo: p.rumbo ?? 0, dinero: p.dinero ?? 0, aPie: p.aPie ?? false, modelo: p.modelo ?? 0, ...(typeof p.hora === 'number' ? { hora: p.hora } : {}), ...(typeof p.barrio === 'string' ? { barrio: p.barrio } : {}) };
  } catch {
    return null;
  }
}

export function guardarPartida(p: Partida): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    // Sin almacenamiento (modo privado, cuota): se juega sin guardar.
  }
}
