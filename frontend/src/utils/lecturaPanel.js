// Los tamaños de texto del panel (ver LECTURA en context/ThemeContext.jsx). Viven aparte porque
// los usa también OpcionesLectura, y un archivo de contexto que exporta constantes rompe el
// refresco en caliente.
export const TAMANOS_TEXTO = [
  { id: 'normal', nombre: 'Normal' },
  { id: 'grande', nombre: 'Grande' },
  { id: 'muy-grande', nombre: 'Muy grande' },
];
