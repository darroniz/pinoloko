import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { CUPONES_POR_SORTEO, HORA_SORTEO, Once, PREMIOS, elegirVendedor, numeroPremiado, premio } from '../src/mundo/once';
import type { Nivel } from '../src/mundo/tipos';
import { azar } from '../src/mundo/geometria';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('el cupón de la ONCE', () => {
  it('el vendedor está cerca de la parada, en un pasaje', () => {
    const v = elegirVendedor(nivel, grafo, { x: 0, z: 0 })!;
    expect(v).not.toBeNull();
    const d = Math.hypot(v.x, v.z);
    expect(d).toBeGreaterThan(12);
    expect(d).toBeLessThan(48);
  });

  it('el número premiado depende de la fecha y del sorteo, y los premios van por cifras finales', () => {
    expect(numeroPremiado('2026-09-14', 0)).toBe(numeroPremiado('2026-09-14', 0));
    expect(numeroPremiado('2026-09-14', 0)).not.toBe(numeroPremiado('2026-09-14', 1));
    expect(numeroPremiado('2026-09-15', 0)).not.toBe(numeroPremiado('2026-09-14', 0));
    expect(premio(12345, 12345)).toBe(PREMIOS.gordo);
    expect(premio(99345, 12345)).toBe(PREMIOS.tres);
    expect(premio(99945, 12345)).toBe(PREMIOS.dos);
    expect(premio(99995, 12345)).toBe(PREMIOS.una);
    expect(premio(99999, 12345)).toBe(0);
  });

  it('tres cupones por sorteo como mucho; a las nueve y cuarto se sortea y se vacían', () => {
    const o = new Once({ x: 0, z: 0, rumbo: 0 }, azar(5));
    for (let i = 0; i < 5; i++) o.comprar();
    expect(o.cupones.length).toBe(CUPONES_POR_SORTEO);
    const lejos = { x: 999, z: 999 };
    expect(o.actualizar(HORA_SORTEO - 0.1, 0.1, '2026-09-14', lejos).sorteo).toBeNull();
    const r = o.actualizar(HORA_SORTEO + 0.01, 0.1, '2026-09-14', lejos);
    expect(r.sorteo).not.toBeNull();
    expect(r.sorteo!.premios.length).toBe(CUPONES_POR_SORTEO);
    expect(o.cupones.length).toBe(0);
    expect(o.sorteos).toBe(1);
    // Al día siguiente vuelve a haber sorteo, no en el mismo minuto.
    expect(o.actualizar(HORA_SORTEO + 0.02, 0.1, '2026-09-14', lejos).sorteo).toBeNull();
    o.actualizar(23.9, 0.1, '2026-09-14', lejos);
    o.actualizar(0.1, 0.1, '2026-09-14', lejos);
    o.actualizar(HORA_SORTEO - 0.05, 0.1, '2026-09-14', lejos);
    expect(o.actualizar(HORA_SORTEO + 0.01, 0.1, '2026-09-14', lejos).sorteo).not.toBeNull();
  });

  it('el pregón solo si estás cerca, y sin vendedor no hay nada', () => {
    const o = new Once({ x: 0, z: 0, rumbo: 0 }, azar(6));
    let pregon: string | null = null;
    for (let i = 0; i < 100 && !pregon; i++) pregon = o.actualizar(12, 0.1, '2026-09-14', { x: 5, z: 0 }).pregon;
    expect(pregon).toBeTruthy();
    const sin = new Once(null);
    expect(sin.comprar()).not.toBeNull(); // comprar no mira la distancia: eso lo mira el juego con `cerca`
    expect(sin.cerca(0, 0)).toBe(false);
    expect(sin.actualizar(HORA_SORTEO + 0.01, 0.1, '2026-09-14', { x: 0, z: 0 }).sorteo).toBeNull();
  });
});
