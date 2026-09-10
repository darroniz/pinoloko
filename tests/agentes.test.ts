import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { azar } from '../src/mundo/geometria';
import { RADIO_TRINCAR, TIEMPO_TRINCAR, VELOCIDAD_AGENTE, crearAgente, pasoAgente } from '../src/policia/agentes';
import type { Nivel } from '../src/mundo/tipos';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('la Local a pie', () => {
  const nodoJugador = grafo.masCercano(30, 0, 'peatonal');
  const [jx, jz] = grafo.nodos[nodoJugador]!;

  it('aparece a 35-80 m del jugador, en un nodo peatonal', () => {
    const a = crearAgente(grafo, { x: jx, z: jz }, azar(1))!;
    expect(a).not.toBeNull();
    const d = Math.hypot(a.x - jx, a.z - jz);
    expect(d).toBeGreaterThanOrEqual(35);
    expect(d).toBeLessThanOrEqual(80);
    expect(grafo.vecinos(a.nodo, 'peatonal').length).toBeGreaterThan(0);
  });

  it('se acerca por el grafo a un jugador quieto y acaba trincándolo', () => {
    const a = crearAgente(grafo, { x: jx, z: jz }, azar(2))!;
    const camino = grafo.camino(a.nodo, nodoJugador, 'peatonal');
    let largo = 0;
    for (let i = 0; i + 1 < camino.length; i++) largo += grafo.distancia(camino[i]!, camino[i + 1]!);
    expect(largo).toBeGreaterThan(0);
    let resultado: ReturnType<typeof pasoAgente> = null;
    let t = 0;
    for (let i = 0; i < 60 * 60 && resultado !== 'trinca'; i++) {
      resultado = pasoAgente(a, grafo, { x: jx, z: jz }, 1 / 60);
      t += 1 / 60;
    }
    expect(resultado).toBe('trinca');
    expect(Math.hypot(a.x - jx, a.z - jz)).toBeLessThan(RADIO_TRINCAR + 0.1);
    // No tarda más de lo que da el camino del grafo a su velocidad, más el tiempo de trincar y un margen.
    expect(t).toBeLessThan(largo / VELOCIDAD_AGENTE + TIEMPO_TRINCAR + 4);
  });

  it('un jugador que corre más rápido que el agente no cae', () => {
    const a = crearAgente(grafo, { x: jx, z: jz }, azar(3))!;
    let x = jx;
    let resultado: ReturnType<typeof pasoAgente> = null;
    for (let i = 0; i < 60 * 8; i++) {
      x += (VELOCIDAD_AGENTE + 1.5) / 60;
      resultado = pasoAgente(a, grafo, { x, z: jz }, 1 / 60);
      if (resultado === 'trinca') break;
    }
    expect(resultado).not.toBe('trinca');
  });
});
