import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { OPCIONES_COLA, elegirEstadio, elegirSitio, entreHoras, esHoraDeBotellon } from '../src/mundo/botellon';
import type { Nivel } from '../src/mundo/tipos';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('el botellón', () => {
  it('la cola de la churrería es de mañana y no lleva litronas', () => {
    expect(entreHoras(9, OPCIONES_COLA.desde, OPCIONES_COLA.hasta)).toBe(true);
    expect(entreHoras(12, OPCIONES_COLA.desde, OPCIONES_COLA.hasta)).toBe(false);
    expect(OPCIONES_COLA.litronas).toBe(false);
  });

  it('es de diez de la noche a cuatro', () => {
    expect(esHoraDeBotellon(21.9)).toBe(false);
    expect(esHoraDeBotellon(22)).toBe(true);
    expect(esHoraDeBotellon(1.5)).toBe(true);
    expect(esHoraDeBotellon(4)).toBe(false);
    expect(esHoraDeBotellon(12)).toBe(false);
  });

  it('los tramos de horas pueden cruzar la medianoche', () => {
    expect(entreHoras(21, 20.5, 22.5)).toBe(true);
    expect(entreHoras(23, 20.5, 22.5)).toBe(false);
    expect(entreHoras(2, 22, 4)).toBe(true);
  });

  it('el estadio solo existe donde hay un edificio estadio', () => {
    expect(elegirEstadio(nivel, grafo)).toBeNull();
    const nervion = JSON.parse(readFileSync(new URL('../public/barrios/nervion/nivel.json', import.meta.url), 'utf8')) as Nivel;
    const g = new GrafoBarrio(nervion.grafo);
    const s = elegirEstadio(nervion, g)!;
    expect(s).not.toBeNull();
    expect(g.masCercano(s.x, s.z, 'peatonal')).toBeGreaterThanOrEqual(0);
  });

  it('la plaza es un nodo peatonal del grafo, cerca de la zona verde más grande si la hay', () => {
    const s = elegirSitio(nivel, grafo)!;
    expect(s).not.toBeNull();
    const nodo = grafo.masCercano(s.x, s.z, 'peatonal');
    expect(grafo.nodos[nodo]).toEqual([s.x, s.z]);
  });

  it('sin zonas verdes cae en el cruce de pasajes con más salidas', () => {
    const s = elegirSitio({ zonas: [] }, grafo)!;
    const nodo = grafo.masCercano(s.x, s.z, 'peatonal');
    expect(grafo.vecinos(nodo, 'peatonal').length).toBeGreaterThanOrEqual(3);
  });
});
