// Logros: metas del modo freestyle sacadas de las estadísticas acumuladas. Lógica pura con
// tests; el menú los pinta y el juego avisa cuando cae uno nuevo.
import type { Estadisticas } from './estadisticas';

export interface Logro {
  id: string;
  nombre: string;
  descripcion: string;
  cumple: (e: Estadisticas) => boolean;
  /** Para el menú: cuánto llevas y cuánto hace falta (solo en los logros de umbral). */
  medida?: (e: Estadisticas) => number;
  objetivo?: number;
}

export const LOGROS: Logro[] = [
  { id: 'primer_lio', nombre: 'Primer lío', descripcion: 'Derriba 10 trastos', cumple: (e) => e.trastos >= 10, medida: (e) => e.trastos, objetivo: 10 },
  { id: 'cafre', nombre: 'Cafre del barrio', descripcion: 'Derriba 200 trastos', cumple: (e) => e.trastos >= 200, medida: (e) => e.trastos, objetivo: 200 },
  { id: 'racha', nombre: 'Lío armado', descripcion: 'Una racha de 10 seguidos', cumple: (e) => e.rachaMaxima >= 10, medida: (e) => e.rachaMaxima, objetivo: 10 },
  { id: 'chorizo', nombre: 'Chorizo de motos', descripcion: 'Roba 5 motos', cumple: (e) => e.motosRobadas >= 5, medida: (e) => e.motosRobadas, objetivo: 5 },
  { id: 'coches', nombre: 'Préstamo sin aviso', descripcion: 'Roba 3 coches en marcha', cumple: (e) => e.cochesRobados >= 3, medida: (e) => e.cochesRobados, objetivo: 3 },
  { id: 'el13', nombre: 'Se lo llevó el 13', descripcion: 'Viaja en el 13 una vez', cumple: (e) => e.viajes13 >= 1, medida: (e) => e.viajes13, objetivo: 1 },
  { id: 'turista', nombre: 'Turista de Tussam', descripcion: 'Seis viajes en el 13', cumple: (e) => e.viajes13 >= 6, medida: (e) => e.viajes13, objetivo: 6 },
  { id: 'volador', nombre: 'Volador', descripcion: 'Un vuelo de más de 1,2 s', cumple: (e) => e.vueloMaximo >= 1.2, medida: (e) => e.vueloMaximo, objetivo: 1.2 },
  { id: 'recadero', nombre: 'Recadero', descripcion: 'Entrega 5 encargos', cumple: (e) => e.recados >= 5, medida: (e) => e.recados, objetivo: 5 },
  { id: 'cadena', nombre: 'Cadena de tres', descripcion: 'Tres encargos seguidos', cumple: (e) => e.cadenaRecados >= 3, medida: (e) => e.cadenaRecados, objetivo: 3 },
  { id: 'corredor', nombre: 'Corredor de pasajes', descripcion: 'Termina 3 carreras', cumple: (e) => e.carreras >= 3, medida: (e) => e.carreras, objetivo: 3 },
  { id: 'pique', nombre: 'Pique ganado', descripcion: 'Gana una carrera al Kevin, al Jonathan y a la Vanessa', cumple: (e) => e.piquesGanados >= 1, medida: (e) => e.piquesGanados, objetivo: 1 },
  { id: 'rey_piques', nombre: 'El más rápido del barrio', descripcion: 'Gana cinco piques', cumple: (e) => e.piquesGanados >= 5, medida: (e) => e.piquesGanados, objetivo: 5 },
  { id: 'spray', nombre: 'Wifly estuvo aquí', descripcion: 'Firma una pintada', cumple: (e) => e.pintadas >= 1, medida: (e) => e.pintadas, objetivo: 1 },
  { id: 'rey_spray', nombre: 'Rey del spray', descripcion: 'Quince pintadas por Sevilla', cumple: (e) => e.pintadas >= 15, medida: (e) => e.pintadas, objetivo: 15 },
  { id: 'territorio_pijo', nombre: 'Territorio pijo', descripcion: 'Firma una pintada en Los Remedios o Nervión', cumple: (e) => e.pintadasPijas >= 1, medida: (e) => e.pintadasPijas, objetivo: 1 },
  { id: 'guerra', nombre: 'Guerra de barrios', descripcion: 'Tira a 10 pijos', cumple: (e) => e.pijosAtropellados >= 10, medida: (e) => e.pijosAtropellados, objetivo: 10 },
  { id: 'alarmas', nombre: 'Media Sevilla despierta', descripcion: 'Dispara 5 alarmas de coche', cumple: (e) => e.alarmas >= 5, medida: (e) => e.alarmas, objetivo: 5 },
  { id: 'vespa', nombre: 'Vespa de pijo', descripcion: 'Roba una Vespa Primavera', cumple: (e) => e.vespas >= 1, medida: (e) => e.vespas, objetivo: 1 },
  { id: 'patadon', nombre: 'Patadón', descripcion: 'Veinticinco patadas a pie', cumple: (e) => e.patadas >= 25, medida: (e) => e.patadas, objetivo: 25 },
  { id: 'radar', nombre: 'Cazado por el radar', descripcion: 'Tres fotos de radar', cumple: (e) => e.multas >= 3, medida: (e) => e.multas, objetivo: 3 },
  { id: 'guiris', nombre: 'Atracción turística', descripcion: '100 € de propinas de los guiris', cumple: (e) => e.propinas >= 100, medida: (e) => e.propinas, objetivo: 100 },
  { id: 'mil', nombre: 'Mil euros', descripcion: 'Gana 1.000 € en total', cumple: (e) => e.dineroTotal >= 1000, medida: (e) => e.dineroTotal, objetivo: 1000 },
  { id: 'km', nombre: 'Diez kilómetros', descripcion: 'Recorre 10 km', cumple: (e) => e.metros >= 10000, medida: (e) => e.metros, objetivo: 10000 },
  { id: 'trincao', nombre: 'Cliente habitual', descripcion: 'Que te trinquen 3 veces', cumple: (e) => e.trincados >= 3, medida: (e) => e.trincados, objetivo: 3 },
  { id: 'rio', nombre: 'Al Guadalquivir', descripcion: 'Un chapuzón en el río', cumple: (e) => e.chapuzones >= 1, medida: (e) => e.chapuzones, objetivo: 1 },
  { id: 'rojo', nombre: 'Foto multa', descripcion: 'Sáltate 5 semáforos en rojo', cumple: (e) => e.semaforos >= 5, medida: (e) => e.semaforos, objetivo: 5 },
  { id: 'mecheros', nombre: 'Coleccionista', descripcion: 'Recoge 30 mecheros', cumple: (e) => e.mecheros >= 30, medida: (e) => e.mecheros, objetivo: 30 },
  { id: 'rey', nombre: 'Rey del barrio', descripcion: 'Los 20 mecheros de un barrio', cumple: (e) => e.barriosCompletos >= 1, medida: (e) => e.barriosCompletos, objetivo: 1 },
  { id: 'atropellos', nombre: 'Que era el del quinto', descripcion: 'Atropella a 25 vecinos', cumple: (e) => e.atropellos >= 25, medida: (e) => e.atropellos, objetivo: 25 },
  { id: 'gol', nombre: '¡Gooool!', descripcion: 'Mete un gol en una pachanga', cumple: (e) => e.goles >= 1, medida: (e) => e.goles, objetivo: 1 },
  { id: 'pichichi', nombre: 'Pichichi del pasaje', descripcion: 'Diez goles', cumple: (e) => e.goles >= 10, medida: (e) => e.goles, objetivo: 10 },
  { id: 'sevici', nombre: 'Carril bici', descripcion: 'Tira a 5 del Sevici', cumple: (e) => e.ciclistas >= 5, medida: (e) => e.ciclistas, objetivo: 5 },
  { id: 'taller', nombre: 'Tubarro', descripcion: 'Compra una mejora en el taller', cumple: (e) => e.mejoras >= 1, medida: (e) => e.mejoras, objetivo: 1 },
  { id: 'tuneada', nombre: 'Tuneá', descripcion: 'Doce mejoras del taller', cumple: (e) => e.mejoras >= 12, medida: (e) => e.mejoras, objetivo: 12 },
  { id: 'reventon', nombre: 'Petó la Jog', descripcion: 'Revienta un vehículo', cumple: (e) => e.reventones >= 1, medida: (e) => e.reventones, objetivo: 1 },
  { id: 'taxista', nombre: 'Taxista', descripcion: 'Cinco carreras de taxi', cumple: (e) => e.carrerasTaxi >= 5, medida: (e) => e.carrerasTaxi, objetivo: 5 },
  { id: 'tele_taxi', nombre: 'Tele Taxi', descripcion: 'Veinticinco carreras de taxi', cumple: (e) => e.carrerasTaxi >= 25, medida: (e) => e.carrerasTaxi, objetivo: 25 },
  { id: 'conductor13', nombre: 'Conductor del 13', descripcion: 'Treinta pasajeros en el 13', cumple: (e) => e.pasajeros >= 30, medida: (e) => e.pasajeros, objetivo: 30 },
  { id: 'vecina', nombre: 'La vecina del quinto', descripcion: 'Que te dé una maceta desde la azotea', cumple: (e) => e.macetazos >= 1, medida: (e) => e.macetazos, objetivo: 1 },
  { id: 'levantada', nombre: 'Así es el barrio', descripcion: 'Recupera una moto que te han levantado', cumple: (e) => e.motosRecuperadas >= 1, medida: (e) => e.motosRecuperadas, objetivo: 1 },
  { id: 'chapa', nombre: 'Como nueva', descripcion: 'Pasa por chapa y pintura', cumple: (e) => e.chapas >= 1, medida: (e) => e.chapas, objetivo: 1 },
  { id: 'truco', nombre: 'Trescientos sesenta', descripcion: 'Un giro completo en el aire', cumple: (e) => e.trucos >= 1, medida: (e) => e.trucos, objetivo: 1 },
  { id: 'manguerazo', nombre: 'Manguerazo', descripcion: 'Que vengan los bomberos a apagar tu moto', cumple: (e) => e.bomberos >= 1, medida: (e) => e.bomberos, objetivo: 1 },
  { id: 'el061', nombre: 'El 061 ya te conoce', descripcion: 'Tres salidas de la ambulancia por tu culpa', cumple: (e) => e.ambulancias >= 3, medida: (e) => e.ambulancias, objetivo: 3 },
  { id: 'semaforo_pique', nombre: 'Pique de semáforo', descripcion: 'Acepta un pique callejero de un motero', cumple: (e) => e.piquesCallejeros >= 1, medida: (e) => e.piquesCallejeros, objetivo: 1 },
  { id: 'lipasam', nombre: 'Empleado del mes de Lipasam', descripcion: 'Recoge 20 contenedores con el camión', cumple: (e) => e.contenedores >= 20, medida: (e) => e.contenedores, objetivo: 20 },
  { id: 'derrapador', nombre: 'Rey del derrape', descripcion: 'Diez derrapadas largas', cumple: (e) => e.derrapadas >= 10, medida: (e) => e.derrapadas, objetivo: 10 },
  { id: 'caballito', nombre: 'A una rueda', descripcion: 'Un caballito de más de 2 s', cumple: (e) => e.caballitoMaximo >= 2, medida: (e) => e.caballitoMaximo, objetivo: 2 },
  { id: 'pelos', nombre: 'Por los pelos', descripcion: 'Veinticinco pasadas rozando sin tocar', cumple: (e) => e.porLosPelos >= 25, medida: (e) => e.porLosPelos, objetivo: 25 },
  { id: 'contramano', nombre: 'Contramano', descripcion: 'Cinco tramos en dirección prohibida', cumple: (e) => e.contramanos >= 5, medida: (e) => e.contramanos, objetivo: 5 },
  { id: 'escobazo', nombre: 'Escobazo', descripcion: 'Que el camarero te dé con la escoba', cumple: (e) => e.escobazos >= 1, medida: (e) => e.escobazos, objetivo: 1 },
  { id: 'devuelta', nombre: 'Era de su primo', descripcion: 'Que un motero recupere su moto', cumple: (e) => e.motosDevueltas >= 1, medida: (e) => e.motosDevueltas, objetivo: 1 },
  { id: 'reto', nombre: 'Reto del día', descripcion: 'Cumple un reto del día', cumple: (e) => e.retos >= 1, medida: (e) => e.retos, objetivo: 1 },
  { id: 'retos', nombre: 'Uno detrás de otro', descripcion: 'Diez retos del día', cumple: (e) => e.retos >= 10, medida: (e) => e.retos, objetivo: 10 },
  { id: 'piscina', nombre: 'Bomba', descripcion: 'Un chapuzón en una piscina o una fuente con la moto', cumple: (e) => e.piscinas >= 1, medida: (e) => e.piscinas, objetivo: 1 },
  { id: 'columpio', nombre: 'Parque infantil', descripcion: 'Derriba un columpio o un tobogán', cumple: (e) => e.parquesInfantiles >= 1, medida: (e) => e.parquesInfantiles, objetivo: 1 },
  { id: 'butanero', nombre: '¡El butanero!', descripcion: 'Tira diez bombonas del camión del butano', cumple: (e) => e.bombonas >= 10, medida: (e) => e.bombonas, objetivo: 10 },
  { id: 'botellon', nombre: 'Aguafiestas', descripcion: 'Disuelve un botellón pasando por medio', cumple: (e) => e.botellones >= 1, medida: (e) => e.botellones, objetivo: 1 },
  { id: 'escalerazo', nombre: 'Escalerazo', descripcion: 'Baja cinco escaleras con la moto', cumple: (e) => e.escaleras >= 5, medida: (e) => e.escaleras, objetivo: 5 },
  { id: 'aficion', nombre: 'Día de partido', descripcion: 'Dispersa a la afición a la puerta del estadio', cumple: (e) => e.aficiones >= 1, medida: (e) => e.aficiones, objetivo: 1 },
  { id: 'sevici_sin_tarjeta', nombre: 'Sin tarjeta', descripcion: 'Quítale el Sevici a un ciclista y pedalea', cumple: (e) => e.sevicis >= 1, medida: (e) => e.sevicis, objetivo: 1 },
  { id: 'sacado', nombre: 'Que lo estoy pagando', descripcion: 'Que el dueño te saque de su coche', cumple: (e) => e.sacados >= 1, medida: (e) => e.sacados, objetivo: 1 },
  { id: 'once', nombre: 'Para hoy, para hoy', descripcion: 'Compra cinco cupones de la ONCE', cumple: (e) => e.cupones >= 5, medida: (e) => e.cupones, objetivo: 5 },
  { id: 'tocado', nombre: 'Le tocó al Wifly', descripcion: 'Gana 200 € o más en los sorteos', cumple: (e) => e.premiosOnce >= 200, medida: (e) => e.premiosOnce, objetivo: 200 },
  { id: 'calor', nombre: 'Qué calor, mi arma', descripcion: 'Un chapuzón con la moto en plena ola de calor', cumple: (e) => e.chapuzonesCalor >= 1, medida: (e) => e.chapuzonesCalor, objetivo: 1 },
  { id: 'stoppie', nombre: 'Stoppie', descripcion: 'Diez stoppies (frenazo recto con el trasero en el aire)', cumple: (e) => e.stoppies >= 10, medida: (e) => e.stoppies, objetivo: 10 },
  { id: 'bolsas', nombre: 'Lipasam te odia', descripcion: 'Revienta 30 bolsas de basura', cumple: (e) => e.bolsas >= 30, medida: (e) => e.bolsas, objetivo: 30 },
  { id: 'paquete', nombre: 'De paquete', descripcion: 'Lleva a cinco colegas de paquete a donde te digan', cumple: (e) => e.paquetes >= 5, medida: (e) => e.paquetes, objetivo: 5 },
  { id: 'pilla', nombre: '¡A que no me pillas!', descripcion: 'Gana tres pilla-pillas a los canis en moto', cumple: (e) => e.pillados >= 3, medida: (e) => e.pillados, objetivo: 3 },
  { id: 'caramelos', nombre: 'Bolsillo de caramelos', descripcion: 'Que los nazarenos te den 20 caramelos', cumple: (e) => e.caramelos >= 20, medida: (e) => e.caramelos, objetivo: 20 },
  { id: 'minimoto', nombre: 'Pocket bike', descripcion: 'Roba una minimoto', cumple: (e) => e.minimotos >= 1, medida: (e) => e.minimotos, objetivo: 1 },
  { id: 'cofrade', nombre: 'Cofrade de Pino Montano', descripcion: 'Párate a ver pasar el paso', cumple: (e) => e.respetos >= 1, medida: (e) => e.respetos, objetivo: 1 },
  { id: 'sinrespeto', nombre: 'Ni un respeto', descripcion: 'Cuélate tres veces por medio de la cofradía', cumple: (e) => e.cruzadas >= 3, medida: (e) => e.cruzadas, objetivo: 3 },
  { id: 'lluvia', nombre: 'En Sevilla también llueve', descripcion: 'Recorre 1.000 m bajo la lluvia', cumple: (e) => e.metrosLluvia >= 1000, medida: (e) => Math.round(e.metrosLluvia), objetivo: 1000 },
  { id: 'charcos', nombre: 'Chof', descripcion: 'Salpica a diez vecinos pisando charcos', cumple: (e) => e.salpicados >= 10, medida: (e) => e.salpicados, objetivo: 10 },
  { id: 'gatos', nombre: 'Espantagatos', descripcion: 'Espanta 15 gatos de los coches y los bancos', cumple: (e) => e.gatos >= 15, medida: (e) => e.gatos, objetivo: 15 },
  { id: 'palomas', nombre: 'Espantapalomas', descripcion: 'Espanta 25 bandadas de palomas', cumple: (e) => e.palomas >= 25, medida: (e) => e.palomas, objetivo: 25 },
  { id: 'comitiva', nombre: 'Perreo en el pasaje', descripcion: 'Una comitiva de cinco canis detrás del altavoz', cumple: (e) => e.comitivaMaximo >= 5, medida: (e) => e.comitivaMaximo, objetivo: 5 },
  { id: 'dj', nombre: 'El DJ del barrio', descripcion: 'Veinte canis que se apuntan a tu comitiva', cumple: (e) => e.comitiva >= 20, medida: (e) => e.comitiva, objetivo: 20 },
  { id: 'salida', nombre: 'Salida de semáforo', descripcion: 'Gánale la salida a cinco coches al ponerse verde', cumple: (e) => e.salidas >= 5, medida: (e) => e.salidas, objetivo: 5 },
  { id: 'acrobata', nombre: 'Acróbata del pasaje', descripcion: 'Veinte trucos en el aire', cumple: (e) => e.trucos >= 20, medida: (e) => e.trucos, objetivo: 20 },
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
