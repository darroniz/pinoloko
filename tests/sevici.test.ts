import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Nivel } from '../src/mundo/tipos';
import { carrilesBici, pasoCiclista, type Ciclista } from '../src/mundo/sevici';
import { azar } from '../src/mundo/geometria';

const carga = (b: string): Nivel => JSON.parse(readFileSync(new URL(`../public/barrios/${b}/nivel.json`, import.meta.url), 'utf8')) as Nivel;

describe('sevici', () => {
  it('el Mercado y Triana tienen carril bici y el ciclista nunca se sale de él', () => {
    // La Alameda no tiene carril bici dentro de la caja: ahí no hay Sevici.
    expect(carrilesBici(carga('alameda')).size).toBe(0);
    for (const id of ['pino-montano', 'triana']) {
      const nivel = carga(id);
      const ady = carrilesBici(nivel);
      expect(ady.size, id).toBeGreaterThan(4);
      const origen = [...ady.keys()][0]!;
      const c: Ciclista = { origen, destino: ady.get(origen)![0]!, t: 0, x: 0, z: 0, rumbo: 0, velocidad: 5, estado: 'pedalear', tiempo: 0, timbre: 0 };
      const rnd = azar(7);
      const lejos = { x: 9999, z: 9999, rapidez: 0 };
      for (let i = 0; i < 3000; i++) {
        pasoCiclista(c, nivel.grafo.nodos, ady, lejos, 1 / 30, rnd);
        expect(ady.get(c.origen)).toContain(c.destino);
      }
    }
  });

  it('se cae si lo atropellas, se levanta a los tres segundos y toca el timbre si te tiene delante', () => {
    const nodos: [number, number][] = [[0, 0], [0, -100]];
    const ady = new Map([[0, [1]], [1, [0]]]);
    const c: Ciclista = { origen: 0, destino: 1, t: 0.5, x: 0, z: -50, rumbo: 0, velocidad: 5, estado: 'pedalear', tiempo: 0, timbre: 0 };
    const rnd = azar(1);
    expect(pasoCiclista(c, nodos, ady, { x: 0, z: -55, rapidez: 0 }, 1 / 60, rnd)).toBe('timbre');
    expect(pasoCiclista(c, nodos, ady, { x: 0, z: -55, rapidez: 0 }, 1 / 60, rnd)).toBeNull();
    expect(pasoCiclista(c, nodos, ady, { x: 0.5, z: c.z, rapidez: 8 }, 1 / 60, rnd)).toBe('atropello');
    expect(c.estado).toBe('caido');
    for (let i = 0; i < 60 * 3.1; i++) pasoCiclista(c, nodos, ady, { x: 99, z: 99, rapidez: 0 }, 1 / 60, rnd);
    expect(c.estado).toBe('pedalear');
  });
});
