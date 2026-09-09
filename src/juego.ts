// El juego: escena, bucle, física y sincronización entre módulos. El barrio cargado vive en
// un `Barrio` (escena + física + población); cambiar de barrio es destruirlo y crear otro.
import * as THREE from 'three';
import { CamaraAlta } from './camara';
import { Controles } from './control/entrada';
import { PASO_FISICA } from './fisica/mundo';
import { MODELOS, Scooter } from './fisica/scooter';
import { Peaton } from './fisica/peaton';
import { BUS, Coche, UTILITARIO, geometriaFurgoneta } from './fisica/coche';
import { BUS_ANCHO, BUS_ESCALA, BUS_LARGO } from './mundo/trafico';
import { geometriaBus } from './cinematica';
import { viaMasCercana } from './mundo/grafo';
import { COLORES } from './mundo/nivel';
import { dentroDePoligono } from './mundo/geometria';
import { Hud } from './ui/hud';
import { AudioJuego } from './audio/motor';
import { cargarPartida, guardarPartida } from './guardado';
import { FRASES, ROMPIBLES } from './mundo/trastos';
import { Trozos } from './efectos/trozos';
import { MarcasNeumatico } from './efectos/marcas';
import { Particulas } from './efectos/particulas';
import { MarcadorJugador } from './efectos/marcador';
import { NivelBusqueda } from './policia/busqueda';
import { Helicoptero } from './policia/helicoptero';
import { Cielo } from './mundo/cielo';
import { TOTAL_MECHEROS } from './mundo/mecheros';
import { Barrio } from './mundo/barrio';
import { PENDIENTE } from './mundo/rampas';
import { BARRIO_INICIAL, BARRIOS } from './mundo/barrios';
import { Cinematica13 } from './cinematica';
import { Contador, Garaje } from './estadisticas';
import { Carrera, Records, formatearTiempo, premio } from './carreras';
import { Recadero, elegirDestino, premioRecado } from './recados';
import type { Mejora } from './taller';
import { Logros } from './logros';
import { Repeticion } from './efectos/repeticion';
import { Foto } from './ui/foto';
import { Taller, aplicarMejoras } from './taller';
import { Menu, type Pestana } from './ui/menu';
import { Minimapa } from './ui/minimapa';

declare global {
  interface Window {
    __pv_frames: number;
    __pv_listo: boolean;
    __pv_jugando: boolean;
    __pv_info: () => unknown;
    __pv_escena: THREE.Scene;
    __pv_barrios: Record<string, unknown>;
    __pv_prueba: { robarCoche: () => boolean; calor: (n: number) => void; hora: (h: number) => void; viajar: (destino?: string) => Promise<string>; barrio: () => string; irA: (x: number, z: number, rumbo?: number) => void; carreras: () => [number, number][][]; dinero: (n: number) => void; ajustes: () => unknown; helicoptero: () => unknown; sevici: () => unknown; pachangas: () => unknown; recado: () => unknown; semaforos: () => unknown; rampas: () => { x: number; z: number; rumbo: number }[]; carrera: () => unknown; trastos: (tipo: string) => [number, number][]; robarBus: () => boolean; empujar: (vx: number, vz: number) => void; forzarEje: (x: number, y: number) => void };
  }
}

export type Calidad = 'alta' | 'media' | 'baja';
const CLAVE_CALIDAD = 'pinoloko.calidad';

const SIN_ENTRADA = { eje: { x: 0, y: 0 }, freno: true, accion: false };
const PASO_MAXIMO = 1 / 20;
const RADIO_PARADA = 5;

const esCalidad = (v: string | null): v is Calidad => v === 'alta' || v === 'media' || v === 'baja';

/**
 * Calidad gráfica: `?calidad=` manda, luego la elegida en el menú (guardada), y si no, se
 * decide sola: sin GPU (SwiftShader, llvmpipe) baja; móvil (táctil y pantalla pequeña) media;
 * el resto alta. Alta: sombras de 1024, antialias, DPR hasta 1,5 y bordes en los edificios.
 * Media: sombras de 512, sin antialias, DPR 1 y sin bordes. Baja: sin sombras y a DPR 0,5.
 */
function detectarCalidad(): Calidad {
  const forzada = new URLSearchParams(location.search).get('calidad');
  if (esCalidad(forzada)) return forzada;
  const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
  if (!gl) return 'baja';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const nombre = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software|mesa offscreen/i.test(nombre)) return 'baja';
  let guardada: string | null = null;
  try { guardada = localStorage.getItem(CLAVE_CALIDAD); } catch { /* sin almacenamiento */ }
  if (esCalidad(guardada)) return guardada;
  const movil = navigator.maxTouchPoints > 0 && Math.min(window.innerWidth, window.innerHeight) < 900;
  return movil ? 'media' : 'alta';
}

/** Guarda la calidad elegida en el menú y recarga: el barrio se construye distinto según ella. */
export function elegirCalidad(c: Calidad): void {
  try { localStorage.setItem(CLAVE_CALIDAD, c); } catch { /* sin almacenamiento */ }
  const url = new URL(location.href);
  url.searchParams.delete('calidad');
  location.href = url.toString();
}

export class Juego {
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara: CamaraAlta;
  private controles: Controles;
  private hud = new Hud();
  private audio = new AudioJuego();
  private barrio!: Barrio;
  private scooter!: Scooter;
  private peaton!: Peaton;
  private coche: Coche | null = null;
  private sol!: THREE.DirectionalLight;
  private acumulador = 0;
  private ultimoTiempo = 0;
  private jugando = false;
  private dinero = 0;
  private tiempoGuardado = 0;
  private tiempoCalle = 0;
  private lienzo: HTMLCanvasElement;
  private marcas = new MarcasNeumatico();
  private particulas = new Particulas();
  private trozos = new Trozos();
  private marcador = new MarcadorJugador();
  private busqueda = new NivelBusqueda();
  private tiempoTrincao = 0;
  private motosRobadas = new Set<Scooter>();
  private rndPolicia = () => Math.random();
  private cielo!: Cielo;
  private cine = new Cinematica13();
  private cargandoBarrio = false;
  private faros = new THREE.Group();
  private colorHumo = new THREE.Color('#5a5a5a');
  private colorFuego = new THREE.Color('#ff7a1a');
  private tiempoClaxon = 0;
  private reventado = new Set<Scooter | Coche>();
  private racha = 0;
  private tiempoRacha = 0;
  private colorChispa = new THREE.Color('#ffd166');
  private colorPolvo = new THREE.Color('#d8c9a8');
  private aPie = false;
  private botonAccion = document.getElementById('boton-accion')!;
  private tiempoInsulto = 0;
  private enParada = false;
  private destinoViaje = BARRIO_INICIAL;
  private tiempoControl = 4;
  private carrera = new Carrera();
  private records = new Records();
  private indiceCarrera = -1;
  private enfriamientoCarrera = 0;
  private tiempoAire = 0;
  private enAire = false;
  private contador = new Contador();
  private garaje = new Garaje();
  private logros = new Logros();
  private taller = new Taller();
  private tiempoLogros = 0;
  private repeticion = new Repeticion();
  private foto: Foto;
  private tiempoGolNinos = 0;
  private horaCampanas = -1;
  /** Pistas que ya se han enseñado (una vez por partida guardada). */
  private pistas = new Set<string>(Juego.leerPistas());
  private tiempoParado = 0;
  private helicoptero = new Helicoptero();
  private tiempoTimbre = 0;
  /** `?vibrar=0` la apaga; la vibración solo existe en móviles. */
  private conVibracion = new URLSearchParams(location.search).get('vibrar') !== '0' && typeof navigator.vibrate === 'function';
  private menu: Menu;
  private minimapa = new Minimapa();
  /** `?minimapa=0` lo apaga del todo (para medir su coste en la sonda). */
  private sinMinimapa = new URLSearchParams(location.search).get('minimapa') === '0';
  private pausado = false;
  /** Copia de `renderer.info.render` justo tras la pasada principal (la del minimapa la pisa). */
  private infoRender = { calls: 0, triangles: 0 };
  private ultimaPos = new THREE.Vector3();
  private tiempoSemaforo = 0;
  private recadero = new Recadero();
  private enfriamientoRecado = 0;
  readonly calidad: Calidad;

  constructor() {
    this.lienzo = document.getElementById('lienzo') as HTMLCanvasElement;
    this.calidad = detectarCalidad();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.lienzo, antialias: this.calidad === 'alta', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.calidad === 'baja' ? 0.5 : this.calidad === 'media' ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = this.calidad !== 'baja';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.escena.background = new THREE.Color(COLORES.cielo);
    this.camara = new CamaraAlta(window.innerWidth / window.innerHeight);
    this.camara.redimensionar(window.innerWidth / window.innerHeight);
    this.controles = new Controles(
      document.getElementById('joystick')!,
      document.getElementById('joystick-bola')!,
      document.getElementById('boton-freno')!,
      document.getElementById('boton-accion')!,
      document.getElementById('boton-claxon')!,
    );
    window.addEventListener('resize', () => this.redimensionar());
    this.menu = new Menu({
      modelos: MODELOS,
      garaje: this.garaje,
      contador: this.contador,
      logros: this.logros,
      alElegirMoto: (i) => this.cambiarMoto(i),
      alNuevaPartida: () => this.nuevaPartida(),
      alCerrar: () => { this.pausado = false; },
      calidad: this.calidad,
      alElegirCalidad: (c) => { this.guardar(); elegirCalidad(c); },
      taller: this.taller,
      dinero: () => this.dinero,
      alComprar: (mejora) => this.comprarMejora(mejora),
    });
    document.getElementById('boton-menu')!.addEventListener('click', () => this.abrirMenu());
    this.foto = new Foto(this.lienzo, () => `${this.hud.calleActual} · ${this.cielo.textoHora} · ${this.barrio.ficha.nombre.split(' ·')[0]}`, (t) => this.hud.avisar(t, 1.2));
    document.getElementById('boton-foto')!.addEventListener('click', () => { if (this.jugando && !this.pausado) this.foto.pedir(); });
    for (const b of document.querySelectorAll<HTMLElement>('#portada [data-menu]')) b.addEventListener('click', () => this.menu.abrir(b.dataset['menu'] as Pestana));
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && this.jugando) { this.minimapa.alternar(); return; }
      if (e.code === 'KeyP' && this.jugando && !this.pausado) { this.foto.pedir(); return; }
      if (e.code !== 'Escape') return;
      if (this.menu.abierto) this.menu.cerrar();
      else if (this.jugando) this.abrirMenu();
    });
    window.__pv_frames = 0;
    window.__pv_listo = false;
    window.__pv_jugando = false;
  }

  async cargar(): Promise<void> {
    this.escena.add(this.marcas.malla, this.particulas.puntos, this.trozos.malla, this.marcador.grupo, this.cine.bus, this.helicoptero.grupo);

    // Luz: hemisferio cálido y un sol con sombras suaves que sigue al jugador.
    const ambiente = new THREE.HemisphereLight('#ffffff', '#c9b69a', 0.85);
    this.escena.add(ambiente);
    this.sol = new THREE.DirectionalLight('#fff3dc', 1.6);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(this.calidad === 'alta' ? 1024 : 512, this.calidad === 'alta' ? 1024 : 512);
    const s = 95;
    this.sol.shadow.camera.left = -s;
    this.sol.shadow.camera.right = s;
    this.sol.shadow.camera.top = s;
    this.sol.shadow.camera.bottom = -s;
    this.sol.shadow.camera.near = 10;
    this.sol.shadow.camera.far = 260;
    this.sol.shadow.bias = -0.0008;
    this.sol.shadow.normalBias = 0.05;
    this.escena.add(this.sol, this.sol.target);
    this.cielo = new Cielo(this.escena, this.sol, ambiente);

    // Faros: dos conos de luz que se ven de noche delante del vehículo.
    const materialFaro = new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const lado of [-0.5, 0.5]) {
      const cono = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 8, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -5), materialFaro);
      cono.position.set(lado, 0.3, -0.5);
      this.faros.add(cono);
    }
    this.faros.visible = false;
    this.escena.add(this.faros);

    // Partida guardada: barrio, posición, dinero y hora. `?barrio=` fuerza uno para probarlo.
    const partida = cargarPartida();
    const forzado = new URLSearchParams(location.search).get('barrio');
    const id = forzado && BARRIOS[forzado] ? forzado : partida?.barrio && BARRIOS[partida.barrio] ? partida.barrio : BARRIO_INICIAL;
    const mismoBarrio = partida && (partida.barrio ?? BARRIO_INICIAL) === id;
    this.dinero = partida?.dinero ?? 0;
    if (partida?.hora !== undefined) this.cielo.hora = partida.hora;
    this.cielo.actualizar(0);
    await this.cargarBarrio(id, mismoBarrio ? partida : null, partida?.modelo ?? this.garaje.elegida);
    if (mismoBarrio && partida?.aPie) this.bajarse();
    this.hud.ponerDinero(this.dinero);

    document.addEventListener('visibilitychange', () => { if (document.hidden) this.guardar(); });
    window.__pv_listo = true;
    window.__pv_escena = this.escena;
    window.__pv_barrios = BARRIOS;
    // Ganchos para la sonda de verificación: forzar situaciones que no se pueden guionizar con teclas.
    window.__pv_prueba = {
      calor: (n: number) => { this.busqueda.calor = n; },
      hora: (h: number) => { this.cielo.hora = h; },
      barrio: () => this.barrio.ficha.id,
      irA: (x: number, z: number, rumbo = 0) => { this.scooter.teletransportar(x, z, rumbo); this.camara.colocar(x, z); this.barrio.trastos.gestionarRadio(x, z); },
      carreras: () => this.barrio.carreras.map((c) => c.ruta.puntos.map((n) => this.barrio.grafo.nodos[n] ?? [0, 0])),
      forzarEje: (x: number, y: number) => { this.controles.forzado = x === 0 && y === 0 ? null : { x, y }; },
      empujar: (vx: number, vz: number) => { this.scooter.cuerpo.setLinvel({ x: vx, y: 0, z: vz }, true); },
      trastos: (tipo: string) => this.barrio.trastos.lista.filter((t) => t.tipo === tipo && !t.roto).map((t) => [t.malla.position.x, t.malla.position.z]),
      carrera: () => ({ estado: this.carrera.estado, indice: this.carrera.indice, tiempo: this.carrera.tiempo, enfriamiento: this.enfriamientoCarrera, aPie: this.aPie, coche: !!this.coche }),
      dinero: (n: number) => { this.dinero = n; this.hud.ponerDinero(n); },
      ajustes: () => ({ ...this.scooter.ajustes }),
      helicoptero: () => ({ activo: this.helicoptero.activo, pos: this.helicoptero.grupo.children[0]?.position.toArray() }),
      sevici: () => this.barrio.sevici.lista.map((c) => ({ x: Math.round(c.x * 10) / 10, z: Math.round(c.z * 10) / 10, estado: c.estado })),
      pachangas: () => this.barrio.pachangas.lista.map((p) => ({ x: p.x, z: p.z, goles: p.goles, porteria: p.porteria, balon: p.malla.position.toArray() })),
      recado: () => ({ estado: this.recadero.estado, destino: this.recadero.destino, restante: this.recadero.restante, cadena: this.recadero.cadena, puntos: this.barrio.encargos.puntos }),
      semaforos: () => this.barrio.semaforos.cruces.map((c) => ({ x: c.x, z: c.z, n: c.semaforos.length, luz: this.barrio.semaforos.luzDelante(c.x - Math.sin(c.eje) * 12, c.z + Math.cos(c.eje) * 12, c.eje, 20)?.luz ?? null })),
      rampas: () => this.barrio.rampas.posiciones.map(([x, z], i) => ({ x, z, rumbo: this.barrio.rampas.rumbos[i] ?? 0 })),
      viajar: async (destino?: string) => { await this.viajar(destino ?? this.barrio.ficha.destinos13[0]!); return this.barrio.ficha.id; },
      robarBus: () => {
        const bus = this.barrio.trafico.lista.find((c) => c.tipo === 'bus');
        if (!bus) return false;
        if (!this.aPie) this.bajarse();
        this.peaton.aparecer(bus.x + 2.5, bus.z, 0);
        return this.subirse() && !!this.coche?.apariencia;
      },
      robarCoche: () => {
        const c = this.barrio.trafico.lista[0];
        if (!c) return false;
        if (!this.aPie) this.bajarse();
        this.peaton.aparecer(c.x + 2, c.z, 0);
        return this.subirse() && this.coche !== null;
      },
    };
    window.__pv_info = () => {
      const b = this.barrio;
      return { calidad: this.calidad, barrio: b.ficha.id, timestep: b.fisica.world.timestep, render: { ...this.infoRender }, memoria: { ...this.renderer.info.memory }, scooter: { ...this.scooter.estado }, eje: { ...this.controles.eje }, trastos: b.trastos.lista.length, trozos: this.trozos.cuantos, sentados: b.vecinos.lista.filter((v) => v.estado === 'sentado').length, buses: b.trafico.lista.filter((c) => c.tipo === 'bus').length, rotos: b.trastos.lista.filter((t) => t.roto).length, activos: b.trastos.activos, despiertos: b.trastos.lista.filter((t) => t.cuerpo && !t.cuerpo.isSleeping()).length, cuerpos: b.fisica.world.bodies.len(), aPie: this.aPie, enCoche: !!this.coche, estrellas: this.busqueda.estrellas, calor: Math.round(this.busqueda.calor), patrullas: b.patrullas.lista.map((p) => [p.tipo, Math.round(p.x), Math.round(p.z), p.directo, Math.round(p.velocidad * 10) / 10, Math.round(Math.hypot(p.cuerpo.linvel().x, p.cuerpo.linvel().z) * 10) / 10, p.ruta.length, Math.round(Math.hypot(p.x - this.vehiculo.estado.x, p.z - this.vehiculo.estado.z)), Math.round(p.tiempoEncima * 10) / 10]), dentroEdificio: b.nivel.edificios.some((ed) => dentroDePoligono(this.vehiculo.estado.x, this.vehiculo.estado.z, ed.poligono)), vehiculo: [this.vehiculo.estado.x, this.vehiculo.estado.z, this.vehiculo.estado.velocidad, this.vehiculo.posicion.y], salud: Math.round(this.vehiculo.salud), reventados: this.reventado.size, trafico: b.trafico.lista.length, peaton: [this.peaton.posicion.x, this.peaton.posicion.z], vecinosCerca: b.vecinos.lista.filter((v) => (v.x - this.scooter.estado.x) ** 2 + (v.z - this.scooter.estado.z) ** 2 < 60 * 60).length, paradas: b.paradas.lista.length, enParada: this.enParada };
    };
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  /**
   * Destruye el barrio actual (si lo hay) y carga otro. Wifly aparece donde diga `donde`
   * (la partida guardada) o, si no, en la parada de llegada del 13 con su moto al lado.
   */
  private async cargarBarrio(id: string, donde: { x: number; z: number; rumbo: number } | null, indiceModelo: number): Promise<void> {
    const ficha = BARRIOS[id] ?? BARRIOS[BARRIO_INICIAL]!;
    if (this.barrio) {
      this.barrio.destruir(this.escena);
      this.marcas.cortar();
    }
    this.coche = null;
    this.aPie = false;
    if (this.carrera.estado === 'en_curso') { this.carrera.abandonar(); this.hud.ponerCarrera(null); }
    this.recadero.abandonar();
    this.reventado.clear();
    this.motosRobadas.clear();
    this.barrio = await Barrio.cargar(ficha, this.calidad, this.escena);
    const inicio = donde ?? this.barrio.arranque;
    const modelo = MODELOS[indiceModelo] ?? MODELOS[0];
    this.scooter = new Scooter(this.barrio.fisica, inicio.x, inicio.z, inicio.rumbo, modelo);
    this.aplicarTaller(this.scooter);
    this.scooter.montar(true);
    this.barrio.scooters.unshift(this.scooter);
    this.barrio.grupo.add(this.scooter.malla);
    this.motosRobadas.add(this.scooter);
    this.peaton = new Peaton(this.barrio.fisica, inicio.x, inicio.z);
    this.barrio.grupo.add(this.peaton.malla);
    this.botonAccion.textContent = 'BAJAR';
    this.barrio.trastos.gestionarRadio(inicio.x, inicio.z);
    this.barrio.trafico.gestionarRadio(inicio.x, inicio.z);
    this.camara.colocar(inicio.x, inicio.z);
    this.hud.ponerMecheros(this.barrio.mecheros.cuantos, TOTAL_MECHEROS);
    this.hud.ponerCalle(this.barrio.nivel.nombre);
    this.hud.ponerEstrellas(0);
    this.busqueda.limpiar();
    this.helicoptero.retirar(true);
    this.minimapa.cargar(this.barrio.nivel);
  }

  /** El viaje en el 13: cinemática ya vista, pantalla en negro, barrio nuevo y Wifly a pie en la parada. */
  private async viajar(destino: string): Promise<void> {
    if (this.cargandoBarrio) return;
    this.cargandoBarrio = true;
    try {
      await this.cargarBarrio(destino, null, MODELOS.indexOf(this.scooter.modelo));
      this.contador.sumar('viajes13');
      // Te bajas a pie junto a la parada; la moto se queda aparcada al lado por si la quieres.
      const parada = this.barrio.paradaLlegada;
      if (parada) {
        this.scooter.teletransportar(parada.x + 2.5, parada.z + 2.5, this.barrio.arranque.rumbo);
        this.scooter.montar(false);
        this.peaton.aparecer(parada.x, parada.z + 1.5, this.barrio.arranque.rumbo);
        this.aPie = true;
        this.botonAccion.textContent = 'SUBIR';
        this.camara.colocar(parada.x, parada.z);
      }
      this.hud.avisar(this.barrio.ficha.bienvenida, 3);
      this.guardar();
    } finally {
      this.cargandoBarrio = false;
      this.cine.llegar();
    }
  }

  /** Wifly, a pie y en la parada, coge el 13: arranca la cinemática. */
  private cogerEl13(): void {
    const p = this.peaton.posicion;
    const parada = this.barrio.paradas.cercana(p.x, p.z, RADIO_PARADA);
    if (!parada) return;
    const destino = BARRIOS[parada.destino];
    if (!destino) return;
    this.destinoViaje = destino.id;
    const dir = this.barrio.direccionCalle(parada.x, parada.z);
    this.peaton.esconder();
    this.busqueda.limpiar();
    this.barrio.patrullas.retirarTodas();
    this.helicoptero.retirar(true);
    this.audio.actualizarHelicoptero(false, 0);
    this.hud.ponerEstrellas(0);
    this.audio.silenciarMotor(true);
    this.audio.actualizarSirena(false, 0, 1);
    this.cine.empezar(parada.x, parada.z, dir.x, dir.z, `Línea 13 · ${destino.nombre}`);
  }

  /** Lo que lleva Wifly ahora mismo (moto o coche), para cámara, HUD y efectos. */
  private get vehiculo(): Scooter | Coche {
    return this.coche ?? this.scooter;
  }

  /** Wifly se baja del vehículo y se queda de pie a su lado. */
  private bajarse(): void {
    if (this.aPie) return;
    const v = this.vehiculo;
    const e = v.estado;
    const lado = v.direccion.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).multiplyScalar(this.coche ? (this.coche.apariencia ? 2.8 : 2.2) : 1.2);
    v.montar(false);
    this.peaton.aparecer(e.x + lado.x, e.z + lado.z, e.rumbo);
    this.aPie = true;
    this.abandonarCarrera('Carrera abandonada');
    this.abandonarRecado('Encargo abandonado');
    this.coche = null;
    this.botonAccion.textContent = 'SUBIR';
  }

  /** Se sube a lo más cercano que haya a mano: moto, coche aparcado o coche del tráfico. */
  private subirse(): boolean {
    const p = this.peaton.posicion;
    const b = this.barrio;
    let mejorMoto: Scooter | null = null, mejorD = 3.2 * 3.2;
    for (const m of b.scooters) {
      const d = (m.estado.x - p.x) ** 2 + (m.estado.z - p.z) ** 2;
      if (d < mejorD) { mejorD = d; mejorMoto = m; }
    }
    let mejorCoche: Coche | null = null, mejorDc = 4.2 * 4.2;
    for (const c of b.coches) {
      const d = (c.estado.x - p.x) ** 2 + (c.estado.z - p.z) ** 2;
      if (d < mejorDc) { mejorDc = d; mejorCoche = c; }
    }
    const delTrafico = b.trafico.masCercano(p.x, p.z, 4.2);
    const dTrafico = delTrafico ? (delTrafico.x - p.x) ** 2 + (delTrafico.z - p.z) ** 2 : Infinity;

    if (delTrafico && dTrafico < mejorD && dTrafico < mejorDc) {
      // Robo en marcha: el coche (o el 13) sale del tráfico y pasa a ser un vehículo de verdad.
      const esBus = delTrafico.tipo === 'bus';
      const c = esBus
        ? new Coche(b.fisica, delTrafico.x, delTrafico.z, delTrafico.rumbo, delTrafico.color, BUS, { geometria: geometriaBus(), escala: BUS_ESCALA, largo: BUS_LARGO, ancho: BUS_ANCHO, nombre: 'el 13' })
        : delTrafico.variante === 'furgoneta'
          ? new Coche(b.fisica, delTrafico.x, delTrafico.z, delTrafico.rumbo, delTrafico.color, UTILITARIO, { geometria: geometriaFurgoneta(delTrafico.color), escala: 1.35, largo: 3.9, ancho: 1.75, nombre: 'la furgoneta' })
          : new Coche(b.fisica, delTrafico.x, delTrafico.z, delTrafico.rumbo, delTrafico.color);
      b.trafico.quitar(delTrafico);
      b.coches.push(c);
      b.grupo.add(c.malla);
      mejorCoche = c;
      mejorDc = 0;
      this.hud.avisar(esBus ? '¡El 13 es mío! Todos al fondo' : delTrafico.variante === 'furgoneta' ? '¡La furgoneta del reparto!' : ['¡Fuera del coche, hombre!', '¡Baja, que llevo prisa!', '¡Esto es un préstamo!'][Math.floor(Math.random() * 3)]!, 1.8);
      this.busqueda.fechoria('robo_coche');
      this.contador.sumar('cochesRobados');
    }
    if (mejorCoche && mejorCoche.rota && mejorDc < mejorD) { this.hud.avisar('Ese coche está para el desguace', 1.4); return false; }
    if (mejorMoto && mejorMoto.rota && (!mejorCoche || mejorD < mejorDc)) { this.hud.avisar('Esa moto ha petado', 1.4); return false; }
    if (mejorCoche && mejorDc < mejorD) {
      this.coche = mejorCoche;
      this.coche.montar(true);
    } else if (mejorMoto) {
      if (!this.motosRobadas.has(mejorMoto)) {
        this.motosRobadas.add(mejorMoto);
        this.busqueda.fechoria('robo_moto');
        this.contador.sumar('motosRobadas');
        const nueva = this.garaje.desbloquear(MODELOS.indexOf(mejorMoto.modelo));
        this.hud.avisar(nueva ? `${mejorMoto.modelo.nombre}: ¡mía! Nueva en el garaje` : `${mejorMoto.modelo.nombre}: ¡mía!`, 1.8);
      }
      this.scooter = mejorMoto;
      this.aplicarTaller(this.scooter);
      this.scooter.montar(true);
      this.coche = null;
    } else return false;
    this.peaton.esconder();
    this.aPie = false;
    this.botonAccion.textContent = 'BAJAR';
    return true;
  }

  /** Estrellas, patrullas que aparecen y desaparecen, sirena y el momento de que te trinquen. */
  private actualizarPolicia(pos: THREE.Vector3, rapidez: number, dt: number): void {
    if (this.tiempoTrincao > 0) {
      this.tiempoTrincao -= dt;
      if (this.tiempoTrincao <= 0) this.hud.mostrarTrincao(false);
      return;
    }
    const b = this.barrio;
    const cambio = this.busqueda.actualizar(dt);
    if (cambio > 0) this.hud.avisar(this.busqueda.estrellas >= 5 ? '¡Cinco estrellas! Esto ya es la Feria' : this.busqueda.estrellas >= 3 ? '¡Las motos de la Local!' : '¡Que viene la Local!', 1.8);
    this.hud.ponerEstrellas(this.busqueda.estrellas);

    const dotacion = this.busqueda.dotacion;
    const coches = b.patrullas.lista.filter((p) => p.tipo === 'coche');
    const motos = b.patrullas.lista.filter((p) => p.tipo === 'moto');
    if (coches.length < dotacion.coches) b.patrullas.aparecer('coche', pos, this.rndPolicia);
    if (motos.length < dotacion.motos) b.patrullas.aparecer('moto', pos, this.rndPolicia);
    // Sobran: se retira la más lejana (se va por donde vino).
    const lejana = (lista: typeof coches): typeof coches[number] | undefined =>
      lista.sort((a, c) => Math.hypot(c.x - pos.x, c.z - pos.z) - Math.hypot(a.x - pos.x, a.z - pos.z))[0];
    if (coches.length > dotacion.coches) { const p = lejana(coches); if (p) b.patrullas.retirar(p); }
    if (motos.length > dotacion.motos) { const p = lejana(motos); if (p) b.patrullas.retirar(p); }
    // A cinco estrellas, el helicóptero: mientras su foco te tenga, el calor no baja.
    if (this.busqueda.estrellas >= 5 && !this.helicoptero.activo) { this.helicoptero.aparecer(pos.x, pos.z); this.hud.avisar('¡El helicóptero de la Local!', 2.2); }
    else if (this.busqueda.estrellas < 4 && this.helicoptero.activo) this.helicoptero.retirar();
    const heli = this.helicoptero.actualizar({ x: pos.x, z: pos.z }, dt);
    if (heli.iluminado) this.busqueda.visto();
    this.audio.actualizarHelicoptero(this.helicoptero.activo, heli.cercania);
    // Controles: a partir de dos estrellas, uno cruzado por delante de ti cada pocos segundos.
    const controles = b.patrullas.lista.filter((p) => p.tipo === 'control');
    this.tiempoControl -= dt;
    if (this.busqueda.estrellas >= 2 && controles.length < 1 && this.tiempoControl <= 0) {
      this.tiempoControl = 9;
      const dir = this.aPie ? { x: 0, z: 0 } : this.vehiculo.direccion;
      if (b.patrullas.aparecerControl({ x: pos.x, z: pos.z, dirX: dir.x, dirZ: dir.z }, this.rndPolicia)) this.hud.avisar('Control de la Local más adelante', 1.6);
    } else if (this.busqueda.estrellas < 2) for (const p of controles) b.patrullas.retirar(p);

    const via = viaMasCercana(b.nivel, pos.x, pos.z, 6);
    const enPasaje = via?.clase === 'peatonal';
    const r = b.patrullas.actualizar({ x: pos.x, z: pos.z, rapidez, enPasaje }, dt);
    if (r.visto) this.busqueda.visto();
    if (r.choques > 0) { this.busqueda.fechoria('choque_patrulla', r.choques); this.hud.avisar('¡Le has dado a la patrulla!', 1.5); }
    if (r.activados > 0) { this.busqueda.visto(); this.hud.avisar('¡Alto, Policía Local!', 1.6); }
    let cercania = 0;
    for (const p of b.patrullas.lista) cercania = Math.max(cercania, 1 - Math.min(1, Math.hypot(p.x - pos.x, p.z - pos.z) / 70));
    this.audio.actualizarSirena(b.patrullas.lista.length > 0, cercania, dt);
    if (r.trincado) this.trincar();
  }

  private trincar(): void {
    this.tiempoTrincao = 3;
    this.abandonarCarrera(null);
    this.abandonarRecado(null);
    this.hud.mostrarTrincao(true);
    this.hud.ponerEstrellas(0);
    this.busqueda.limpiar();
    this.barrio.patrullas.retirarTodas();
    this.helicoptero.retirar(true);
    this.audio.actualizarHelicoptero(false, 0);
    this.dinero = Math.max(0, Math.floor(this.dinero * 0.8));
    this.hud.ponerDinero(this.dinero);
    this.contador.sumar('trincados');
    this.contador.maximo('rachaMaxima', this.racha);
    this.racha = 0;
    this.hud.ponerRacha(0);
    this.audio.claxon();
    this.volverAlArranque();
  }

  /** Te sueltan en la parada del 13 del barrio, con tu moto de siempre y como nueva. */
  private volverAlArranque(): void {
    const arranque = this.barrio.arranque;
    if (this.coche) { this.coche.montar(false); this.coche = null; }
    if (this.aPie) { this.peaton.esconder(); this.aPie = false; }
    this.scooter.salud = 100;
    this.reventado.delete(this.scooter);
    this.scooter.teletransportar(arranque.x, arranque.z, arranque.rumbo);
    this.scooter.montar(true);
    this.botonAccion.textContent = 'BAJAR';
    this.camara.colocar(arranque.x, arranque.z);
    this.barrio.trastos.gestionarRadio(arranque.x, arranque.z);
    this.guardar();
  }

  empezar(): void {
    if (this.jugando) return;
    this.jugando = true;
    this.audio.arrancar();
    window.__pv_jugando = true;
    this.hud.avisar('Dale caña, Wifly', 2.5);
    document.body.classList.add('jugando');
    this.botonAccion.textContent = this.aPie ? 'SUBIR' : 'BAJAR';
  }

  private redimensionar(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camara.redimensionar(window.innerWidth / window.innerHeight);
    this.minimapa.redimensionar(window.innerWidth, window.innerHeight);
  }

  private guardar(): void {
    if (!this.scooter || this.cargandoBarrio || this.cine.activa) return;
    const pos = this.aPie ? this.peaton.posicion : this.vehiculo.posicion;
    guardarPartida({ x: pos.x, z: pos.z, rumbo: this.scooter.estado.rumbo, dinero: this.dinero, aPie: this.aPie, modelo: MODELOS.indexOf(this.scooter.modelo), hora: this.cielo.hora, barrio: this.barrio.ficha.id });
    this.contador.guardar();
  }

  /** Sobre una rampa, la moto lleva la velocidad vertical de la pendiente y en lo alto sale volando. */
  private subirRampa(): void {
    const e = this.scooter.estado;
    const r = this.barrio.rampas.pendiente(e.x, e.z);
    if (!r) return;
    const v = this.scooter.cuerpo.linvel();
    const alFrente = v.x * r.dirX + v.z * r.dirZ;
    if (alFrente < 1) return;
    const vy = alFrente * (r.avance > 0.8 ? 0.6 : PENDIENTE * 1.05);
    if (vy > v.y) this.scooter.cuerpo.setLinvel({ x: v.x, y: vy, z: v.z }, true);
  }

  /** Saltos: en el aire más de un tercio de segundo y aterrizar da aviso y unos euros. */
  private actualizarSaltos(dt: number): void {
    if (this.aPie || this.coche) { this.enAire = false; return; }
    const y = this.vehiculo.posicion.y;
    const volando = y > 1.0;
    if (volando) { this.tiempoAire += dt; this.enAire = true; return; }
    if (this.enAire) {
      this.enAire = false;
      if (this.tiempoAire > 0.35) {
        const euros = 10 + Math.round(this.tiempoAire * 20);
        this.ganar(euros);
        this.contador.sumar('saltos');
        this.contador.maximo('vueloMaximo', this.tiempoAire);
        this.hud.avisar(this.tiempoAire > 0.8 ? `¡Vuelo de ${this.tiempoAire.toFixed(1)} s! +${euros} €` : `¡Salto! +${euros} €`, 1.6);
        this.audio.pitido(this.tiempoAire > 0.8 ? 1100 : 800, 0.18, 0.18);
        this.particulas.emitir(this.vehiculo.estado.x, 0.3, this.vehiculo.estado.z, 10, this.colorPolvo, 3);
      }
      this.tiempoAire = 0;
    }
  }

  private static leerPistas(): string[] {
    try { return JSON.parse(localStorage.getItem('pinoloko.pistas.v1') ?? '[]') as string[]; } catch { return []; }
  }

  /** Una pista de juego, solo la primera vez que toca. */
  private pista(id: string, texto: string): void {
    if (this.pistas.has(id) || this.tiempoTrincao > 0 || this.cine.activa) return;
    this.pistas.add(id);
    try { localStorage.setItem('pinoloko.pistas.v1', JSON.stringify([...this.pistas])); } catch { /* sin almacenamiento */ }
    this.hud.avisar(texto, 3.4);
  }

  /** Comprueba qué pista toca según dónde estás y qué llevas (cada 0,3 s). */
  private actualizarPistas(pos: THREE.Vector3, dt: number): void {
    const b = this.barrio;
    if (this.aPie) { this.pista('subir', 'A pie por los pasajes. Para robar una moto aparcada, acércate y E / SUBIR'); this.tiempoParado = 0; }
    else if (Math.abs(this.vehiculo.estado.velocidad) < 0.5) { this.tiempoParado += dt; if (this.tiempoParado > 4) this.pista('bajar', 'Para bajarte: E o el botón BAJAR. A pie llegas donde la moto no'); }
    else this.tiempoParado = 0;
    const e = this.busqueda.estrellas;
    if (e >= 1) this.pista('local', '★ La Local. Sus coches no entran en los pasajes: métete por ellos y aguanta hasta que se enfríen');
    if (e >= 3) this.pista('motos', 'A tres estrellas salen las motos de la Local, y esas sí entran en los pasajes');
    const cerca = (x: number, z: number, r: number): boolean => (x - pos.x) ** 2 + (z - pos.z) ** 2 < r * r;
    if (!this.aPie && b.encargos.puntos.some((l) => cerca(l.x, l.z, 18))) this.pista('encargo', 'Bolsa naranja: pásala en moto para coger un encargo y llevarlo a otro local contra el reloj');
    if (!this.aPie && b.carreras.some((c) => { const [x, z] = b.grafo.nodos[c.salida] ?? [9e9, 9e9]; return cerca(x, z, 18); })) this.pista('carrera', 'Pancarta a cuadros: crúzala en moto y corre por los pasajes contra el reloj');
    if (b.pachangas.lista.some((p) => cerca(p.x, p.z, 22))) this.pista('balon', 'Los niños juegan al fútbol: chuta el balón con la moto, gol son 40 €');
    if (!this.aPie && b.rampas.posiciones.some(([x, z]) => cerca(x, z, 16))) this.pista('rampa', 'Rampa: a fondo y a volar. Cuanto más dure el vuelo, más euros');
    if (!this.aPie && !this.coche && b.trafico.lista.some((c) => cerca(c.x, c.z, 14))) this.pista('robar', 'Los coches en marcha se roban: bájate delante de uno parado y E / SUBIR');
  }

  /** Campanas de la iglesia más cercana a cada hora en punto (si estás a menos de 200 m): una,
   *  y tres a las doce y a las ocho, que son las de la misa. */
  private actualizarCampanas(pos: THREE.Vector3): void {
    const hora = Math.floor(this.cielo.hora) % 24;
    if (hora === this.horaCampanas) return;
    this.horaCampanas = hora;
    let mejor = Infinity;
    for (const p of this.barrio.nivel.pois) if (p.clase === 'place_of_worship') mejor = Math.min(mejor, Math.hypot(p.x - pos.x, p.z - pos.z));
    if (mejor > 200 || hora < 8 || hora > 21) return;
    this.audio.campanas(hora === 12 || hora === 20 ? 3 : 1, 0.05 + 0.2 * (1 - mejor / 200));
  }

  /** Vibración táctil corta (móvil): golpes, atropellos, reventones y goles. */
  private vibrar(ms: number): void {
    if (!this.conVibracion) return;
    try { navigator.vibrate(ms); } catch { /* sin vibración */ }
  }

  /** Pachangas: el balón y los niños tras la física; los goles del jugador dan dinero. */
  private actualizarPachangas(pos: THREE.Vector3, rapidez: number, dt: number): void {
    const r = this.barrio.pachangas.actualizar({ x: pos.x, z: pos.z, rapidez }, dt);
    if (r.golesJugador > 0) {
      this.ganar(40 * r.golesJugador);
      this.contador.sumar('goles', r.golesJugador);
      this.hud.avisar(['¡GOOOL de Wifly! +40 €', '¡Golazo por la escuadra! +40 €', '¡Gol! Los niños flipando +40 €'][Math.floor(Math.random() * 3)]!, 2.4);
      this.audio.fanfarria();
      this.vibrar(80);
    }
    this.tiempoGolNinos -= dt;
    if (r.golesNinos > 0 && this.tiempoGolNinos <= 0) {
      this.tiempoGolNinos = 12;
      if (this.barrio.pachangas.lista.some((p) => Math.hypot(p.x - pos.x, p.z - pos.z) < 40)) this.hud.avisar('¡Gol de los niños del pasaje!', 1.6);
    }
  }

  /** Semáforos: ciclan solos; pasar uno en rojo en vehículo y con prisa calienta a la Local. */
  private actualizarSemaforos(pos: THREE.Vector3, rapidez: number, dt: number): void {
    const s = this.barrio.semaforos;
    if (!s.cruces.length) return;
    s.actualizar(dt);
    this.tiempoSemaforo -= dt;
    if (this.aPie || rapidez < 3 || this.tiempoSemaforo > 0) return;
    const luz = s.luzDelante(pos.x, pos.z, this.vehiculo.estado.rumbo, 2.5);
    if (luz && luz.luz === 'rojo' && luz.distancia < 2.5) {
      this.tiempoSemaforo = 6;
      this.busqueda.fechoria('semaforo');
      this.contador.sumar('semaforos');
      this.hud.avisar(['¡Que está en rojo!', '¡El semáforo, Wifly!', '¡En rojo y a fondo!'][Math.floor(Math.random() * 3)]!, 1.6);
    }
  }

  private abandonarRecado(aviso: string | null): void {
    if (this.recadero.estado !== 'en_curso') return;
    this.recadero.abandonar();
    this.hud.ponerCarrera(null);
    this.enfriamientoRecado = 5;
    if (aviso) this.hud.avisar(aviso, 1.6);
  }

  /** Recadero: pasar en vehículo por la bolsa de un local arranca un encargo hacia otro local. */
  private actualizarRecados(pos: THREE.Vector3, dt: number): void {
    const b = this.barrio;
    this.enfriamientoRecado = Math.max(0, this.enfriamientoRecado - dt);
    const r = this.recadero;
    if (r.estado === 'fuera') {
      b.encargos.actualizar(dt, null, pos.x, pos.z);
      if (this.aPie || this.enfriamientoRecado > 0 || this.carrera.estado === 'en_curso') return;
      const origen = b.encargos.cercano(pos.x, pos.z, 4);
      if (!origen) return;
      const destino = elegirDestino(b.locales, origen, Math.random);
      if (!destino) return;
      r.empezar(origen, destino);
      this.hud.avisar(`Encargo de ${origen.nombre}: llévalo a ${destino.nombre} en ${r.total} s`, 3);
      this.audio.pitido(720, 0.2, 0.2);
      return;
    }
    const resultado = r.actualizar(pos.x, pos.z, dt);
    if (resultado === 'entregado') {
      const euros = premioRecado(r.restante, r.total, r.cadena - 1);
      this.ganar(euros);
      this.contador.sumar('recados');
      this.contador.maximo('cadenaRecados', r.cadena);
      this.audio.fanfarria();
      // Encadena: el local que recibe tiene otro encargo listo, con más premio.
      const siguiente = r.destino && elegirDestino(b.locales, r.destino, Math.random);
      if (siguiente && r.destino && !this.aPie) {
        const desde = r.destino;
        r.empezar(desde, siguiente);
        this.hud.avisar(`¡Entregado! +${euros} € · Ahora a ${siguiente.nombre} (${r.total} s, cadena ×${r.cadena + 1})`, 3.2);
      } else {
        this.hud.avisar(`¡Entregado! +${euros} €`, 2.4);
        this.hud.ponerCarrera(null);
        r.cadena = 0;
      }
    } else if (resultado === 'tiempo') {
      this.hud.avisar('Se te ha pasado el encargo', 2);
      this.hud.ponerCarrera(null);
      this.enfriamientoRecado = 5;
      b.encargos.actualizar(dt, null, pos.x, pos.z);
      return;
    }
    if (r.estado === 'en_curso' && r.destino) {
      b.encargos.actualizar(dt, r.destino, pos.x, pos.z);
      if (this.carrera.estado !== 'en_curso') this.hud.ponerCarrera(`Encargo · ${r.destino.nombre} · ${Math.ceil(r.restante)} s${r.cadena ? ` · ×${r.cadena + 1}` : ''}`);
    }
  }

  private abandonarCarrera(aviso: string | null): void {
    if (this.carrera.estado !== 'en_curso') return;
    this.carrera.abandonar();
    this.barrio.circuito.mostrarRuta(null);
    this.hud.ponerCarrera(null);
    this.enfriamientoCarrera = 6;
    if (aviso) this.hud.avisar(aviso, 1.6);
  }

  /** Carreras: pasar en moto por una pancarta de salida arranca el reloj; anillos en orden y meta. */
  private actualizarCarrera(pos: THREE.Vector3, dt: number): void {
    const b = this.barrio;
    this.enfriamientoCarrera = Math.max(0, this.enfriamientoCarrera - dt);
    if (this.carrera.estado === 'fuera') {
      if (this.aPie || this.coche || this.enfriamientoCarrera > 0) return;
      b.carreras.forEach((c, i) => {
        if (this.carrera.estado !== 'fuera') return;
        const [sx, sz] = b.grafo.nodos[c.salida] ?? [Infinity, Infinity];
        if (Math.hypot(sx - pos.x, sz - pos.z) > 4.5) return;
        this.indiceCarrera = i;
        this.carrera.empezar(c.ruta);
        b.circuito.mostrarRuta(c.ruta);
        const mejor = this.records.mejor(b.ficha.id, i);
        this.hud.avisar(mejor === null ? `¡Carrera! ${c.ruta.puntos.length} puntos por los pasajes` : `¡Carrera! Récord: ${formatearTiempo(mejor)}`, 2.2);
        this.audio.pitido(660, 0.25, 0.2);
      });
      return;
    }
    const ruta = this.carrera.ruta!;
    const r = this.carrera.actualizar(pos.x, pos.z, dt, b.grafo);
    if (r === 'punto') {
      this.hud.avisar(`${this.carrera.indice}/${ruta.puntos.length}`, 0.9);
      this.audio.pitido(990, 0.14, 0.2);
    } else if (r === 'meta') {
      const dinero = premio(this.carrera.tiempo, ruta.puntos.length);
      const record = this.records.registrar(b.ficha.id, this.indiceCarrera, this.carrera.tiempo);
      this.ganar(dinero);
      this.contador.sumar('carreras');
      this.hud.avisar(`¡Meta! ${formatearTiempo(this.carrera.tiempo)}${record ? ' · ¡RÉCORD!' : ''} · +${dinero} €`, 3);
      this.audio.fanfarria();
      b.circuito.mostrarRuta(null);
      this.hud.ponerCarrera(null);
      this.enfriamientoCarrera = 8;
      return;
    } else if (r === 'tiempo') {
      this.hud.avisar('Se acabó el tiempo', 1.8);
      b.circuito.mostrarRuta(null);
      this.hud.ponerCarrera(null);
      this.enfriamientoCarrera = 6;
      return;
    }
    b.circuito.actualizar(dt, this.carrera.indice, pos.x, pos.z);
    this.hud.ponerCarrera(`⏱ ${formatearTiempo(this.carrera.tiempo)} · ${this.carrera.indice}/${ruta.puntos.length}`);
  }

  /** Dinero que entra: al bolsillo y a la estadística de total ganado. */
  private ganar(cantidad: number): void {
    this.dinero += cantidad;
    this.contador.sumar('dineroTotal', cantidad);
    this.hud.ponerDinero(this.dinero);
  }

  private abrirMenu(pestana?: Pestana): void {
    if (this.cine.activa || this.cargandoBarrio) return;
    this.pausado = true;
    this.audio.silenciarMotor(true);
    this.guardar();
    this.menu.abrir(pestana);
  }

  /** Compra en el taller una mejora para la moto elegida y la aplica si es la que llevas. */
  private comprarMejora(mejora: Mejora): boolean {
    const indice = this.garaje.elegida;
    const coste = this.taller.comprar(indice, mejora, this.dinero);
    if (coste < 0) { this.hud.avisar('No llega el dinero', 1.4); return false; }
    this.dinero -= coste;
    this.hud.ponerDinero(this.dinero);
    this.contador.sumar('mejoras');
    this.aplicarTaller(this.scooter);
    this.guardar();
    this.audio.pitido(1200, 0.12, 0.15);
    return true;
  }

  /** Ajustes de la moto según lo comprado en el taller para su modelo. */
  private aplicarTaller(moto: Scooter): void {
    const indice = MODELOS.indexOf(moto.modelo);
    moto.ajustes = aplicarMejoras(moto.modelo.ajustes, this.taller.niveles(indice));
    this.audio.tono = 1 + 0.1 * this.taller.nivel(indice, 'escape');
  }

  /** Cambia la moto de Wifly por otra del garaje, en el mismo sitio y en el mismo estado. */
  private cambiarMoto(indice: number): void {
    const modelo = MODELOS[indice];
    if (!modelo || modelo === this.scooter.modelo) return;
    const vieja = this.scooter;
    const e = vieja.estado;
    const montado = !this.aPie && !this.coche;
    const nueva = new Scooter(this.barrio.fisica, e.x, e.z, e.rumbo, modelo);
    this.barrio.scooters.splice(this.barrio.scooters.indexOf(vieja), 1, nueva);
    this.barrio.grupo.remove(vieja.malla);
    vieja.destruir(this.barrio.fisica);
    this.barrio.grupo.add(nueva.malla);
    this.motosRobadas.delete(vieja);
    this.motosRobadas.add(nueva);
    this.reventado.delete(vieja);
    this.scooter = nueva;
    this.aplicarTaller(nueva);
    nueva.montar(montado);
    this.hud.avisar(`${modelo.nombre}: lista`, 1.6);
  }

  /** Borra partida, mecheros y estadísticas (el garaje se queda) y recarga. */
  private nuevaPartida(): void {
    try {
      for (const clave of Object.keys(localStorage)) if (clave.startsWith('pinoloko.') && !clave.startsWith('pinoloko.garaje')) localStorage.removeItem(clave);
    } catch { /* sin almacenamiento */ }
    location.href = location.pathname;
  }

  private frame(tiempo: number): void {
    const dt = Math.min(0.1, (tiempo - this.ultimoTiempo) / 1000 || 0);
    this.ultimoTiempo = tiempo;
    performance.mark('update-inicio');
    this.actualizar(dt);
    performance.mark('update-fin');
    performance.measure('update', 'update-inicio', 'update-fin');
    performance.mark('render-inicio');
    this.renderer.render(this.escena, this.camara.camara);
    this.infoRender.calls = this.renderer.info.render.calls;
    this.infoRender.triangles = this.renderer.info.render.triangles;
    // Capa del minimapa encima, sin borrar lo pintado.
    this.minimapa.mostrar(this.jugando && !this.cine.activa && !this.cargandoBarrio && !this.sinMinimapa);
    if (this.minimapa.escena.children[0]?.visible) {
      this.renderer.autoClear = false;
      this.renderer.render(this.minimapa.escena, this.minimapa.camara);
      this.renderer.autoClear = true;
    }
    this.foto.capturar();
    performance.mark('render-fin');
    performance.measure('render', 'render-inicio', 'render-fin');
    window.__pv_frames++;
  }

  /** La tecla E / botón de acción: coger el 13, subirse o bajarse. La R: volver a la parada. */
  private atenderAcciones(): void {
    if (this.tiempoTrincao > 0) return;
    if (this.controles.accion) {
      if (this.aPie) {
        if (this.enParada) this.cogerEl13();
        else if (!this.subirse()) this.hud.avisar('No hay moto a mano', 1.2);
      } else if (Math.abs(this.vehiculo.estado.velocidad) < 2.5) this.bajarse();
      else this.hud.avisar('Frena antes de bajarte', 1.2);
    }
    if (this.controles.reaparecer) {
      this.hud.avisar('Vuelta a la parada', 1.4);
      this.volverAlArranque();
    }
  }

  private actualizar(dt: number): void {
    this.controles.actualizar();
    // Cinemática del 13: la cámara es del bus, el barrio se congela y al fundir a negro se viaja.
    if (this.cine.activa || this.cargandoBarrio) {
      if (this.cine.actualizar(dt, this.camara.camara)) void this.viajar(this.destinoViaje);
      this.cielo.colocarSol(this.cine.bus.position.x, this.cine.bus.position.z);
      this.particulas.actualizar(dt);
      return;
    }
    const b = this.barrio;
    if (this.jugando && !this.pausado) {
      this.atenderAcciones();
      this.contador.sumar('segundos', dt);
      // Paso de física variable: 1/60 s a 60 fps, dos subpasos a 30 fps, y por debajo el
      // paso crece hasta 1/20 s para que el tiempo de juego siga siendo real (hasta 20 fps).
      performance.mark('u0');
      this.acumulador += dt;
      const pasos = Math.min(2, Math.max(1, Math.ceil(this.acumulador / PASO_FISICA)));
      const paso = Math.min(PASO_MAXIMO, this.acumulador / pasos);
      b.fisica.world.timestep = paso;
      this.acumulador = Math.max(0, this.acumulador - paso * pasos);
      if (this.acumulador > PASO_FISICA) this.acumulador = 0;
      for (let i = 0; i < pasos; i++) {
        const entrada = this.tiempoTrincao > 0 ? SIN_ENTRADA : this.controles;
        if (this.aPie) this.peaton.actualizar(entrada, paso);
        else if (this.coche) this.coche.actualizar(entrada, paso);
        else { this.scooter.actualizar(entrada, paso); this.subirRampa(); }
        b.trafico.actualizar(this.aPie ? this.peaton.posicion : this.vehiculo.estado, paso);
        b.fisica.paso();
        b.trafico.despuesDelPaso();
        b.patrullas.despuesDelPaso();
        for (const m of b.scooters) { if (m === this.scooter && !this.aPie && !this.coche) m.despuesDelPaso(); else m.reposo(); }
        for (const c of b.coches) { if (c === this.coche && !this.aPie) c.despuesDelPaso(); else c.reposo(); }
        if (this.aPie) this.peaton.sincronizar();
      }
      performance.mark('u1');
      performance.measure('u-fisica', 'u0', 'u1');
      const e = this.vehiculo.estado;
      if (e.golpe > 0 && !this.aPie) {
        if (e.golpe > 4) this.vibrar(Math.min(60, Math.round(e.golpe * 4)));
        this.camara.sacudir(e.golpe * 0.06);
        this.audio.golpe(e.golpe);
        this.particulas.emitir(e.x, 0.6, e.z, Math.min(30, Math.round(e.golpe * 2)), this.colorChispa, Math.min(9, e.golpe * 0.8));
      }
      // Marcas y polvo del derrape o de la frenada fuerte.
      const frenando = !this.aPie && this.controles.freno && Math.abs(e.velocidad) > 4;
      if (!this.aPie && (e.derrapando || frenando)) {
        const atras = this.vehiculo.direccion.multiplyScalar(this.coche ? -1.6 : -0.6);
        this.marcas.pintar(e.x + atras.x, e.z + atras.z, e.derrapando ? 1 : 0.55);
        if (e.derrapando && Math.random() < 0.5) this.particulas.emitir(e.x + atras.x, 0.2, e.z + atras.z, 1, this.colorPolvo, 2);
      } else this.marcas.cortar();

      // Vecinos: pasean, huyen, insultan y se caen si los atropellas.
      const jugadorPos = this.aPie ? this.peaton.posicion : this.vehiculo.posicion;
      const rapidez = this.aPie ? this.peaton.velocidad : Math.abs(e.velocidad);
      performance.mark('u2');
      const eventos = b.vecinos.actualizar({ x: jugadorPos.x, z: jugadorPos.z, rapidez }, dt);
      performance.mark('u3');
      performance.measure('u-vecinos', 'u2', 'u3');
      this.tiempoInsulto -= dt;
      if (eventos.insulto && this.tiempoInsulto <= 0) { this.hud.avisar(eventos.insulto, 1.8); this.tiempoInsulto = 2.5; }
      if (eventos.atropellos > 0) {
        this.racha += eventos.atropellos;
        this.tiempoRacha = 3;
        this.ganar(25 * eventos.atropellos);
        this.contador.sumar('atropellos', eventos.atropellos);
        this.hud.ponerRacha(this.racha);
        this.hud.avisar(['¡Atropello!', '¡Al suelo, vecino!', '¡Uy, uy, uy!', '¡Que era el del quinto!'][Math.floor(Math.random() * 4)]!, 1.5);
        this.camara.sacudir(0.35);
        this.vibrar(40);
        this.audio.golpe(4);
        this.busqueda.fechoria('atropello', eventos.atropellos);
      }
      this.actualizarPolicia(jugadorPos, rapidez, dt);
      performance.mark('u4');
      performance.measure('u-policia', 'u3', 'u4');
      const mechero = b.mecheros.actualizar(jugadorPos.x, jugadorPos.z, dt);
      if (mechero >= 0) {
        this.ganar(10);
        this.contador.sumar('mecheros');
        if (b.mecheros.cuantos === TOTAL_MECHEROS) this.contador.sumar('barriosCompletos');
        this.hud.ponerMecheros(b.mecheros.cuantos, TOTAL_MECHEROS);
        this.hud.avisar(b.mecheros.cuantos === TOTAL_MECHEROS ? `¡Los 20 mecheros! Eres el rey de ${b.ficha.nombre.split(' ·')[0]}` : `Mechero ${b.mecheros.cuantos}/${TOTAL_MECHEROS}`, 1.6);
        if (b.mecheros.cuantos === TOTAL_MECHEROS) this.audio.fanfarria(); else this.audio.pitido(1320, 0.15);
      }
      this.actualizarCarrera(jugadorPos, dt);
      this.actualizarSaltos(dt);
      this.actualizarSemaforos(jugadorPos, rapidez, dt);
      this.actualizarRecados(jugadorPos, dt);
      this.actualizarPachangas(jugadorPos, rapidez, dt);
      // Sevici por el carril bici: timbre si te tienen delante y al suelo si los atropellas.
      const sevici = b.sevici.actualizar({ x: jugadorPos.x, z: jugadorPos.z, rapidez }, dt);
      this.tiempoTimbre -= dt;
      if (sevici.timbre && this.tiempoTimbre <= 0) { this.tiempoTimbre = 1.5; this.audio.pitido(2200, 0.06, 0.08); setTimeout(() => this.audio.pitido(2200, 0.06, 0.08), 90); }
      if (sevici.atropellos > 0) {
        this.racha += sevici.atropellos;
        this.tiempoRacha = 3;
        this.ganar(30 * sevici.atropellos);
        this.contador.sumar('ciclistas', sevici.atropellos);
        this.hud.ponerRacha(this.racha);
        this.hud.avisar(['¡El del Sevici al suelo!', '¡Por el carril bici no, illo!', '¡Menudo caballito ha hecho el ciclista!'][Math.floor(Math.random() * 3)]!, 1.6);
        this.camara.sacudir(0.3);
        this.vibrar(40);
        this.audio.golpe(4);
        this.busqueda.fechoria('atropello', sevici.atropellos);
      }
      this.actualizarCampanas(jugadorPos);
      // Daño: humo por debajo de 30 y reventón a 0 (Wifly sale despedido y la moto ya no arranca).
      if (!this.aPie) {
        const v = this.vehiculo;
        if (v.salud < 30 && Math.random() < (v.rota ? 0.9 : 0.4)) {
          const atras = v.direccion.multiplyScalar(this.coche ? 1.5 : 0.5);
          this.particulas.emitir(v.estado.x + atras.x, 0.8, v.estado.z + atras.z, 1, v.rota ? this.colorFuego : this.colorHumo, 1.2);
        }
        if (v.rota && !this.reventado.has(v)) {
          this.reventado.add(v);
          this.particulas.emitir(v.estado.x, 1, v.estado.z, 60, this.colorFuego, 9);
          this.camara.sacudir(1.2);
          this.audio.golpe(20);
          this.hud.avisar(this.coche ? '¡El coche ha reventado!' : `¡La ${v instanceof Scooter ? v.modelo.nombre : 'moto'} ha petado!`, 2.2);
          this.contador.sumar('reventones');
          this.busqueda.fechoria('trasto', 4);
          this.vibrar(150);
          this.bajarse();
          this.repeticion.empezar(v.estado.x, v.estado.z, v.estado.rumbo);
        }
      }
      // Claxon: asusta a los vecinos de alrededor.
      this.tiempoClaxon -= dt;
      if (this.controles.claxon && this.tiempoClaxon <= 0 && !this.aPie) {
        this.tiempoClaxon = 0.6;
        this.audio.claxon();
        b.vecinos.asustar(jugadorPos.x, jugadorPos.z, 14);
      }
      // Faros de noche, pegados al vehículo que lleves; y las ventanas del barrio encendidas.
      this.faros.visible = this.cielo.esDeNoche && !this.aPie;
      b.ventanas.visible = this.cielo.esDeNoche;
      if (this.faros.visible) {
        const v = this.vehiculo;
        this.faros.position.set(v.estado.x, 0, v.estado.z);
        this.faros.rotation.y = -v.estado.rumbo;
        this.faros.scale.setScalar(this.coche ? 1.4 : 1);
      }

      // Trastos derribados: dinero, racha y frase de barrio.
      performance.mark('u5');
      const derribados = b.trastos.actualizar(jugadorPos.x, jugadorPos.z);
      performance.mark('u6');
      performance.measure('u-trastos', 'u5', 'u6');
      if (derribados.length) {
        this.tiempoRacha = 3;
        for (const t of derribados) {
          this.racha++;
          const multiplicador = Math.min(5, 1 + Math.floor(this.racha / 3));
          this.ganar(t.valor * multiplicador);
          const frases = FRASES[t.tipo];
          const frase = frases[Math.floor(Math.random() * frases.length)]!;
          this.hud.avisar(multiplicador > 1 ? `${frase}  ×${multiplicador}` : frase, 1.6);
          const p = t.malla.position;
          this.particulas.emitir(p.x, p.y + 0.3, p.z, 8, this.colorPolvo, 3);
          // Lo que se rompe de verdad: macetas, cajas del mercado, sillas y mesas de terraza.
          const colores = ROMPIBLES[t.tipo];
          if (colores && (t.tipo === 'maceta' || t.tipo === 'caja' || rapidez > 7)) {
            const v = b.trastos.romper(t);
            this.trozos.estallar(p.x, p.y, p.z, colores.map((c) => new THREE.Color(c)), v.vx, v.vz, t.tipo === 'caja' ? 5 : 3.5);
            this.audio.golpe(4);
          }
        }
        this.hud.ponerRacha(this.racha);
        this.busqueda.fechoria('trasto', derribados.length);
        this.contador.sumar('trastos', derribados.length);
      }
      if (this.tiempoRacha > 0) {
        this.tiempoRacha -= dt;
        if (this.tiempoRacha <= 0 && this.racha > 0) {
          if (this.racha >= 6) this.hud.avisar(`Lío armado: ${this.racha} trastos`, 2.2);
          this.contador.maximo('rachaMaxima', this.racha);
          this.racha = 0;
          this.hud.ponerRacha(0);
        }
      }
      this.particulas.actualizar(dt);
      this.trozos.actualizar(dt);
      // Logros: se comprueban cada dos segundos contra las estadísticas.
      this.tiempoLogros -= dt;
      if (this.tiempoLogros <= 0) {
        this.tiempoLogros = 2;
        const nuevos = this.logros.comprobar(this.contador.datos);
        if (nuevos.length) { this.hud.avisar(`Logro: ${nuevos.map((l) => l.nombre).join(' · ')}`, 3); this.audio.fanfarria(); }
      }
    }

    performance.mark('u7');
    const pos = this.aPie ? this.peaton.posicion : this.vehiculo.posicion;
    const v = this.aPie ? this.peaton.cuerpo.linvel() : this.vehiculo.cuerpo.linvel();
    // Recorrido: se acumula lo andado o rodado, sin contar teletransportes (parada, trincao).
    const tramo = Math.hypot(pos.x - this.ultimaPos.x, pos.z - this.ultimaPos.z);
    if (this.jugando && !this.pausado && tramo < 30) this.contador.sumar('metros', tramo);
    this.ultimaPos.set(pos.x, 0, pos.z);
    this.camara.distanciaObjetivo = this.aPie ? 50 : this.coche ? (this.coche.apariencia?.nombre === 'el 13' ? 84 : 72) : 66;
    this.camara.seguir(pos, new THREE.Vector3(v.x, 0, v.z), dt);
    if (this.repeticion.activa) this.repeticion.actualizar(dt, this.camara.camara);
    this.marcador.actualizar(pos.x, pos.z, this.aPie ? 2.6 : this.coche ? 2.2 : 2.6, dt);
    if (this.jugando) this.cielo.actualizar(dt);
    this.cielo.colocarSol(pos.x, pos.z);
    this.hud.ponerHora(this.cielo.textoHora);
    if (this.jugando && !this.sinMinimapa) {
      const rumbo = this.aPie ? Math.atan2(v.x, -v.z) : this.vehiculo.estado.rumbo;
      const destinoRecado: [number, number] | undefined = this.recadero.estado === 'en_curso' && this.recadero.destino ? [this.recadero.destino.x, this.recadero.destino.z] : undefined;
      const siguiente = this.carrera.estado === 'en_curso' ? b.grafo.nodos[this.carrera.siguiente] : destinoRecado;
      this.minimapa.actualizar(dt, {
        jugador: { x: pos.x, z: pos.z, rumbo: this.aPie && Math.hypot(v.x, v.z) < 0.5 ? this.scooter.estado.rumbo : rumbo },
        paradas: b.paradas.lista,
        patrullas: b.patrullas.lista,
        mecheros: b.mecheros.posiciones.filter((_, i) => !b.mecheros.recogidos.has(i)).map(([x, z]) => ({ x, z })),
        objetivo: siguiente ? { x: siguiente[0], z: siguiente[1] } : null,
        rampas: b.rampas.posiciones.map(([x, z]) => ({ x, z })),
      });
    }

    this.hud.ponerVelocidad(this.aPie ? this.peaton.velocidad : this.vehiculo.estado.velocidad);
    this.tiempoCalle += dt;
    if (this.tiempoCalle > 0.3) {
      this.tiempoCalle = 0;
      b.trastos.gestionarRadio(pos.x, pos.z);
      b.trafico.gestionarRadio(pos.x, pos.z);
      const via = viaMasCercana(b.nivel, pos.x, pos.z);
      this.hud.ponerCalle(via?.nombre || (via ? 'Pasaje' : b.nivel.nombre));
      if (this.jugando && !this.pausado) this.actualizarPistas(pos, 0.3);
      // Al río: en Triana el Guadalquivir es zona de agua; caer dentro te devuelve a la parada.
      if (this.jugando && this.tiempoTrincao <= 0 && b.nivel.zonas.some((z) => z.clase === 'water' && dentroDePoligono(pos.x, pos.z, z.poligono))) {
        this.hud.avisar(this.aPie ? '¡Al Guadalquivir! Wifly no sabe nadar' : '¡La moto al Guadalquivir!', 2.6);
        this.audio.golpe(8);
        this.particulas.emitir(pos.x, 0.3, pos.z, 40, new THREE.Color('#9fd3e8'), 6);
        this.abandonarCarrera(null);
        this.abandonarRecado(null);
        this.contador.sumar('chapuzones');
        this.volverAlArranque();
      }
      // A pie y junto a una parada, el botón de acción pasa a ser "EL 13".
      const parada = this.aPie ? b.paradas.cercana(pos.x, pos.z, RADIO_PARADA) : null;
      const enParada = !!parada;
      if (enParada !== this.enParada) {
        this.enParada = enParada;
        if (this.aPie) this.botonAccion.textContent = enParada ? 'EL 13' : 'SUBIR';
        if (enParada && parada) this.hud.avisar(`${parada.nombre.split(' (')[0]} · E: el 13 a ${BARRIOS[parada.destino]?.nombre.split(' ·')[0] ?? '?'}`, 2.4);
      }
    }
    const acelerando = !this.aPie && Math.hypot(this.controles.eje.x, this.controles.eje.y) > 0.2 && !this.controles.freno;
    this.audio.actualizar(this.aPie ? 0 : this.vehiculo.estado.velocidad, acelerando, !this.aPie && this.vehiculo.estado.derrapando, dt, !!this.coche);
    this.audio.silenciarMotor(this.aPie);
    this.tiempoGuardado += dt;
    if (this.tiempoGuardado > 5) { this.tiempoGuardado = 0; this.guardar(); }
    performance.mark('u8');
    performance.measure('u-resto', 'u7', 'u8');
  }
}
