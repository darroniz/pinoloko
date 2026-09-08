// El juego: escena, bucle, física y sincronización entre módulos. El barrio cargado vive en
// un `Barrio` (escena + física + población); cambiar de barrio es destruirlo y crear otro.
import * as THREE from 'three';
import { CamaraAlta } from './camara';
import { Controles } from './control/entrada';
import { PASO_FISICA } from './fisica/mundo';
import { MODELOS, Scooter } from './fisica/scooter';
import { Peaton } from './fisica/peaton';
import { Coche } from './fisica/coche';
import { viaMasCercana } from './mundo/grafo';
import { COLORES } from './mundo/nivel';
import { dentroDePoligono } from './mundo/geometria';
import { Hud } from './ui/hud';
import { AudioJuego } from './audio/motor';
import { cargarPartida, guardarPartida } from './guardado';
import { FRASES } from './mundo/trastos';
import { MarcasNeumatico } from './efectos/marcas';
import { Particulas } from './efectos/particulas';
import { MarcadorJugador } from './efectos/marcador';
import { NivelBusqueda } from './policia/busqueda';
import { Cielo } from './mundo/cielo';
import { TOTAL_MECHEROS } from './mundo/mecheros';
import { Barrio } from './mundo/barrio';
import { BARRIO_INICIAL, BARRIOS } from './mundo/barrios';
import { Cinematica13 } from './cinematica';
import { Contador, Garaje } from './estadisticas';
import { Menu, type Pestana } from './ui/menu';

declare global {
  interface Window {
    __pv_frames: number;
    __pv_listo: boolean;
    __pv_jugando: boolean;
    __pv_info: () => unknown;
    __pv_escena: THREE.Scene;
    __pv_prueba: { robarCoche: () => boolean; calor: (n: number) => void; hora: (h: number) => void; viajar: () => Promise<string>; barrio: () => string };
  }
}

export type Calidad = 'alta' | 'baja';

const SIN_ENTRADA = { eje: { x: 0, y: 0 }, freno: true, accion: false };
const PASO_MAXIMO = 1 / 20;
const RADIO_PARADA = 5;

/** Sin GPU (SwiftShader, llvmpipe) o forzado por `?calidad=baja`: sin sombras y a DPR 1. */
function detectarCalidad(): Calidad {
  const forzada = new URLSearchParams(location.search).get('calidad');
  if (forzada === 'alta' || forzada === 'baja') return forzada;
  const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
  if (!gl) return 'baja';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const nombre = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software|mesa offscreen/i.test(nombre)) return 'baja';
  return 'alta';
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
  private tiempoControl = 4;
  private contador = new Contador();
  private garaje = new Garaje();
  private menu: Menu;
  private pausado = false;
  private ultimaPos = new THREE.Vector3();
  readonly calidad: Calidad;

  constructor() {
    this.lienzo = document.getElementById('lienzo') as HTMLCanvasElement;
    this.calidad = detectarCalidad();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.lienzo, antialias: this.calidad === 'alta', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.calidad === 'baja' ? 0.5 : Math.min(window.devicePixelRatio, 1.5));
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
      alElegirMoto: (i) => this.cambiarMoto(i),
      alNuevaPartida: () => this.nuevaPartida(),
      alCerrar: () => { this.pausado = false; },
    });
    document.getElementById('boton-menu')!.addEventListener('click', () => this.abrirMenu());
    for (const b of document.querySelectorAll<HTMLElement>('#portada [data-menu]')) b.addEventListener('click', () => this.menu.abrir(b.dataset['menu'] as Pestana));
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;
      if (this.menu.abierto) this.menu.cerrar();
      else if (this.jugando) this.abrirMenu();
    });
    window.__pv_frames = 0;
    window.__pv_listo = false;
    window.__pv_jugando = false;
  }

  async cargar(): Promise<void> {
    this.escena.add(this.marcas.malla, this.particulas.puntos, this.marcador.grupo, this.cine.bus);

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
    // Ganchos para la sonda de verificación: forzar situaciones que no se pueden guionizar con teclas.
    window.__pv_prueba = {
      calor: (n: number) => { this.busqueda.calor = n; },
      hora: (h: number) => { this.cielo.hora = h; },
      barrio: () => this.barrio.ficha.id,
      viajar: async () => { await this.viajar(this.barrio.ficha.destino13); return this.barrio.ficha.id; },
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
      return { calidad: this.calidad, barrio: b.ficha.id, timestep: b.fisica.world.timestep, render: { ...this.renderer.info.render }, memoria: { ...this.renderer.info.memory }, scooter: { ...this.scooter.estado }, eje: { ...this.controles.eje }, trastos: b.trastos.lista.length, activos: b.trastos.activos, despiertos: b.trastos.lista.filter((t) => t.cuerpo && !t.cuerpo.isSleeping()).length, cuerpos: b.fisica.world.bodies.len(), aPie: this.aPie, enCoche: !!this.coche, estrellas: this.busqueda.estrellas, calor: Math.round(this.busqueda.calor), patrullas: b.patrullas.lista.map((p) => [p.tipo, Math.round(p.x), Math.round(p.z), p.directo, Math.round(p.velocidad * 10) / 10, Math.round(Math.hypot(p.cuerpo.linvel().x, p.cuerpo.linvel().z) * 10) / 10, p.ruta.length, Math.round(Math.hypot(p.x - this.vehiculo.estado.x, p.z - this.vehiculo.estado.z)), Math.round(p.tiempoEncima * 10) / 10]), dentroEdificio: b.nivel.edificios.some((ed) => dentroDePoligono(this.vehiculo.estado.x, this.vehiculo.estado.z, ed.poligono)), vehiculo: [this.vehiculo.estado.x, this.vehiculo.estado.z, this.vehiculo.estado.velocidad], salud: Math.round(this.vehiculo.salud), reventados: this.reventado.size, trafico: b.trafico.lista.length, peaton: [this.peaton.posicion.x, this.peaton.posicion.z], vecinosCerca: b.vecinos.lista.filter((v) => (v.x - this.scooter.estado.x) ** 2 + (v.z - this.scooter.estado.z) ** 2 < 60 * 60).length, paradas: b.paradas.lista.length, enParada: this.enParada };
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
    this.reventado.clear();
    this.motosRobadas.clear();
    this.barrio = await Barrio.cargar(ficha, this.calidad, this.escena);
    const inicio = donde ?? this.barrio.arranque;
    const modelo = MODELOS[indiceModelo] ?? MODELOS[0];
    this.scooter = new Scooter(this.barrio.fisica, inicio.x, inicio.z, inicio.rumbo, modelo);
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
    const destino = BARRIOS[this.barrio.ficha.destino13];
    if (!destino) return;
    const dir = this.barrio.direccionCalle(parada.x, parada.z);
    this.peaton.esconder();
    this.busqueda.limpiar();
    this.barrio.patrullas.retirarTodas();
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
    const lado = v.direccion.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).multiplyScalar(this.coche ? 2.2 : 1.2);
    v.montar(false);
    this.peaton.aparecer(e.x + lado.x, e.z + lado.z, e.rumbo);
    this.aPie = true;
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
      // Robo en marcha: el coche sale del tráfico y pasa a ser un coche de verdad.
      const c = new Coche(b.fisica, delTrafico.x, delTrafico.z, delTrafico.rumbo, delTrafico.color);
      b.trafico.quitar(delTrafico);
      b.coches.push(c);
      b.grupo.add(c.malla);
      mejorCoche = c;
      mejorDc = 0;
      this.hud.avisar(['¡Fuera del coche, hombre!', '¡Baja, que llevo prisa!', '¡Esto es un préstamo!'][Math.floor(Math.random() * 3)]!, 1.8);
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
    if (cambio > 0) this.hud.avisar(this.busqueda.estrellas >= 3 ? '¡Las motos de la Local!' : '¡Que viene la Local!', 1.8);
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
    this.hud.mostrarTrincao(true);
    this.hud.ponerEstrellas(0);
    this.busqueda.limpiar();
    this.barrio.patrullas.retirarTodas();
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
  }

  private guardar(): void {
    if (!this.scooter || this.cargandoBarrio || this.cine.activa) return;
    const pos = this.aPie ? this.peaton.posicion : this.vehiculo.posicion;
    guardarPartida({ x: pos.x, z: pos.z, rumbo: this.scooter.estado.rumbo, dinero: this.dinero, aPie: this.aPie, modelo: MODELOS.indexOf(this.scooter.modelo), hora: this.cielo.hora, barrio: this.barrio.ficha.id });
    this.contador.guardar();
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
      if (this.cine.actualizar(dt, this.camara.camara)) void this.viajar(this.barrio.ficha.destino13);
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
        else this.scooter.actualizar(entrada, paso);
        b.trafico.actualizar(this.aPie ? this.peaton.posicion : this.vehiculo.estado, paso);
        b.fisica.paso();
        b.trafico.despuesDelPaso();
        b.patrullas.despuesDelPaso();
        for (const m of b.scooters) { if (m === this.scooter && !this.aPie && !this.coche) m.despuesDelPaso(); else m.reposo(); }
        for (const c of b.coches) { if (c === this.coche && !this.aPie) c.despuesDelPaso(); else c.reposo(); }
        if (this.aPie) this.peaton.sincronizar();
      }
      const e = this.vehiculo.estado;
      if (e.golpe > 0 && !this.aPie) {
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
      const eventos = b.vecinos.actualizar({ x: jugadorPos.x, z: jugadorPos.z, rapidez }, dt);
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
        this.audio.golpe(4);
        this.busqueda.fechoria('atropello', eventos.atropellos);
      }
      this.actualizarPolicia(jugadorPos, rapidez, dt);
      const mechero = b.mecheros.actualizar(jugadorPos.x, jugadorPos.z, dt);
      if (mechero >= 0) {
        this.ganar(10);
        this.hud.ponerMecheros(b.mecheros.cuantos, TOTAL_MECHEROS);
        this.hud.avisar(b.mecheros.cuantos === TOTAL_MECHEROS ? `¡Los 20 mecheros! Eres el rey de ${b.ficha.nombre.split(' ·')[0]}` : `Mechero ${b.mecheros.cuantos}/${TOTAL_MECHEROS}`, 1.6);
        this.audio.claxon();
      }
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
          this.bajarse();
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
      const derribados = b.trastos.actualizar(jugadorPos.x, jugadorPos.z);
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
    }

    const pos = this.aPie ? this.peaton.posicion : this.vehiculo.posicion;
    const v = this.aPie ? this.peaton.cuerpo.linvel() : this.vehiculo.cuerpo.linvel();
    // Recorrido: se acumula lo andado o rodado, sin contar teletransportes (parada, trincao).
    const tramo = Math.hypot(pos.x - this.ultimaPos.x, pos.z - this.ultimaPos.z);
    if (this.jugando && !this.pausado && tramo < 30) this.contador.sumar('metros', tramo);
    this.ultimaPos.set(pos.x, 0, pos.z);
    this.camara.distanciaObjetivo = this.aPie ? 50 : this.coche ? 72 : 66;
    this.camara.seguir(pos, new THREE.Vector3(v.x, 0, v.z), dt);
    this.marcador.actualizar(pos.x, pos.z, this.aPie ? 2.6 : this.coche ? 2.2 : 2.6, dt);
    if (this.jugando) this.cielo.actualizar(dt);
    this.cielo.colocarSol(pos.x, pos.z);
    this.hud.ponerHora(this.cielo.textoHora);

    this.hud.ponerVelocidad(this.aPie ? this.peaton.velocidad : this.vehiculo.estado.velocidad);
    this.tiempoCalle += dt;
    if (this.tiempoCalle > 0.3) {
      this.tiempoCalle = 0;
      b.trastos.gestionarRadio(pos.x, pos.z);
      b.trafico.gestionarRadio(pos.x, pos.z);
      const via = viaMasCercana(b.nivel, pos.x, pos.z);
      this.hud.ponerCalle(via?.nombre || (via ? 'Pasaje' : b.nivel.nombre));
      // A pie y junto a una parada, el botón de acción pasa a ser "EL 13".
      const parada = this.aPie ? b.paradas.cercana(pos.x, pos.z, RADIO_PARADA) : null;
      const enParada = !!parada;
      if (enParada !== this.enParada) {
        this.enParada = enParada;
        if (this.aPie) this.botonAccion.textContent = enParada ? 'EL 13' : 'SUBIR';
        if (enParada && parada) this.hud.avisar(`Parada ${parada.nombre}: pulsa E para coger el 13`, 2.2);
      }
    }
    const acelerando = !this.aPie && Math.hypot(this.controles.eje.x, this.controles.eje.y) > 0.2 && !this.controles.freno;
    this.audio.actualizar(this.aPie ? 0 : this.vehiculo.estado.velocidad, acelerando, !this.aPie && this.vehiculo.estado.derrapando, dt, !!this.coche);
    this.audio.silenciarMotor(this.aPie);
    this.tiempoGuardado += dt;
    if (this.tiempoGuardado > 5) { this.tiempoGuardado = 0; this.guardar(); }
  }
}
