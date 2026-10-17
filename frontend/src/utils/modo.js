// MODO CLARO / OSCURO — modo.js
// Lo que elige cada persona en Mi Cuenta → Preferencias.

export const LLAVE_MODO = 'la635_modo';

export const MODOS = ['claro', 'oscuro', 'sistema'];

export const leerModoGuardado = () => {
  try {
    const guardado = localStorage.getItem(LLAVE_MODO);
    return MODOS.includes(guardado) ? guardado : 'claro';
  } catch {
    return 'claro';
  }
};

export const guardarModo = (modo) => {
  try {
    localStorage.setItem(LLAVE_MODO, modo);
  } catch {
    // Sin almacenamiento (navegación privada estricta): se aplica igual,
    // solo que no se recuerda en la próxima visita.
  }
};

export const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

export const sistemaEnOscuro = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.(CONSULTA_OSCURO).matches;

export const esOscuro = (modo, sistemaOscuro = sistemaEnOscuro()) =>
  modo === 'oscuro' || (modo === 'sistema' && sistemaOscuro);

// Pone o quita el modo en el <html>. Los colores los resuelve index.css.
export const aplicarModo = (oscuro) => {
  const raiz = document.documentElement;
  if (oscuro) raiz.setAttribute('data-modo', 'oscuro');
  else raiz.removeAttribute('data-modo');
  // La barra del sistema del teléfono (y de la web instalada) toma el color del fondo de la página,
  // --papel en index.css: blanca en claro, casi negra en oscuro. Si no, quedaba una franja blanca
  // encima de la tienda oscura.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#121417' : '#FFFFFF');
};
