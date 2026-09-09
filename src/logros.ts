// Logros: metas del modo freestyle sacadas de las estadísticas acumuladas. Lógica pura con
// tests; el menú los pinta y el juego avisa cuando cae uno nuevo.
import type { Estadisticas } from './estadisticas';

export interface Logro {
  id: string;
  nombre: string;
  descripcion: string;
  cumple: (e: Estadisticas) => boolean;
}

export const LOGROS: Logro[] = [
  { id: 'primer_lio', nombre: 'Primer lío', descripcion: 'Derriba 10 trastos', cumple: (e) => e.trastos >= 10 },
  { id: 'cafre', nombre: 'Cafre del barrio', descripcion: 'Derriba 200 trastos', cumple: (e) => e.trastos >= 200 },
  { id: 'racha', nombre: 'Lío armado', descripcion: 'Una racha de 10 seguidos', cumple: (e) => e.rachaMaxima >= 10 },
  { id: 'chorizo', nombre: 'Chorizo de motos', descripcion: 'Roba 5 motos', cumple: (e) => e.motosRobadas >= 5 },
  { id: 'coches', nombre: 'Préstamo sin aviso', descripcion: 'Roba 3 coches en marcha', cumple: (e) => e.cochesRobados >= 3 },
  { id: 'el13', nombre: 'Se lo llevó el 13', descripcion: 'Viaja en el 13 una vez', cumple: (e) => e.viajes13 >= 1 },
  { id: 'turista', nombre: 'Turista de Tussam', descripcion: 'Seis viajes en el 13', cumple: (e) => e.viajes13 >= 6 },
  { id: 'volador', nombre: 'Volador', descripcion: 'Un vuelo de más de 1,2 s', cumple: (e) => e.vueloMaximo >= 1.2 },
  { id: 'recadero', nombre: 'Recadero', descripcion: 'Entrega 5 encargos', cumple: (e) => e.recados >= 5 },
  { id: 'cadena', nombre: 'Cadena de tres', descripcion: 'Tres encargos seguidos', cumple: (e) => e.cadenaRecados >= 3 },
  { id: 'corredor', nombre: 'Corredor de pasajes', descripcion: 'Termina 3 carreras', cumple: (e) => e.carreras >= 3 },
  { id: 'mil', nombre: 'Mil euros', descripcion: 'Gana 1.000 € en total', cumple: (e) => e.dineroTotal >= 1000 },
  { id: 'km', nombre: 'Diez kilómetros', descripcion: 'Recorre 10 km', cumple: (e) => e.metros >= 10000 },
  { id: 'trincao', nombre: 'Cliente habitual', descripcion: 'Que te trinquen 3 veces', cumple: (e) => e.trincados >= 3 },
  { id: 'rio', nombre: 'Al Guadalquivir', descripcion: 'Un chapuzón en el río', cumple: (e) => e.chapuzones >= 1 },
  { id: 'rojo', nombre: 'Foto multa', descripcion: 'Sáltate 5 semáforos en rojo', cumple: (e) => e.semaforos >= 5 },
  { id: 'mecheros', nombre: 'Coleccionista', descripcion: 'Recoge 30 mecheros', cumple: (e) => e.mecheros >= 30 },
  { id: 'rey', nombre: 'Rey del barrio', descripcion: 'Los 20 mecheros de un barrio', cumple: (e) => e.barriosCompletos >= 1 },
  { id: 'atropellos', nombre: 'Que era el del quinto', descripcion: 'Atropella a 25 vecinos', cumple: (e) => e.atropellos >= 25 },
  { id: 'gol', nombre: '¡Gooool!', descripcion: 'Mete un gol en una pachanga', cumple: (e) => e.goles >= 1 },
  { id: 'pichichi', nombre: 'Pichichi del pasaje', descripcion: 'Diez goles', cumple: (e) => e.goles >= 10 },
  { id: 'reventon', nombre: 'Petó la Jog', descripcion: 'Revienta un vehículo', cumple: (e) => e.reventones >= 1 },
];

const CLAVE = 'pinoloko.logros.v1';

export class Logros {
  readonly desbloqueados: Set<string>;

  constructor(inicial?: Iterable<string>) {
    this.desbloqueados = new Set(inicial ?? Logros.leer());
  }

  private static leer(): string[] {
    try { return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as string[]; } catch { return []; }
  }

  /** Comprueba las estadísticas y devuelve los logros recién conseguidos (ya guardados). */
  comprobar(e: Estadisticas): Logro[] {
    const nuevos = LOGROS.filter((l) => !this.desbloqueados.has(l.id) && l.cumple(e));
    if (nuevos.length) {
      for (const l of nuevos) this.desbloqueados.add(l.id);
      try { localStorage.setItem(CLAVE, JSON.stringify([...this.desbloqueados])); } catch { /* sin almacenamiento */ }
    }
    return nuevos;
  }
}
