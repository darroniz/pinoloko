import { describe, expect, it } from 'vitest';
import { bloqueCercano, bordeMasCercano, posicionMaceta, puntoDeCaida, Vecina } from '../src/mundo/vecina';
import type { Edificio } from '../src/mundo/tipos';

const bloque: Edificio = { id: 1, tipo: 'bloque', plantas: 5, altura: 15, color: '#fff', poligono: [[0, 0], [20, 0], [20, 10], [0, 10]] };
const bajo: Edificio = { id: 2, tipo: 'bloque', plantas: 1, altura: 3, color: '#fff', poligono: [[30, 0], [40, 0], [40, 10], [30, 10]] };
const nave: Edificio = { id: 3, tipo: 'nave', plantas: 3, altura: 10, color: '#fff', poligono: [[-30, 0], [-20, 0], [-20, 10], [-30, 10]] };

describe('la vecina del quinto', () => {
  it('se asoma por el borde de la fachada más cercana, solo en bloques altos', () => {
    const b = bordeMasCercano(bloque.poligono, 10, 14);
    expect(b.x).toBeCloseTo(10);
    expect(b.z).toBeCloseTo(10);
    expect(b.d).toBeCloseTo(4);
    expect(bloqueCercano([bloque, bajo, nave], 10, 14, 16)?.edificio.id).toBe(1);
    expect(bloqueCercano([bajo], 35, 14, 16)).toBeNull();
    expect(bloqueCercano([nave], -25, 14, 16)).toBeNull();
    expect(bloqueCercano([bloque], 10, 40, 16)).toBeNull();
  });

  it('apunta a donde va a estar el jugador y la maceta describe un arco hasta el suelo', () => {
    const caida = puntoDeCaida({ x: 0, z: 0, vx: 10, vz: 0 }, 1);
    expect(caida.x).toBeGreaterThan(5);
    const desde = { x: 0, y: 17, z: 0 };
    expect(posicionMaceta(desde, { x: 10, z: 0 }, 0).y).toBeCloseTo(17);
    expect(posicionMaceta(desde, { x: 10, z: 0 }, 1).y).toBeCloseTo(0.3);
    expect(posicionMaceta(desde, { x: 10, z: 0 }, 0.5).y).toBeGreaterThan((17 + 0.3) / 2);
  });

  it('grita, lanza al segundo y da al que se queda quieto; luego se enfría', () => {
    const v = new Vecina();
    const quieto = { x: 10, z: 14, vx: 0, vz: 0 };
    expect(v.asomar([bloque], quieto, () => 0)).toBe('¡Niñato, que son las tantas!');
    expect(v.activa).toBe(true);
    expect(v.asomar([bloque], quieto, () => 0)).toBeNull();
    let evento: string | null = null;
    for (let i = 0; i < 60 * 6 && !evento; i++) evento = v.actualizar(quieto, 1 / 60).evento;
    expect(evento).toBe('macetazo');
    for (let i = 0; i < 60 * 3; i++) v.actualizar(quieto, 1 / 60);
    expect(v.activa).toBe(false);
    expect(v.asomar([bloque], quieto, () => 0)).toBeNull();
    for (let i = 0; i < 60 * 25; i++) v.actualizar(quieto, 1 / 60);
    expect(v.asomar([bloque], quieto, () => 0)).not.toBeNull();
  });

  it('falla si el jugador se aparta, y la maceta se hace cascos', () => {
    const v = new Vecina();
    const j = { x: 10, z: 14, vx: 0, vz: 0 };
    v.asomar([bloque], j, () => 0);
    let r: { evento: string | null } = { evento: null };
    for (let i = 0; i < 60 * 6 && !r.evento; i++) { if (i === 70) { j.x = 30; j.z = 40; } r = v.actualizar(j, 1 / 60); }
    expect(r.evento).toBe('cascos');
  });
});
