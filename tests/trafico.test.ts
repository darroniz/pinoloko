import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import type { Nivel } from '../src/mundo/tipos';
import { azar, distanciaPolilinea } from '../src/mundo/geometria';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('tráfico por el grafo rodado', () => {
  it('un coche que sigue siguienteAlAzar(rodada) nunca pisa un pasaje', () => {
    const rnd = azar(5);
    let anterior = -1;
    let actual = grafo.masCercano(0, 0, 'rodada');
    for (let paso = 0; paso < 200; paso++) {
      const siguiente = grafo.siguienteAlAzar(actual, anterior, 'rodada', rnd);
      if (siguiente === actual) break;
      // La arista recorrida existe y es rodada.
      const arista = grafo.vecinos(actual, 'rodada').find((v) => v.nodo === siguiente);
      expect(arista).toBeDefined();
      // Y el punto medio está sobre una calle rodada, no sobre un pasaje.
      const [ax, az] = grafo.nodos[actual]!;
      const [bx, bz] = grafo.nodos[siguiente]!;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const rodadas = nivel.vias.filter((v) => v.clase === 'rodada');
      const cerca = rodadas.some((v) => distanciaPolilinea(mx, mz, v.puntos) < 1);
      expect(cerca).toBe(true);
      anterior = actual;
      actual = siguiente;
    }
  });

  it('respeta el sentido único: la arista inversa no existe', () => {
    const unicas = nivel.grafo.aristas.filter((a) => a[4] === 1);
    expect(unicas.length).toBeGreaterThan(0);
    for (const [a, b] of unicas.slice(0, 40)) {
      const inversa = grafo.vecinos(b, 'rodada').some((v) => v.nodo === a);
      // Puede existir si otra vía rodada de doble sentido une los mismos nodos; en la caja no pasa.
      expect(inversa).toBe(false);
    }
  });
});
