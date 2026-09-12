import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { AGUANTE, VELOCIDAD, crearPerseguidor, pasoPerseguidor } from '../src/mundo/perseguidores';
import { VELOCIDAD_AGENTE } from '../src/policia/agentes';
import type { Nivel } from '../src/mundo/tipos';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('el barrio se venga', () => {
  const nodo = grafo.masCercano(30, 0, 'peatonal');
  const [jx, jz] = grafo.nodos[nodo]!;

  it('el camarero sale de la puerta del bar y alcanza a un jugador parado cerca', () => {
    const p = crearPerseguidor('camarero', grafo, jx + 8, jz, 'Bar El Cazador');
    let r: ReturnType<typeof pasoPerseguidor> = null;
    let t = 0;
    while (r !== 'alcanza' && t < 10) { r = pasoPerseguidor(p, grafo, { x: jx, z: jz }, 1 / 30); t += 1 / 30; if (r === 'rendido') break; }
    expect(r).toBe('alcanza');
    expect(t).toBeLessThan(5);
  });

  it('se cansa pasado su aguante si no te pilla, y grita por el camino', () => {
    const p = crearPerseguidor('motero', grafo, jx + 60, jz, 'Zip SP');
    let gritos = 0, r: ReturnType<typeof pasoPerseguidor> = null, t = 0;
    // El jugador huye siempre a 40 m por delante: nunca lo alcanza.
    while (r !== 'rendido' && t < AGUANTE.motero + 5) {
      r = pasoPerseguidor(p, grafo, { x: p.agente.x + 40, z: p.agente.z }, 1 / 30);
      if (r === 'grita') gritos++;
      expect(r).not.toBe('alcanza');
      t += 1 / 30;
    }
    expect(r).toBe('rendido');
    expect(t).toBeGreaterThanOrEqual(AGUANTE.motero - 0.1);
    expect(gritos).toBeGreaterThanOrEqual(3);
  });

  it('se rinde si te vas muy lejos', () => {
    const p = crearPerseguidor('camarero', grafo, jx, jz, 'Bar');
    expect(pasoPerseguidor(p, grafo, { x: jx + 200, z: jz }, 1 / 30)).toBe('rendido');
  });

  it('el camarero es más lento que la Local y el motero más rápido que el camarero', () => {
    expect(VELOCIDAD.camarero).toBeLessThan(VELOCIDAD_AGENTE);
    expect(VELOCIDAD.motero).toBeGreaterThan(VELOCIDAD.camarero);
  });
});
