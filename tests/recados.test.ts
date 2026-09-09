import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Nivel } from '../src/mundo/tipos';
import { GrafoBarrio } from '../src/mundo/grafo';
import { Recadero, elegirDestino, localesConNombre, premioRecado, tiempoPara } from '../src/recados';
import { azar } from '../src/mundo/geometria';

const carga = (b: string): Nivel => JSON.parse(readFileSync(new URL(`../public/barrios/${b}/nivel.json`, import.meta.url), 'utf8')) as Nivel;

describe('recadero', () => {
  it('cada barrio tiene locales con nombre de sobra y las puertas están en la calle', () => {
    for (const id of ['pino-montano', 'alameda', 'triana']) {
      const nivel = carga(id);
      const grafo = new GrafoBarrio(nivel.grafo);
      const locales = localesConNombre(nivel.pois, (p) => grafo.nodos[grafo.masCercano(p.x, p.z)] ?? [p.x, p.z]);
      expect(locales.length, id).toBeGreaterThanOrEqual(6);
      expect(new Set(locales.map((l) => l.nombre)).size).toBe(locales.length);
      for (const l of locales) expect(grafo.nodos.some(([x, z]) => x === l.x && z === l.z)).toBe(true);
      const destino = elegirDestino(locales, locales[0]!, azar(3));
      expect(destino).not.toBeNull();
      expect(destino!.nombre).not.toBe(locales[0]!.nombre);
    }
  });

  it('el destino cae en la horquilla de distancia cuando hay candidatos', () => {
    const locales = [{ nombre: 'A', x: 0, z: 0 }, { nombre: 'B', x: 20, z: 0 }, { nombre: 'C', x: 150, z: 0 }, { nombre: 'D', x: 900, z: 0 }];
    for (let i = 0; i < 10; i++) expect(elegirDestino(locales, locales[0]!, azar(i))!.nombre).toBe('C');
    // Sin candidatos en la horquilla: el más lejano.
    expect(elegirDestino(locales.slice(0, 2), locales[0]!, azar(1))!.nombre).toBe('B');
    expect(elegirDestino([locales[0]!], locales[0]!, azar(1))).toBeNull();
  });

  it('entrega, cadena y tiempo agotado', () => {
    const r = new Recadero();
    const a = { nombre: 'A', x: 0, z: 0 }, b = { nombre: 'B', x: 100, z: 0 };
    r.empezar(a, b);
    expect(r.estado).toBe('en_curso');
    expect(r.total).toBe(tiempoPara(100));
    expect(r.actualizar(50, 0, 1)).toBeNull();
    expect(r.actualizar(97, 0, 1)).toBe('entregado');
    expect(r.cadena).toBe(1);
    expect(r.estado).toBe('fuera');
    r.empezar(b, a);
    expect(r.actualizar(100, 0, r.total + 1)).toBe('tiempo');
    expect(r.cadena).toBe(0);
  });

  it('el premio crece con el tiempo sobrante y con la cadena', () => {
    expect(premioRecado(0, 30, 0)).toBe(20);
    expect(premioRecado(30, 30, 0)).toBe(80);
    expect(premioRecado(30, 30, 4)).toBe(160);
    expect(premioRecado(30, 30, 20)).toBe(premioRecado(30, 30, 8));
    expect(tiempoPara(200)).toBe(52);
  });
});
