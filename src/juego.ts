// El juego: escena, bucle, física y sincronización entre módulos.
import * as THREE from 'three';
import { CamaraAlta } from './camara';
import { Controles } from './control/entrada';
import { MundoFisico, PASO_FISICA } from './fisica/mundo';
import { MODELOS, Scooter } from './fisica/scooter';
import { Peaton } from './fisica/peaton';
import { Coche, COLORES_COCHE } from './fisica/coche';
import { Trafico } from './mundo/trafico';
import { Vecinos } from './mundo/peatones';
import { construirArboles, construirAzoteas } from './mundo/azoteas';
import { GrafoBarrio, viaMasCercana } from './mundo/grafo';
import { cargarNivel, construirBarrio, COLORES } from './mundo/nivel';
import { dentroDePoligono } from './mundo/geometria';
import type { Nivel } from './mundo/tipos';
import { Hud } from './ui/hud';
import { AudioJuego } from './audio/motor';
import { cargarPartida, guardarPartida } from './guardado';
import { FRASES, Trastos } from './mundo/trastos';
import { MarcasNeumatico } from './efectos/marcas';
import { Particulas } from './efectos/particulas';
import { MarcadorJugador } from './efectos/marcador';
import { NivelBusqueda } from './policia/busqueda';
import { Patrullas } from './policia/patrullas';

declare global {
  interface Window {
    __pv_frames: number;
    __pv_listo: boolean;
    __pv_jugando: boolean;
    __pv_info: () => unknown;
    __pv_escena: THREE.Scene;
    __pv_prueba: { robarCoche: () => boolean; calor: (n: number) => void };
  }
}

export type Calidad = 'alta' | 'baja';

const SIN_ENTRADA = { eje: { x: 0, y: 0 }, freno: true, accion: false };

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
  private fisica!: MundoFisico;
  private scooter!: Scooter;
  private nivel!: Nivel;
  private grafo!: GrafoBarrio;
  private sol!: THREE.DirectionalLight;
  private acumulador = 0;
  private ultimoTiempo = 0;
  private jugando = false;
  private dinero = 0;
  private tiempoGuardado = 0;
  private tiempoCalle = 0;
  private lienzo: HTMLCanvasElement;
  private trastos!: Trastos;
  private marcas = new MarcasNeumatico();
  private particulas = new Particulas();
  private marcador = new MarcadorJugador();
  private busqueda = new NivelBusqueda();
  private patrullas!: Patrullas;
  private tiempoTrincao = 0;
  private motosRobadas = new Set<Scooter>();
  private rndPolicia = () => Math.random();
  private arranque = { x: 0, z: 0, rumbo: 0 };
  private racha = 0;
  private tiempoRacha = 0;
  private colorChispa = new THREE.Color('#ffd166');
  private colorPolvo = new THREE.Color('#d8c9a8');
  private scooters: Scooter[] = [];
  private peaton!: Peaton;
  private vecinos!: Vecinos;
  private aPie = false;
  private coche: Coche | null = null;
  private coches: Coche[] = [];
  private trafico!: Trafico;
  private botonAccion = document.getElementById('boton-accion')!;
  private tiempoInsulto = 0;
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
    );
    window.addEventListener('resize', () => this.redimensionar());
    window.__pv_frames = 0;
    window.__pv_listo = false;
    window.__pv_jugando = false;
  }

  async cargar(): Promise<void> {
    const [nivel, fisica] = await Promise.all([cargarNivel('/barrios/pino-montano/nivel.json'), MundoFisico.crear()]);
    this.nivel = nivel;
    this.fisica = fisica;
    this.grafo = new GrafoBarrio(nivel.grafo);

    const barrio = construirBarrio(nivel, { bordes: this.calidad === 'alta', ligero: this.calidad === 'baja' });
    this.escena.add(barrio.grupo);
    this.escena.add(construirAzoteas(nivel));
    const arboles = construirArboles(nivel);
    this.escena.add(arboles.grupo);

    fisica.crearSueloYLimites(nivel.tamano[0], nivel.tamano[1]);
    fisica.crearEdificios(barrio.colisionEdificios.vertices, barrio.colisionEdificios.indices);

    this.trastos = new Trastos(fisica);
    this.trastos.poblar(nivel, arboles.posiciones);

    this.escena.add(this.trastos.grupo, this.marcas.malla, this.particulas.puntos, this.marcador.grupo);

    // Luz: hemisferio cálido y un sol con sombras suaves que sigue al jugador.
    this.escena.add(new THREE.HemisphereLight('#ffffff', '#c9b69a', 0.85));
    this.sol = new THREE.DirectionalLight('#fff3dc', 1.6);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(this.calidad === 'alta' ? 2048 : 512, this.calidad === 'alta' ? 2048 : 512);
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

    // Arranque: en la calle rodada más cercana al Mercado, mirando a lo largo de ella.
    const nodoInicio = this.grafo.masCercano(0, 0, 'rodada');
    const [ix, iz] = this.grafo.nodos[nodoInicio] ?? [0, 0];
    const vecino = this.grafo.vecinos(nodoInicio, 'rodada')[0];
    const [vx, vz] = vecino ? this.grafo.nodos[vecino.nodo]! : [ix, iz - 1];
    const arranque = { x: ix, z: iz, rumbo: Math.atan2(vx - ix, -(vz - iz)) };
    this.arranque = arranque;
    const partida = cargarPartida();
    const inicio = partida ?? arranque;
    this.dinero = partida?.dinero ?? 0;
    this.scooter = new Scooter(fisica, inicio.x, inicio.z, inicio.rumbo, MODELOS[partida?.modelo ?? 0] ?? MODELOS[0]);
    this.scooter.montar(true);
    this.scooters.push(this.scooter);
    this.escena.add(this.scooter.malla);
    this.aparcarScooters(nivel);
    this.peaton = new Peaton(fisica, inicio.x, inicio.z);
    this.escena.add(this.peaton.malla);
    this.vecinos = new Vecinos(this.grafo, 110);
    this.escena.add(this.vecinos.grupo);
    this.trafico = new Trafico(fisica, this.grafo, 14);
    this.escena.add(this.trafico.grupo);
    this.patrullas = new Patrullas(fisica, this.grafo);
    this.escena.add(this.patrullas.grupo);
    this.motosRobadas.add(this.scooter);
    this.aparcarCoches(nivel);
    if (partida?.aPie) this.bajarse();
    this.trastos.gestionarRadio(inicio.x, inicio.z);
    this.camara.colocar(inicio.x, inicio.z);
    this.hud.ponerDinero(this.dinero);
    this.hud.ponerCalle(nivel.nombre);

    document.addEventListener('visibilitychange', () => { if (document.hidden) this.guardar(); });
    window.__pv_listo = true;
    window.__pv_escena = this.escena;
    // Ganchos para la sonda de verificación: forzar situaciones que no se pueden guionizar con teclas.
    window.__pv_prueba = {
      calor: (n: number) => { this.busqueda.calor = n; },
      robarCoche: () => {
        const c = this.trafico.lista[0];
        if (!c) return false;
        if (!this.aPie) this.bajarse();
        this.peaton.aparecer(c.x + 2, c.z, 0);
        return this.subirse() && this.coche !== null;
      },
    };
    window.__pv_info = () => ({ calidad: this.calidad, render: { ...this.renderer.info.render }, memoria: { ...this.renderer.info.memory }, scooter: { ...this.scooter.estado }, eje: { ...this.controles.eje }, trastos: this.trastos.lista.length, activos: this.trastos.activos, despiertos: this.trastos.lista.filter((t) => t.cuerpo && !t.cuerpo.isSleeping()).length, cuerpos: this.fisica.world.bodies.len(), aPie: this.aPie, enCoche: !!this.coche, estrellas: this.busqueda.estrellas, calor: Math.round(this.busqueda.calor), patrullas: this.patrullas.lista.map((p) => [p.tipo, Math.round(p.x), Math.round(p.z), p.directo]), dentroEdificio: this.nivel.edificios.some((ed) => dentroDePoligono(this.vehiculo.estado.x, this.vehiculo.estado.z, ed.poligono)), vehiculo: [this.vehiculo.estado.x, this.vehiculo.estado.z, this.vehiculo.estado.velocidad], trafico: this.trafico.lista.length, peaton: [this.peaton.posicion.x, this.peaton.posicion.z], vecinosCerca: this.vecinos.lista.filter((v) => (v.x - this.scooter.estado.x) ** 2 + (v.z - this.scooter.estado.z) ** 2 < 60 * 60).length });
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  /** Motos aparcadas por el barrio para robar: junto a los bares, el mercado y en los pasajes. */
  private aparcarScooters(nivel: Nivel): void {
    const rnd = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const sitios: { x: number; z: number }[] = [];
    for (const poi of nivel.pois) if (['bar', 'marketplace', 'supermarket', 'pharmacy', 'bank', 'library', 'school'].includes(poi.clase)) sitios.push(poi);
    let i = 0;
    for (const sitio of sitios) {
      if (i >= 14) break;
      const nodo = this.grafo.masCercano(sitio.x, sitio.z, 'peatonal');
      const [nx, nz] = this.grafo.nodos[nodo] ?? [sitio.x, sitio.z];
      const x = nx + (rnd(i) - 0.5) * 3, z = nz + (rnd(i + 50) - 0.5) * 3;
      if (Math.hypot(x - this.scooter.estado.x, z - this.scooter.estado.z) < 6) continue;
      const modelo = MODELOS[(i + 1) % MODELOS.length]!;
      const moto = new Scooter(this.fisica, x, z, rnd(i + 100) * Math.PI * 2, modelo);
      this.scooters.push(moto);
      this.escena.add(moto.malla);
      i++;
    }
  }

  /** Coches aparcados en el arcén de las calles rodadas. */
  private aparcarCoches(nivel: Nivel): void {
    const rnd = (n: number) => ((Math.sin(n * 78.233) * 43758.5453) % 1 + 1) % 1;
    let i = 0;
    for (const via of nivel.vias) {
      if (via.clase !== 'rodada' || via.tipo === 'service' || i >= 12) continue;
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
      this.escena.add(coche.malla);
      i++;
    }
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
    let mejorMoto: Scooter | null = null, mejorD = 3.2 * 3.2;
    for (const m of this.scooters) {
      const d = (m.estado.x - p.x) ** 2 + (m.estado.z - p.z) ** 2;
      if (d < mejorD) { mejorD = d; mejorMoto = m; }
    }
    let mejorCoche: Coche | null = null, mejorDc = 4.2 * 4.2;
    for (const c of this.coches) {
      const d = (c.estado.x - p.x) ** 2 + (c.estado.z - p.z) ** 2;
      if (d < mejorDc) { mejorDc = d; mejorCoche = c; }
    }
    const delTrafico = this.trafico.masCercano(p.x, p.z, 4.2);
    const dTrafico = delTrafico ? (delTrafico.x - p.x) ** 2 + (delTrafico.z - p.z) ** 2 : Infinity;

    if (delTrafico && dTrafico < mejorD && dTrafico < mejorDc) {
      // Robo en marcha: el coche sale del tráfico y pasa a ser un coche de verdad.
      const c = new Coche(this.fisica, delTrafico.x, delTrafico.z, delTrafico.rumbo, delTrafico.color);
      this.trafico.quitar(delTrafico);
      this.coches.push(c);
      this.escena.add(c.malla);
      mejorCoche = c;
      mejorDc = 0;
      this.hud.avisar(['¡Fuera del coche, hombre!', '¡Baja, que llevo prisa!', '¡Esto es un préstamo!'][Math.floor(Math.random() * 3)]!, 1.8);
      this.busqueda.fechoria('robo_coche');
    }
    if (mejorCoche && mejorDc < mejorD) {
      this.coche = mejorCoche;
      this.coche.montar(true);
    } else if (mejorMoto) {
      if (!this.motosRobadas.has(mejorMoto)) {
        this.motosRobadas.add(mejorMoto);
        this.hud.avisar(`${mejorMoto.modelo.nombre}: ¡mía!`, 1.8);
        this.busqueda.fechoria('robo_moto');
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
    const cambio = this.busqueda.actualizar(dt);
    if (cambio > 0) this.hud.avisar(this.busqueda.estrellas >= 3 ? '¡Las motos de la Local!' : '¡Que viene la Local!', 1.8);
    this.hud.ponerEstrellas(this.busqueda.estrellas);

    const dotacion = this.busqueda.dotacion;
    const coches = this.patrullas.lista.filter((p) => p.tipo === 'coche');
    const motos = this.patrullas.lista.filter((p) => p.tipo === 'moto');
    if (coches.length < dotacion.coches) this.patrullas.aparecer('coche', pos, this.rndPolicia);
    if (motos.length < dotacion.motos) this.patrullas.aparecer('moto', pos, this.rndPolicia);
    // Sobran: se retira la más lejana (se va por donde vino).
    const lejana = (lista: typeof coches): typeof coches[number] | undefined =>
      lista.sort((a, b) => Math.hypot(b.x - pos.x, b.z - pos.z) - Math.hypot(a.x - pos.x, a.z - pos.z))[0];
    if (coches.length > dotacion.coches) { const p = lejana(coches); if (p) this.patrullas.retirar(p); }
    if (motos.length > dotacion.motos) { const p = lejana(motos); if (p) this.patrullas.retirar(p); }

    const via = viaMasCercana(this.nivel, pos.x, pos.z, 6);
    const enPasaje = via?.clase === 'peatonal';
    const r = this.patrullas.actualizar({ x: pos.x, z: pos.z, rapidez, enPasaje }, dt);
    if (r.visto) this.busqueda.visto();
    if (r.choques > 0) { this.busqueda.fechoria('choque_patrulla', r.choques); this.hud.avisar('¡Le has dado a la patrulla!', 1.5); }
    let cercania = 0;
    for (const p of this.patrullas.lista) cercania = Math.max(cercania, 1 - Math.min(1, Math.hypot(p.x - pos.x, p.z - pos.z) / 70));
    this.audio.actualizarSirena(this.patrullas.lista.length > 0, cercania, dt);
    if (r.trincado) this.trincar();
  }

  private trincar(): void {
    this.tiempoTrincao = 3;
    this.hud.mostrarTrincao(true);
    this.hud.ponerEstrellas(0);
    this.busqueda.limpiar();
    this.patrullas.retirarTodas();
    this.dinero = Math.max(0, Math.floor(this.dinero * 0.8));
    this.hud.ponerDinero(this.dinero);
    this.racha = 0;
    this.hud.ponerRacha(0);
    this.audio.claxon();
    // Te sueltan en el Mercado, con tu moto de siempre.
    if (this.coche) { this.coche.montar(false); this.coche = null; }
    if (this.aPie) { this.peaton.esconder(); this.aPie = false; }
    this.scooter.teletransportar(this.arranque.x, this.arranque.z, this.arranque.rumbo);
    this.scooter.montar(true);
    this.botonAccion.textContent = 'BAJAR';
    this.camara.colocar(this.arranque.x, this.arranque.z);
    this.trastos.gestionarRadio(this.arranque.x, this.arranque.z);
    this.guardar();
  }

  empezar(): void {
    if (this.jugando) return;
    this.jugando = true;
    this.audio.arrancar();
    window.__pv_jugando = true;
    this.hud.avisar('Dale caña, Wifly', 2.5);
    this.botonAccion.textContent = this.aPie ? 'SUBIR' : 'BAJAR';
  }

  private redimensionar(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camara.redimensionar(window.innerWidth / window.innerHeight);
  }

  private guardar(): void {
    if (!this.scooter) return;
    const pos = this.aPie ? this.peaton.posicion : this.vehiculo.posicion;
    guardarPartida({ x: pos.x, z: pos.z, rumbo: this.scooter.estado.rumbo, dinero: this.dinero, aPie: this.aPie, modelo: MODELOS.indexOf(this.scooter.modelo) });
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

  private actualizar(dt: number): void {
    this.controles.actualizar();
    if (this.jugando) {
      this.acumulador += dt;
      let pasos = 0;
      if (this.controles.accion) {
        if (this.aPie) { if (!this.subirse()) this.hud.avisar('No hay moto a mano', 1.2); }
        else if (Math.abs(this.vehiculo.estado.velocidad) < 2.5) this.bajarse();
        else this.hud.avisar('Frena antes de bajarte', 1.2);
      }
      while (this.acumulador >= PASO_FISICA && pasos < 2) {
        const entrada = this.tiempoTrincao > 0 ? SIN_ENTRADA : this.controles;
        if (this.aPie) this.peaton.actualizar(entrada, PASO_FISICA);
        else if (this.coche) this.coche.actualizar(entrada, PASO_FISICA);
        else this.scooter.actualizar(entrada, PASO_FISICA);
        this.trafico.actualizar(this.aPie ? this.peaton.posicion : this.vehiculo.estado, PASO_FISICA);
        this.fisica.paso();
        for (const m of this.scooters) { if (m === this.scooter && !this.aPie && !this.coche) m.despuesDelPaso(); else m.reposo(); }
        for (const c of this.coches) { if (c === this.coche && !this.aPie) c.despuesDelPaso(); else c.reposo(); }
        if (this.aPie) this.peaton.sincronizar();
        this.acumulador -= PASO_FISICA;
        pasos++;
      }
      if (pasos === 2) this.acumulador = 0;
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
      const eventos = this.vecinos.actualizar({ x: jugadorPos.x, z: jugadorPos.z, rapidez }, dt);
      this.tiempoInsulto -= dt;
      if (eventos.insulto && this.tiempoInsulto <= 0) { this.hud.avisar(eventos.insulto, 1.8); this.tiempoInsulto = 2.5; }
      if (eventos.atropellos > 0) {
        this.racha += eventos.atropellos;
        this.tiempoRacha = 3;
        this.dinero += 25 * eventos.atropellos;
        this.hud.ponerDinero(this.dinero);
        this.hud.ponerRacha(this.racha);
        this.hud.avisar(['¡Atropello!', '¡Al suelo, vecino!', '¡Uy, uy, uy!', '¡Que era el del quinto!'][Math.floor(Math.random() * 4)]!, 1.5);
        this.camara.sacudir(0.35);
        this.audio.golpe(4);
        this.busqueda.fechoria('atropello', eventos.atropellos);
      }
      this.actualizarPolicia(jugadorPos, rapidez, dt);

      // Trastos derribados: dinero, racha y frase de barrio.
      const derribados = this.trastos.actualizar(jugadorPos.x, jugadorPos.z);
      if (derribados.length) {
        this.tiempoRacha = 3;
        for (const t of derribados) {
          this.racha++;
          const multiplicador = Math.min(5, 1 + Math.floor(this.racha / 3));
          this.dinero += t.valor * multiplicador;
          const frases = FRASES[t.tipo];
          const frase = frases[Math.floor(Math.random() * frases.length)]!;
          this.hud.avisar(multiplicador > 1 ? `${frase}  ×${multiplicador}` : frase, 1.6);
          const p = t.malla.position;
          this.particulas.emitir(p.x, p.y + 0.3, p.z, 8, this.colorPolvo, 3);
        }
        this.hud.ponerDinero(this.dinero);
        this.hud.ponerRacha(this.racha);
        this.busqueda.fechoria('trasto', derribados.length);
      }
      if (this.tiempoRacha > 0) {
        this.tiempoRacha -= dt;
        if (this.tiempoRacha <= 0 && this.racha > 0) {
          if (this.racha >= 6) this.hud.avisar(`Lío armado: ${this.racha} trastos`, 2.2);
          this.racha = 0;
          this.hud.ponerRacha(0);
        }
      }
      this.particulas.actualizar(dt);
    }

    const pos = this.aPie ? this.peaton.posicion : this.vehiculo.posicion;
    const v = this.aPie ? this.peaton.cuerpo.linvel() : this.vehiculo.cuerpo.linvel();
    this.camara.seguir(pos, new THREE.Vector3(v.x, 0, v.z), dt);
    this.marcador.actualizar(pos.x, pos.z, this.aPie ? 2.6 : this.coche ? 2.2 : 2.6, dt);
    this.sol.position.set(pos.x + 60, 120, pos.z + 40);
    this.sol.target.position.set(pos.x, 0, pos.z);

    this.hud.ponerVelocidad(this.aPie ? this.peaton.velocidad : this.vehiculo.estado.velocidad);
    this.tiempoCalle += dt;
    if (this.tiempoCalle > 0.3) {
      this.tiempoCalle = 0;
      this.trastos.gestionarRadio(pos.x, pos.z);
      const via = viaMasCercana(this.nivel, pos.x, pos.z);
      this.hud.ponerCalle(via?.nombre || (via ? 'Pasaje' : this.nivel.nombre));
    }
    const acelerando = !this.aPie && Math.hypot(this.controles.eje.x, this.controles.eje.y) > 0.2 && !this.controles.freno;
    this.audio.actualizar(this.aPie ? 0 : this.vehiculo.estado.velocidad, acelerando, !this.aPie && this.vehiculo.estado.derrapando, dt, !!this.coche);
    this.audio.silenciarMotor(this.aPie);
    this.tiempoGuardado += dt;
    if (this.tiempoGuardado > 5) { this.tiempoGuardado = 0; this.guardar(); }
  }
}
