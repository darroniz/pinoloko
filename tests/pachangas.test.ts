import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Nivel } from '../src/mundo/tipos';
import { esGol, pasoNino, sitiosPachanga, type Nino } from '../src/mundo/pachangas';
import { azar } from '../src/mundo/geometria';

const carga = (b: string): Nivel => JSON.parse(readFileSync(new URL(`../public/barrios/${b}/nivel.json`, import.meta.url), 'utf8')) as Nivel;

const nino = (): Nino => ({ x: 5, z: 0, rumbo: 0, estado: 'jugar', tiempo: 0, enfriamiento: 0, fase: 0, equipo: 0 });

describe('pachangas', () => {
  it('cada barrio tiene sitio para al menos dos pachangas, separadas', () => {
    for (const id of ['pino-montano', 'alameda', 'triana']) {
      const sitios = sitiosPachanga(carga(id), 4, []);
      expect(sitios.length, id).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < sitios.length; i++) for (let j = i + 1; j < sitios.length; j++) expect(Math.hypot(sitios[i]!.x - sitios[j]!.x, sitios[i]!.z - sitios[j]!.z)).toBeGreaterThan(60);
    }
  });

  it('el niño corre al balón y lo chuta hacia la portería', () => {
    const n = nino();
    const lejos = { x: 0, z: 0, rapidez: 0 };
    const porteria = { x: 0, z: -9 };
    const parado = { x: 100, z: 100, rapidez: 0 };
    const rnd = azar(1);
    let chut = null;
    for (let i = 0; i < 400 && !chut; i++) chut = pasoNino(n, lejos, porteria, parado, 1 / 60, rnd);
    expect(chut).not.toBeNull();
    expect(Math.hypot(n.x, n.z)).toBeLessThan(1.2);
    // El chut va hacia la portería (norte, -z) con algo de desvío.
    expect(chut!.vz).toBeLessThan(0);
    expect(Math.abs(chut!.vx)).toBeLessThan(Math.abs(chut!.vz) + 3);
    // Y no vuelve a chutar en seguida.
    expect(pasoNino(n, lejos, porteria, parado, 1 / 60, rnd)).toBeNull();
  });

  it('se aparta si el jugador viene lanzado y vuelve a jugar después', () => {
    const n = nino();
    const balon = { x: 0, z: 0, rapidez: 0 };
    const porteria = { x: 0, z: -9 };
    pasoNino(n, balon, porteria, { x: 5, z: 3, rapidez: 8 }, 1 / 60, azar(2));
    expect(n.estado).toBe('apartarse');
    const z0 = n.z;
    for (let i = 0; i < 30; i++) pasoNino(n, balon, porteria, { x: 5, z: 3, rapidez: 8 }, 1 / 60, azar(2));
    expect(n.z).toBeLessThan(z0); // huye del jugador, que está al sur
    for (let i = 0; i < 200; i++) pasoNino(n, balon, porteria, { x: 50, z: 50, rapidez: 0 }, 1 / 60, azar(2));
    expect(n.estado).toBe('jugar');
  });

  it('gol: entre los postes y pasada la línea, mirando al norte', () => {
    const porteria = { x: 0, z: 0, rumbo: 0 };
    expect(esGol({ x: 0, z: -0.6 }, porteria)).toBe(true);
    expect(esGol({ x: 1.9, z: -1.2 }, porteria)).toBe(true);
    expect(esGol({ x: 2.3, z: -0.6 }, porteria)).toBe(false);
    expect(esGol({ x: 0, z: 0.5 }, porteria)).toBe(false);
    expect(esGol({ x: 0, z: -2 }, porteria)).toBe(false);
  });
});
