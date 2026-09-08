// El detalle vive en los tejados: aires, depósitos, casetones, antenas, tendederos y
// macetas repartidos procedimentalmente por cada azotea. Y árboles por pasajes y jardines.
import * as THREE from 'three';
import type { Nivel, Punto } from './tipos';
import { azar, cajaPoligono, dentroDePoligono, muestrearPolilinea } from './geometria';
import { Instanciador } from './losetas';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _eje = new THREE.Vector3(0, 1, 0);

function crear(geometria: THREE.BufferGeometry, material: THREE.Material, _maximo: number, sombra = true): Instanciador {
  return new Instanciador(geometria, material, sombra);
}

function poner(i: Instanciador, x: number, y: number, z: number, giro: number, escala = 1, escalaY = escala): void {
  i.poner(x, y, z, giro, escala, escalaY);
}

/** Puntos interiores de un polígono a `margen` metros del borde (muestreo por rechazo). */
function puntosDentro(poligono: Punto[], cuantos: number, margen: number, rnd: () => number): Punto[] {
  const caja = cajaPoligono(poligono);
  const salida: Punto[] = [];
  for (let intento = 0; intento < cuantos * 8 && salida.length < cuantos; intento++) {
    const x = caja.minX + margen + rnd() * Math.max(0, caja.maxX - caja.minX - 2 * margen);
    const z = caja.minZ + margen + rnd() * Math.max(0, caja.maxZ - caja.minZ - 2 * margen);
    if (!dentroDePoligono(x, z, poligono)) continue;
    // El margen se aproxima comprobando cuatro puntos alrededor.
    if (!dentroDePoligono(x + margen, z, poligono) || !dentroDePoligono(x - margen, z, poligono)
      || !dentroDePoligono(x, z + margen, poligono) || !dentroDePoligono(x, z - margen, poligono)) continue;
    if (salida.some(([sx, sz]) => (sx - x) ** 2 + (sz - z) ** 2 < 4)) continue;
    salida.push([x, z]);
  }
  return salida;
}

export function construirAzoteas(nivel: Nivel): THREE.Group {
  const grupo = new THREE.Group();
  grupo.name = 'azoteas';
  const rnd = azar(1313);

  const blanco = new THREE.MeshLambertMaterial({ color: '#f4f1ea' });
  const gris = new THREE.MeshLambertMaterial({ color: '#b9bcc2' });
  const azul = new THREE.MeshLambertMaterial({ color: '#8fb8d6' });
  const oscuro = new THREE.MeshLambertMaterial({ color: '#4a4a52' });
  const naranja = new THREE.MeshLambertMaterial({ color: '#d98a5a' });
  const ropa = new THREE.MeshLambertMaterial({ vertexColors: true });

  const aires = crear(new THREE.BoxGeometry(0.9, 0.55, 0.45), gris, 900);
  const depositos = crear(new THREE.CylinderGeometry(0.7, 0.7, 1.3, 8).translate(0, 0.65, 0), azul, 250);
  const casetones = crear(new THREE.BoxGeometry(3, 2.6, 3).translate(0, 1.3, 0), blanco, 220);
  const antenas = crear(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 4).translate(0, 1.6, 0), oscuro, 300, false);
  const parabolicas = crear(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 10).rotateX(Math.PI / 3).translate(0, 1.2, 0), blanco, 300, false);
  const macetas = crear(new THREE.CylinderGeometry(0.3, 0.22, 0.4, 7).translate(0, 0.2, 0), naranja, 400, false);
  const petos = crear(new THREE.BoxGeometry(1, 0.9, 0.18).translate(0, 0.45, 0), blanco, 3000, false);

  // Tendederos: una cuerda con tres o cuatro prendas de colores por vértice.
  const geoRopa = new THREE.BoxGeometry(0.55, 0.7, 0.06);
  const coloresRopa = ['#f27d91', '#7ec8e3', '#f4e285', '#8cd790', '#ffffff', '#c39bd3'];
  const nRopa = geoRopa.getAttribute('position').count;
  const colRopa = new Float32Array(nRopa * 3);
  geoRopa.setAttribute('color', new THREE.BufferAttribute(colRopa, 3));
  const prendas: Instanciador[] = coloresRopa.map((c) => {
    const g = geoRopa.clone();
    const col = new THREE.Color(c);
    const arr = g.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < nRopa; i++) arr.setXYZ(i, col.r, col.g, col.b);
    return crear(g, ropa, 400, false);
  });

  for (const e of nivel.edificios) {
    const y = e.altura;
    const caja = cajaPoligono(e.poligono);
    const ancho = caja.maxX - caja.minX, fondo = caja.maxZ - caja.minZ;
    const superficie = ancho * fondo;
    if (e.tipo === 'bloque' && e.altura > 6) {
      // Peto (murete) alrededor del borde de la azotea: da el borde superior "de verdad".
      // Solo en bloques de cuatro plantas o más: en el casco antiguo (casas de dos y tres
      // plantas, cientos de ellas) eran cien mil triángulos que no se distinguían.
      for (let i = 0; e.plantas >= 4 && superficie >= 150 && i < e.poligono.length; i++) {
        const [ax, az] = e.poligono[i]!;
        const [bx, bz] = e.poligono[(i + 1) % e.poligono.length]!;
        const l = Math.hypot(bx - ax, bz - az);
        if (l < 0.5) continue;
        const giro = -Math.atan2(bz - az, bx - ax);
        _p.set((ax + bx) / 2, y, (az + bz) / 2);
        _q.setFromAxisAngle(_eje, giro);
        _s.set(l, 1, 1);
        petos.ponerMatriz(_m.compose(_p, _q, _s), _p.x, _p.z);
      }
      const cuantos = superficie < 110 ? 1 : Math.min(14, Math.max(2, Math.round(superficie / 60)));
      const puntos = puntosDentro(e.poligono, cuantos, 1.6, rnd);
      puntos.forEach(([x, z], i) => {
        const r = rnd();
        const giro = Math.round(rnd() * 3) * (Math.PI / 2);
        if (i === 0 && superficie > 120) poner(casetones, x, y, z, giro);
        else if (r < 0.35) poner(aires, x, y + 0.28, z, giro);
        else if (r < 0.5) poner(depositos, x, y, z, giro);
        else if (r < 0.62) { poner(antenas, x, y, z, 0); poner(parabolicas, x, y, z, rnd() * Math.PI * 2); }
        else if (r < 0.8) {
          const dir = rnd() * Math.PI * 2;
          for (let k = -1.5; k <= 1.5; k++) {
            const prenda = prendas[Math.floor(rnd() * prendas.length)]!;
            poner(prenda, x + Math.cos(dir) * k * 0.7, y + 0.9, z + Math.sin(dir) * k * 0.7, -dir + Math.PI / 2);
          }
        } else poner(macetas, x, y, z, 0);
      });
    } else if (e.tipo === 'mercado' || e.tipo === 'comercio' || e.tipo === 'nave') {
      // Naves y mercado: aires industriales grandes y depósitos en fila.
      const puntos = puntosDentro(e.poligono, Math.max(2, Math.round(superficie / 150)), 2.5, rnd);
      puntos.forEach(([x, z], i) => {
        if (i % 3 === 2) poner(depositos, x, y, z, 0, 1.4);
        else poner(aires, x, y + 0.5, z, rnd() * Math.PI, 2, 1.8);
      });
    } else if (e.tipo === 'colegio' || e.tipo === 'sanidad' || e.tipo === 'publico' || e.tipo === 'biblioteca' || e.tipo === 'bomberos') {
      const puntos = puntosDentro(e.poligono, Math.max(1, Math.round(superficie / 200)), 2, rnd);
      puntos.forEach(([x, z], i) => {
        if (i === 0) poner(casetones, x, y, z, 0);
        else poner(aires, x, y + 0.4, z, 0, 1.6);
      });
    } else if (e.tipo === 'iglesia') {
      const [cx, cz] = puntosDentro(e.poligono, 1, 2, rnd)[0] ?? [caja.minX + ancho / 2, caja.minZ + fondo / 2];
      poner(antenas, cx, y, cz, 0, 1, 2.5);
    }
  }

  for (const i of [aires, depositos, casetones, antenas, parabolicas, macetas, petos, ...prendas]) i.cerrar(grupo);
  return grupo;
}

/** Árboles low-poly: primero los reales de OSM (`natural=tree`), y el resto por los pasajes y jardines. */
export function construirArboles(nivel: Nivel): { grupo: THREE.Group; posiciones: Punto[] } {
  const grupo = new THREE.Group();
  grupo.name = 'arboles';
  const rnd = azar(2024);
  const troncos = crear(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 6).translate(0, 1.1, 0), new THREE.MeshLambertMaterial({ color: '#8b6b4a' }), 900);
  const copasVerdes = crear(new THREE.IcosahedronGeometry(1.6, 1).translate(0, 3.3, 0), new THREE.MeshLambertMaterial({ color: '#6fae5c', flatShading: true }), 600);
  const copasClaras = crear(new THREE.IcosahedronGeometry(1.4, 1).translate(0, 3.0, 0), new THREE.MeshLambertMaterial({ color: '#9ccc6a', flatShading: true }), 600);
  const naranjos = crear(new THREE.SphereGeometry(1.25, 7, 5).translate(0, 2.9, 0), new THREE.MeshLambertMaterial({ color: '#4f8f45', flatShading: true }), 400);
  const posiciones: Punto[] = [];

  const agua = nivel.zonas.filter((z) => z.clase === 'water');
  const libre = (x: number, z: number, minimo = 3.2): boolean => {
    for (const e of nivel.edificios) if (dentroDePoligono(x, z, e.poligono)) return false;
    for (const a of agua) if (dentroDePoligono(x, z, a.poligono)) return false;
    for (const via of nivel.vias) {
      // No plantar sobre asfalto ni en medio de un pasaje ancho.
      const medio = via.ancho / 2 + (via.clase === 'rodada' ? 0.6 : 0);
      for (let i = 0; i + 1 < via.puntos.length; i++) {
        const [ax, az] = via.puntos[i]!;
        const [bx, bz] = via.puntos[i + 1]!;
        const dx = bx - ax, dz = bz - az;
        const l2 = dx * dx + dz * dz;
        const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
        const cx = ax + t * dx - x, cz = az + t * dz - z;
        if (cx * cx + cz * cz < medio * medio) return false;
      }
    }
    for (const [px, pz] of posiciones) if ((px - x) ** 2 + (pz - z) ** 2 < minimo * minimo) return false;
    return true;
  };

  const plantar = (x: number, z: number): void => {
    posiciones.push([x, z]);
    const escala = 0.8 + rnd() * 0.5;
    const giro = rnd() * Math.PI * 2;
    poner(troncos, x, 0, z, giro, escala);
    const r = rnd();
    if (r < 0.4) poner(copasVerdes, x, 0, z, giro, escala);
    else if (r < 0.7) poner(copasClaras, x, 0, z, giro, escala);
    else poner(naranjos, x, 0, z, giro, escala);
  };

  // Los árboles que OSM sí trae (en la Alameda, la hilera de álamos) van donde están de verdad.
  for (const [x, z] of nivel.arboles) if (!nivel.edificios.some((e) => dentroDePoligono(x, z, e.poligono)) && libre(x, z, 1.5)) plantar(x, z);

  for (const via of nivel.vias) {
    if (via.clase === 'rodada' && via.tipo === 'service') continue;
    const lado = via.clase === 'rodada' ? via.ancho / 2 + 3.4 : via.ancho / 2 + 1.6;
    const paso = via.clase === 'rodada' ? 14 : 11;
    for (const m of muestrearPolilinea(via.puntos, paso, rnd() * paso)) {
      const signo = rnd() < 0.5 ? 1 : -1;
      const x = m.x + m.nx * lado * signo, z = m.z + m.nz * lado * signo;
      if (libre(x, z)) plantar(x, z);
    }
  }
  for (const zona of nivel.zonas) {
    if (zona.clase === 'parking' || zona.clase === 'pitch') continue;
    for (const [x, z] of puntosDentro(zona.poligono, 6, 2.5, rnd)) if (libre(x, z, 4.5)) plantar(x, z);
  }

  for (const i of [troncos, copasVerdes, copasClaras, naranjos]) i.cerrar(grupo);
  return { grupo, posiciones };
}
