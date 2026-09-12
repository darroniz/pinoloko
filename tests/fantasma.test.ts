import { describe, expect, it } from 'vitest';
import { Fantasmas, Grabador, MAXIMO_MUESTRAS, PASO_MUESTRA, posicionFantasma, type Muestra } from '../src/fantasma';

describe('el fantasma del récord', () => {
  it('graba una muestra cada quinto de segundo y cierra con la última posición', () => {
    const g = new Grabador();
    g.empezar(0, 0, 0);
    for (let t = 0; t < 2; t += 1 / 30) g.muestrear(t * 10, 0, 0.5, 1 / 30);
    const m = g.terminar(20, 0, 0.5);
    expect(m.length).toBeGreaterThanOrEqual(11);
    expect(m.length).toBeLessThanOrEqual(13);
    expect(m[0]).toEqual([0, 0, 0]);
    expect(m[m.length - 1]).toEqual([20, 0, 0.5]);
    expect(g.activo).toBe(false);
  });

  it('no crece sin límite', () => {
    const g = new Grabador();
    g.empezar(0, 0, 0);
    g.muestrear(1, 1, 0, PASO_MUESTRA * (MAXIMO_MUESTRAS + 50));
    expect(g.terminar(1, 1, 0).length).toBe(MAXIMO_MUESTRAS);
  });

  it('reproduce interpolando entre muestras y se queda en la última', () => {
    const m: Muestra[] = [[0, 0, 0], [10, 0, 0], [10, 10, Math.PI / 2]];
    expect(posicionFantasma(m, 0)).toEqual({ x: 0, z: 0, rumbo: 0 });
    expect(posicionFantasma(m, PASO_MUESTRA / 2)).toEqual({ x: 5, z: 0, rumbo: 0 });
    const fin = posicionFantasma(m, PASO_MUESTRA * 9)!;
    expect([fin.x, fin.z]).toEqual([10, 10]);
    expect(posicionFantasma([], 1)).toBeNull();
  });

  it('el giro se interpola por el camino corto', () => {
    const m: Muestra[] = [[0, 0, 3.0], [0, 0, -3.0]];
    const p = posicionFantasma(m, PASO_MUESTRA / 2)!;
    expect(Math.abs(Math.abs(p.rumbo) - Math.PI)).toBeLessThan(0.2);
  });

  it('guarda una trazada por barrio y carrera', () => {
    const f = new Fantasmas({});
    expect(f.de('pino-montano', 0)).toBeNull();
    f.guardar('pino-montano', 0, [[1, 2, 3]]);
    expect(f.de('pino-montano', 0)).toEqual([[1, 2, 3]]);
    expect(f.de('pino-montano', 1)).toBeNull();
  });
});
