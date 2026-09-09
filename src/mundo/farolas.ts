// Farolas por las calles rodadas: postes instanciados de día y, de noche, un charco de luz
// cálida en el suelo bajo cada una (sin luces puntuales, que en móvil cuestan).
import * as THREE from 'three';
import type { Nivel, Punto } from './tipos';
import { azar, dentroDePoligono, muestrearPolilinea } from './geometria';
import { Instanciador } from './losetas';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function construirFarolas(nivel: Nivel, ocupado: Punto[]): { postes: THREE.Group; luces: THREE.Group; posiciones: Punto[] } {
  const rnd = azar(515);
  const postes = new THREE.Group();
  postes.name = 'farolas';
  const luces = new THREE.Group();
  luces.name = 'farolas-luz';
  luces.visible = false;
  const geoPoste = mergeGeometries([
    new THREE.CylinderGeometry(0.07, 0.1, 6, 6).translate(0, 3, 0),
    new THREE.BoxGeometry(0.1, 0.1, 1.4).translate(0, 5.9, -0.6),
    new THREE.BoxGeometry(0.4, 0.2, 0.6).translate(0, 5.8, -1.2),
  ]);
  const poste = new Instanciador(geoPoste, new THREE.MeshLambertMaterial({ color: '#4a4f55' }), false);
  const cabeza = new Instanciador(new THREE.BoxGeometry(0.42, 0.12, 0.62).translate(0, 5.7, -1.2), new THREE.MeshBasicMaterial({ color: '#ffe6a8' }), false);
  const charco = new Instanciador(new THREE.CircleGeometry(5.5, 14).rotateX(-Math.PI / 2).translate(0, 0.05, -1.2), new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }), false);
  const posiciones: Punto[] = [];
  const libre = (x: number, z: number): boolean => {
    for (const e of nivel.edificios) if (dentroDePoligono(x, z, e.poligono)) return false;
    for (const [px, pz] of ocupado) if ((px - x) ** 2 + (pz - z) ** 2 < 2.5 * 2.5) return false;
    for (const [px, pz] of posiciones) if ((px - x) ** 2 + (pz - z) ** 2 < 12 * 12) return false;
    return true;
  };
  for (const via of nivel.vias) {
    if (via.clase !== 'rodada' || via.tipo === 'service') continue;
    const lado = via.ancho / 2 + 1.0;
    let signo = rnd() < 0.5 ? 1 : -1;
    for (const m of muestrearPolilinea(via.puntos, 28, rnd() * 28)) {
      signo = -signo; // alternando aceras
      const x = m.x + m.nx * lado * signo, z = m.z + m.nz * lado * signo;
      if (!libre(x, z)) continue;
      posiciones.push([x, z]);
      // El brazo mira hacia la calzada.
      const giro = Math.atan2(-m.nx * signo, m.nz * signo);
      poste.poner(x, 0, z, giro);
      cabeza.poner(x, 0, z, giro);
      charco.poner(x, 0, z, giro);
    }
  }
  poste.cerrar(postes);
  cabeza.cerrar(luces);
  charco.cerrar(luces);
  return { postes, luces, posiciones };
}
