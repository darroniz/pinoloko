import { describe, expect, it } from 'vitest';
import { ESTADISTICAS_VACIAS } from '../src/estadisticas';
import { CATALOGO_RETOS, PREMIO_RETO, RetosDelDia, claveDia, retosDelDia } from '../src/retos';

describe('retos del día', () => {
  it('cada día salen tres distintos del catálogo, los mismos para la misma fecha', () => {
    const a = retosDelDia('2026-09-13');
    expect(a).toHaveLength(3);
    expect(new Set(a.map((r) => r.clave)).size).toBe(3);
    expect(retosDelDia('2026-09-13')).toEqual(a);
    expect(retosDelDia('2026-09-14')).not.toEqual(a);
    for (const r of a) expect(CATALOGO_RETOS).toContain(r);
  });

  it('la clave del día es AAAA-MM-DD en hora local', () => {
    expect(claveDia(new Date(2026, 8, 3))).toBe('2026-09-03');
  });

  it('se miden desde la foto del primer arranque del día y pagan una vez', () => {
    const stats = { ...ESTADISTICAS_VACIAS, trastos: 100 };
    const r = new RetosDelDia(stats, '2026-01-01', null);
    const reto = r.lista[0]!;
    expect(r.progreso(reto, stats)).toBe(0);
    stats[reto.clave] += reto.objetivo - 1;
    expect(r.comprobar(stats)).toEqual([]);
    stats[reto.clave] += 1;
    expect(r.comprobar(stats)).toEqual([reto]);
    expect(r.comprobar(stats)).toEqual([]);
    expect(r.resumen(stats)[0]).toEqual({ reto, progreso: reto.objetivo, hecho: true });
    expect(PREMIO_RETO).toBeGreaterThan(0);
  });

  it('el guardado del mismo día conserva la base y los hechos; otro día empieza de cero', () => {
    const stats = { ...ESTADISTICAS_VACIAS, trastos: 50 };
    const guardado = { dia: '2026-01-01', base: { trastos: 10 }, hechos: [] as string[] };
    const mismo = new RetosDelDia(stats, '2026-01-01', guardado);
    const reto = mismo.lista.find((x) => x.clave === 'trastos');
    if (reto) expect(mismo.progreso(reto, stats)).toBe(Math.min(reto.objetivo, 40));
    const otro = new RetosDelDia(stats, '2026-01-02', guardado);
    for (const x of otro.lista) expect(otro.progreso(x, stats)).toBe(0);
    expect(otro.hechos.size).toBe(0);
  });
});
