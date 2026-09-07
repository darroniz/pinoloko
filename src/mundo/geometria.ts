// Utilidades geométricas puras (sin Three), testeables en Node.
import type { Punto } from './tipos';

export function dentroDePoligono(x: number, z: number, poligono: Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, zi] = poligono[i]!;
    const [xj, zj] = poligono[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function areaPoligono(poligono: Punto[]): number {
  let a = 0;
  for (let i = 0; i < poligono.length; i++) {
    const [x1, z1] = poligono[i]!;
    const [x2, z2] = poligono[(i + 1) % poligono.length]!;
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

export function cajaPoligono(poligono: Punto[]): { minX: number; minZ: number; maxX: number; maxZ: number } {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of poligono) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, minZ, maxX, maxZ };
}

/** Distancia al cuadrado de un punto a un segmento, y el parámetro t del punto más cercano. */
export function distanciaSegmento2(px: number, pz: number, ax: number, az: number, bx: number, bz: number): { d2: number; t: number } {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx - px, cz = az + t * dz - pz;
  return { d2: cx * cx + cz * cz, t };
}

export function distanciaPolilinea(px: number, pz: number, puntos: Punto[]): number {
  let mejor = Infinity;
  for (let i = 0; i + 1 < puntos.length; i++) {
    const [ax, az] = puntos[i]!;
    const [bx, bz] = puntos[i + 1]!;
    const { d2 } = distanciaSegmento2(px, pz, ax, az, bx, bz);
    if (d2 < mejor) mejor = d2;
  }
  return Math.sqrt(mejor);
}

/** Generador pseudoaleatorio determinista (mulberry32) para que el barrio sea igual cada noche. */
export function azar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Puntos repartidos a lo largo de una polilínea cada `paso` metros, con la normal lateral. */
export function muestrearPolilinea(puntos: Punto[], paso: number, desfase = 0): { x: number; z: number; nx: number; nz: number; tx: number; tz: number }[] {
  const salida: { x: number; z: number; nx: number; nz: number; tx: number; tz: number }[] = [];
  let acumulado = desfase;
  for (let i = 0; i + 1 < puntos.length; i++) {
    const [ax, az] = puntos[i]!;
    const [bx, bz] = puntos[i + 1]!;
    const dx = bx - ax, dz = bz - az;
    const largo = Math.hypot(dx, dz);
    if (largo < 1e-6) continue;
    const tx = dx / largo, tz = dz / largo;
    while (acumulado <= largo) {
      salida.push({ x: ax + tx * acumulado, z: az + tz * acumulado, nx: -tz, nz: tx, tx, tz });
      acumulado += paso;
    }
    acumulado -= largo;
  }
  return salida;
}
