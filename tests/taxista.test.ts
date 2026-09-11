import { describe, expect, it } from 'vitest';
import { ESPERA_MAXIMA, Taxista, premioTaxi } from '../src/taxista';
import type { Local } from '../src/recados';

const locales: Local[] = [
  { nombre: 'Bar Pepe', x: 0, z: 0 },
  { nombre: 'Cruz Farmacia', x: 150, z: 0 },
  { nombre: 'Mercado', x: 0, z: 200 },
];
const rnd = () => 0.3;

describe('Taxista', () => {
  it('sin taxi no hace nada', () => {
    const t = new Taxista();
    expect(t.actualizar({ x: 0, z: 0, rapidez: 0 }, 1, () => ({ x: 1, z: 1, rumbo: 0 }), locales, rnd)).toBeNull();
    expect(t.clientes).toHaveLength(0);
  });

  it('libre: salen clientes, y parar a su lado los sube con destino y reloj', () => {
    const t = new Taxista();
    t.empezar();
    expect(t.estado).toBe('libre');
    let e = t.actualizar({ x: 0, z: 0, rapidez: 5 }, 2, () => ({ x: 3, z: 0, rumbo: 0 }), locales, rnd);
    expect(e).toBeNull();
    expect(t.clientes).toHaveLength(1);
    // Pasando rápido no sube nadie.
    e = t.actualizar({ x: 2, z: 0, rapidez: 6 }, 0.1, () => null, locales, rnd);
    expect(e).toBeNull();
    e = t.actualizar({ x: 2, z: 0, rapidez: 0 }, 0.1, () => null, locales, rnd);
    expect(e).toBe('sube');
    expect(t.estado).toBe('ocupado');
    expect(t.destino).not.toBeNull();
    expect(t.destino!.nombre).not.toBe('');
    expect(t.total).toBeGreaterThan(10);
    expect(t.clientes).toHaveLength(0);
  });

  it('llegar parado a la puerta entrega y encadena; el reloj agotado deja al cliente en la calle', () => {
    const t = new Taxista();
    t.empezar();
    t.actualizar({ x: 0, z: 0, rapidez: 5 }, 2, () => ({ x: 1, z: 0, rumbo: 0 }), locales, rnd);
    expect(t.actualizar({ x: 0, z: 0, rapidez: 0 }, 0.1, () => null, locales, rnd)).toBe('sube');
    const d = t.destino!;
    // Pasar por delante rápido no vale.
    expect(t.actualizar({ x: d.x, z: d.z, rapidez: 8 }, 0.1, () => null, locales, rnd)).toBeNull();
    expect(t.actualizar({ x: d.x + 1, z: d.z, rapidez: 0.5 }, 0.1, () => null, locales, rnd)).toBe('entregado');
    expect(t.cadena).toBe(1);
    expect(t.estado).toBe('libre');
    // Otro cliente y se agota el tiempo.
    t.actualizar({ x: 0, z: 0, rapidez: 5 }, 3, () => ({ x: 1, z: 0, rumbo: 0 }), locales, rnd);
    expect(t.actualizar({ x: 0, z: 0, rapidez: 0 }, 0.1, () => null, locales, rnd)).toBe('sube');
    expect(t.actualizar({ x: 0, z: 0, rapidez: 0 }, t.total + 1, () => null, locales, rnd)).toBe('tiempo');
    expect(t.cadena).toBe(0);
    expect(t.estado).toBe('libre');
  });

  it('los clientes se cansan de esperar y bajarse lo deja todo fuera', () => {
    const t = new Taxista();
    t.empezar();
    t.actualizar({ x: 0, z: 0, rapidez: 5 }, 2, () => ({ x: 50, z: 0, rumbo: 0 }), locales, rnd);
    expect(t.clientes).toHaveLength(1);
    expect(t.actualizar({ x: 0, z: 0, rapidez: 5 }, ESPERA_MAXIMA + 1, () => null, locales, rnd)).toBe('se_va');
    expect(t.clientes).toHaveLength(0);
    t.abandonar();
    expect(t.estado).toBe('fuera');
  });

  it('el premio sube con la distancia, con el reloj que sobra y con la cadena', () => {
    expect(premioTaxi(100, 0, 30, 0)).toBeLessThan(premioTaxi(100, 30, 30, 0));
    expect(premioTaxi(100, 15, 30, 0)).toBeLessThan(premioTaxi(300, 15, 30, 0));
    expect(premioTaxi(100, 15, 30, 0)).toBeLessThan(premioTaxi(100, 15, 30, 3));
    expect(premioTaxi(200, 20, 40, 0)).toBeGreaterThanOrEqual(30);
  });
});
