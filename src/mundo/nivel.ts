// Construcción del barrio en Three.js a partir del nivel JSON: suelo, zonas, calles,
// edificios extruidos con color plano por tipo y borde suave.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mallasPorLoseta } from './losetas';
import type { Edificio, Nivel, Punto, Via } from './tipos';
import { distanciaPolilinea, distanciaSegmento2, muestrearPolilinea } from './geometria';

export const COLORES = {
  cielo: '#bfe0f2',
  suelo: '#d9d0bb',
  asfalto: '#6f6f76',
  acera: '#e7dfcb',
  pasaje: '#e2d6bd',
  carril: '#c9b58a',
  parque: '#a3cf86',
  jardin: '#b4d792',
  playground: '#e9c690',
  pitch: '#88bd74',
  parking: '#9c9ca2',
  agua: '#6fb0d8',
  lineaVia: '#f2ead6',
};

export interface BarrioConstruido {
  grupo: THREE.Group;
  /** Geometría de colisión de los edificios (posiciones + índices) para Rapier. */
  colisionEdificios: { vertices: Float32Array; indices: Uint32Array };
}

export async function cargarNivel(url: string): Promise<Nivel> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo cargar el nivel: ${r.status}`);
  return (await r.json()) as Nivel;
}

function formaDe(poligono: Punto[], huecos?: Punto[][]): THREE.Shape {
  const forma = new THREE.Shape(poligono.map(([x, z]) => new THREE.Vector2(x, -z)));
  if (huecos) {
    for (const h of huecos) forma.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  }
  return forma;
}

/** Polígono plano a altura y (para zonas y suelo). */
function geometriaPlana(poligono: Punto[], y: number, color: THREE.Color): THREE.BufferGeometry {
  const g = normalizar(new THREE.ShapeGeometry(formaDe(poligono)));
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  pintar(g, color);
  return g;
}

/** Deja la geometría sin índice, sin uv y con normales: así todas las piezas se pueden fusionar. */
function normalizar(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const sinIndice = g.index ? g.toNonIndexed() : g;
  sinIndice.deleteAttribute('uv');
  if (!sinIndice.getAttribute('normal')) sinIndice.computeVertexNormals();
  return sinIndice;
}

function pintar(g: THREE.BufferGeometry, color: THREE.Color, colorTecho?: THREE.Color): void {
  const n = g.getAttribute('position').count;
  const colores = new Float32Array(n * 3);
  const normales = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  for (let i = 0; i < n; i++) {
    const techo = colorTecho && normales && normales.getY(i) > 0.9;
    const c = techo ? colorTecho : color;
    colores[i * 3] = c.r;
    colores[i * 3 + 1] = c.g;
    colores[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
}

/** Cinta de una vía: un cuadrilátero por segmento más un disco en cada vértice para cerrar las juntas. */
type Pieza = { geometria: THREE.BufferGeometry; x: number; z: number };

function geometriaVia(via: Via, y: number, color: THREE.Color, anchoExtra = 0): Pieza[] {
  const piezas: Pieza[] = [];
  const medio = via.ancho / 2 + anchoExtra;
  const pts = via.puntos;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i]!;
    const [bx, bz] = pts[i + 1]!;
    const dx = bx - ax, dz = bz - az;
    const l = Math.hypot(dx, dz);
    if (l < 0.01) continue;
    const nx = (-dz / l) * medio, nz = (dx / l) * medio;
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz,
      ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    pintar(g, color);
    piezas.push({ geometria: g, x: (ax + bx) / 2, z: (az + bz) / 2 });
  }
  for (const [x, z] of pts) {
    const g = normalizar(new THREE.CircleGeometry(medio, 10));
    g.rotateX(-Math.PI / 2);
    g.translate(x, y, z);
    pintar(g, color);
    piezas.push({ geometria: g, x, z });
  }
  return piezas;
}

/** Línea discontinua central en las calles rodadas. */
function geometriaLineaCentral(via: Via, y: number, color: THREE.Color): Pieza[] {
  const piezas: Pieza[] = [];
  if (via.tipo === 'service' || via.ancho < 5) return piezas;
  for (const m of muestrearPolilinea(via.puntos, 6, 2)) {
    const g = normalizar(new THREE.PlaneGeometry(0.25, 2.2));
    g.rotateX(-Math.PI / 2);
    g.rotateY(-Math.atan2(m.tz, m.tx) + Math.PI / 2);
    g.translate(m.x, y, m.z);
    pintar(g, color);
    piezas.push({ geometria: g, x: m.x, z: m.z });
  }
  return piezas;
}

function geometriaEdificio(e: Edificio): THREE.BufferGeometry {
  const forma = formaDe(e.poligono, e.huecos);
  const g = normalizar(new THREE.ExtrudeGeometry(forma, { depth: e.altura, bevelEnabled: false, steps: 1 }));
  g.rotateX(-Math.PI / 2);
  const base = new THREE.Color(e.color);
  const techo = base.clone().multiplyScalar(0.9).lerp(new THREE.Color('#b9a78f'), 0.35);
  g.computeVertexNormals();
  pintar(g, base, techo);
  return g;
}

export function construirBarrio(nivel: Nivel, opciones: { bordes?: boolean; ligero?: boolean } = {}): BarrioConstruido {
  const grupo = new THREE.Group();
  grupo.name = 'barrio';
  const materialSuelo = new THREE.MeshLambertMaterial({ vertexColors: true });
  const materialVias = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });

  // Suelo: un poco más grande que la caja, con margen para no ver el borde del mundo.
  const [w, h] = nivel.tamano;
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(w + 400, h + 400), new THREE.MeshLambertMaterial({ color: COLORES.suelo }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  suelo.name = 'suelo';
  grupo.add(suelo);

  // Zonas verdes y aparcamientos.
  const zonas: Pieza[] = [];
  for (const z of nivel.zonas) {
    const color = new THREE.Color(
      z.clase === 'park' ? COLORES.parque : z.clase === 'garden' ? COLORES.jardin
        : z.clase === 'playground' ? COLORES.playground : z.clase === 'pitch' ? COLORES.pitch
        : z.clase === 'parking' ? COLORES.parking : z.clase === 'water' ? COLORES.agua : COLORES.jardin,
    );
    const [px, pz] = z.poligono[0]!;
    zonas.push({ geometria: geometriaPlana(z.poligono, 0.01, color), x: px, z: pz });
  }
  if (zonas.length) grupo.add(mallasPorLoseta(zonas, materialSuelo, { nombre: 'zonas' }));

  // Vías: primero las aceras de las rodadas (más anchas y claras), luego asfalto, luego pasajes.
  const aceras: Pieza[] = [];
  const asfalto: Pieza[] = [];
  const pasajes: Pieza[] = [];
  const lineas: Pieza[] = [];
  const cAcera = new THREE.Color(COLORES.acera), cAsfalto = new THREE.Color(COLORES.asfalto);
  const cPasaje = new THREE.Color(COLORES.pasaje), cCarril = new THREE.Color(COLORES.carril), cLinea = new THREE.Color(COLORES.lineaVia);
  for (const via of nivel.vias) {
    if (via.clase === 'rodada') {
      // En calidad baja se ahorran las capas de acera y línea central (menos relleno de píxeles).
      if (!opciones.ligero) aceras.push(...geometriaVia(via, 0.02, cAcera, 2.2));
      asfalto.push(...geometriaVia(via, 0.03, cAsfalto));
      if (!opciones.ligero) lineas.push(...geometriaLineaCentral(via, 0.04, cLinea));
    } else {
      pasajes.push(...geometriaVia(via, 0.025, via.tipo === 'cycleway' ? cCarril : cPasaje));
    }
  }
  // Pasos de cebra: cinco franjas blancas cruzando la calle rodada más cercana.
  for (const [px, pz] of nivel.pasos ?? []) {
    const via = nivel.vias.filter((v) => v.clase === 'rodada').sort((a, b) => distanciaPolilinea(px, pz, a.puntos) - distanciaPolilinea(px, pz, b.puntos))[0];
    if (!via) continue;
    let mejor = { d: Infinity, tx: 1, tz: 0 };
    for (let i = 0; i + 1 < via.puntos.length; i++) {
      const [ax, az] = via.puntos[i]!;
      const [bx, bz] = via.puntos[i + 1]!;
      const { d2 } = distanciaSegmento2(px, pz, ax, az, bx, bz);
      if (d2 < mejor.d) { const l = Math.hypot(bx - ax, bz - az) || 1; mejor = { d: d2, tx: (bx - ax) / l, tz: (bz - az) / l }; }
    }
    for (let k = -2; k <= 2; k++) {
      const g = normalizar(new THREE.PlaneGeometry(0.5, via.ancho - 0.6));
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(mejor.tz, mejor.tx));
      g.translate(px + mejor.tx * k * 1.0, 0.045, pz + mejor.tz * k * 1.0);
      pintar(g, cLinea);
      lineas.push({ geometria: g, x: px, z: pz });
    }
  }
  for (const [nombre, piezas] of [['aceras', aceras], ['pasajes', pasajes], ['asfalto', asfalto], ['lineas', lineas]] as const) {
    if (piezas.length) grupo.add(mallasPorLoseta(piezas, materialVias, { nombre }));
  }

  // Edificios: colores por vértice y un borde suave en las aristas, por losetas.
  // La geometría de colisión se saca de la fusión completa antes de repartir.
  const cuerpos = nivel.edificios.map((e) => {
    const [px, pz] = e.poligono[0]!;
    return { geometria: geometriaEdificio(e), x: px, z: pz };
  });
  const geoColision = mergeGeometries(cuerpos.map((c) => c.geometria), false);
  const posiciones = geoColision.getAttribute('position') as THREE.BufferAttribute;
  const vertices = new Float32Array(posiciones.array as Float32Array);
  const indices = new Uint32Array(posiciones.count);
  for (let i = 0; i < indices.length; i++) indices[i] = i;
  geoColision.dispose();
  grupo.add(mallasPorLoseta(cuerpos, new THREE.MeshLambertMaterial({ vertexColors: true }), {
    nombre: 'edificios', sombra: true, recibeSombra: true,
    ...(opciones.bordes === false ? {} : { bordes: new THREE.LineBasicMaterial({ color: '#5a4a3f', transparent: true, opacity: 0.35 }) }),
  }));

  return { grupo, colisionEdificios: { vertices, indices } };
}
