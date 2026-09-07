// Wifly, el protagonista: cápsula con cabeza, chándal y gorra, hasta que haya modelo.
// La misma figura sirve montado en la scooter (sentado) y a pie.
import * as THREE from 'three';

const piel = new THREE.MeshLambertMaterial({ color: '#e0ac8b' });
const camiseta = new THREE.MeshLambertMaterial({ color: '#f5f5f5' });
const chandal = new THREE.MeshLambertMaterial({ color: '#1d4ed8' });
const negro = new THREE.MeshLambertMaterial({ color: '#2b2b2f' });
const oro = new THREE.MeshLambertMaterial({ color: '#f2c14e', emissive: '#6b5210' });

export interface FiguraWifly {
  grupo: THREE.Group;
  piernaIz: THREE.Mesh;
  piernaDe: THREE.Mesh;
  brazos: THREE.Mesh;
}

export function crearWifly(sentado: boolean): FiguraWifly {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 3, 8), camiseta);
  tronco.position.set(0, sentado ? 0.98 : 0.95, sentado ? 0.15 : 0);
  const cadena = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 4, 8), oro);
  cadena.position.set(0, sentado ? 1.1 : 1.07, sentado ? 0.0 : -0.14);
  cadena.rotation.x = Math.PI / 2.4;
  const piernaIz = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.14), chandal);
  piernaIz.position.set(-0.12, 0.62, sentado ? -0.02 : 0);
  const piernaDe = piernaIz.clone();
  piernaDe.position.x = 0.12;
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), piel);
  cabeza.position.set(0, 1.36, sentado ? 0.1 : 0);
  const gorra = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 10), negro);
  gorra.position.set(0, 1.46, sentado ? 0.1 : 0);
  const visera = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.18), negro);
  visera.position.set(0, 1.43, sentado ? -0.08 : -0.18);
  const brazos = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.08), camiseta);
  brazos.position.set(0, 1.0, sentado ? -0.3 : 0);
  if (sentado) brazos.rotation.x = -0.4;
  g.add(tronco, cadena, piernaIz, piernaDe, cabeza, gorra, visera, brazos);
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return { grupo: g, piernaIz, piernaDe, brazos };
}
