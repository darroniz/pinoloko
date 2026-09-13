import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GrafoBarrio } from '../src/mundo/grafo';
import { HORA_SALIDA, Procesion, RESPETO_SEGUNDOS, elegirParroquia, esTardeDeSalida, formarCofradia } from '../src/mundo/procesion';
import type { Nivel } from '../src/mundo/tipos';
import { azar } from '../src/mundo/geometria';

const nivel = JSON.parse(readFileSync(new URL('../public/barrios/pino-montano/nivel.json', import.meta.url), 'utf8')) as Nivel;
const grafo = new GrafoBarrio(nivel.grafo);

describe('la procesión', () => {
  it('la cofradía va formada: cruz, nazarenos en dos filas, el paso y la banda, de delante atrás', () => {
    const m = formarCofradia();
    expect(m[0]!.tipo).toBe('cruz');
    expect(m.filter((x) => x.tipo === 'nazareno').length).toBe(16);
    expect(m.filter((x) => x.tipo === 'paso').length).toBe(1);
    expect(m.filter((x) => x.tipo === 'banda').length).toBe(12);
    for (let i = 1; i < m.length; i++) expect(m[i]!.d).toBeGreaterThanOrEqual(m[i - 1]!.d);
  });

  it('sale de la parroquia del Mercado una tarde de cada tres', () => {
    const p = elegirParroquia(nivel, grafo)!;
    expect(p).not.toBeNull();
    expect(p.nodo).toBeGreaterThanOrEqual(0);
    expect(esTardeDeSalida(0, 20)).toBe(true);
    expect(esTardeDeSalida(1, 20)).toBe(false);
    expect(esTardeDeSalida(3, HORA_SALIDA.desde)).toBe(true);
    expect(esTardeDeSalida(3, HORA_SALIDA.hasta)).toBe(false);
    expect(esTardeDeSalida(0, 12)).toBe(false);
  });

  it('sale ya formada por la puerta y la fila sigue el rastro de la cabeza con las distancias guardadas', () => {
    const pr = new Procesion(elegirParroquia(nivel, grafo), grafo, azar(2));
    const lejos = { x: 9999, z: 9999, rapidez: 0, enVehiculo: false };
    expect(pr.actualizar(12, lejos, 0.1).sale).toBe(false);
    const ev = pr.actualizar(19.1, lejos, 0.1);
    expect(ev.sale).toBe(true);
    expect(pr.activa).toBe(true);
    const cabeza = pr.miembros[0]!;
    const distancias = (): number[] => pr.miembros.map((m) => Math.hypot(m.x - cabeza.x, m.z - cabeza.z));
    // Recién salida: cada uno a su distancia (la fila es recta al principio).
    let d = distancias();
    pr.miembros.forEach((m, i) => expect(Math.abs(d[i]! - Math.hypot(m.d, m.lado))).toBeLessThan(0.3));
    // Anda un minuto: la cabeza se ha movido unos 50 m y la fila sigue detrás por el grafo.
    const x0 = cabeza.x, z0 = cabeza.z;
    for (let i = 0; i < 600; i++) pr.actualizar(19.5, lejos, 0.1);
    expect(Math.hypot(cabeza.x - x0, cabeza.z - z0)).toBeGreaterThan(15);
    d = distancias();
    // El paso no se separa de la cabeza más que el largo de fila (la fila serpentea, así que es menor o igual).
    const paso = pr.paso;
    expect(Math.hypot(paso.x - cabeza.x, paso.z - cabeza.z)).toBeLessThanOrEqual(21.6);
    expect(Math.hypot(paso.x - cabeza.x, paso.z - cabeza.z)).toBeGreaterThan(6);
    // Y se recoge a las once y media.
    expect(pr.actualizar(HORA_SALIDA.hasta + 0.01, lejos, 0.1).seRecoge).toBe(true);
    expect(pr.activa).toBe(false);
  });

  it('colarse por medio con la moto es una cruzada; pararse junto al paso, un respeto (una vez)', () => {
    const pr = new Procesion(elegirParroquia(nivel, grafo), grafo, azar(3));
    pr.salir();
    const paso = pr.paso;
    const ev = pr.actualizar(20, { x: paso.x, z: paso.z, rapidez: 8, enVehiculo: true }, 0.1);
    expect(ev.cruzada).toBe(true);
    expect(ev.cercania).toBeGreaterThan(0.9);
    // Enfriamiento: no cuenta dos veces seguidas.
    expect(pr.actualizar(20, { x: paso.x, z: paso.z, rapidez: 8, enVehiculo: true }, 0.1).cruzada).toBe(false);
    // A pie por medio no es cruzada.
    const pr2 = new Procesion(elegirParroquia(nivel, grafo), grafo, azar(3));
    pr2.salir();
    expect(pr2.actualizar(20, { x: pr2.paso.x, z: pr2.paso.z, rapidez: 4, enVehiculo: false }, 0.1).cruzada).toBe(false);
    // Parado al lado del paso el rato que toca: respeto, y solo una vez.
    let respeto = false;
    for (let t = 0; t < RESPETO_SEGUNDOS + 1; t += 0.1) respeto = respeto || pr2.actualizar(20, { x: pr2.paso.x + 5, z: pr2.paso.z, rapidez: 0, enVehiculo: true }, 0.1).respeto;
    expect(respeto).toBe(true);
    respeto = false;
    for (let t = 0; t < RESPETO_SEGUNDOS + 1; t += 0.1) respeto = respeto || pr2.actualizar(20, { x: pr2.paso.x + 5, z: pr2.paso.z, rapidez: 0, enVehiculo: true }, 0.1).respeto;
    expect(respeto).toBe(false);
  });

  it('donde no hay parroquia no hay procesión', () => {
    const pr = new Procesion(null, grafo);
    expect(pr.actualizar(20, { x: 0, z: 0, rapidez: 0, enVehiculo: false }, 0.1).sale).toBe(false);
    pr.salir();
    expect(pr.activa).toBe(false);
  });
});
