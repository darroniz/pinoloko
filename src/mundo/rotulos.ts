// Rótulos con el nombre real de bares y comercios (etiqueta `name` de OSM). Se pintan todos
// en un atlas de canvas y se funden en una sola malla; cada rótulo es un cartel inclinado
// hacia la cámara (que nunca gira, así que la inclinación es fija) y, si el local está dentro
// de un edificio, va sobre la azotea, que es lo que se ve desde arriba.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Nivel, Poi } from './tipos';
import { dentroDePoligono } from './geometria';

const SIN_ROTULO = new Set(['bus_stop', 'parking', 'parking_space', 'parking_entrance', 'recycling', 'school', 'kindergarten', 'place_of_worship', 'bicycle_parking', 'bench', 'waste_basket', 'atm', 'vending_machine', 'fountain', 'toilets', 'post_box', 'taxi', 'charging_station', 'community_centre', 'social_facility', 'townhall', 'police', 'drinking_water', 'university', 'college', 'clock', 'public_bookcase', 'motorcycle_parking', 'loading_dock', 'shelter']);
const COLOR_CLASE: Record<string, string> = {
  bar: '#c62828', pub: '#c62828', cafe: '#8d5524', restaurant: '#b5451b', fast_food: '#d97706', ice_cream: '#db2777', bakery: '#a16207',
  pharmacy: '#15803d', chemist: '#15803d', bank: '#1e40af', supermarket: '#1d4ed8', convenience: '#1d4ed8', marketplace: '#c2410c',
  hairdresser: '#7c3aed', beauty: '#7c3aed', clothes: '#0e7490', shoes: '#0e7490', library: '#4338ca', florist: '#be185d', tobacco: '#78350f',
};
const CELDA_ANCHO = 256, CELDA_ALTO = 48, COLUMNAS = 8;
const INCLINACION = THREE.MathUtils.degToRad(58);

export class Rotulos {
  readonly grupo = new THREE.Group();
  readonly cuantos: number;

  constructor(nivel: Nivel) {
    const pois = nivel.pois.filter((p) => p.nombre && !SIN_ROTULO.has(p.clase));
    this.cuantos = pois.length;
    this.grupo.name = 'rotulos';
    if (!pois.length) return;
    const filas = Math.ceil(pois.length / COLUMNAS);
    const alto = Math.min(4096, THREE.MathUtils.ceilPowerOfTwo(filas * CELDA_ALTO));
    const lienzo = document.createElement('canvas');
    lienzo.width = CELDA_ANCHO * COLUMNAS;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    const piezas: THREE.BufferGeometry[] = [];
    pois.forEach((poi, i) => {
      if (i >= Math.floor(alto / CELDA_ALTO) * COLUMNAS) return;
      const col = i % COLUMNAS, fila = Math.floor(i / COLUMNAS);
      const texto = this.pintar(ctx, col * CELDA_ANCHO, fila * CELDA_ALTO, poi);
      // Tamaño del cartel según el texto, para que quepa legible desde 66 m de altura.
      const ancho = Math.max(5, Math.min(11, 3.2 + texto.length * 0.42));
      const altoCartel = ancho * (CELDA_ALTO / CELDA_ANCHO);
      const g = new THREE.PlaneGeometry(ancho, altoCartel);
      const uv = g.getAttribute('uv') as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) {
        uv.setXY(k, (col + uv.getX(k)) * (CELDA_ANCHO / lienzo.width), 1 - ((fila + 1 - uv.getY(k)) * CELDA_ALTO) / lienzo.height);
      }
      const edificio = nivel.edificios.find((e) => dentroDePoligono(poi.x, poi.z, e.poligono));
      const y = edificio ? edificio.altura + 0.4 + altoCartel / 2 : 4;
      g.rotateX(-INCLINACION).translate(poi.x, y, poi.z);
      piezas.push(g);
    });
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.minFilter = THREE.LinearMipmapLinearFilter;
    textura.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: textura, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide });
    const malla = new THREE.Mesh(mergeGeometries(piezas, false), material);
    malla.frustumCulled = false;
    this.grupo.add(malla);
  }

  /** Pinta la celda del rótulo: tablero redondeado del color del gremio y el nombre en blanco. */
  private pintar(ctx: CanvasRenderingContext2D | null, x: number, y: number, poi: Poi): string {
    let texto = poi.nombre.trim();
    if (texto.length > 26) texto = `${texto.slice(0, 24)}…`;
    if (!ctx) return texto;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, CELDA_ANCHO - 6, CELDA_ALTO - 6, 10);
    ctx.fillStyle = COLOR_CLASE[poi.clase] ?? '#374151';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let tam = 30;
    ctx.font = `bold ${tam}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    while (ctx.measureText(texto).width > CELDA_ANCHO - 24 && tam > 16) {
      tam -= 2;
      ctx.font = `bold ${tam}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    }
    ctx.fillText(texto, x + CELDA_ANCHO / 2, y + CELDA_ALTO / 2 + 1);
    ctx.restore();
    return texto;
  }
}
