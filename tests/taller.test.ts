import { describe, expect, it } from 'vitest';
import { JOG_RR } from '../src/fisica/scooter';
import { MEJORAS, NIVEL_MAXIMO, Taller, aplicarMejoras } from '../src/taller';

describe('taller', () => {
  it('sin mejoras los ajustes son los del modelo', () => {
    expect(aplicarMejoras(JOG_RR, {})).toEqual(JOG_RR);
  });

  it('cada nivel sube lo suyo y no pasa del máximo', () => {
    const a = aplicarMejoras(JOG_RR, { escape: 3, variador: 1, neumaticos: 2, frenos: 9 });
    expect(a.velocidadMaxima).toBeCloseTo(JOG_RR.velocidadMaxima * 1.21);
    expect(a.aceleracion).toBeCloseTo(JOG_RR.aceleracion * 1.1);
    expect(a.agarre).toBeCloseTo(JOG_RR.agarre * 1.16);
    expect(a.frenado).toBeCloseTo(JOG_RR.frenado * 1.36);
    expect(a.giroParado).toBe(JOG_RR.giroParado);
  });

  it('comprar cobra el precio del nivel, exige dinero y se para en el tercero', () => {
    const t = new Taller({});
    const escape = MEJORAS.find((m) => m.id === 'escape')!;
    expect(t.precio(0, 'escape')).toBe(escape.precios[0]);
    expect(t.comprar(0, 'escape', 100)).toBe(-1);
    expect(t.comprar(0, 'escape', 150)).toBe(150);
    expect(t.nivel(0, 'escape')).toBe(1);
    expect(t.precio(0, 'escape')).toBe(escape.precios[1]);
    expect(t.comprar(0, 'escape', 9999)).toBe(300);
    expect(t.comprar(0, 'escape', 9999)).toBe(600);
    expect(t.nivel(0, 'escape')).toBe(NIVEL_MAXIMO);
    expect(t.precio(0, 'escape')).toBeNull();
    expect(t.comprar(0, 'escape', 9999)).toBe(-1);
    // Otra moto empieza de cero.
    expect(t.nivel(1, 'escape')).toBe(0);
  });
});
