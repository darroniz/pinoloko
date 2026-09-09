import { describe, expect, it } from 'vitest';
import { ESTADISTICAS_VACIAS } from '../src/estadisticas';
import { LOGROS, Logros } from '../src/logros';

describe('logros', () => {
  it('con las estadísticas a cero no cae ninguno y los ids son únicos', () => {
    const l = new Logros([]);
    expect(l.comprobar({ ...ESTADISTICAS_VACIAS })).toEqual([]);
    expect(new Set(LOGROS.map((x) => x.id)).size).toBe(LOGROS.length);
  });

  it('cada logro se consigue una sola vez y se acumula', () => {
    const l = new Logros([]);
    const e = { ...ESTADISTICAS_VACIAS, trastos: 10, viajes13: 1 };
    expect(l.comprobar(e).map((x) => x.id).sort()).toEqual(['el13', 'primer_lio']);
    expect(l.comprobar(e)).toEqual([]);
    e.trastos = 250;
    e.rachaMaxima = 12;
    expect(l.comprobar(e).map((x) => x.id).sort()).toEqual(['cafre', 'racha']);
    expect(l.desbloqueados.size).toBe(4);
  });

  it('todos los logros son alcanzables con estadísticas altas', () => {
    const e = { ...ESTADISTICAS_VACIAS };
    for (const k of Object.keys(e) as (keyof typeof e)[]) e[k] = 100000;
    expect(new Logros([]).comprobar(e).length).toBe(LOGROS.length);
  });
});
