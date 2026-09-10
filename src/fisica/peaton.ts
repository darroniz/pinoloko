// Wifly a pie: una bola de Rapier con rotaciones bloqueadas que se mueve en el plano de
// pantalla. Los pasajes son suyos: cabe por donde no cabe ni la moto.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { MundoFisico } from './mundo';
import { RAPIER as R } from './mundo';
import type { Entrada } from '../control/entrada';
import { crearWifly, type FiguraWifly } from '../mundo/wifly';

const RADIO = 0.4;
const VELOCIDAD = 5.2;
const ESCALA_VISUAL = 1.6;

export class Peaton {
  readonly malla: THREE.Group;
  readonly cuerpo: RAPIER.RigidBody;
  private figura: FiguraWifly;
  private rumbo = 0;
  private fase = 0;
  private patada = 0;
  velocidad = 0;

  constructor(fisica: MundoFisico, x: number, z: number) {
    this.cuerpo = fisica.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(x, RADIO + 0.05, z).lockRotations().setLinearDamping(4).setCcdEnabled(true),
    );
    fisica.world.createCollider(
      R.ColliderDesc.ball(RADIO).setRestitution(0.1).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setDensity(1.2),
      this.cuerpo,
    );
    this.cuerpo.setEnabled(false);
    this.figura = crearWifly(false);
    this.figura.grupo.scale.setScalar(ESCALA_VISUAL);
    this.malla = new THREE.Group();
    this.malla.add(this.figura.grupo);
    this.malla.visible = false;
  }

  get posicion(): THREE.Vector3 {
    const t = this.cuerpo.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  /** Hacia dónde mira Wifly (en el plano). */
  get direccion(): { x: number; z: number } {
    return { x: Math.sin(this.rumbo), z: -Math.cos(this.rumbo) };
  }

  /** Patada: la pierna derecha sale disparada un tercio de segundo. */
  patear(): void {
    this.patada = 0.35;
  }

  aparecer(x: number, z: number, rumbo: number): void {
    this.cuerpo.setEnabled(true);
    this.cuerpo.setTranslation({ x, y: RADIO + 0.05, z }, true);
    this.cuerpo.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.rumbo = rumbo;
    this.malla.visible = true;
    this.sincronizar();
  }

  esconder(): void {
    this.cuerpo.setEnabled(false);
    this.malla.visible = false;
  }

  actualizar(entrada: Entrada, dt: number): void {
    const sx = entrada.eje.x, sy = entrada.eje.y;
    const magnitud = Math.min(1, Math.hypot(sx, sy));
    const v = this.cuerpo.linvel();
    this.patada = Math.max(0, this.patada - dt);
    if (magnitud > 0.12) {
      const objetivo = Math.atan2(sx, sy);
      let dif = objetivo - this.rumbo;
      while (dif > Math.PI) dif -= Math.PI * 2;
      while (dif < -Math.PI) dif += Math.PI * 2;
      this.rumbo += dif * Math.min(1, dt * 14);
      const rapido = entrada.freno ? 1.45 : 1;
      const vel = VELOCIDAD * magnitud * rapido;
      this.cuerpo.setLinvel({ x: (sx / Math.max(magnitud, 1e-6)) * vel * magnitud, y: v.y, z: (-sy / Math.max(magnitud, 1e-6)) * vel * magnitud }, true);
      this.velocidad = vel * magnitud;
      this.fase += dt * (8 + vel * 0.8);
    } else {
      this.cuerpo.setLinvel({ x: 0, y: v.y, z: 0 }, true);
      this.velocidad = 0;
      this.fase *= 0.8;
    }
  }

  sincronizar(): void {
    const t = this.cuerpo.translation();
    this.malla.position.set(t.x, t.y - RADIO, t.z);
    this.malla.rotation.y = -this.rumbo;
    const paso = Math.sin(this.fase) * Math.min(1, this.velocidad / 3) * 0.6;
    this.figura.piernaIz.rotation.x = paso;
    this.figura.piernaDe.rotation.x = this.patada > 0 ? -1.5 * Math.sin((this.patada / 0.35) * Math.PI) : -paso;
    this.figura.brazos.rotation.y = paso * 0.5;
  }
}
