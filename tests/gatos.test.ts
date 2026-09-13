import { describe, expect, it } from 'vitest';
import { crearGato, pasoGato } from '../src/mundo/gatos';
import { azar } from '../src/mundo/geometria';

describe('los gatos', () => {
  it('sentado en su sitio hasta que te acercas; huye, y luego vuelve y se sube', () => {
    const rnd = azar(3);
    const g = crearGato({ x: 10, z: 10, y: 1.35 }, null, rnd);
    for (let i = 0; i < 50; i++) expect(pasoGato(g, { x: 40, z: 40, rapidez: 10 }, 0.05, rnd)).toBe(false);
    expect(g.estado).toBe('sentado');
    expect(g.y).toBe(1.35);
    // Parado al lado (a 3 m) no lo asusta... salvo pegado a él.
    expect(pasoGato(g, { x: 13, z: 10, rapidez: 0 }, 0.05, rnd)).toBe(false);
    expect(pasoGato(g, { x: 13, z: 10, rapidez: 3 }, 0.05, rnd)).toBe(true);
    expect(g.estado).toBe('huyendo');
    let t = 0;
    while (g.estado === 'huyendo' && t < 5) { pasoGato(g, { x: 13, z: 10, rapidez: 0 }, 0.05, rnd); t += 0.05; }
    expect(g.estado).toBe('vuelta');
    expect(g.y).toBe(0);
    expect(Math.hypot(g.x - 10, g.z - 10)).toBeGreaterThan(5);
    while (g.estado !== 'sentado' && t < 40) { pasoGato(g, { x: 60, z: 60, rapidez: 0 }, 0.05, rnd); t += 0.05; }
    expect(g.estado).toBe('sentado');
    expect(g.x).toBe(10);
    expect(g.y).toBe(1.35);
  });

  it('si el coche en el que está arranca, salta', () => {
    const rnd = azar(4);
    const coche = { estado: { x: 5, z: 5, velocidad: 0 } };
    const g = crearGato({ x: 5, z: 5, y: 1.35 }, coche as never, rnd);
    expect(pasoGato(g, { x: 50, z: 50, rapidez: 0 }, 0.05, rnd)).toBe(false);
    coche.estado.velocidad = 3;
    expect(pasoGato(g, { x: 50, z: 50, rapidez: 0 }, 0.05, rnd)).toBe(true);
    expect(g.estado).toBe('huyendo');
  });
});
