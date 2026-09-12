import { describe, expect, it } from 'vitest';
import { EUROS_PELOS, Estilo, MINIMO_CABALLITO, MINIMO_DERRAPADA, TRAMO_CONTRAMANO, eurosCaballito, eurosContramano, eurosDerrapada, sentidoVia, vaEnContramano, type EntradaEstilo } from '../src/estilo';

const base: EntradaEstilo = { enMoto: true, rapidez: 9, derrapando: false, caballito: 0, cerca: [], golpe: false, contramano: false };

function correr(e: Estilo, entrada: Partial<EntradaEstilo>, segundos: number, dt = 1 / 30) {
  const eventos = [];
  for (let t = 0; t < segundos; t += dt) eventos.push(...e.actualizar({ ...base, ...entrada }, dt));
  return eventos;
}

describe('conducir con estilo', () => {
  it('una derrapada larga paga al terminar; una corta no', () => {
    const e = new Estilo();
    expect(correr(e, { derrapando: true }, 0.6)).toEqual([]);
    expect(correr(e, {}, 0.5)).toEqual([]);
    expect(correr(e, { derrapando: true }, MINIMO_DERRAPADA + 0.3)).toEqual([]);
    const [ev] = correr(e, {}, 0.5);
    expect(ev?.tipo).toBe('derrapada');
    expect(ev!.segundos).toBeGreaterThanOrEqual(MINIMO_DERRAPADA);
    expect(ev!.euros).toBe(eurosDerrapada(ev!.segundos));
  });

  it('un caballito largo paga cuando el morro baja', () => {
    const e = new Estilo();
    expect(correr(e, { caballito: 0.3 }, MINIMO_CABALLITO + 0.2)).toEqual([]);
    const [ev] = correr(e, { caballito: 0 }, 0.1);
    expect(ev?.tipo).toBe('caballito');
    expect(ev!.euros).toBe(eurosCaballito(ev!.segundos));
    expect(eurosCaballito(2)).toBeGreaterThan(eurosCaballito(0.8));
  });

  it('bajarse de la moto paga lo que ya llegaba al mínimo y corta lo demás', () => {
    const e = new Estilo();
    correr(e, { derrapando: true, caballito: 0.3 }, MINIMO_DERRAPADA + 0.2);
    const ev = e.actualizar({ ...base, enMoto: false }, 0.03);
    expect(ev.map((x) => x.tipo).sort()).toEqual(['caballito', 'derrapada']);
    expect(e.enCurso).toEqual({ derrape: 0, caballito: 0, contramano: 0 });
  });

  it('por los pelos: un coche que entra y sale del radio a velocidad sin golpe', () => {
    const e = new Estilo();
    const coche = {};
    expect(correr(e, { cerca: [coche] }, 0.3)).toEqual([]);
    const [ev] = correr(e, { cerca: [] }, 0.1);
    expect(ev).toEqual({ tipo: 'pelos', segundos: 0, euros: EUROS_PELOS });
  });

  it('por los pelos no vale si lo has tocado o si vas despacio', () => {
    const e = new Estilo();
    const coche = {};
    correr(e, { cerca: [coche] }, 0.2);
    e.actualizar({ ...base, cerca: [coche], golpe: true }, 0.03);
    expect(correr(e, { cerca: [] }, 0.2)).toEqual([]);
    const lento = new Estilo();
    correr(lento, { cerca: [coche], rapidez: 4 }, 0.2);
    expect(correr(lento, { cerca: [], rapidez: 4 }, 0.2)).toEqual([]);
  });

  it('dos cosas seguidas por los pelos no pagan dos veces en el mismo instante', () => {
    const e = new Estilo();
    const a = {}, b = {};
    correr(e, { cerca: [a, b] }, 0.2);
    expect(correr(e, { cerca: [] }, 0.1)).toHaveLength(1);
  });

  it('el contramano paga por tramos y cada tramo vale más, hasta cuatro', () => {
    const e = new Estilo();
    const eventos = correr(e, { contramano: true }, TRAMO_CONTRAMANO * 5 + 0.2);
    expect(eventos.map((x) => x.tipo)).toEqual(['contramano', 'contramano', 'contramano', 'contramano', 'contramano']);
    expect(eventos.map((x) => x.euros)).toEqual([eurosContramano(1), eurosContramano(2), eurosContramano(3), eurosContramano(4), eurosContramano(4)]);
    // Al salir de la calle y volver a entrar, se empieza de cero.
    correr(e, { contramano: false }, 3);
    expect(correr(e, { contramano: true }, TRAMO_CONTRAMANO + 0.1)[0]?.euros).toBe(eurosContramano(1));
  });

  it('el sentido de una vía es el de su tramo más cercano', () => {
    const via = { puntos: [[0, 0], [10, 0], [10, 10]] as [number, number][] };
    expect(sentidoVia(via, 5, -1)).toEqual({ x: 1, z: 0 });
    expect(sentidoVia(via, 11, 5)).toEqual({ x: 0, z: 1 });
  });

  it('solo hay contramano en rodadas de sentido único yendo contra su sentido', () => {
    const puntos: [number, number][] = [[0, 0], [20, 0]];
    const unica = { puntos, clase: 'rodada' as const, unico: true, ancho: 6 };
    expect(vaEnContramano(unica, 10, 0, -1, 0)).toBe(true);
    expect(vaEnContramano(unica, 10, 0, 1, 0)).toBe(false);
    expect(vaEnContramano(unica, 10, 0, 0, 1)).toBe(false);
    expect(vaEnContramano({ puntos, clase: 'rodada', ancho: 6 }, 10, 0, -1, 0)).toBe(false);
    expect(vaEnContramano({ ...unica, clase: 'peatonal' }, 10, 0, -1, 0)).toBe(false);
    expect(vaEnContramano(null, 10, 0, -1, 0)).toBe(false);
  });
});
