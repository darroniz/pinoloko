import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { Emergencias, elegirEntrada } from '../src/mundo/emergencias';
import { azar } from '../src/mundo/geometria';
import type { Nivel } from '../src/mundo/tipos';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('emergencias', () => {
  it('entran desde lejos por un camino rodado hasta el nodo del suceso', () => {
    const destino = grafo.masCercano(0, 0, 'rodada');
    const camino = elegirEntrada(grafo, destino, azar(1));
    expect(camino).not.toBeNull();
    expect(camino![camino!.length - 1]).toBe(destino);
    const [x, z] = grafo.nodos[camino![0]!]!;
    expect(Math.hypot(x, z)).toBeGreaterThan(60);
  });

  it('los bomberos vienen, trabajan siete segundos y se van; solo uno a la vez', () => {
    const e = new Emergencias(grafo);
    expect(e.llamar('bomberos', 0, 0, azar(2))).toBe(true);
    expect(e.llamar('bomberos', 0, 0, azar(2))).toBe(false);
    expect(e.llamar('ambulancia', 0, 0, azar(3))).toBe(true);
    let llegadas = 0, terminadas = 0;
    for (let i = 0; i < 60 * 90 && e.lista.length; i++) { const r = e.actualizar(1 / 60); llegadas += r.llegan.length; terminadas += r.terminan.length; }
    expect(llegadas).toBe(2);
    expect(terminadas).toBe(2);
    expect(e.lista).toHaveLength(0);
  });
});
