import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { azar } from '../src/mundo/geometria';
import { generarRuta } from '../src/carreras';
import { RITMOS, caminoDeRuta, crearRivales, largoCamino, pasoRival, progreso, puesto } from '../src/piques';
import type { Nivel } from '../src/mundo/tipos';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);
const salida = grafo.masCercano(30, 0, 'peatonal');
const ruta = generarRuta(grafo, salida, 6, azar(7))!;

describe('piques: los canis que corren contigo', () => {
  it('el camino pasa por todos los puntos de control en orden y solo por aristas del grafo', () => {
    const camino = caminoDeRuta(grafo, ruta);
    expect(camino[0]).toBe(ruta.salida);
    let i = 0;
    for (const n of camino) if (n === ruta.puntos[i]) i++;
    expect(i).toBe(ruta.puntos.length);
    for (let k = 0; k + 1 < camino.length; k++) {
      expect(grafo.vecinos(camino[k]!, 'peatonal').some((v) => v.nodo === camino[k + 1])).toBe(true);
    }
    expect(largoCamino(grafo, camino)).toBeGreaterThan(200);
  });

  it('tres rivales con ritmos distintos que llegan a la meta en orden y con tiempos crecientes', () => {
    const rivales = crearRivales(grafo, ruta, azar(3));
    expect(rivales).toHaveLength(3);
    expect(rivales[0]!.velocidad).toBeGreaterThan(rivales[2]!.velocidad);
    expect(puesto(rivales)).toBe(1);
    let reloj = 0;
    const llegadas: string[] = [];
    for (let paso = 0; paso < 6000 && llegadas.length < 3; paso++) {
      reloj += 1 / 30;
      for (const r of rivales) if (pasoRival(r, grafo, 1 / 30, reloj)) llegadas.push(r.nombre);
    }
    expect(llegadas).toEqual(['el Kevin', 'el Jonathan', 'la Vanessa']);
    expect(rivales[0]!.tiempo).toBeLessThan(rivales[1]!.tiempo);
    expect(rivales[1]!.tiempo).toBeLessThan(rivales[2]!.tiempo);
    // El rápido anda cerca de su ritmo sobre el tiempo "bueno" de la carrera; el lento, por encima.
    expect(rivales[0]!.tiempo).toBeLessThan(ruta.puntos.length * 12 * RITMOS[0]! * 1.1);
    expect(rivales[2]!.tiempo).toBeGreaterThan(ruta.puntos.length * 12 * RITMOS[2]! * 0.9);
    for (const r of rivales) expect(r.velocidad).toBeLessThanOrEqual(11);
    expect(puesto(rivales)).toBe(4);
    const [mx, mz] = grafo.nodos[ruta.salida]!;
    for (const r of rivales) { expect(Math.hypot(r.x - mx, r.z - mz)).toBeLessThan(0.01); expect(progreso(r, grafo)).toBe(1); }
  });

  it('el progreso crece con el tiempo y el rival no se sale del camino', () => {
    const r = crearRivales(grafo, ruta, azar(1))[1]!;
    let anterior = 0;
    for (let paso = 0; paso < 300; paso++) {
      pasoRival(r, grafo, 1 / 30, paso / 30);
      const p = progreso(r, grafo);
      expect(p).toBeGreaterThanOrEqual(anterior);
      anterior = p;
      const [ax, az] = grafo.nodos[r.camino[r.tramo]!] ?? [0, 0];
      const [bx, bz] = grafo.nodos[r.camino[r.tramo + 1] ?? r.camino[r.tramo]!] ?? [ax, az];
      // Está sobre el segmento actual (a menos de medio metro de la recta).
      const l = Math.hypot(bx - ax, bz - az) || 1;
      const dist = Math.abs((bx - ax) * (az - r.z) - (ax - r.x) * (bz - az)) / l;
      expect(dist).toBeLessThan(0.5);
    }
    expect(anterior).toBeGreaterThan(0.1);
  });
});
