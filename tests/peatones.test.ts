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

describe('los que esperan el 13', () => {
  it('andan hasta la marquesina, se quedan esperando y al subir al bus reaparecen lejos', async () => {
    const { Vecinos } = await import('../src/mundo/peatones');
    const parada = nivel.pois.find((p) => p.clase === 'bus_stop')!;
    const vecinos = new Vecinos(grafo, 40, [], 'canis', [{ x: parada.x, z: parada.z }]);
    const esperando = vecinos.lista.filter((v) => v.estado === 'esperando');
    expect(esperando.length).toBeGreaterThanOrEqual(1);
    const v = esperando[0]!;
    expect(Math.hypot(v.x - parada.x, v.z - parada.z)).toBeLessThan(3);
    expect(vecinos.enLaParada(0, parada.x, parada.z, 5)).toContain(v);
    vecinos.subirAlBus(v);
    expect(v.estado).toBe('pasear');
    expect(v.parada).toBe(-1);
    expect(Math.hypot(v.x - parada.x, v.z - parada.z)).toBeGreaterThan(60);
    // Uno que va de camino llega y se queda.
    const otro = vecinos.lista.find((c) => c.estado === 'pasear')!;
    otro.x = parada.x + 4; otro.z = parada.z + 4;
    otro.objetivo = { x: parada.x, z: parada.z + 1, rumbo: 0 };
    otro.parada = 0;
    for (let i = 0; i < 60 * 10 && otro.estado === 'pasear'; i++) pasoVecino(otro, grafo, lejos, 1 / 60, azar(3));
    expect(otro.estado).toBe('esperando');
    expect(Math.hypot(otro.x - parada.x, otro.z - (parada.z + 1))).toBeLessThan(0.6);
  });
});

describe('el corro de mirones', () => {
  it('los que pasean cerca se acercan, se quedan mirando un rato y vuelven a pasear', async () => {
    const { Vecinos } = await import('../src/mundo/peatones');
    const vecinos = new Vecinos(grafo, 60, [], 'canis');
    const v = vecinos.lista.find((c) => c.estado === 'pasear')!;
    const x = v.x + 8, z = v.z;
    expect(vecinos.congregar(x, z, 28, 5)).toBeGreaterThanOrEqual(1);
    expect(v.objetivo).not.toBeNull();
    const rnd = azar(4);
    for (let i = 0; i < 60 * 15 && v.estado === 'pasear'; i++) pasoVecino(v, grafo, lejos, 1 / 60, rnd);
    expect(v.estado).toBe('mirando');
    const d = Math.hypot(v.x - x, v.z - z);
    expect(d).toBeGreaterThan(3.5);
    expect(d).toBeLessThan(6);
    for (let i = 0; i < 60 * 14 && v.estado === 'mirando'; i++) pasoVecino(v, grafo, lejos, 1 / 60, rnd);
    expect(v.estado).toBe('pasear');
    expect(vecinos.comentario().length).toBeGreaterThan(3);
  });
});

describe('la siesta', () => {
  it('entre las tres y las cinco y media, un tercio del barrio se queda en casa y no se mueve', async () => {
    const { Vecinos, enCasa, esSiesta } = await import('../src/mundo/peatones');
    expect(esSiesta(16)).toBe(true);
    expect(esSiesta(12)).toBe(false);
    const vecinos = new Vecinos(grafo, 90, [], 'canis');
    const casa = vecinos.lista.filter(enCasa);
    expect(casa.length).toBeGreaterThan(15);
    expect(casa.length).toBeLessThan(50);
    const antes = casa.map((v) => [v.x, v.z]);
    for (let i = 0; i < 60; i++) vecinos.actualizar(lejos, 1 / 60, true);
    casa.forEach((v, i) => { expect(v.x).toBe(antes[i]![0]); expect(v.z).toBe(antes[i]![1]); });
    const fuera = vecinos.lista.find((v) => !enCasa(v) && v.estado === 'pasear')!;
    const [fx, fz] = [fuera.x, fuera.z];
    for (let i = 0; i < 60; i++) vecinos.actualizar(lejos, 1 / 60, true);
    expect(Math.hypot(fuera.x - fx, fuera.z - fz)).toBeGreaterThan(0.3);
  });
});
