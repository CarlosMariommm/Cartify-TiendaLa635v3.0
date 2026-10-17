// COLORES — la misma paleta que la tienda web, en claro y en oscuro
// En la web estos valores viven repetidos arriba de cada pantalla (`const BROWN = '#B46C30'`).

export const COLORES_CLARO = {
  oscuro: false,

  // El azul marino de la marca y su versión oscura (--marca-600/--marca-700
  // de la web). Antes era café; la tienda se repintó de azul y esto se había
  // quedado atrás.
  marca: '#003049',
  marcaOscuro: '#00283D',
  // El azul apagado del botón deshabilitado: se ve apretable pero no lo está.
  marcaApagado: '#A9C2CE',
  // Fondo tenue para los cuadritos de iconos de las ventajas (--marca-100).
  marcaSuave: '#DDECF3',
  // La marca cuando es LETRA (enlaces, precios, títulos en color) y no fondo (--marca-texto de la
  // web). En claro es la misma; en oscuro es el tono claro, porque la marca oscura está afinada para
  // llevar letra blanca encima y como letra sobre el fondo oscuro no se leía.
  marcaTexto: '#003049',
  // La letra encima de un botón de la marca. Blanca aquí y en oscuro; solo cambia con las paletas
  // del panel en el modo del personal (Modo oscuro y Calma noche tienen un principal claro y llevan
  // letra oscura encima; ver utils/paletaPanel.js).
  sobreMarca: '#FFFFFF',

  fondo: '#FFFFFF',
  texto: '#000000',
  tituloFuerte: '#1D1206',
  tituloVentaja: '#2A1A0E',
  textoSuave: '#756D64',
  textoVentaja: '#55504A',
  textoTenue: '#6F6F6F',
  subtitulo: '#756E67',

  linea: '#E8E8E8',
  lineaCard: '#F0E7DE',
  borde: '#E0E0E0',
  iconoCampo: '#AAAAAA',
  marcador: '#BBBBBB',

  error: '#C62828',

  // ── Los tokens de la web ── Los colores que hicieron falta para el modo oscuro, con el nombre y
  // el valor de frontend/src/index.css. `tinta`: el texto principal y los botones negros.
  tinta: '#1C1614',
  tintaSuave: '#6B6560',
  tintaTenue: '#736D66',
  // Iconos en reposo que apenas se ven (el corazón vacío).
  tintaApagada: '#D4D0CC',
  // El texto encima de un botón color tinta: blanco en claro, oscuro en oscuro.
  sobreTinta: '#FFFFFF',

  // Lo que flota encima: hojas de detalle, modales, la barra de abajo.
  papelAlto: '#FFFFFF',
  // Filas presionadas, fondos apenas distintos del de la página.
  papelSuave: '#FAFAFA',
  // Fondo de la foto de producto, campos, pastillas.
  papelGris: '#F5F5F5',
  banda: '#E9E7E4',
  // Un cartelito encima de una foto o de un mapa: casi opaco, que se lea.
  papelVelado: 'rgba(255, 255, 255, 0.94)',
  // Lo que oscurece detrás de una hoja o un modal.
  velo: 'rgba(0, 0, 0, 0.45)',
  // Sombreado al presionar algo que no es un botón de color.
  realce: 'rgba(0, 0, 0, 0.03)',

  alerta: '#B8421E',
  alertaTexto: '#8A2B12',
  exito: '#297E45',

  // Colores de ESTADO: verde de listo, azul de en camino, ámbar de cuidado, rojo de error. No son
  // marca, así que no cambian con la temporada; sí cambian con el modo oscuro, porque un fondo
  // pastel sobre negro deslumbra.
  exitoFondo: '#EFFAF1',
  exitoBorde: '#D3EEDA',
  exitoTexto: '#14663A',
  exitoSuave: '#3C7A55',
  exitoVivo: '#117F3A',
  infoFondo: '#EFF5FF',
  infoBorde: '#CFE0FF',
  infoTexto: '#173F94',
  infoSuave: '#3E5FA3',
  infoVivo: '#1D4ED8',
  avisoFondo: '#FFF6E9',
  avisoBorde: '#F3DFC0',
  avisoTexto: '#7A3E08',
  avisoVivo: '#AE560C',
  peligroFondo: '#FEF2F2',
  peligroBorde: '#FECACA',
  peligro: '#D72323',
};

// El oscuro de la web (`:root[data-modo="oscuro"]` en index.css).
export const COLORES_OSCURO = {
  oscuro: true,

  marca: '#0E75AA',
  marcaOscuro: '#0F7DB5',
  marcaApagado: '#2E3A42',
  marcaSuave: '#112D3D',
  marcaTexto: '#4AB7F0',
  sobreMarca: '#FFFFFF',

  fondo: '#121417',
  texto: '#ECEEF0',
  tituloFuerte: '#ECEEF0',
  tituloVentaja: '#E3E6E9',
  textoSuave: '#A9B0B7',
  textoVentaja: '#BCC2C8',
  textoTenue: '#8A929A',
  subtitulo: '#8A9299',

  linea: '#2A2F35',
  lineaCard: '#2A2F35',
  borde: '#3A4047',
  iconoCampo: '#7D858D',
  marcador: '#6B737B',

  error: '#F87171',

  tinta: '#ECEEF0',
  tintaSuave: '#A9B0B7',
  tintaTenue: '#8A929A',
  tintaApagada: '#4A5058',
  sobreTinta: '#121417',

  papelAlto: '#1A1D21',
  papelSuave: '#181B1F',
  papelGris: '#1F2328',
  banda: '#23272C',
  papelVelado: 'rgba(26, 29, 33, 0.94)',
  velo: 'rgba(0, 0, 0, 0.65)',
  realce: 'rgba(255, 255, 255, 0.05)',

  alerta: '#F07A52',
  alertaTexto: '#F4A58A',
  exito: '#4CC27A',

  exitoFondo: '#10261A',
  exitoBorde: '#1E4630',
  exitoTexto: '#7DDBA3',
  exitoSuave: '#5FB386',
  exitoVivo: '#34C46A',
  infoFondo: '#121F36',
  infoBorde: '#22385F',
  infoTexto: '#A3C2FF',
  infoSuave: '#8AA5D8',
  infoVivo: '#6A9CFF',
  avisoFondo: '#2A1F12',
  avisoBorde: '#4F3A1C',
  avisoTexto: '#F2C58B',
  avisoVivo: '#F0A35A',
  peligroFondo: '#331719',
  peligroBorde: '#5C2629',
  peligro: '#F87171',
};

// La paleta clara con su nombre de siempre, para lo que se pinta fuera de una pantalla (el HTML de
// un mapa, un valor por defecto) y no puede usar hooks. Dentro de un componente, `useColores()`.
export const COLORES = COLORES_CLARO;

export default COLORES;
