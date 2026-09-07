import { describe, expect, it } from 'vitest';
import { areaPoligono, azar, dentroDePoligono, distanciaPolilinea, muestrearPolilinea } from '../src/mundo/geometria';

describe('geometría', () => {
  const cuadrado: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];

  it('punto dentro y fuera de un polígono', () => {
    expect(dentroDePoligono(5, 5, cuadrado)).toBe(true);
    expect(dentroDePoligono(15, 5, cuadrado)).toBe(false);
  });

  it('área de un cuadrado', () => {
    expect(areaPoligono(cuadrado)).toBe(100);
  });

  it('distancia a una polilínea', () => {
    expect(distanciaPolilinea(5, 3, [[0, 0], [10, 0]])).toBeCloseTo(3);
    expect(distanciaPolilinea(-4, 0, [[0, 0], [10, 0]])).toBeCloseTo(4);
  });

  it('muestreo de una polilínea con paso fijo', () => {
    const m = muestrearPolilinea([[0, 0], [10, 0], [10, 10]], 5);
    expect(m.length).toBe(5);
    expect(m[1]).toMatchObject({ x: 5, z: 0 });
    expect(m[3]!.tz).toBeCloseTo(1);
  });

  it('el azar con semilla es determinista', () => {
    const a = azar(7), b = azar(7);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});
