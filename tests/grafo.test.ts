import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio, viaMasCercana } from '../src/mundo/grafo';
import type { Nivel } from '../src/mundo/tipos';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;

describe('grafo del Mercado', () => {
  const g = new GrafoBarrio(nivel.grafo);

  it('tiene la red que promete el brief: más peatonal que rodado', () => {
    const rodadas = nivel.vias.filter((v) => v.clase === 'rodada').length;
    const peatonales = nivel.vias.filter((v) => v.clase === 'peatonal').length;
    expect(peatonales).toBeGreaterThan(rodadas);
    expect(nivel.edificios.length).toBeGreaterThan(150);
  });

  it('las aristas rodadas forman una componente grande (se puede circular)', () => {
    const nodo = g.masCercano(0, 0, 'rodada');
    expect(nodo).toBeGreaterThanOrEqual(0);
    const tam = g.componente(nodo, 'rodada');
    expect(tam).toBeGreaterThan(40);
  });

  it('un vecino rodado nunca llega por una arista peatonal', () => {
    for (let i = 0; i < g.nodos.length; i++) {
      for (const v of g.vecinos(i, 'rodada')) expect(v.clase).toBe('rodada');
    }
  });

  it('encuentra camino entre dos nodos rodados de la misma componente', () => {
    const a = g.masCercano(0, 0, 'rodada');
    // Destino: el nodo rodado alcanzable desde `a` que esté más lejos (la caja corta calles
    // en el borde y los sentidos únicos parten el grafo dirigido, así que no vale uno al azar).
    let b = a, lejos = 0;
    for (let i = 0; i < g.nodos.length; i++) {
      const d = g.distancia(a, i);
      if (d > lejos && g.camino(a, i, 'rodada').length > 0) { lejos = d; b = i; }
    }
    expect(lejos).toBeGreaterThan(150);
    const camino = g.camino(a, b, 'rodada');
    expect(camino.length).toBeGreaterThan(2);
    expect(camino[0]).toBe(a);
    expect(camino[camino.length - 1]).toBe(b);
    for (let i = 0; i + 1 < camino.length; i++) {
      expect(g.vecinos(camino[i]!, 'rodada').some((v) => v.nodo === camino[i + 1])).toBe(true);
    }
  });

  it('pasear al azar no vuelve por donde vino si hay alternativa', () => {
    const inicio = g.masCercano(0, 0, 'peatonal');
    let anterior = -1, actual = inicio;
    const rnd = () => 0.5;
    for (let i = 0; i < 20; i++) {
      const siguiente = g.siguienteAlAzar(actual, anterior, 'peatonal', rnd);
      if (g.vecinos(actual, 'peatonal').length > 1) expect(siguiente).not.toBe(anterior);
      anterior = actual;
      actual = siguiente;
    }
  });

  it('la vía más cercana al origen es una calle con nombre', () => {
    const via = viaMasCercana(nivel, 0, 0, 40);
    expect(via).not.toBeNull();
    expect(via!.nombre.length).toBeGreaterThan(0);
  });
});

describe('camino libre (a contramano)', () => {
  const g = new GrafoBarrio(nivel.grafo);

  it('alcanza más nodos rodados ignorando el sentido único', () => {
    const a = g.masCercano(0, 0, 'rodada');
    let dirigidos = 0, libres = 0;
    for (let i = 0; i < g.nodos.length; i++) {
      if (g.vecinos(i, 'rodada').length === 0) continue;
      if (g.camino(a, i, 'rodada').length) dirigidos++;
      if (g.camino(a, i, 'rodada', true).length) libres++;
    }
    expect(libres).toBeGreaterThan(dirigidos);
    expect(libres).toBeGreaterThan(100);
  });
});
