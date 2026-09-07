import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { crearVecino, pasoVecino } from '../src/mundo/peatones';
import { azar } from '../src/mundo/geometria';
import type { Nivel } from '../src/mundo/tipos';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);
const lejos = { x: 9999, z: 9999, rapidez: 0 };

function nodoPeatonal(): number {
  for (let i = 0; i < grafo.nodos.length; i++) if (grafo.vecinos(i, 'peatonal').length > 1) return i;
  throw new Error('sin nodos peatonales');
}

describe('vecinos del barrio', () => {
  it('pasean por el grafo peatonal y avanzan de nodo en nodo', () => {
    const rnd = azar(1);
    const v = crearVecino(grafo, nodoPeatonal(), rnd);
    const nodoInicial = v.nodo;
    for (let i = 0; i < 60 * 30; i++) pasoVecino(v, grafo, lejos, 1 / 60, rnd);
    expect(v.estado).toBe('pasear');
    expect(v.nodo).not.toBe(nodoInicial);
    // Siempre está cerca de algún nodo peatonal: no se ha salido del pasaje.
    const cercano = grafo.masCercano(v.x, v.z, 'peatonal');
    const [nx, nz] = grafo.nodos[cercano]!;
    expect(Math.hypot(nx - v.x, nz - v.z)).toBeLessThan(40);
  });

  it('huye de la moto cuando viene lanzada y luego vuelve a pasear', () => {
    const rnd = azar(2);
    const v = crearVecino(grafo, nodoPeatonal(), rnd);
    const moto = { x: v.x + 4, z: v.z, rapidez: 12 };
    const evento = pasoVecino(v, grafo, moto, 1 / 60, rnd);
    expect(v.estado).toBe('huir');
    expect(evento).toBe('insulto');
    const dAntes = Math.hypot(v.x - moto.x, v.z - moto.z);
    for (let i = 0; i < 30; i++) pasoVecino(v, grafo, moto, 1 / 60, rnd);
    expect(Math.hypot(v.x - moto.x, v.z - moto.z)).toBeGreaterThan(dAntes);
    for (let i = 0; i < 60 * 6; i++) pasoVecino(v, grafo, lejos, 1 / 60, rnd);
    expect(v.estado).toBe('pasear');
  });

  it('se cae si lo atropellas y se levanta pasado un rato', () => {
    const rnd = azar(3);
    const v = crearVecino(grafo, nodoPeatonal(), rnd);
    const moto = { x: v.x + 0.5, z: v.z, rapidez: 8 };
    expect(pasoVecino(v, grafo, moto, 1 / 60, rnd)).toBe('atropello');
    expect(v.estado).toBe('caido');
    // Mientras está en el suelo no se le puede atropellar otra vez.
    expect(pasoVecino(v, grafo, moto, 1 / 60, rnd)).toBeNull();
    for (let i = 0; i < 60 * 4; i++) pasoVecino(v, grafo, lejos, 1 / 60, rnd);
    expect(['huir', 'pasear']).toContain(v.estado);
  });

  it('no insulta dos veces seguidas', () => {
    const rnd = azar(4);
    const v = crearVecino(grafo, nodoPeatonal(), rnd);
    const moto = { x: v.x + 4, z: v.z, rapidez: 12 };
    expect(pasoVecino(v, grafo, moto, 1 / 60, rnd)).toBe('insulto');
    v.estado = 'pasear';
    expect(pasoVecino(v, grafo, moto, 1 / 60, rnd)).toBeNull();
  });
});
