import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { azar } from '../src/mundo/geometria';
import { LIMITE, elegirRadares, pasoRadar } from '../src/mundo/radares';
import { BARRIOS, rutaNivel } from '../src/mundo/barrios';
import type { Nivel } from '../src/mundo/tipos';

const nivelDe = (id: string): Nivel => JSON.parse(readFileSync(new URL(`../public${rutaNivel(id)}`, import.meta.url), 'utf8')) as Nivel;

describe('radares', () => {
  it('cada barrio tiene radares en calles anchas, separados y deterministas', () => {
    for (const ficha of Object.values(BARRIOS)) {
      const nivel = nivelDe(ficha.id);
      const radares = elegirRadares(nivel, 3, azar(5150));
      expect(radares.length, ficha.id).toBeGreaterThan(0);
      for (const r of radares) {
        expect(Math.hypot(r.tx, r.tz)).toBeCloseTo(1, 5);
        expect(r.ancho).toBeGreaterThanOrEqual(4);
      }
      for (let i = 0; i < radares.length; i++) for (let j = i + 1; j < radares.length; j++) {
        expect(Math.hypot(radares[i]!.x - radares[j]!.x, radares[i]!.z - radares[j]!.z)).toBeGreaterThanOrEqual(120);
      }
      expect(elegirRadares(nivel, 3, azar(5150))).toEqual(radares);
    }
  });

  it('hace la foto al pasar la raya rápido en vehículo, no a pie ni despacio, y no dos veces seguidas', () => {
    const r = { x: 0, z: 0, tx: 1, tz: 0, ancho: 9, calle: 'Luis de Morales', enfriamiento: 0 };
    expect(pasoRadar(r, { x: 0, z: 2, rapidez: LIMITE - 0.1, enVehiculo: true }, 1 / 60)).toBe(false);
    expect(pasoRadar(r, { x: 0, z: 2, rapidez: 16, enVehiculo: false }, 1 / 60)).toBe(false);
    expect(pasoRadar(r, { x: 0, z: 9, rapidez: 16, enVehiculo: true }, 1 / 60)).toBe(false); // fuera de la calzada
    expect(pasoRadar(r, { x: 4, z: 2, rapidez: 16, enVehiculo: true }, 1 / 60)).toBe(false); // lejos de la raya
    expect(pasoRadar(r, { x: 1, z: -3, rapidez: 16, enVehiculo: true }, 1 / 60)).toBe(true);
    expect(pasoRadar(r, { x: 1, z: -3, rapidez: 16, enVehiculo: true }, 1 / 60)).toBe(false);
    expect(pasoRadar(r, { x: 1, z: -3, rapidez: 16, enVehiculo: true }, 9)).toBe(true);
  });
});
