import { describe, expect, it } from 'vitest';
import { NivelBusqueda, UMBRALES } from '../src/policia/busqueda';

describe('nivel de búsqueda', () => {
  it('empieza limpio y un cono no llama a la policía', () => {
    const n = new NivelBusqueda();
    expect(n.estrellas).toBe(0);
    n.fechoria('trasto');
    expect(n.estrellas).toBe(0);
  });

  it('acumular gamberradas acaba en una estrella', () => {
    const n = new NivelBusqueda();
    for (let i = 0; i < 10; i++) n.fechoria('trasto');
    expect(n.estrellas).toBe(1);
  });

  it('un robo de coche y un atropello suben a dos estrellas', () => {
    const n = new NivelBusqueda();
    n.fechoria('robo_coche');
    n.fechoria('atropello');
    expect(n.estrellas).toBeGreaterThanOrEqual(1);
    n.fechoria('atropello');
    n.fechoria('atropello');
    expect(n.estrellas).toBe(2);
  });

  it('se enfría si nadie te ve, y no mientras te están viendo', () => {
    const n = new NivelBusqueda();
    n.calor = UMBRALES[2]! + 5;
    expect(n.estrellas).toBe(2);
    for (let i = 0; i < 60; i++) { n.visto(); n.actualizar(1 / 60); }
    expect(n.estrellas).toBe(2);
    let cambios = 0;
    for (let i = 0; i < 60 * 40; i++) cambios += n.actualizar(1 / 60);
    expect(n.estrellas).toBe(0);
    expect(cambios).toBe(-2);
  });

  it('nunca pasa de cinco estrellas ni del calor máximo', () => {
    const n = new NivelBusqueda();
    for (let i = 0; i < 50; i++) n.fechoria('choque_patrulla');
    expect(n.estrellas).toBe(5);
    n.fechoria('robo_coche');
    expect(n.estrellas).toBe(5);
  });

  it('la dotación crece con las estrellas y las motos llegan a la tercera', () => {
    const n = new NivelBusqueda();
    expect(n.dotacion).toEqual({ coches: 0, motos: 0 });
    n.calor = UMBRALES[1]!;
    expect(n.dotacion).toEqual({ coches: 1, motos: 0 });
    n.calor = UMBRALES[3]!;
    expect(n.dotacion).toEqual({ coches: 3, motos: 1 });
    n.calor = UMBRALES[5]!;
    expect(n.dotacion).toEqual({ coches: 4, motos: 3 });
  });

  it('trincado limpia todo', () => {
    const n = new NivelBusqueda();
    n.fechoria('robo_coche');
    n.limpiar();
    expect(n.estrellas).toBe(0);
    expect(n.calor).toBe(0);
  });
});
