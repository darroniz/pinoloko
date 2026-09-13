import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DURACION_LLUVIA, PROBABILIDAD_POR_HORA, RAMPA, Tiempo } from '../src/mundo/tiempo';
import { CHARCOS_POR_BARRIO, colocarCharcos } from '../src/mundo/charcos';
import { GrafoBarrio } from '../src/mundo/grafo';
import type { Nivel } from '../src/mundo/tipos';
import { azar } from '../src/mundo/geometria';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);
const HORAS_POR_SEGUNDO = 24 / 600;

describe('el tiempo', () => {
  it('sin forzar, llueve de vez en cuando (el dado se tira cada hora en punto) y dura unas horas', () => {
    const t = new Tiempo(null, () => 0); // el dado siempre sale bajo: llueve a la primera hora en punto
    expect(t.actualizar(10.5, 0.1, HORAS_POR_SEGUNDO)).toBeNull();
    expect(t.actualizar(11.0, 0.1, HORAS_POR_SEGUNDO)).toBe('empieza');
    expect(t.lloviendo).toBe(true);
    expect(t.restante).toBeCloseTo(DURACION_LLUVIA.min, 5);
    // La intensidad sube con rampa, no de golpe.
    expect(t.intensidad).toBeLessThan(0.05);
    for (let i = 0; i < RAMPA * 10 + 2; i++) t.actualizar(11.2, 0.1, HORAS_POR_SEGUNDO);
    expect(t.intensidad).toBe(1);
    // Al agotar las horas escampa y el suelo se seca despacio.
    let ev: string | null = null;
    for (let s = 0; s < DURACION_LLUVIA.min / HORAS_POR_SEGUNDO + 1 && ev !== 'escampa'; s += 0.1) ev = t.actualizar(12, 0.1, HORAS_POR_SEGUNDO);
    expect(ev).toBe('escampa');
    for (let i = 0; i < RAMPA * 10 + 2; i++) t.actualizar(12, 0.1, HORAS_POR_SEGUNDO);
    expect(t.intensidad).toBe(0);
    expect(t.mojado).toBeGreaterThan(0.7);
  });

  it('con el dado alto no llueve nunca; forzada, llueve siempre; quitada, jamás', () => {
    const seco = new Tiempo(null, () => 0.99);
    for (let h = 0; h < 24 * 5; h++) expect(seco.actualizar(h % 24, 1, HORAS_POR_SEGUNDO)).toBeNull();
    expect(seco.lloviendo).toBe(false);
    const forzada = new Tiempo('si');
    expect(forzada.lloviendo).toBe(true);
    for (let i = 0; i < 400; i++) forzada.actualizar(3, 0.1, HORAS_POR_SEGUNDO);
    expect(forzada.intensidad).toBe(1);
    const quitada = new Tiempo('no', () => 0);
    for (let h = 0; h < 48; h++) expect(quitada.actualizar(h % 24, 1, HORAS_POR_SEGUNDO)).toBeNull();
    expect(quitada.lloviendo).toBe(false);
  });

  it('la probabilidad sale a un día de lluvia cada dos o tres', () => {
    expect(PROBABILIDAD_POR_HORA * 24).toBeCloseTo(0.4, 5);
  });

  it('los charcos van en las calles rodadas, separados entre sí', () => {
    const charcos = colocarCharcos(grafo, CHARCOS_POR_BARRIO, azar(1));
    expect(charcos.length).toBeGreaterThan(20);
    for (let i = 0; i < charcos.length; i++) for (let j = i + 1; j < charcos.length; j++) expect(Math.hypot(charcos[i]!.x - charcos[j]!.x, charcos[i]!.z - charcos[j]!.z)).toBeGreaterThanOrEqual(12);
    for (const c of charcos) {
      const n = grafo.masCercano(c.x, c.z, 'rodada');
      const [nx, nz] = grafo.nodos[n]!;
      expect(Math.hypot(nx - c.x, nz - c.z)).toBeLessThan(80); // hay tramos de calle de más de 100 m entre nodos
    }
  });
});
