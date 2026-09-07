// Losetas: el barrio se parte en cuadrados para que el recorte de frustum de Three
// solo dibuje lo que hay en pantalla. Con la cámara alta se ve un 5% del nivel; sin
// esto, se dibujaba el 100% en cada frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const TAMANO_LOSETA = 64;

export function claveLoseta(x: number, z: number, tamano = TAMANO_LOSETA): string {
  return `${Math.floor(x / tamano)},${Math.floor(z / tamano)}`;
}

/** Agrupa geometrías por loseta (según un punto representativo) y devuelve una malla por loseta. */
export function mallasPorLoseta(
  piezas: { geometria: THREE.BufferGeometry; x: number; z: number }[],
  material: THREE.Material,
  opciones: { sombra?: boolean; recibeSombra?: boolean; nombre?: string; bordes?: THREE.Material } = {},
): THREE.Group {
  const grupo = new THREE.Group();
  grupo.name = opciones.nombre ?? 'losetas';
  const porLoseta = new Map<string, THREE.BufferGeometry[]>();
  for (const p of piezas) {
    const k = claveLoseta(p.x, p.z);
    let lista = porLoseta.get(k);
    if (!lista) { lista = []; porLoseta.set(k, lista); }
    lista.push(p.geometria);
  }
  for (const lista of porLoseta.values()) {
    const geo = mergeGeometries(lista, false);
    geo.computeBoundingSphere();
    const malla = new THREE.Mesh(geo, material);
    malla.castShadow = opciones.sombra ?? false;
    malla.receiveShadow = opciones.recibeSombra ?? true;
    grupo.add(malla);
    if (opciones.bordes) {
      const lineas = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), opciones.bordes);
      lineas.geometry.computeBoundingSphere();
      grupo.add(lineas);
    }
    for (const g of lista) g.dispose();
  }
  return grupo;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _eje = new THREE.Vector3(0, 1, 0);

/** Acumula instancias de una geometría y las reparte en un InstancedMesh por loseta. */
export class Instanciador {
  private porLoseta = new Map<string, THREE.Matrix4[]>();
  total = 0;

  constructor(
    readonly geometria: THREE.BufferGeometry,
    readonly material: THREE.Material,
    private readonly sombra = true,
    /** Las instancias usan losetas más grandes: menos objetos que recorrer por frame. */
    private readonly tamano = TAMANO_LOSETA * 2,
  ) {}

  poner(x: number, y: number, z: number, giro: number, escala = 1, escalaY = escala): void {
    _p.set(x, y, z);
    _q.setFromAxisAngle(_eje, giro);
    _s.set(escala, escalaY, escala);
    this.ponerMatriz(_m.compose(_p, _q, _s), x, z);
  }

  ponerMatriz(m: THREE.Matrix4, x: number, z: number): void {
    const k = claveLoseta(x, z, this.tamano);
    let lista = this.porLoseta.get(k);
    if (!lista) { lista = []; this.porLoseta.set(k, lista); }
    lista.push(m.clone());
    this.total++;
  }

  cerrar(grupo: THREE.Group): void {
    for (const lista of this.porLoseta.values()) {
      const malla = new THREE.InstancedMesh(this.geometria, this.material, lista.length);
      lista.forEach((m, i) => malla.setMatrixAt(i, m));
      malla.instanceMatrix.needsUpdate = true;
      malla.castShadow = this.sombra;
      malla.receiveShadow = this.sombra;
      malla.computeBoundingSphere();
      grupo.add(malla);
    }
    this.porLoseta.clear();
  }
}
