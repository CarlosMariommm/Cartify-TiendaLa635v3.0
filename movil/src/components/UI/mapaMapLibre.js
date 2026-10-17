// MAPLIBRE PARA LOS WEBVIEW — lo que comparten los mapas de la app
// La web usa mapcn (MapLibre con los mapas vectoriales de CARTO).

const VERSION = '5.24.0';

export const MAPLIBRE_JS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist/maplibre-gl.js`;
export const MAPLIBRE_CSS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist/maplibre-gl.css`;

// Los mismos dos estilos que usa mapcn en la web: las calles claras de siempre y, en modo oscuro,
// las oscuras de CARTO — no un mapa blanco en medio de la pantalla.
export const ESTILO_MAPA = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
export const ESTILO_MAPA_OSCURO = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const estiloMapa = (oscuro) => (oscuro ? ESTILO_MAPA_OSCURO : ESTILO_MAPA);

// El color de fondo del mapa mientras cargan las calles.
export const FONDO_MAPA = '#F2F1EE';
export const FONDO_MAPA_OSCURO = '#1F2328';

// En oscuro, los botones de zoom y el crédito también: cajitas blancas
// encima de un mapa negro deslumbran.
const cssControlesOscuros = `
  .maplibregl-ctrl-group { background: #1A1D21 !important; }
  .maplibregl-ctrl-group button + button { border-top-color: #2A2F35 !important; }
  .maplibregl-ctrl-group button .maplibregl-ctrl-icon { filter: invert(1) brightness(.85); }
  .maplibregl-ctrl-attrib { background: rgba(26,29,33,.85) !important; color: #A9B0B7; }
  .maplibregl-ctrl-attrib a { color: #A9B0B7; }
  .maplibregl-ctrl-attrib-button { filter: invert(1) brightness(.85); }
`;

// Los pines y el crédito, igual que en la web (MapaTienda.jsx): - la gota: cuadrado con tres
// esquinas redondas girado 45°; - el repartidor: punto azul con halo que late; - el crédito "©
// CARTO, © OpenStreetMap" plegado en su botón "i".
export const cssComun = (colorMarca, oscuro = false) => `
  html, body, #mapa { height: 100%; margin: 0; padding: 0; background: ${oscuro ? FONDO_MAPA_OSCURO : FONDO_MAPA}; }
  ${oscuro ? cssControlesOscuros : ''}
  .pin-gota-caja { width: 26px; height: 26px; display: flex; align-items: flex-start; justify-content: center; }
  .pin-gota {
    width: 20px; height: 20px; border-radius: 50% 50% 50% 0;
    background: ${colorMarca}; transform: rotate(-45deg);
    border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,.3);
  }
  .pin-vivo { position: relative; width: 16px; height: 16px; }
  .pin-vivo::before {
    content: ''; position: absolute; inset: -6px; border-radius: 50%;
    background: rgba(37,99,235,.28); animation: latido 1.6s ease-out infinite;
  }
  .pin-vivo::after {
    content: ''; position: absolute; inset: 0; border-radius: 50%;
    background: #2563eb; border: 3px solid #fff; box-sizing: border-box;
    box-shadow: 0 0 0 5px rgba(37,99,235,.22), 0 2px 6px rgba(0,0,0,.3);
  }
  @keyframes latido { from { transform: scale(.6); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }
  .maplibregl-ctrl-attrib { border-radius: 8px; font-size: 10px; }
  .maplibregl-ctrl-group { border-radius: 10px !important; }
`;

// Script: pliega el crédito cuando el mapa termina de cargar.
export const JS_PLEGAR_CREDITO = `
  function plegarCredito(mapa) {
    mapa.on('load', function () {
      var credito = document.querySelector('.maplibregl-ctrl-attrib');
      if (credito) credito.classList.remove('maplibregl-compact-show');
    });
  }
`;
