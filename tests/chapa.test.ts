import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { NOMBRE_CHAPA_BARRIO, elegirTaller } from '../src/mundo/chapa';
import type { Nivel } from '../src/mundo/tipos';

const cargar = (id: string): Nivel => JSON.parse(readFileSync(new URL(`../public/barrios/${id}/nivel.json`, import.meta.url), 'utf8')) as Nivel;

describe('chapa y pintura', () => {
  it('en Los Remedios usa un taller de verdad de OSM, con su nombre', () => {
    const nivel = cargar('los-remedios');
    const t = elegirTaller(nivel, new GrafoBarrio(nivel.grafo), { x: 0, z: 0 });
    expect(t).not.toBeNull();
    expect(t!.nombre).not.toBe(NOMBRE_CHAPA_BARRIO);
    expect(nivel.pois.some((p) => p.nombre === t!.nombre)).toBe(true);
  });

  it('en Pino Montano se inventa uno en una calle rodada a unos cien metros de la parada', () => {
    const nivel = cargar('pino-montano');
    const grafo = new GrafoBarrio(nivel.grafo);
    const t = elegirTaller(nivel, grafo, { x: 0, z: 0 });
    expect(t).not.toBeNull();
    expect(t!.nombre).toBe(NOMBRE_CHAPA_BARRIO);
    const d = Math.hypot(t!.x, t!.z);
    expect(d).toBeGreaterThanOrEqual(80);
    expect(d).toBeLessThanOrEqual(160);
    const [nx, nz] = grafo.nodos[grafo.masCercano(t!.x, t!.z, 'rodada')]!;
    expect(Math.hypot(nx - t!.x, nz - t!.z)).toBeLessThan(0.01);
  });
});
