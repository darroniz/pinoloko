import { describe, expect, it } from 'vitest';
import { Contador, ESTADISTICAS_VACIAS, Garaje, resumen } from '../src/estadisticas';

describe('estadísticas', () => {
  it('suma, guarda máximos y resume con unidades legibles', () => {
    const c = new Contador({ ...ESTADISTICAS_VACIAS });
    c.sumar('trastos', 3);
    c.sumar('metros', 12500);
    c.sumar('segundos', 3700);
    c.maximo('rachaMaxima', 7);
    c.maximo('rachaMaxima', 4);
    expect(c.datos.trastos).toBe(3);
    expect(c.datos.rachaMaxima).toBe(7);
    const filas = Object.fromEntries(resumen(c.datos));
    expect(filas['Recorrido']).toBe('13 km');
    expect(filas['Tiempo haciendo el cafre']).toBe('1 h 1 min');
    expect(filas['Lío más grande']).toBe('7 trastos seguidos');
  });

  it('el resumen de una partida vacía no rompe', () => {
    const filas = resumen({ ...ESTADISTICAS_VACIAS });
    expect(filas.length).toBeGreaterThan(8);
    expect(Object.fromEntries(filas)['Recorrido']).toBe('0.0 km');
  });
});

describe('garaje', () => {
  it('la Jog RR siempre está y no se puede elegir una moto que no has robado', () => {
    const g = new Garaje({ desbloqueadas: [], elegida: 3 });
    expect(g.desbloqueadas.has(0)).toBe(true);
    expect(g.elegida).toBe(0);
    expect(g.elegir(3)).toBe(false);
    expect(g.desbloquear(3)).toBe(true);
    expect(g.desbloquear(3)).toBe(false);
    expect(g.elegir(3)).toBe(true);
    expect(g.elegida).toBe(3);
  });
});
