import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { azar } from '../src/mundo/geometria';
import { Carrera, Records, generarRuta, premio } from '../src/carreras';
import type { Nivel } from '../src/mundo/tipos';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('carreras por los pasajes', () => {
  const salida = grafo.masCercano(30, 0, 'peatonal');
  const ruta = generarRuta(grafo, salida, 6, azar(7))!;

  it('genera un bucle de puntos separados y todos en el grafo peatonal', () => {
    expect(ruta).not.toBeNull();
    expect(ruta.puntos.length).toBeGreaterThanOrEqual(3);
    expect(ruta.puntos.at(-1)).toBe(salida);
    const alcanzables = grafo.alcanzables(salida, 'peatonal');
    for (const p of ruta.puntos) expect(alcanzables.has(p)).toBe(true);
    for (let i = 0; i + 2 < ruta.puntos.length; i++) {
      const [ax, az] = grafo.nodos[ruta.puntos[i]!]!;
      const [bx, bz] = grafo.nodos[ruta.puntos[i + 1]!]!;
      expect(Math.hypot(bx - ax, bz - az)).toBeGreaterThanOrEqual(45);
    }
  });

  it('es determinista con la misma semilla', () => {
    expect(generarRuta(grafo, salida, 6, azar(7))!.puntos).toEqual(ruta.puntos);
  });

  it('hay que pasar los puntos en orden y al último se llega a la meta', () => {
    const c = new Carrera();
    c.empezar(ruta);
    const [ux, uz] = grafo.nodos[ruta.puntos.at(-1)!]!;
    expect(c.actualizar(ux, uz, 0.1, grafo)).toBeNull(); // la meta no cuenta si faltan puntos
    for (let i = 0; i < ruta.puntos.length; i++) {
      const [x, z] = grafo.nodos[ruta.puntos[i]!]!;
      const r = c.actualizar(x + 1, z - 1, 0.5, grafo);
      expect(r).toBe(i === ruta.puntos.length - 1 ? 'meta' : 'punto');
    }
    expect(c.estado).toBe('fuera');
    expect(c.tiempo).toBeCloseTo(0.1 + 0.5 * ruta.puntos.length);
  });

  it('se abandona por tiempo', () => {
    const c = new Carrera();
    c.empezar(ruta);
    expect(c.actualizar(9999, 9999, 200, grafo)).toBe('tiempo');
    expect(c.estado).toBe('fuera');
  });

  it('paga más cuanto más rápido, y algo siempre', () => {
    expect(premio(30, 6)).toBeGreaterThan(premio(90, 6));
    expect(premio(1000, 6)).toBeGreaterThanOrEqual(30);
  });

  it('guarda solo los récords que mejoran', () => {
    const r = new Records({});
    expect(r.registrar('pino-montano', 0, 50)).toBe(true);
    expect(r.registrar('pino-montano', 0, 60)).toBe(false);
    expect(r.registrar('pino-montano', 0, 40)).toBe(true);
    expect(r.mejor('pino-montano', 0)).toBe(40);
    expect(r.mejor('alameda', 0)).toBeNull();
  });
});
