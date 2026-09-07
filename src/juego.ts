// El juego: escena, bucle, física y sincronización entre módulos.
import * as THREE from 'three';
import { CamaraAlta } from './camara';
import { Controles } from './control/entrada';
import { MundoFisico, PASO_FISICA } from './fisica/mundo';
import { MODELOS, Scooter } from './fisica/scooter';
import { Peaton } from './fisica/peaton';
import { Vecinos } from './mundo/peatones';
import { construirArboles, construirAzoteas } from './mundo/azoteas';
import { GrafoBarrio, viaMasCercana } from './mundo/grafo';
import { cargarNivel, construirBarrio, COLORES } from './mundo/nivel';
import type { Nivel } from './mundo/tipos';
import { Hud } from './ui/hud';
import { AudioJuego } from './audio/motor';
import { cargarPartida, guardarPartida } from './guardado';
import { FRASES, Trastos } from './mundo/trastos';
import { MarcasNeumatico } from './efectos/marcas';
import { Particulas } from './efectos/particulas';

declare global {
  interface Window {
    __pv_frames: number;
    __pv_listo: boolean;
    __pv_jugando: boolean;
    __pv_info: () => unknown;
    __pv_escena: THREE.Scene;
  }
}

export type Calidad = 'alta' | 'baja';

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
  private racha = 0;
  private tiempoRacha = 0;
  private colorChispa = new THREE.Color('#ffd166');
  private colorPolvo = new THREE.Color('#d8c9a8');
  private scooters: Scooter[] = [];
  private peaton!: Peaton;
  private vecinos!: Vecinos;
  private aPie = false;
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

    this.escena.add(this.trastos.grupo, this.marcas.malla, this.particulas.puntos);

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
    if (partida?.aPie) this.bajarse();
    this.trastos.gestionarRadio(inicio.x, inicio.z);
    this.camara.colocar(inicio.x, inicio.z);
    this.hud.ponerDinero(this.dinero);
    this.hud.ponerCalle(nivel.nombre);

    document.addEventListener('visibilitychange', () => { if (document.hidden) this.guardar(); });
    window.__pv_listo = true;
    window.__pv_escena = this.escena;
    window.__pv_info = () => ({ calidad: this.calidad, render: { ...this.renderer.info.render }, memoria: { ...this.renderer.info.memory }, scooter: { ...this.scooter.estado }, eje: { ...this.controles.eje }, trastos: this.trastos.lista.length, activos: this.trastos.activos, despiertos: this.trastos.lista.filter((t) => t.cuerpo && !t.cuerpo.isSleeping()).length, cuerpos: this.fisica.world.bodies.len(), aPie: this.aPie, peaton: [this.peaton.posicion.x, this.peaton.posicion.z], vecinosCerca: this.vecinos.lista.filter((v) => (v.x - this.scooter.estado.x) ** 2 + (v.z - this.scooter.estado.z) ** 2 < 60 * 60).length });
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

  /** Wifly se baja de la moto y se queda de pie a su lado. */
  private bajarse(): void {
    if (this.aPie) return;
    const e = this.scooter.estado;
    const lado = this.scooter.direccion.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).multiplyScalar(1.2);
    this.scooter.montar(false);
    this.peaton.aparecer(e.x + lado.x, e.z + lado.z, e.rumbo);
    this.aPie = true;
    this.botonAccion.textContent = 'SUBIR';
  }

  /** Se sube a la moto más cercana si hay una a mano. */
  private subirse(): boolean {
    const p = this.peaton.posicion;
    let mejor: Scooter | null = null, mejorD = 3.2 * 3.2;
    for (const m of this.scooters) {
      const d = (m.estado.x - p.x) ** 2 + (m.estado.z - p.z) ** 2;
      if (d < mejorD) { mejorD = d; mejor = m; }
    }
    if (!mejor) return false;
    if (mejor !== this.scooter) this.hud.avisar(`${mejor.modelo.nombre}: ¡mía!`, 1.8);
    this.scooter = mejor;
    this.scooter.montar(true);
    this.peaton.esconder();
    this.aPie = false;
    this.botonAccion.textContent = 'BAJAR';
    return true;
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
    const pos = this.aPie ? this.peaton.posicion : this.scooter.posicion;
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
        else if (Math.abs(this.scooter.estado.velocidad) < 2.5) this.bajarse();
        else this.hud.avisar('Frena antes de bajarte', 1.2);
      }
      while (this.acumulador >= PASO_FISICA && pasos < 3) {
        if (this.aPie) this.peaton.actualizar(this.controles, PASO_FISICA);
        else this.scooter.actualizar(this.controles, PASO_FISICA);
        this.fisica.paso();
        for (const m of this.scooters) { if (m === this.scooter && !this.aPie) m.despuesDelPaso(); else m.reposo(); }
        if (this.aPie) this.peaton.sincronizar();
        this.acumulador -= PASO_FISICA;
        pasos++;
      }
      if (pasos === 3) this.acumulador = 0;
      const e = this.scooter.estado;
      if (e.golpe > 0 && !this.aPie) {
        this.camara.sacudir(e.golpe * 0.06);
        this.audio.golpe(e.golpe);
        this.particulas.emitir(e.x, 0.6, e.z, Math.min(30, Math.round(e.golpe * 2)), this.colorChispa, Math.min(9, e.golpe * 0.8));
      }
      // Marcas y polvo del derrape o de la frenada fuerte.
      const frenando = !this.aPie && this.controles.freno && Math.abs(e.velocidad) > 4;
      if (!this.aPie && (e.derrapando || frenando)) {
        const atras = this.scooter.direccion.multiplyScalar(-0.6);
        this.marcas.pintar(e.x + atras.x, e.z + atras.z, e.derrapando ? 1 : 0.55);
        if (e.derrapando && Math.random() < 0.5) this.particulas.emitir(e.x + atras.x, 0.2, e.z + atras.z, 1, this.colorPolvo, 2);
      } else this.marcas.cortar();

      // Vecinos: pasean, huyen, insultan y se caen si los atropellas.
      const jugadorPos = this.aPie ? this.peaton.posicion : this.scooter.posicion;
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
      }

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

    const pos = this.aPie ? this.peaton.posicion : this.scooter.posicion;
    const v = this.aPie ? this.peaton.cuerpo.linvel() : this.scooter.cuerpo.linvel();
    this.camara.seguir(pos, new THREE.Vector3(v.x, 0, v.z), dt);
    this.sol.position.set(pos.x + 60, 120, pos.z + 40);
    this.sol.target.position.set(pos.x, 0, pos.z);

    this.hud.ponerVelocidad(this.aPie ? this.peaton.velocidad : this.scooter.estado.velocidad);
    this.tiempoCalle += dt;
    if (this.tiempoCalle > 0.3) {
      this.tiempoCalle = 0;
      this.trastos.gestionarRadio(pos.x, pos.z);
      const via = viaMasCercana(this.nivel, pos.x, pos.z);
      this.hud.ponerCalle(via?.nombre || (via ? 'Pasaje' : this.nivel.nombre));
    }
    const acelerando = !this.aPie && Math.hypot(this.controles.eje.x, this.controles.eje.y) > 0.2 && !this.controles.freno;
    this.audio.actualizar(this.aPie ? 0 : this.scooter.estado.velocidad, acelerando, !this.aPie && this.scooter.estado.derrapando, dt);
    this.audio.silenciarMotor(this.aPie);
    this.tiempoGuardado += dt;
    if (this.tiempoGuardado > 5) { this.tiempoGuardado = 0; this.guardar(); }
  }
}
