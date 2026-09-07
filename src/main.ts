import { Juego } from './juego';

const juego = new Juego();
const portada = document.getElementById('portada')!;
const boton = document.getElementById('boton-jugar') as HTMLButtonElement;
boton.disabled = true;
boton.textContent = 'CARGANDO…';

juego.cargar().then(() => {
  boton.disabled = false;
  boton.textContent = 'JUGAR';
}).catch((e: unknown) => {
  boton.textContent = 'ERROR';
  console.error(e);
});

boton.addEventListener('click', () => {
  portada.classList.add('oculta');
  juego.empezar();
});
