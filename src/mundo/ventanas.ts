// Ventanas encendidas de noche: cuadrados cálidos sin iluminar pegados a las fachadas que
// miran a la cámara (sur, este y oeste), una fila por planta y encendidas al azar con semilla
// fija. Es un grupo aparte que solo se enciende cuando es de noche; se funde por losetas.
import * as THREE from 'three';
import { mallasPorLoseta } from './losetas';
import { azar } from './geometria';
import type { Nivel } from './tipos';

const ANCHO = 1.1, ALTO = 1.3, SEPARACION = 3.6, SALIENTE = 0.08;
const MAXIMO_POR_EDIFICIO = 90;

export function construirVentanas(nivel: Nivel): THREE.Group {
  const rnd = azar(4040);
  const piezas: { geometria: THREE.BufferGeometry; x: number; z: number }[] = [];
  for (const e of nivel.edificios) {
    if (e.tipo === 'garaje' || e.tipo === 'nave' || e.tipo === 'setas' || e.plantas < 1) continue;
    const poli = e.poligono;
    let cx = 0, cz = 0;
    for (const [x, z] of poli) { cx += x; cz += z; }
    cx /= poli.length; cz /= poli.length;
    const altoPlanta = e.altura / e.plantas;
    const posiciones: number[] = [];
    const indices: number[] = [];
    let cuantas = 0;
    for (let i = 0; i < poli.length && cuantas < MAXIMO_POR_EDIFICIO; i++) {
      const [ax, az] = poli[i]!;
      const [bx, bz] = poli[(i + 1) % poli.length]!;
      const dx = bx - ax, dz = bz - az;
      const l = Math.hypot(dx, dz);
      if (l < SEPARACION + 1) continue;
      const ux = dx / l, uz = dz / l;
      // Normal hacia fuera: la que se aleja del centro del polígono.
      let nx = -uz, nz = ux;
      if (((ax + bx) / 2 - cx) * nx + ((az + bz) / 2 - cz) * nz < 0) { nx = -nx; nz = -nz; }
      if (nz < -0.25) continue; // mira al norte: la cámara no la ve
      const huecos = Math.floor((l - 1.2) / SEPARACION);
      const margen = (l - huecos * SEPARACION) / 2 + SEPARACION / 2;
      for (let f = 0; f < e.plantas && cuantas < MAXIMO_POR_EDIFICIO; f++) {
        const y = f * altoPlanta + altoPlanta * 0.55;
        for (let h = 0; h < huecos; h++) {
          if (rnd() > 0.5) continue;
          const t = margen + h * SEPARACION;
          const px = ax + ux * t + nx * SALIENTE, pz = az + uz * t + nz * SALIENTE;
          const hx = ux * ANCHO / 2, hz = uz * ANCHO / 2;
          const base = posiciones.length / 3;
          posiciones.push(px - hx, y - ALTO / 2, pz - hz, px + hx, y - ALTO / 2, pz + hz, px + hx, y + ALTO / 2, pz + hz, px - hx, y + ALTO / 2, pz - hz);
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          cuantas++;
        }
      }
    }
    if (!cuantas) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    g.setIndex(indices);
    piezas.push({ geometria: g.toNonIndexed(), x: cx, z: cz });
    g.dispose();
  }
  const grupo = new THREE.Group();
  grupo.name = 'ventanas';
  if (piezas.length) grupo.add(mallasPorLoseta(piezas, new THREE.MeshBasicMaterial({ color: '#ffd27a', side: THREE.DoubleSide }), { nombre: 'ventanas' }));
  grupo.visible = false;
  return grupo;
}
