import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Nivel } from '../src/mundo/tipos';
import { GrafoBarrio } from '../src/mundo/grafo';
import { pasoPerro, type Perro } from '../src/mundo/perros';
import { azar } from '../src/mundo/geometria';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

function perro(): Perro {
  const nodo = grafo.masCercano(0, 0, 'peatonal');
  const [x, z] = grafo.nodos[nodo]!;
  return { x, z, rumbo: 0, estado: 'vagar', nodo, anterior: -1, destino: grafo.siguienteAlAzar(nodo, -1, 'peatonal', azar(1)), tiempo: 0, salto: 0, ladrido: 0, fase: 0, color: 0 };
}

describe('perros', () => {
  it('vaga por los pasajes sin salirse del grafo peatonal', () => {
    const p = perro();
    const rnd = azar(3);
    for (let i = 0; i < 2000; i++) {
      pasoPerro(p, grafo, { x: 9999, z: 9999, rapidez: 0 }, 1 / 30, rnd);
      expect(p.estado).toBe('vagar');
    }
    const [nx, nz] = grafo.nodos[p.destino]!;
    expect(Math.hypot(nx - p.x, nz - p.z)).toBeLessThan(80);
  });

  it('persigue ladrando a la moto que pasa cerca y luego se cansa', () => {
    const p = perro();
    const rnd = azar(5);
    const moto = { x: p.x + 8, z: p.z, rapidez: 10 };
    let ladridos = 0;
    for (let i = 0; i < 60 * 8; i++) if (pasoPerro(p, grafo, moto, 1 / 60, rnd) === 'ladrido') ladridos++;
    expect(ladridos).toBeGreaterThan(3);
    expect(p.estado).toBe('cansado');
    expect(Math.hypot(moto.x - p.x, moto.z - p.z)).toBeLessThan(5);
    for (let i = 0; i < 60 * 7; i++) pasoPerro(p, grafo, { x: 9999, z: 9999, rapidez: 0 }, 1 / 60, rnd);
    expect(p.estado).toBe('vagar');
  });

  it('salta a un lado si vas a llevártelo por delante', () => {
    const p = perro();
    const x0 = p.x, z0 = p.z;
    pasoPerro(p, grafo, { x: p.x, z: p.z + 1.5, rapidez: 12 }, 1 / 60, azar(2));
    expect(p.estado).toBe('apartarse');
    for (let i = 0; i < 20; i++) pasoPerro(p, grafo, { x: x0, z: z0 + 1.5, rapidez: 12 }, 1 / 60, azar(2));
    expect(Math.abs(p.x - x0)).toBeGreaterThan(1.5); // se ha ido de lado, no hacia delante
  });
});
