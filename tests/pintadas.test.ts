import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { azar, dentroDePoligono } from '../src/mundo/geometria';
import { DURACION_PINTADA, Firma, RADIO_PINTADA, TOTAL_PINTADAS, elegirPuntos } from '../src/mundo/pintadas';
import { BARRIOS, rutaNivel } from '../src/mundo/barrios';
import type { Nivel } from '../src/mundo/tipos';

const nivelDe = (id: string): Nivel => JSON.parse(readFileSync(new URL(`../public${rutaNivel(id)}`, import.meta.url), 'utf8')) as Nivel;

describe('pintadas', () => {
  it('cada barrio tiene sus seis puntos de spray, en cruces de pasajes, fuera de los edificios y separados', () => {
    for (const ficha of Object.values(BARRIOS)) {
      const nivel = nivelDe(ficha.id);
      const grafo = new GrafoBarrio(nivel.grafo);
      const puntos = elegirPuntos(nivel, grafo, TOTAL_PINTADAS, azar(3030 + ficha.id.length));
      expect(puntos.length, ficha.id).toBe(TOTAL_PINTADAS);
      for (const [x, z] of puntos) {
        expect(nivel.edificios.some((e) => dentroDePoligono(x, z, e.poligono))).toBe(false);
        const nodo = grafo.masCercano(x, z, 'peatonal');
        expect(grafo.vecinos(nodo, 'peatonal').length).toBeGreaterThanOrEqual(2);
      }
      for (let i = 0; i < puntos.length; i++) for (let j = i + 1; j < puntos.length; j++) {
        expect(Math.hypot(puntos[i]![0] - puntos[j]![0], puntos[i]![1] - puntos[j]![1])).toBeGreaterThanOrEqual(70);
      }
      expect(elegirPuntos(nivel, grafo, TOTAL_PINTADAS, azar(3030 + ficha.id.length))).toEqual(puntos);
    }
  });

  it('la firma tarda dos segundos al lado del punto y se pierde si Wifly se aleja', () => {
    const f = new Firma(0, 10, 10);
    let r: ReturnType<Firma['actualizar']> = null;
    let t = 0;
    while (r === null) { r = f.actualizar(10.5, 10, 0.1); t += 0.1; }
    expect(r).toBe('hecha');
    expect(t).toBeCloseTo(DURACION_PINTADA, 0);
    const g = new Firma(1, 0, 0);
    expect(g.actualizar(1, 1, 0.1)).toBeNull();
    expect(g.actualizar(RADIO_PINTADA + 1, 0, 0.1)).toBe('perdida');
  });
});
