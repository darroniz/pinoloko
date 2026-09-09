// Nivel de búsqueda de la Policía Local: de 0 a 5 estrellas. Lógica pura, con tests.
// El "calor" sube con cada fechoría y baja con el tiempo si nadie te ve; las estrellas
// son tramos del calor. Perder a las patrullas de vista acelera el enfriamiento.

export type Fechoria = 'trasto' | 'atropello' | 'robo_moto' | 'robo_coche' | 'choque_patrulla' | 'huida' | 'semaforo';

const CALOR: Record<Fechoria, number> = {
  trasto: 4,
  atropello: 22,
  robo_moto: 18,
  robo_coche: 35,
  choque_patrulla: 40,
  huida: 8,
  semaforo: 12,
};

/** Umbrales de calor para cada estrella. */
export const UMBRALES = [0, 30, 80, 160, 280, 420];
export const CALOR_MAXIMO = 520;

export class NivelBusqueda {
  calor = 0;
  /** Segundos desde que una patrulla vio al jugador por última vez. */
  sinVerte = 0;
  private estrellasPrevias = 0;

  get estrellas(): number {
    let e = 0;
    for (let i = 1; i < UMBRALES.length; i++) if (this.calor >= UMBRALES[i]!) e = i;
    return e;
  }

  fechoria(tipo: Fechoria, multiplicador = 1): void {
    // Las gamberradas pequeñas no llaman a la policía hasta que se acumulan.
    this.calor = Math.min(CALOR_MAXIMO, this.calor + CALOR[tipo] * multiplicador);
  }

  /** Una patrulla te tiene a la vista: el calor no baja y, si estás liándola, se mantiene. */
  visto(): void {
    this.sinVerte = 0;
  }

  /** Avanza el tiempo; devuelve el cambio de estrellas (positivo, negativo o 0). */
  actualizar(dt: number): number {
    this.sinVerte += dt;
    // Enfriamiento: lento si te acaban de ver, rápido si llevas un rato escondido.
    const ritmo = this.sinVerte < 3 ? 0 : this.sinVerte < 12 ? 3 : 9;
    if (this.estrellas === 0) this.calor = Math.max(0, this.calor - 6 * dt);
    else this.calor = Math.max(0, this.calor - ritmo * dt);
    const ahora = this.estrellas;
    const cambio = ahora - this.estrellasPrevias;
    this.estrellasPrevias = ahora;
    return cambio;
  }

  /** Te han trincado: se limpia todo. */
  limpiar(): void {
    this.calor = 0;
    this.sinVerte = 0;
    this.estrellasPrevias = 0;
  }

  /** Cuántas patrullas de coche y de moto toca tener en la calle. */
  get dotacion(): { coches: number; motos: number } {
    const e = this.estrellas;
    return { coches: e === 0 ? 0 : Math.min(4, e), motos: e >= 3 ? e - 2 : 0 };
  }
}
