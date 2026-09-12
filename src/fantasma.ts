// El fantasma del récord: en las carreras fijas (las de pancarta) se graba tu trazada cada
// quinto de segundo y, si haces récord, se guarda; la próxima vez corre contigo una moto
// translúcida que repite esa vuelta. Lógica pura (grabar, guardar, reproducir con
// interpolación); lo visible está en src/mundo/fantasma.ts.

/** Una muestra: [x, z, rumbo]. */
export type Muestra = [number, number, number];

export const PASO_MUESTRA = 0.2;
/** Tope de muestras (150 s de carrera a cinco por segundo). */
export const MAXIMO_MUESTRAS = 760;

/** Graba la trazada de una carrera a intervalos fijos. */
export class Grabador {
  private muestras: Muestra[] = [];
  private acumulado = 0;
  activo = false;

  empezar(x: number, z: number, rumbo: number): void {
    this.muestras = [[Math.round(x * 10) / 10, Math.round(z * 10) / 10, Math.round(rumbo * 100) / 100]];
    this.acumulado = 0;
    this.activo = true;
  }

  muestrear(x: number, z: number, rumbo: number, dt: number): void {
    if (!this.activo) return;
    this.acumulado += dt;
    while (this.acumulado >= PASO_MUESTRA) {
      this.acumulado -= PASO_MUESTRA;
      if (this.muestras.length < MAXIMO_MUESTRAS) this.muestras.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, Math.round(rumbo * 100) / 100]);
    }
  }

  /** Cierra la grabación y devuelve la trazada (con la muestra final donde estés). */
  terminar(x: number, z: number, rumbo: number): Muestra[] {
    this.activo = false;
    if (this.muestras.length < MAXIMO_MUESTRAS) this.muestras.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, Math.round(rumbo * 100) / 100]);
    return this.muestras;
  }

  abandonar(): void {
    this.activo = false;
    this.muestras = [];
  }
}

function anguloEntre(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Dónde está el fantasma a los `segundos` de carrera (interpolando entre muestras). */
export function posicionFantasma(muestras: Muestra[], segundos: number): { x: number; z: number; rumbo: number } | null {
  if (!muestras.length) return null;
  const i = Math.max(0, Math.floor(segundos / PASO_MUESTRA));
  const a = muestras[Math.min(i, muestras.length - 1)]!;
  const b = muestras[Math.min(i + 1, muestras.length - 1)]!;
  const t = i >= muestras.length - 1 ? 0 : Math.max(0, Math.min(1, segundos / PASO_MUESTRA - i));
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, rumbo: anguloEntre(a[2], b[2], t) };
}

const CLAVE = 'pinoloko.fantasmas.v1';

/** Trazadas guardadas por barrio y carrera (solo la del récord). */
export class Fantasmas {
  private datos: Record<string, Muestra[]>;

  constructor(inicial?: Record<string, Muestra[]>) {
    this.datos = inicial ?? Fantasmas.leer();
  }

  private static leer(): Record<string, Muestra[]> {
    try { return JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Record<string, Muestra[]>; } catch { return {}; }
  }

  de(barrio: string, carrera: number): Muestra[] | null {
    return this.datos[`${barrio}/${carrera}`] ?? null;
  }

  guardar(barrio: string, carrera: number, muestras: Muestra[]): void {
    this.datos[`${barrio}/${carrera}`] = muestras;
    try { localStorage.setItem(CLAVE, JSON.stringify(this.datos)); } catch { /* sin almacenamiento */ }
  }
}
