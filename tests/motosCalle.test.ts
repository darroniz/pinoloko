import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Nivel } from '../src/mundo/tipos';
import { GrafoBarrio } from '../src/mundo/grafo';
import { PILLA_VELOCIDAD, pasoMotero, type Motero } from '../src/mundo/motosCalle';
import { azar } from '../src/mundo/geometria';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

function motero(): Motero {
  const origen = grafo.masCercano(0, 0);
  return { origen, destino: grafo.vecinos(origen)[0]!.nodo, t: 0, x: 0, z: 0, rumbo: 0, estado: 'rodar', tiempo: 0, modelo: 0, golpeado: 9 };
}

describe('motos callejeras', () => {
  it('en el pilla-pilla corre más y el tiempo de huida se agota', () => {
    const lejos = { x: 9999, z: 9999, rapidez: 0, enVehiculo: false };
    const normal = motero(), huyendo = motero();
    huyendo.huye = 3;
    let dn = 0, dh = 0;
    for (let i = 0; i < 30; i++) {
      const nx = normal.x, nz = normal.z, hx = huyendo.x, hz = huyendo.z;
      pasoMotero(normal, grafo, lejos, 1 / 30, azar(1));
      pasoMotero(huyendo, grafo, lejos, 1 / 30, azar(1));
      dn += Math.hypot(normal.x - nx, normal.z - nz);
      dh += Math.hypot(huyendo.x - hx, huyendo.z - hz);
    }
    expect(dh / dn).toBeCloseTo(PILLA_VELOCIDAD, 1);
    expect(huyendo.huye).toBeCloseTo(2, 1);
    for (let i = 0; i < 100; i++) pasoMotero(huyendo, grafo, lejos, 1 / 30, azar(1));
    expect(huyendo.huye).toBe(0);
  });

  it('recorre calles y pasajes sin salirse del grafo, y pisa ambas clases', () => {
    const m = motero();
    const rnd = azar(9);
    const clases = new Set<string>();
    for (let i = 0; i < 6000; i++) {
      pasoMotero(m, grafo, { x: 9999, z: 9999, rapidez: 0, enVehiculo: false }, 1 / 30, rnd);
      const arista = grafo.vecinos(m.origen).find((v) => v.nodo === m.destino);
      expect(arista).toBeDefined();
      clases.add(arista!.clase);
    }
    expect(clases.size).toBe(2);
  });

  it('cae si lo embistes con la moto (no a pie), y a los cuatro segundos sigue', () => {
    const m = motero();
    const rnd = azar(2);
    pasoMotero(m, grafo, { x: 9999, z: 9999, rapidez: 0, enVehiculo: false }, 1 / 60, rnd);
    expect(pasoMotero(m, grafo, { x: m.x, z: m.z, rapidez: 9, enVehiculo: false }, 1 / 60, rnd)).toBeNull();
    expect(pasoMotero(m, grafo, { x: m.x, z: m.z, rapidez: 9, enVehiculo: true }, 1 / 60, rnd)).toBe('golpe');
    expect(m.estado).toBe('caido');
    // Sin doble golpe en el mismo choque.
    expect(pasoMotero(m, grafo, { x: m.x, z: m.z, rapidez: 9, enVehiculo: true }, 1 / 60, rnd)).toBeNull();
    for (let i = 0; i < 60 * 4.2; i++) pasoMotero(m, grafo, { x: 9999, z: 9999, rapidez: 0, enVehiculo: false }, 1 / 60, rnd);
    expect(m.estado).toBe('rodar');
  });
});
