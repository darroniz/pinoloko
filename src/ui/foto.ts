// Modo foto: una captura del frame con una franja abajo (logo, calle y hora) para compartir.
// En el móvil sale la hoja de compartir; si no la hay, se descarga el PNG.
export class Foto {
  private pendiente = false;
  private logo: HTMLImageElement | null = null;

  constructor(private readonly lienzo: HTMLCanvasElement, private readonly pie: () => string, private readonly alAvisar: (texto: string) => void) {}

  pedir(): void {
    if (this.pendiente) return;
    this.pendiente = true;
    if (!this.logo) {
      this.logo = new Image();
      this.logo.src = '/marca/logo.png';
    }
  }

  /** Llamar justo después de pintar el frame (sin preserveDrawingBuffer solo vale en ese momento). */
  capturar(): void {
    if (!this.pendiente) return;
    this.pendiente = false;
    const w = this.lienzo.width, h = this.lienzo.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(this.lienzo, 0, 0);
    const banda = Math.round(Math.min(w, h) * 0.13);
    const escala = w / 390;
    ctx.fillStyle = 'rgba(43,35,32,0.82)';
    ctx.fillRect(0, h - banda, w, banda);
    if (this.logo?.complete && this.logo.naturalWidth) {
      const alto = banda * 0.62, ancho = alto * (this.logo.naturalWidth / this.logo.naturalHeight);
      ctx.drawImage(this.logo, 14 * escala, h - banda + (banda - alto) / 2, ancho, alto);
    }
    ctx.fillStyle = '#fff8ee';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(13 * escala)}px system-ui, sans-serif`;
    ctx.fillText(this.pie(), w - 14 * escala, h - banda * 0.62);
    ctx.font = `600 ${Math.round(11 * escala)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,248,238,0.75)';
    ctx.fillText('pinoloko.com · mapa © OpenStreetMap', w - 14 * escala, h - banda * 0.3);
    c.toBlob((blob) => {
      if (!blob) return;
      const fichero = new File([blob], `pinoloko-${Date.now()}.png`, { type: 'image/png' });
      const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (n.canShare?.({ files: [fichero] })) {
        n.share({ files: [fichero], title: 'Pinoloko' }).catch(() => this.descargar(blob, fichero.name));
      } else this.descargar(blob, fichero.name);
    }, 'image/png');
    this.alAvisar('¡Foto!');
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
