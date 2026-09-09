import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Nivel } from '../src/mundo/tipos';
import { AMBAR, CICLO, VERDE, agruparCruces, ejeDe, luz } from '../src/mundo/semaforos';

const triana = JSON.parse(readFileSync(new URL('../public/barrios/triana/nivel.json', import.meta.url), 'utf8')) as Nivel;
const pino = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;

describe('semáforos', () => {
  it('Triana agrupa sus 11 semáforos en pocos cruces y el Mercado tiene uno', () => {
    const cruces = agruparCruces(triana, triana.semaforos);
    expect(triana.semaforos.length).toBe(11);
    expect(cruces.length).toBeGreaterThanOrEqual(2);
    expect(cruces.length).toBeLessThanOrEqual(4);
    expect(cruces.reduce((n, c) => n + c.semaforos.length, 0)).toBe(11);
    expect(agruparCruces(pino, pino.semaforos).length).toBe(1);
  });

  it('los dos ejes se turnan: nunca hay verde para los dos a la vez y siempre lo hay para uno', () => {
    const cruce = agruparCruces(triana, triana.semaforos)[0]!;
    const a = cruce.eje, b = cruce.eje + Math.PI / 2;
    expect(ejeDe(cruce, a)).toBe(0);
    expect(ejeDe(cruce, a + Math.PI)).toBe(0);
    expect(ejeDe(cruce, b)).toBe(1);
    let verdes = 0;
    for (let t = 0; t < CICLO * 2; t += 0.25) {
      const la = luz(cruce, t, a), lb = luz(cruce, t, b);
      expect(la === 'rojo' || lb === 'rojo').toBe(true);
      expect(la !== 'rojo' || lb !== 'rojo').toBe(true);
      if (la === 'verde') verdes++;
    }
    // El eje 0 está en verde VERDE segundos de cada ciclo.
    expect(verdes * 0.25).toBeCloseTo(VERDE * 2, 0);
  });

  it('el verde pasa por ámbar antes del rojo', () => {
    const cruce = agruparCruces(triana, triana.semaforos)[0]!;
    const secuencia: string[] = [];
    for (let t = -cruce.desfase; t < CICLO - cruce.desfase; t += 0.5) {
      const l = luz(cruce, t, cruce.eje);
      if (secuencia[secuencia.length - 1] !== l) secuencia.push(l);
    }
    expect(secuencia).toEqual(['verde', 'ambar', 'rojo']);
    expect(CICLO).toBe(2 * (VERDE + AMBAR));
  });
});
