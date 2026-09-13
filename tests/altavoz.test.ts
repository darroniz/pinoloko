import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { Altavoz, COMITIVA_MAXIMA, RADIO_COMITIVA } from '../src/mundo/altavoz';
import { Vecinos, pasoVecino } from '../src/mundo/peatones';
import type { Nivel } from '../src/mundo/tipos';
import { azar } from '../src/mundo/geometria';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

/** Un barrio con `n` vecinos paseando alrededor de (x, z). */
function vecindario(n: number, x: number, z: number): Vecinos {
  const v = new Vecinos(grafo, n);
  for (const p of v.lista) {
    p.estado = 'pasear'; p.parada = -1; p.objetivo = null;
    p.x = x + (Math.random() - 0.5) * 6; p.z = z + (Math.random() - 0.5) * 6;
  }
  return v;
}

describe('el altavoz de la moto', () => {
  it('apagado no hace nada; encendido, los canis se apuntan de uno en uno y pagan', () => {
    const a = new Altavoz(azar(3));
    const v = vecindario(12, 0, 0);
    const moto = { x: 0, z: 0, rapidez: 1, rumbo: 0 };
    expect(a.actualizar(moto, v, 'canis', 0.3).unidos).toBe(0);
    expect(a.alternar()).toBe(true);
    let unidos = 0;
    for (let i = 0; i < 40; i++) unidos += a.actualizar(moto, v, 'canis', 0.3).unidos;
    expect(unidos).toBe(COMITIVA_MAXIMA);
    expect(a.cuantos).toBe(COMITIVA_MAXIMA);
    expect(v.lista.filter((p) => p.sequito).length).toBe(COMITIVA_MAXIMA);
  });

  it('en otro barrio nadie se apunta, pero protestan', () => {
    const a = new Altavoz(azar(4));
    const v = vecindario(6, 0, 0);
    a.alternar();
    let queja: string | null = null;
    for (let i = 0; i < 20 && !queja; i++) queja = a.actualizar({ x: 0, z: 0, rapidez: 1, rumbo: 0 }, v, 'pijos', 0.3).queja;
    expect(queja).toBeTruthy();
    expect(a.cuantos).toBe(0);
  });

  it('la comitiva va detrás de la moto y baila al llegar, sin asustarse de ella', () => {
    const a = new Altavoz(azar(5));
    const v = vecindario(8, 0, 0);
    a.alternar();
    const moto = { x: 0, z: 0, rapidez: 1, rumbo: 0 };
    for (let i = 0; i < 30; i++) a.actualizar(moto, v, 'canis', 0.3);
    expect(a.cuantos).toBeGreaterThanOrEqual(3);
    // Se mueven hacia su sitio detrás (rumbo 0 mira al norte, -z; detrás es +z).
    for (let i = 0; i < 200; i++) {
      a.actualizar(moto, v, 'canis', 0.05);
      for (const p of a.comitiva) pasoVecino(p, grafo, { x: 0, z: 0, rapidez: 3 }, 0.05, Math.random);
    }
    for (const p of a.comitiva) {
      expect(p.z).toBeGreaterThan(1.5);
      expect(Math.abs(p.x)).toBeLessThan(2);
      expect(p.estado).toBe('mirando');
    }
  });

  it('si te vas lejos un rato, la comitiva se pierde; al apagar, se disuelve', () => {
    const a = new Altavoz(azar(6));
    const v = vecindario(8, 0, 0);
    a.alternar();
    for (let i = 0; i < 30; i++) a.actualizar({ x: 0, z: 0, rapidez: 1, rumbo: 0 }, v, 'canis', 0.3);
    expect(a.cuantos).toBeGreaterThan(0);
    let perdida = false;
    for (let i = 0; i < 12 && !perdida; i++) perdida = a.actualizar({ x: 60, z: 0, rapidez: 8, rumbo: 0 }, v, 'canis', 0.3).perdida;
    expect(perdida).toBe(true);
    expect(a.cuantos).toBe(0);
    expect(v.lista.some((p) => p.sequito)).toBe(false);
    const b = new Altavoz(azar(7));
    b.alternar();
    for (let i = 0; i < 30; i++) b.actualizar({ x: 0, z: 0, rapidez: 1, rumbo: 0 }, vecindario(8, 0, 0), 'canis', 0.3);
    expect(b.alternar()).toBe(false);
    expect(b.cuantos).toBe(0);
  });

  it('el radio de unión es corto: los que están lejos no se enteran', () => {
    const a = new Altavoz(azar(8));
    const v = vecindario(8, RADIO_COMITIVA + 20, 0);
    a.alternar();
    for (let i = 0; i < 20; i++) a.actualizar({ x: 0, z: 0, rapidez: 1, rumbo: 0 }, v, 'canis', 0.3);
    expect(a.cuantos).toBe(0);
  });
});
