import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { avisarALaApp } from '../utils/puenteApp';

// Las paletas de fondo oscuro: la app pinta su barra de estado con letras claras.
const PALETAS_OSCURAS = ['dark', 'calma-noche'];

// LAS PALETAS DEL PANEL — todas pensadas para la vista de quien lo usa. "Mi marca" (ver
// armarPaletaDeMarca más abajo) es la que arranca por defecto. 1. Lectura — sepia: fondo color
// papel y letras café oscuro, sin la luz azul ni el reflejo del blanco.

// Los colores de ESTADO (peligro, aviso, éxito) de cada paleta: los recuadros de error, de "ojo
// con esto" y de "listo" del panel.
const ESTADOS_CLAROS = { peligro: '#B91C1C', aviso: '#92400E', exito: '#15803D' };
const ESTADOS_OSCUROS = { peligro: '#FCA5A5', aviso: '#FCD34D', exito: '#86EFAC' };

export const palettes = [
  // LECTURA — sepia. El fondo color papel y las letras café oscuro cansan menos en sesiones largas:
  // no hay blanco que encandile ni tanta luz azul. Texto a 11 a 1; todo lo demás, de 5 para arriba.
  {
    id: 'lectura',
    name: 'Lectura',
    description: 'Sepia · Descansa la vista al leer',
    colors: {
      primary: '#7A4E2D',
      primaryHover: '#663F22',
      primaryLight: '#EFE0C8',
      accent: '#B07A3C',
      accentText: '#7A4E2D',
      buttonText: '#FFFFFF',
      sidebarBg: '#EFE5CD',
      sidebarText: '#3B2F22',
      sidebarBorder: '#E3D6B8',
      topbarBg: '#FBF6EA',
      mainBg: '#F4ECD8',
      cardBg: '#FBF6EA',
      cardBorder: '#E3D6B8',
      textPrimary: '#3B2F22',
      textSecondary: '#54442F',
      textMuted: '#6A5842',
      peligro: '#9E2A1E',
      aviso: '#74500E',
      exito: '#3F6B2A',
    },
    swatches: ['#7A4E2D', '#B07A3C', '#F4ECD8', '#FBF6EA', '#3B2F22'],
  },
  // CONTRASTE REFORZADO — para baja visión o cataratas. Letras negras sobre blanco (21 a 1),
  // acciones en azul fuerte (10 a 1) y bordes que SE VEN (5 a 1: en las demás paletas un borde casi
  // blanco no se distingue con poca vista). Sin el amarillo chillón del Alto contraste de antes.
  {
    id: 'contraste',
    name: 'Contraste reforzado',
    description: 'Baja visión · Letras y bordes marcados',
    colors: {
      primary: '#0033A0',
      primaryHover: '#00247A',
      primaryLight: '#DCE6FA',
      accent: '#0033A0',
      accentText: '#0033A0',
      buttonText: '#FFFFFF',
      sidebarBg: '#F2F2F2',
      sidebarText: '#000000',
      sidebarBorder: '#6B6B6B',
      topbarBg: '#FFFFFF',
      mainBg: '#FFFFFF',
      cardBg: '#FFFFFF',
      cardBorder: '#6B6B6B',
      textPrimary: '#000000',
      textSecondary: '#1F1F1F',
      textMuted: '#3D3D3D',
      peligro: '#A50000',
      aviso: '#6B4200',
      exito: '#006B21',
    },
    swatches: ['#0033A0', '#DCE6FA', '#FFFFFF', '#6B6B6B', '#000000'],
  },
  {
    id: 'dark',
    name: 'Modo Oscuro',
    description: 'Migrañas · Fotosensibilidad',
    colors: {
      primary: '#A78BFA',
      primaryHover: '#8B5CF6',
      primaryLight: 'rgba(167, 139, 250, 0.15)',
      accent: '#A78BFA',
      // Oscuro y no blanco: blanco sobre este lila daba 2.7.
      buttonText: '#0F172A',
      sidebarBg: '#111827',
      sidebarText: '#D1D5DB',
      sidebarBorder: '#1F2937',
      topbarBg: '#111827',
      mainBg: '#0F172A',
      cardBg: '#1E293B',
      cardBorder: '#334155',
      textPrimary: '#F1F5F9',
      textSecondary: '#94A3B8',
      textMuted: '#8B9BB4',
      accentText: '#A78BFA',
      ...ESTADOS_OSCUROS,
    },
    swatches: ['#A78BFA', '#111827', '#0F172A', '#1E293B', '#F1F5F9'],
  },
  // CALMA — para quien se cansa o se abruma con la pantalla.
  // La pidió la tienda para un administrador que se recupera de un derrame.
  {
    id: 'calma',
    name: 'Calma',
    description: 'Colores suaves · Menos brillo',
    colors: {
      primary: '#4E7282',
      primaryHover: '#436372',
      primaryLight: '#E4ECEE',
      accent: '#7FA08F',
      accentText: '#466676',
      buttonText: '#FFFFFF',
      sidebarBg: '#EFEBE3',
      sidebarText: '#3E444D',
      sidebarBorder: '#E2DCD0',
      topbarBg: '#FBF9F4',
      mainBg: '#F4F1EA',
      cardBg: '#FBF9F4',
      cardBorder: '#E2DCD0',
      textPrimary: '#3E444D',
      textSecondary: '#4A5260',
      textMuted: '#5E6470',
      peligro: '#9B4A3F',
      aviso: '#83621F',
      exito: '#4A7553',
    },
    swatches: ['#4E7282', '#7FA08F', '#F4F1EA', '#FBF9F4', '#3E444D'],
  },
  // CALMA NOCHE — la contraparte oscura de Calma, como Modo oscuro lo es de las claras: para quien
  // necesita la misma tranquilidad con poca luz o a quien el fondo claro le molesta. - Nada de negro
  // puro: un carbón tibio.
  {
    id: 'calma-noche',
    name: 'Calma noche',
    description: 'Colores suaves · Poca luz',
    colors: {
      primary: '#8FB3C0',
      primaryHover: '#A5C3CE',
      primaryLight: 'rgba(143, 179, 192, 0.14)',
      accent: '#9DBBA9',
      accentText: '#9DBBA9',
      buttonText: '#1F2226',
      sidebarBg: '#1B1E21',
      sidebarText: '#D5D1C8',
      sidebarBorder: '#30353B',
      topbarBg: '#23272B',
      mainBg: '#1F2226',
      cardBg: '#282C31',
      cardBorder: '#363B42',
      textPrimary: '#E4E0D8',
      textSecondary: '#C2BDB3',
      textMuted: '#A7A298',
      peligro: '#E3A69C',
      aviso: '#D9BF86',
      exito: '#A9CBA6',
    },
    swatches: ['#8FB3C0', '#9DBBA9', '#1F2226', '#282C31', '#E4E0D8'],
  },
];

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// "Mi marca" — la paleta por defecto del panel, con el azul de la casa. Repite los seis tonos de
// index.css porque aquí es un objeto de JavaScript: si la marca cambia, cambian los dos.
const ESCALA_DE_MARCA = {
  '--marca-600': '#003049',
  '--marca-700': '#00283D',
  '--marca-100': '#DDECF3',
  '--acento': '#009AEB',
};

const armarPaletaDeMarca = () => {
  const escala = ESCALA_DE_MARCA;
  return {
    id: 'marca',
    name: 'Mi marca',
    description: 'El color que elegiste para la tienda',
    colors: {
      primary: escala['--marca-600'],
      primaryHover: escala['--marca-700'],
      primaryLight: escala['--marca-100'],
      accent: escala['--acento'],
      buttonText: '#FFFFFF',
      sidebarBg: '#FFFFFF',
      sidebarText: '#374151',
      sidebarBorder: '#E5E7EB',
      topbarBg: '#FFFFFF',
      mainBg: '#F8F9FA',
      cardBg: '#FFFFFF',
      cardBorder: '#F3F4F6',
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      // El azul de la casa para texto: el celeste del acento daba 2.9.
      accentText: '#066494',
      ...ESTADOS_CLAROS,
    },
    swatches: [escala['--marca-600'], escala['--marca-700'], escala['--marca-100'], '#FFFFFF', '#1F2937'],
  };
};

// Quien tenía guardada una de las paletas que se quitaron pasa a la más parecida, en vez de caer
// sin aviso a Mi marca: el que usaba Alto contraste porque ve poco sigue necesitando contraste.
const PALETAS_QUE_SE_FUERON = { 'high-contrast': 'contraste', deuteranopia: 'marca', tritanopia: 'marca' };

// ── LECTURA: las opciones para leer mejor el panel ── Aparte de los colores, porque se combinan
// con cualquier paleta: texto Normal, Grande (115%) o Muy grande (130%).
// Los tamaños (normal, grande, muy-grande) están en utils/lecturaPanel.js.
const LECTURA_INICIAL = { texto: 'normal', espaciado: false, movimiento: false, foco: false };
const LLAVE_LECTURA = 'panel-lectura';

const leerLectura = () => {
  try {
    return { ...LECTURA_INICIAL, ...JSON.parse(localStorage.getItem(LLAVE_LECTURA) || '{}') };
  } catch {
    return LECTURA_INICIAL;
  }
};

export const ThemeProvider = ({ children }) => {
  const [paletteId, setPaletteId] = useState(() => {
    const guardada = localStorage.getItem('theme-palette') || 'marca';
    return PALETAS_QUE_SE_FUERON[guardada] || guardada;
  });

  const [lectura, setLectura] = useState(leerLectura);
  const cambiarLectura = (cambios) => setLectura((antes) => ({ ...antes, ...cambios }));

  useEffect(() => {
    try { localStorage.setItem(LLAVE_LECTURA, JSON.stringify(lectura)); } catch { /* sin memoria, igual se aplica */ }
    const root = document.documentElement;
    root.setAttribute('data-panel-texto', lectura.texto);
    root.toggleAttribute('data-panel-espaciado', !!lectura.espaciado);
    root.toggleAttribute('data-panel-movimiento', !!lectura.movimiento);
    root.toggleAttribute('data-panel-foco', !!lectura.foco);
  }, [lectura]);

  const paletaDeMarca = useMemo(() => armarPaletaDeMarca(), []);
  // "Mi marca" primero: es la que arranca por defecto, no una opción más al fondo.
  const todasLasPaletas = useMemo(() => [paletaDeMarca, ...palettes], [paletaDeMarca]);

  const palette = todasLasPaletas.find((p) => p.id === paletteId) || paletaDeMarca;

  useEffect(() => {
    localStorage.setItem('theme-palette', paletteId);

    // Apply CSS custom properties to :root
    const root = document.documentElement;
    Object.entries(palette.colors).forEach(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    // Dentro de la app del teléfono, la app se viste igual que el panel: todo su modo del personal
    // (Tiqui, el Reparto, los avisos) toma esta paleta. Fuera de la app no pasa nada. Ver
    // utils/puenteApp.js.
    avisarALaApp({
      tipo: 'paleta-panel',
      id: palette.id,
      oscuro: PALETAS_OSCURAS.includes(palette.id),
      colores: palette.colors,
    });
  }, [paletteId, palette]);

  return (
    <ThemeContext.Provider value={{ palette, paletteId, setPaletteId, palettes: todasLasPaletas, lectura, cambiarLectura }}>
      {children}
    </ThemeContext.Provider>
  );
};
