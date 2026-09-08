import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BARRIO_INICIAL, BARRIOS, rutaNivel } from '../src/mundo/barrios';
import { Paradas } from '../src/mundo/paradas';
import { GrafoBarrio } from '../src/mundo/grafo';
import type { Nivel } from '../src/mundo/tipos';

const nivelDe = (id: string): Nivel =>
  JSON.parse(readFileSync(new URL(`../public${rutaNivel(id)}`, import.meta.url), 'utf8')) as Nivel;

describe('registro de barrios (sistema de zonas)', () => {
  it('el barrio inicial existe y cada ficha lleva su id', () => {
    expect(BARRIOS[BARRIO_INICIAL]).toBeDefined();
    for (const [id, ficha] of Object.entries(BARRIOS)) expect(ficha.id).toBe(id);
  });

  it('el 13 lleva siempre a un barrio que existe y distinto del de salida', () => {
    for (const ficha of Object.values(BARRIOS)) {
      expect(BARRIOS[ficha.destino13]).toBeDefined();
      expect(ficha.destino13).not.toBe(ficha.id);
    }
  });

  it('cada barrio tiene nivel generado, paradas del 13 y la parada de llegada existe', () => {
    for (const ficha of Object.values(BARRIOS)) {
      const nivel = nivelDe(ficha.id);
      expect(nivel.tamano[0]).toBeGreaterThan(300);
      expect(nivel.edificios.length).toBeGreaterThan(100);
      const paradas = new Paradas(nivel);
      expect(paradas.lista.length).toBeGreaterThan(0);
      const llegada = paradas.lista.find((p) => p.nombre.toLowerCase().includes(ficha.paradaLlegada.toLowerCase()));
      expect(llegada, `${ficha.id}: parada "${ficha.paradaLlegada}"`).toBeDefined();
      // Y hay una calle rodada a mano para que el bus arranque y Wifly tenga por dónde salir.
      const grafo = new GrafoBarrio(nivel.grafo);
      const nodo = grafo.masCercano(llegada!.x, llegada!.z, 'rodada');
      const [nx, nz] = nivel.grafo.nodos[nodo]!;
      expect(Math.hypot(nx - llegada!.x, nz - llegada!.z)).toBeLessThan(40);
    }
  });

  it('las paradas se encuentran por cercanía y no desde lejos', () => {
    const paradas = new Paradas(nivelDe(BARRIO_INICIAL));
    const p = paradas.lista[0]!;
    expect(paradas.cercana(p.x + 2, p.z - 2)?.nombre).toBe(p.nombre);
    expect(paradas.cercana(p.x + 40, p.z)).toBeNull();
    expect(paradas.masCercana(p.x + 400, p.z + 400)).not.toBeNull();
  });
});
