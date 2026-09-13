import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { BANDADAS_MAXIMAS, PALOMAS_POR_BANDADA, crearBandada, elegirBandadas, pasoBandada } from '../src/mundo/palomas';
import type { Nivel } from '../src/mundo/tipos';
import { azar } from '../src/mundo/geometria';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('las palomas', () => {
  it('hay bandadas en el Mercado y en las zonas verdes grandes, separadas entre sí', () => {
    const sitios = elegirBandadas(nivel, grafo);
    expect(sitios.length).toBeGreaterThanOrEqual(2);
    expect(sitios.length).toBeLessThanOrEqual(BANDADAS_MAXIMAS);
    for (let i = 0; i < sitios.length; i++) for (let j = i + 1; j < sitios.length; j++) expect(Math.hypot(sitios[i]!.x - sitios[j]!.x, sitios[i]!.z - sitios[j]!.z)).toBeGreaterThanOrEqual(40);
    // La primera es la puerta del Mercado: un nodo peatonal cerca del edificio.
    const mercado = nivel.edificios.find((e) => e.tipo === 'mercado')!;
    const cx = mercado.poligono.reduce((a, p) => a + p[0], 0) / mercado.poligono.length, cz = mercado.poligono.reduce((a, p) => a + p[1], 0) / mercado.poligono.length;
    expect(Math.hypot(sitios[0]!.x - cx, sitios[0]!.z - cz)).toBeLessThan(60);
  });

  it('picotean quietas hasta que pasas cerca; entonces despegan, vuelan y vuelven a posarse en su sitio', () => {
    const rnd = azar(11);
    const b = crearBandada({ x: 0, z: 0 }, rnd);
    expect(b.palomas.length).toBe(PALOMAS_POR_BANDADA);
    for (let i = 0; i < 100; i++) expect(pasoBandada(b, { x: 30, z: 0, rapidez: 10 }, 0.05, rnd)).toBe(false);
    expect(b.estado).toBe('suelo');
    for (const p of b.palomas) expect(Math.hypot(p.x, p.z)).toBeLessThan(4);
    // Parado al lado no las asusta; pasando sí.
    expect(pasoBandada(b, { x: 2, z: 0, rapidez: 0 }, 0.05, rnd)).toBe(false);
    expect(pasoBandada(b, { x: 2, z: 0, rapidez: 4 }, 0.05, rnd)).toBe(true);
    expect(b.estado).toBe('vuelo');
    let t = 0;
    while (b.estado === 'vuelo' && t < 10) { pasoBandada(b, { x: 2, z: 0, rapidez: 0 }, 0.05, rnd); t += 0.05; }
    expect(b.estado).toBe('vuelta');
    expect(Math.max(...b.palomas.map((p) => p.y))).toBeGreaterThan(4);
    while (b.estado !== 'suelo' && t < 40) { pasoBandada(b, { x: 40, z: 0, rapidez: 0 }, 0.05, rnd); t += 0.05; }
    expect(b.estado).toBe('suelo');
    expect(t).toBeLessThan(25);
    for (const p of b.palomas) { expect(p.y).toBe(0); expect(Math.hypot(p.x, p.z)).toBeLessThan(4); }
  });
});
