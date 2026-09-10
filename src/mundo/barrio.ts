// Un barrio cargado: su escena, su mundo físico y todo lo que vive en él. Cambiar de barrio
// es destruir este objeto y crear otro; el jugador (moto, Wifly) se recrea en el nuevo mundo.
import * as THREE from 'three';
import { MundoFisico } from '../fisica/mundo';
import { Coche, COLORES_COCHE } from '../fisica/coche';
import { MODELOS, Scooter } from '../fisica/scooter';
import { construirArboles, construirAzoteas } from './azoteas';
import { GrafoBarrio } from './grafo';
import { cargarNivel, construirBarrio } from './nivel';
import { Mecheros } from './mecheros';
import { Paradas, type Parada } from './paradas';
import { Rotulos } from './rotulos';
import { construirVentanas } from './ventanas';
import { Circuito } from './circuito';
import { Rampas } from './rampas';
import { azar } from './geometria';
import { generarRuta, type RutaCarrera } from '../carreras';
import { Vecinos } from './peatones';
import { Trafico } from './trafico';
import { Trastos } from './trastos';
import { Semaforos } from './semaforos';
import { Encargos } from './encargos';
import { Pachangas } from './pachangas';
import { Sevici } from './sevici';
import { Perros } from './perros';
import { MotosCalle } from './motosCalle';
import { Rivales } from './rivales';
import { Pintadas } from './pintadas';
import { construirFarolas } from './farolas';
import { localesConNombre, type Local } from '../recados';
import type { Nivel } from './tipos';
import { Patrullas } from '../policia/patrullas';
import type { FichaBarrio } from './barrios';
import { rutaNivel } from './barrios';
import type { Calidad } from '../juego';

export class Barrio {
  readonly grupo = new THREE.Group();
  readonly grafo: GrafoBarrio;
  readonly trastos: Trastos;
  readonly vecinos: Vecinos;
  readonly trafico: Trafico;
  readonly patrullas: Patrullas;
  readonly mecheros: Mecheros;
  readonly paradas: Paradas;
  readonly rotulos: Rotulos;
  readonly ventanas: THREE.Group;
  readonly circuito: Circuito;
  readonly rampas: Rampas;
  readonly semaforos: Semaforos;
  /** Locales con nombre real (puerta en la calle) y los que tienen encargo para repartir. */
  readonly locales: Local[];
  readonly encargos: Encargos;
  readonly pachangas: Pachangas;
  readonly sevici: Sevici;
  readonly perros: Perros;
  readonly motosCalle: MotosCalle;
  readonly rivales: Rivales;
  readonly pintadas: Pintadas;
  /** Charcos de luz de las farolas: solo visibles de noche. */
  readonly farolasLuz: THREE.Group;
  /** Carreras del barrio: nodo de salida y su ruta fija. */
  readonly carreras: { salida: number; ruta: RutaCarrera }[] = [];
  readonly scooters: Scooter[] = [];
  readonly coches: Coche[] = [];
  readonly arranque: { x: number; z: number; rumbo: number };

  private constructor(readonly ficha: FichaBarrio, readonly nivel: Nivel, readonly fisica: MundoFisico, calidad: Calidad, escena: THREE.Scene) {
    this.grafo = new GrafoBarrio(nivel.grafo);
    const construido = construirBarrio(nivel, { bordes: calidad === 'alta', ligero: calidad === 'baja' });
    this.grupo.add(construido.grupo, construirAzoteas(nivel));
    const arboles = construirArboles(nivel);
    this.grupo.add(arboles.grupo);
    const farolas = construirFarolas(nivel, arboles.posiciones);
    this.grupo.add(farolas.postes, farolas.luces);
    this.farolasLuz = farolas.luces;
    fisica.crearSueloYLimites(nivel.tamano[0], nivel.tamano[1]);
    fisica.crearEdificios(construido.colisionEdificios.vertices, construido.colisionEdificios.indices);

    this.trastos = new Trastos(fisica);
    this.trastos.poblar(nivel, [...arboles.posiciones, ...farolas.posiciones]);
    this.grupo.add(this.trastos.grupo);
    this.vecinos = new Vecinos(this.grafo, ficha.poblacion.vecinos, this.trastos.asientos, ficha.tribu);
    this.grupo.add(this.vecinos.grupo);
    this.trafico = new Trafico(fisica, this.grafo, ficha.poblacion.trafico, ficha.poblacion.buses, nivel.pois.filter((p) => p.clase === 'bus_stop'), 1);
    this.grupo.add(this.trafico.grupo);
    this.semaforos = new Semaforos(nivel);
    this.trafico.semaforos = this.semaforos;
    this.grupo.add(this.semaforos.grupo);
    this.patrullas = new Patrullas(fisica, this.grafo);
    this.grupo.add(this.patrullas.grupo);
    this.mecheros = new Mecheros(nivel, ficha.id);
    this.grupo.add(this.mecheros.grupo);
    this.paradas = new Paradas(nivel, ficha.destinos13);
    this.grupo.add(this.paradas.grupo);
    this.rotulos = new Rotulos(nivel);
    this.grupo.add(this.rotulos.grupo);
    this.ventanas = construirVentanas(nivel);
    this.grupo.add(this.ventanas);

    // Arranque: en la calle rodada más cercana a la parada donde te deja el 13 (o al centro
    // de la caja si no hay parada), mirando a lo largo de ella.
    const llegada = this.paradaLlegada;
    const nodoInicio = this.grafo.masCercano(llegada?.x ?? 0, llegada?.z ?? 0, 'rodada');
    const [ix, iz] = this.grafo.nodos[nodoInicio] ?? [0, 0];
    const vecino = this.grafo.vecinos(nodoInicio, 'rodada')[0];
    const [vx, vz] = vecino ? this.grafo.nodos[vecino.nodo]! : [ix, iz - 1];
    this.arranque = { x: ix, z: iz, rumbo: Math.atan2(vx - ix, -(vz - iz)) };

    this.aparcarScooters(ficha.poblacion.motos);
    this.aparcarCoches(ficha.poblacion.coches);

    // Carreras: dos salidas por barrio (una cerca de la parada y otra lejos) con ruta fija.
    const objetivos: [number, number][] = [[this.arranque.x + 40, this.arranque.z + 10], [this.arranque.x - 130, this.arranque.z - 90], [this.arranque.x + 120, this.arranque.z + 120]];
    for (const [ox, oz] of objetivos) {
      if (this.carreras.length >= 2) break;
      const salida = this.grafo.masCercano(ox, oz, 'peatonal');
      if (salida < 0 || this.carreras.some((c) => c.salida === salida)) continue;
      const ruta = generarRuta(this.grafo, salida, 6, azar(1100 + this.carreras.length * 17 + ficha.id.length));
      if (ruta) this.carreras.push({ salida, ruta });
    }
    this.circuito = new Circuito(this.grafo, this.carreras.map((c) => c.salida));
    this.grupo.add(this.circuito.grupo);
    // Recadero: locales con nombre; el encargo se coge en tres de ellos, repartidos por el barrio.
    this.locales = localesConNombre(nivel.pois, (p) => this.grafo.nodos[this.grafo.masCercano(p.x, p.z)] ?? [p.x, p.z]);
    const conEncargo: Local[] = [];
    for (const l of [...this.locales].sort((a, b) => Math.hypot(a.x - this.arranque.x, a.z - this.arranque.z) - Math.hypot(b.x - this.arranque.x, b.z - this.arranque.z))) {
      if (conEncargo.length >= 3) break;
      if (Math.hypot(l.x - this.arranque.x, l.z - this.arranque.z) < 25) continue;
      if (conEncargo.some((c) => Math.hypot(c.x - l.x, c.z - l.z) < 110)) continue;
      if (this.carreras.some((c) => { const [x, z] = this.grafo.nodos[c.salida] ?? [0, 0]; return Math.hypot(x - l.x, z - l.z) < 12; })) continue;
      if (this.scooters.some((m) => Math.hypot(m.estado.x - l.x, m.estado.z - l.z) < 3.5)) continue;
      conEncargo.push(l);
    }
    this.encargos = new Encargos(conEncargo);
    this.grupo.add(this.encargos.grupo);
    // Pachangas: niños con balón en los campitos y pasajes anchos, lejos de lo demás.
    const evitar: [number, number][] = [[this.arranque.x, this.arranque.z], ...this.carreras.map((c) => this.grafo.nodos[c.salida] ?? [0, 0] as [number, number]), ...conEncargo.map((l) => [l.x, l.z] as [number, number]), ...this.paradas.lista.map((p) => [p.x, p.z] as [number, number])];
    this.pachangas = new Pachangas(fisica, nivel, 4, evitar);
    this.grupo.add(this.pachangas.grupo);
    this.sevici = new Sevici(nivel, ficha.poblacion.sevici);
    this.grupo.add(this.sevici.grupo);
    this.perros = new Perros(this.grafo, ficha.poblacion.perros);
    this.grupo.add(this.perros.grupo);
    this.motosCalle = new MotosCalle(this.grafo, ficha.poblacion.motosCalle);
    this.grupo.add(this.motosCalle.grupo);
    this.rivales = new Rivales(this.grafo);
    this.grupo.add(this.rivales.grupo);
    this.pintadas = new Pintadas(nivel, this.grafo, ficha.id);
    this.grupo.add(this.pintadas.grupo);
    this.rampas = new Rampas(fisica, nivel, 6, [...this.carreras.map((c) => this.grafo.nodos[c.salida] ?? [0, 0] as [number, number]), [this.arranque.x, this.arranque.z]]);
    this.grupo.add(this.rampas.grupo);
    escena.add(this.grupo);
  }

  static async cargar(ficha: FichaBarrio, calidad: Calidad, escena: THREE.Scene): Promise<Barrio> {
    const [nivel, fisica] = await Promise.all([cargarNivel(rutaNivel(ficha.id)), MundoFisico.crear()]);
    return new Barrio(ficha, nivel, fisica, calidad, escena);
  }

  /** Motos aparcadas para robar: junto a bares, mercado, farmacias, bancos, colegios. */
  private aparcarScooters(cuantas: number): void {
    const rnd = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const sitios = this.nivel.pois.filter((p) => ['bar', 'cafe', 'restaurant', 'marketplace', 'supermarket', 'pharmacy', 'bank', 'library', 'school'].includes(p.clase));
    let i = 0;
    for (const sitio of sitios) {
      if (i >= cuantas) break;
      const nodo = this.grafo.masCercano(sitio.x, sitio.z, 'peatonal');
      const [nx, nz] = this.grafo.nodos[nodo] ?? [sitio.x, sitio.z];
      const x = nx + (rnd(i) - 0.5) * 3, z = nz + (rnd(i + 50) - 0.5) * 3;
      if (Math.hypot(x - this.arranque.x, z - this.arranque.z) < 6) continue;
      if (this.scooters.some((m) => Math.hypot(m.estado.x - x, m.estado.z - z) < 3)) continue;
      const moto = new Scooter(this.fisica, x, z, rnd(i + 100) * Math.PI * 2, MODELOS[(i + 1) % MODELOS.length]!);
      this.scooters.push(moto);
      this.grupo.add(moto.malla);
      i++;
    }
  }

  /** Coches aparcados en el arcén de las calles rodadas. */
  private aparcarCoches(cuantos: number): void {
    const rnd = (n: number) => ((Math.sin(n * 78.233) * 43758.5453) % 1 + 1) % 1;
    let i = 0;
    for (const via of this.nivel.vias) {
      if (via.clase !== 'rodada' || via.tipo === 'service' || i >= cuantos) continue;
      if (rnd(via.id) > 0.45) continue;
      const [ax, az] = via.puntos[0]!;
      const [bx, bz] = via.puntos[1] ?? via.puntos[0]!;
      const dx = bx - ax, dz = bz - az;
      const l = Math.hypot(dx, dz) || 1;
      if (l < 12) continue;
      const ux = dx / l, uz = dz / l;
      const lado = via.ancho / 2 + 1.3;
      const x = ax + ux * (5 + rnd(via.id + 1) * (l - 10)) - uz * lado;
      const z = az + uz * (5 + rnd(via.id + 1) * (l - 10)) + ux * lado;
      const coche = new Coche(this.fisica, x, z, Math.atan2(ux, -uz), COLORES_COCHE[Math.floor(rnd(via.id + 2) * COLORES_COCHE.length)]!);
      this.coches.push(coche);
      this.grupo.add(coche.malla);
      i++;
    }
  }

  /** La parada del 13 donde te deja el bus (por trozo del nombre; si no, la más cercana al centro). */
  get paradaLlegada(): Parada | null {
    const buscada = this.ficha.paradaLlegada.toLowerCase();
    return this.paradas.lista.find((p) => p.nombre.toLowerCase().includes(buscada)) ?? this.paradas.masCercana(0, 0);
  }

  /** Dirección de la calle rodada más cercana a un punto (para orientar el bus). */
  direccionCalle(x: number, z: number): { x: number; z: number } {
    let mejor = { d: Infinity, x: 0, z: -1 };
    for (const via of this.nivel.vias) {
      if (via.clase !== 'rodada') continue;
      for (let i = 0; i + 1 < via.puntos.length; i++) {
        const [ax, az] = via.puntos[i]!;
        const [bx, bz] = via.puntos[i + 1]!;
        const l = Math.hypot(bx - ax, bz - az) || 1;
        const d = Math.hypot((ax + bx) / 2 - x, (az + bz) / 2 - z);
        if (d < mejor.d) mejor = { d, x: (bx - ax) / l, z: (bz - az) / l };
      }
    }
    return { x: mejor.x, z: mejor.z };
  }

  destruir(escena: THREE.Scene): void {
    escena.remove(this.grupo);
    this.grupo.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        const m = o.material as THREE.Material & { map?: THREE.Texture | null };
        if (m.map) { m.map.dispose(); m.dispose(); }
      }
    });
    this.fisica.world.free();
  }
}
