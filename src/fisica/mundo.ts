// Envoltorio de Rapier: mundo, suelo, muros del límite del barrio y colisión de edificios.
import RAPIER from '@dimforge/rapier3d-compat';

export const PASO_FISICA = 1 / 60;

export class MundoFisico {
  readonly world: RAPIER.World;

  private constructor(world: RAPIER.World) {
    this.world = world;
  }

  static async crear(): Promise<MundoFisico> {
    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: -22, z: 0 });
    world.timestep = PASO_FISICA;
    return new MundoFisico(world);
  }

  /** Suelo infinito y cuatro muros invisibles en el borde de la caja. */
  crearSueloYLimites(ancho: number, fondo: number): void {
    const suelo = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(ancho + 400, 0.5, fondo + 400).setFriction(1.0), suelo);
    const w = ancho / 2, h = fondo / 2;
    const muro = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    for (const [x, z, sx, sz] of [[w + 1, 0, 1, h + 2], [-w - 1, 0, 1, h + 2], [0, h + 1, w + 2, 1], [0, -h - 1, w + 2, 1]] as const) {
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(sx, 20, sz).setTranslation(x, 20, z).setRestitution(0.8), muro);
    }
  }

  crearEdificios(vertices: Float32Array, indices: Uint32Array): void {
    const cuerpo = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setRestitution(0.7).setFriction(0.2), cuerpo);
  }

  paso(): void {
    this.world.step();
  }
}

export { RAPIER };
