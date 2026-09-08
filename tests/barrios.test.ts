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

  it('el 13 lleva siempre a barrios que existen, distintos del de salida, y desde cualquiera se llega a todos', () => {
    for (const ficha of Object.values(BARRIOS)) {
      expect(ficha.destinos13.length).toBeGreaterThan(0);
      for (const d of ficha.destinos13) { expect(BARRIOS[d]).toBeDefined(); expect(d).not.toBe(ficha.id); }
    }
    const ids = Object.keys(BARRIOS);
    for (const origen of ids) {
      const vistos = new Set([origen]);
      const cola = [origen];
      while (cola.length) for (const d of BARRIOS[cola.shift()!]!.destinos13) if (!vistos.has(d)) { vistos.add(d); cola.push(d); }
      expect([...vistos].sort()).toEqual(ids.slice().sort());
    }
  });

  it('cada parada del barrio lleva a un destino y entre todas cubren todos los destinos', () => {
    for (const ficha of Object.values(BARRIOS)) {
      const paradas = new Paradas(nivelDe(ficha.id), ficha.destinos13);
      for (const p of paradas.lista) expect(ficha.destinos13).toContain(p.destino);
      if (paradas.lista.length >= ficha.destinos13.length) expect(new Set(paradas.lista.map((p) => p.destino)).size).toBe(ficha.destinos13.length);
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
