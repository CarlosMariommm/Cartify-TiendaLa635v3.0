import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useNavigate, useSearchParams, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import styled from 'styled-components';
import { useStore } from '../hooks/useStore';
import ProductCard from '../components/Store/ProductCard';
import EsqueletoProductos from '../components/Store/EsqueletoProductos';
import PromoBanners from '../components/Store/PromoBanners';
// El carrito, Tiqui y las fichas bajan aparte y se precargan (ver pantallasDiferidas).
import { ShoppingCart, AsistenteVoz, ProductDetailModal, PromoDetailModal, precargarPantallas } from '../components/Store/pantallasDiferidas';
import FilaProductos from '../components/Store/FilaProductos';
import HeaderTienda from '../components/Store/HeaderTienda';
import PieTienda from '../components/Store/PieTienda';
import Mascota from '../components/UI/Mascota';
import { useFilaDeslizable } from '../hooks/useFilaDeslizable';
import { useSeccionesTienda } from '../hooks/useSeccionesTienda';
import { useRastroTienda } from '../hooks/useRastroTienda';
import { useMyOrders } from '../hooks/useMyOrders';
import { useModulos } from '../hooks/useModulos';
import { useAjustesCtx } from '../context/AjustesContext';
import { useAuth } from '../hooks/useAuth';
import { bloqueDeSeccion } from '../utils/portada';
import { cuantosFiltros, ORDENES_TIENDA, RANGOS_PRECIO } from '../utils/filtrosTienda';
import { useIdioma } from '../hooks/useIdioma';
// El <Toaster> global vive en App.jsx (uno solo, para que los avisos se cierren bien).

const BROWN = 'var(--marca-600)';
const BROWN_LIGHT = 'var(--marca-100)';

/* ─── Layout ─── */
const Container = styled.div`
  min-height: 100vh;
  /* Fondo blanco. El beige de antes competía con las tarjetas —que también son claras— y hacía ver
     la página como una hoja vieja; con blanco los productos y las promociones son lo único con
     color. */
  background: var(--papel);
  font-family: var(--fuente);

  /* Columna flex para que el pie se quede ABAJO cuando la página es corta. Con min-height: 100vh a
     secas, una búsqueda de cinco productos dejaba el pie flotando a media pantalla y 259 píxeles de
     blanco debajo: la página parecía cortada, como si le faltara algo por cargar. */
  display: flex;
  flex-direction: column;
`;

/* Lo que crece para empujar el pie hasta abajo. */
const Cuerpo = styled.div`
  flex: 1;
`;

/* ─── Category Bar ─── */
/* Lo que tapa cada flecha: al traer la categoría elegida a la vista se deja ese margen. */
const ANCHO_FLECHA_CAT = 56;

// Fundido solo en la orilla que tiene algo escondido. Es lo que avisa que hay más categorías: sin
// él, la última cortada a filo se lee como el final de la lista. En la orilla a la que ya se llegó
// no hay nada que avisar.
const fundidoCategorias = ({ $izq, $der }) => {
  const izq = $izq ? 'transparent 0, #000 var(--fundido)' : '#000 0';
  const der = $der ? '#000 calc(100% - var(--fundido)), transparent 100%' : '#000 100%';
  return `linear-gradient(to right, ${izq}, ${der})`;
};

/* La barra y sus flechas: las flechas van fuera de la barra para que el fundido no las borre. */
const CategoryZona = styled.div`
  position: relative;
`;

const CategoryBar = styled.nav`
  /* relative: así offsetLeft de cada pastilla se mide desde la barra. */
  position: relative;
  background: transparent;
  display: flex;
  overflow-x: auto;
  /* Sin raya abajo. La única línea de la pantalla es la del encabezado, que sí separa dos cosas
     distintas; esta partía la tienda en dos por gusto y competía con el borde de las tarjetas de
     promoción que van justo abajo. */
  height: 60px;
  align-items: center;
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;

  --fundido: 72px;
  mask-image: ${fundidoCategorias};
  -webkit-mask-image: ${fundidoCategorias};

  /* Deslizable con el dedo, sin arrastrar la página con él: el que se corre es ESTE renglón, no el
     cuerpo. */
  @media (max-width: 700px) {
    height: 54px;
    scroll-padding-inline: 16px;
    --fundido: 26px;
  }
`;

// En el diseño las categorías van CENTRADAS, pero sin perder la orilla. Esta pista se centra con
// margen automático, que centra igual cuando sobra espacio y se vuelve cero cuando no: la lista
// arranca siempre en "Todos".
const CategoryPista = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin: 0 auto;
  /* El aire de las orillas va aquí: al final de un scroll el relleno de la barra se pierde. */
  padding: 0 28px;

  @media (max-width: 700px) { padding: 0 16px; }
`;

// La barra de pasillos y sus estilos se eliminaron: los pasillos ahora se eligen desde el menú del
// nombre de la tienda (MenuTienda). Tener las dos cosas era decir lo mismo dos veces, y la barra
// empujaba los productos media pantalla hacia abajo antes de que se viera un solo precio.

/* Pill blanca con borde; la activa es café SÓLIDO con texto blanco. */
const CatBtn = styled.button`
  padding: 0 18px;
  height: 38px;
  border: 1px solid ${props => (props.$active ? BROWN : 'var(--linea)')};
  background: ${props => (props.$active ? BROWN : 'var(--papel)')};
  color: ${props => (props.$active ? '#fff' : 'var(--tinta-suave)')};
  font-weight: ${props => (props.$active ? 600 : 500)};
  border-radius: var(--radio-pill);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), transform var(--dur-press) var(--ease-out), box-shadow var(--dur-press) var(--ease-out);
  flex-shrink: 0;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: ${BROWN};
      color: ${props => (props.$active ? '#fff' : BROWN)};
    }
  }
  &:active { transform: scale(0.97); }

  /* 44px de alto en pantalla táctil: el pulgar no apunta, aproxima. */
  @media (pointer: coarse), (max-width: 560px) { height: 44px; }
`;

/* Las pastillas de espera: anchos variados, como nombres de verdad. */
const ANCHOS_CAT_CARGANDO = [112, 92, 150, 178, 166, 84, 152, 98, 150, 112, 118, 100, 104];

const CatCargando = styled.span`
  flex-shrink: 0;
  height: 38px;
  border-radius: var(--radio-pill);

  @media (pointer: coarse), (max-width: 560px) { height: 44px; }
`;

/* ─── Content ─── */
const Content = styled.div`
  padding: 24px 28px 40px;
  max-width: 1400px;
  margin: 0 auto;

  /* Mismo margen lateral que el pie y que la pantalla de sección, para que al
     pasar de una a otra los productos no se corran de lugar. */
  @media (max-width: 560px) { padding: 20px 16px 32px; }
`;

// El carril de una fila de la portada.
const Franja = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 28px;

  @media (max-width: 560px) { padding: 0 16px; }
`;

/* El aire de arriba que antes ponía <Content>, ahora para el grupo entero. */
const Portada = styled.div`
  padding-top: 24px;

  @media (max-width: 560px) { padding-top: 20px; }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  gap: 12px;

  /* El título es largo ("Todo en Abarrotes") y Filtros no puede encogerse:
     arriba el nombre, abajo el botón, en vez de aplastarse mutuamente. */
  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

/* En el diseño los títulos de sección son grandes y pesados. */
const SectionTitle = styled.h2`
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--tinta);
  margin: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;

  @media (max-width: 560px) { font-size: 21px; }
`;

/* Va pegada al título, así que no hereda su peso ni su tamaño. */
const SectionCount = styled.span`
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--tinta-tenue);
`;

// Flechas circulares a la derecha del título, como en el diseño. Por ahora desplazan la fila de
// tarjetas; cuando la sección no se pueda mover más, la flecha se apaga sola.
const SectionNav = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;

  /* En pantalla táctil la fila se desliza con el dedo: las flechas sobran y en un teléfono le
     quitaban el lugar al título ("Más vendidos6 productos", pegados). */
  @media (hover: none), (pointer: coarse) { display: none; }
`;

const NavCircle = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--linea);
  background: var(--papel);
  color: var(--tinta);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--dur-press) var(--ease-out),
              border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out);
  &:hover:not(:disabled) { border-color: ${BROWN}; color: var(--marca-texto); background: var(--marca-50); }
  &:disabled { opacity: 0.35; cursor: default; }
`;

// Las flechas de la barra de categorías. Con la barra de desplazamiento escondida, con el mouse no
// había cómo llegar a las que no caben; en pantalla táctil no hacen falta, ahí se desliza con el
// dedo.
const CatFlecha = styled(NavCircle)`
  position: absolute;
  top: 50%;
  ${props => (props.$lado === 'izquierda' ? 'left: 12px;' : 'right: 12px;')}
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  z-index: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

  @media (hover: none), (pointer: coarse) { display: none; }
`;

/* ─── Filter bar with dropdown ─── */
/* Vive dentro del encabezado, así que ya no necesita empujarse ni separarse. */
const FilterBar = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  flex-shrink: 0;
`;

const FilterBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1.5px solid ${props => props.$open ? BROWN : 'var(--linea-fuerte)'};
  background: ${props => props.$open ? BROWN_LIGHT : 'var(--papel)'};
  color: ${props => props.$open ? BROWN : 'var(--tinta-suave)'};
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), transform var(--dur-press) var(--ease-out), box-shadow var(--dur-press) var(--ease-out);
  &:hover { border-color: ${BROWN}; color: var(--marca-texto); background: ${BROWN_LIGHT}; }
`;

/* Dropdown panel – matches design exactly */
const FilterDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${BROWN};
  border-radius: 14px;
  padding: 16px 20px;
  z-index: 100;
  min-width: 240px;
  max-height: min(70vh, 560px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
`;

/* Entre un grupo y el siguiente, una línea tenue. */
const FilterGrupo = styled.div`
  & + & { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.18); }
`;

const FilterMarca = styled.select`
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: var(--papel);
  color: var(--tinta);
  font-size: 14px;
  cursor: pointer;
`;

const FilterLimpiar = styled.button`
  margin-top: 14px;
  width: 100%;
  padding: 8px 0;
  border-radius: 30px;
  border: 1.5px solid rgba(255,255,255,0.6);
  background: none;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.12); }
`;

const FilterDropTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
`;

const FilterOption = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: white;
  font-weight: ${props => props.$active ? '700' : '400'};
  text-align: left;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

const FilterToggle = styled.div`
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: ${props => props.$active ? 'var(--papel)' : 'rgba(255,255,255,0.3)'};
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${props => props.$active ? '17px' : '3px'};
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${props => props.$active ? BROWN : 'var(--papel)'};
    transition: left 0.2s;
  }
`;

/* ─── Trending Section ─── */
// Sin tarjeta blanca alrededor: el recuadro partía la portada en cajas y se sentía como secciones
// separadas en vez de una sola página. Ahora las filas se distinguen por el aire entre ellas, no
// por un borde.
const TrendingSection = styled.div`
  margin-bottom: 34px;
`;

const TrendingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  /* El alto de las flechas, aunque no estén: así mide lo mismo que FilaCargando. */
  min-height: 40px;
  margin-bottom: 8px;
`;

const TrendingBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 1.5s infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;

// En el diseño esta fila NO es una grilla: se corre de lado con las flechas. scroll-snap hace que
// siempre quede una tarjeta alineada al borde, sin cortes a media tarjeta.
const TrendingGrid = styled.div`
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding-left: 2px;

  /* Aire arriba y abajo de la fila, comido con márgenes negativos, para que la sombra de la tarjeta
     al pasar el mouse no se recorte. */
  padding: 24px 16px 44px;
  margin: -8px -16px -40px;

  /* Fundido en las orillas. El aire lateral resuelve la sombra de la primera y la última tarjeta,
     pero se desplaza CON el contenido: apenas se hace scroll, la tarjeta que va saliendo vuelve a
     cortarse a filo contra el borde. */
  mask-image: linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%);

  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;

  > * {
    flex: 0 0 clamp(160px, 21%, 214px);
    scroll-snap-align: start;
  }
`;

// Una fila de la portada mientras llega el catálogo. Lighthouse lo medía como el peor salto de la
// página (CLS 0.57 en teléfono, 0.82 en computadora).
const TituloCargando = styled.div`
  width: min(220px, 55%);
  height: 40px;
  border-radius: 10px;
`;

// El alto natural de una ProductCard: foto de 165 más marca, nombre y precio.
const TarjetaCargando = styled.div`
  height: 289px;
  border-radius: 16px;
`;

const FilaCargando = () => (
  <TrendingSection aria-hidden="true">
    <TrendingHeader>
      <TituloCargando className="esqueleto" />
    </TrendingHeader>
    <TrendingGrid>
      {Array.from({ length: 6 }, (_, i) => <TarjetaCargando key={i} className="esqueleto" />)}
    </TrendingGrid>
  </TrendingSection>
);

/* ─── Products Grid ─── */
const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
  gap: 16px;

  /* DOS columnas en el teléfono, no una. Con el mínimo en 195px no cabían dos (2×195+16 = 406 en 343
     de ancho), así que la cuadrícula caía a una sola columna y cada producto ocupaba la pantalla
     entera: para ver seis había que bajar tres veces. */
  @media (max-width: 560px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
`;

/* Vacío o error: la mascota y dos líneas, directo sobre el fondo. */
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 20px 60px;
  gap: 6px;

  .mascota { margin-bottom: 14px; }
  strong { font-size: 17px; font-weight: 700; color: var(--tinta); }
  span { font-size: 14px; color: var(--tinta-suave); max-width: 340px; line-height: 1.5; }
`;

const BotonReintentar = styled.button`
  margin-top: 14px;
  padding: 11px 24px;
  border: none;
  border-radius: var(--radio-pill);
  background: var(--marca-600);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: var(--marca-700); }
  }
  &:active { transform: scale(0.97); }
`;

/* ─── Component ─── */
const Store = () => {
  const navigate = useNavigate();
  // Si vino desde "Servicios" con ?modulo=, la tienda abre parada en ese pasillo. Se lee una sola
  // vez, al montar: después manda la barra de arriba.
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname, search, state: estadoNavegacion } = useLocation();
  const { id: idProducto } = useParams();
  const { esCliente } = useAuth();
  const { t } = useIdioma();
  const { pasillos } = useModulos();
  // La tienda se ve con o sin cuenta; la sesión solo cambia qué botones salen.

  const {
    moduloSeleccionado,
    setModuloSeleccionado,
    categorias,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    terminoBusqueda,
    setTerminoBusqueda,
    productosFiltrados,
    productosDestacados,
    productos, // all products for recommendations
    productosDelPasillo,
    // Para no confundir "todavía no sé" con "no hay". Ver más abajo.
    cargando,
    // Y "no hay" con "no se pudo traer".
    errorCarga,
    reintentarCarga,
    agregarAlCarrito,
    eliminarDelCarrito,
    actualizarCantidad,
    carrito,
    totalCarrito,
    cantidadItems,
    limpiarCarrito,
    filtros,
    cambiarFiltro,
    limpiarFiltros,
    marcasDisponibles,
    promoSeleccionada,
    setPromoSeleccionada,
    promoDetalle,
    productosDePromo,
    abrirPromo,
    cerrarPromo,
    verPromoEnTienda,
  // El `q` lo manda el buscador del encabezado cuando se escribe desde una pantalla que no maneja la
  // búsqueda —Impresiones—. Así teclear algo allá hace lo que uno espera: llegar a la tienda con eso
  // ya buscado.
  } = useStore({
    moduloInicial: searchParams.get('modulo'),
    busquedaInicial: searchParams.get('q') || '',
    // El `promo` lo trae el botón del correo con que se anuncian las promociones nuevas: abre esa
    // promo en grande al entrar, en vez de dejar a la persona en la portada buscando lo que le acaban
    // de ofrecer.
    promoInicial: searchParams.get('promo'),
  });

  // Flechas de la fila de "Más vendidos" (se apagan solas en los extremos).
  const destacados = useFilaDeslizable();

  // La barra de categorías: flechas en las orillas y la rueda del mouse la corre de lado, como el
  // menú de Mi Cuenta. Ya no caben todas en una pantalla de laptop.
  const filaCategorias = useFilaDeslizable({ rueda: true });
  const barraCategorias = useRef(null);
  const { fila: engancharFilaCategorias } = filaCategorias;
  const engancharCategorias = useCallback((el) => {
    barraCategorias.current = el;
    engancharFilaCategorias(el);
  }, [engancharFilaCategorias]);
  const reducirMovimiento = useReducedMotion();

  // Con la portada ya pintada, se bajan en un rato libre el carrito, Tiqui y
  // las fichas, para que abrirlos sea instantáneo. Ver pantallasDiferidas.
  useEffect(() => { if (!cargando) precargarPantallas(); }, [cargando]);

  // La categoría elegida se trae a la vista: si la eligió el asistente de voz o se volvió atrás,
  // puede estar escondida al fondo de la barra. Se corre solo la barra, a mano: scrollIntoView
  // movería también la página.
  useEffect(() => {
    const el = barraCategorias.current;
    const activa = el?.querySelector('[aria-pressed="true"]');
    if (!el || !activa) return;
    const desde = activa.offsetLeft;
    const hasta = desde + activa.offsetWidth;
    const comportamiento = reducirMovimiento ? 'auto' : 'smooth';
    if (desde - ANCHO_FLECHA_CAT < el.scrollLeft) {
      el.scrollTo({ left: Math.max(0, desde - ANCHO_FLECHA_CAT), behavior: comportamiento });
    } else if (hasta + ANCHO_FLECHA_CAT > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: hasta + ANCHO_FLECHA_CAT - el.clientWidth, behavior: comportamiento });
    }
  }, [categoriaSeleccionada, reducirMovimiento]);

  // Sus pedidos alimentan la fila "Volver a comprar"; si es cliente nuevo,
  // esa fila simplemente no se arma.
  const { orders } = useMyOrders();
  // Las secciones automáticas se arman con lo del pasillo, no con todo el catálogo: estando en
  // Librería, "Nuevos en la tienda" mostraba las papas de abarrotes y el filtro parecía roto.
  const secciones = useSeccionesTienda({ productos: productosDelPasillo, pedidos: orders });

  // El orden y la visibilidad de las filas los decide el panel. Ver utils/portada.js y la pantalla
  // de Personalización.
  const { portadaVisible, ajustes } = useAjustesCtx();

  // Qué filas guardan su lugar mientras carga el catálogo: "Más vendidos" y la primera de las que
  // casi siempre salen. Con esas dos se llena la primera pantalla; lo que va más abajo puede
  // acomodarse sin que nadie lo vea moverse.
  const filasQueEsperan = useMemo(() => {
    const claves = portadaVisible.map((b) => b.clave);
    const siguiente = claves.find((c) => ['nuevos', 'familias', 'por-acabarse'].includes(c));
    return new Set(['mas-vendidos', siguiente].filter(Boolean));
  }, [portadaVisible]);

  // Las filas automáticas, agrupadas bajo el bloque que las gobierna. Los estantes de familia
  // ("Quesos", "Bebidas energizantes") caen todos bajo 'familias': cuáles aparecen depende del
  // inventario, así que se encienden y se apagan juntos.
  const seccionesPorBloque = useMemo(() => {
    const mapa = new Map();
    secciones.forEach((seccion) => {
      const bloque = bloqueDeSeccion(seccion.clave);
      if (!mapa.has(bloque)) mapa.set(bloque, []);
      mapa.get(bloque).push(seccion);
    });
    return mapa;
  }, [secciones]);

  // LA FICHA ABIERTA SALE DE LA DIRECCIÓN (/producto/:id).
  // Abrir un producto es navegar y cerrarlo es volver; el producto se busca en el catálogo ya
  // cargado, con su precio de oferta.
  const productoSeleccionado = useMemo(
    () => (idProducto ? productos.find((p) => String(p.id) === idProducto) || null : null),
    [idProducto, productos]
  );

  // Un enlace a un producto que ya no está (se agotó del todo o se quitó): se
  // dice y se queda en la tienda, en vez de mostrar una ficha vacía.
  useEffect(() => {
    if (!idProducto || cargando || errorCarga || productoSeleccionado) return;
    toast(t('Ese producto ya no está en la tienda'), { id: 'producto-no-esta' });
    navigate({ pathname: '/', search }, { replace: true });
  }, [idProducto, cargando, errorCarga, productoSeleccionado, navigate, search, t]);

  // La pestaña dice qué producto es: se lee en el historial y al compartir.
  useEffect(() => {
    if (!productoSeleccionado) return undefined;
    const previo = document.title;
    const tienda = `${ajustes.nombreLinea1 || ''} ${ajustes.nombreLinea2 || ''}`.trim() || 'Tienda la 635';
    document.title = `${productoSeleccionado.nombre} · ${tienda}`;
    return () => { document.title = previo; };
  }, [productoSeleccionado, ajustes.nombreLinea1, ajustes.nombreLinea2]);
  // ?pagar=1: viene del login al que lo mandó Tiqui para pagar. Se abre el carrito directo en el
  // pago, que es donde iba antes de que le pidieran la sesión. Ver irAPagar.
  const vieneAPagar = searchParams.get('pagar') === '1';
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [carritoEnPago, setCarritoEnPago] = useState(false);
  const [mostrarAsistente, setMostrarAsistente] = useState(false);
  // Se abre cuando termina de cargar el catálogo, no antes: el carrito se arma con los productos de
  // hoy y hasta entonces viene vacío. Abierto antes, caía en la lista vacía en vez del pago.
  const [pagoPendiente, setPagoPendiente] = useState(vieneAPagar);
  const abrirPagoPendiente = pagoPendiente && !cargando;

  // El ?pagar=1 se usa una vez: si se quedara, recargar la página volvería a
  // abrir el pago aunque la persona ya lo hubiera cerrado.
  useEffect(() => {
    if (!vieneAPagar) return;
    setSearchParams((previos) => {
      const limpios = new URLSearchParams(previos);
      limpios.delete('pagar');
      return limpios;
    }, { replace: true });
  }, [vieneAPagar, setSearchParams]);

  const cerrarCarrito = () => {
    setMostrarCarrito(false);
    setCarritoEnPago(false);
    setPagoPendiente(false);
  };

  // La persona le confirmó la compra a Tiqui: se abre el pago. Tiqui se cierra antes. Minimizado se
  // quedaba justo encima del botón de "Realizar pedido", y ya no tiene nada que hacer: lo que falta
  // —dirección y forma de pago— se elige tocando.
  const irAPagar = () => {
    setMostrarAsistente(false);
    if (!esCliente) {
      navigate(`/iniciar-sesion?volver=${encodeURIComponent(`${pathname}?pagar=1`)}`);
      return;
    }
    setCarritoEnPago(true);
    setMostrarCarrito(true);
  };
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Abrir una ficha es una página más en el historial. `fichas` cuenta cuántas se abrieron seguidas
  // (de una recomendación a otra) para que cerrar vuelva a la tienda de una vez, y no ficha por
  // ficha.
  const handleAbrirDetalle = (producto) => {
    if (!producto?.id || String(producto.id) === idProducto) return;
    const fichas = idProducto ? (estadoNavegacion?.fichas || 0) + 1 : 1;
    navigate({ pathname: `/producto/${producto.id}`, search }, { state: { fichas } });
  };
  const handleCerrarDetalle = () => {
    if (!idProducto) return;
    const fichas = estadoNavegacion?.fichas;
    // Entró directo por un enlace: no hay a dónde "volver", se va a la tienda.
    if (fichas) navigate(-fichas);
    else navigate({ pathname: '/', search }, { replace: true });
  };

  // Cuántos filtros hay puestos, para el botón y para el aviso de "nada coincide".
  const filtrosPuestos = cuantosFiltros(filtros);

  // Display labels matching design

  const showTrending = !categoriaSeleccionada && !terminoBusqueda && !promoSeleccionada;

  // Nombre del pasillo donde está parado el cliente, para los títulos y avisos.
  const nombrePasillo = pasillos.find((m) => String(m._id) === String(moduloSeleccionado))?.name || '';

  // El camino que hizo hasta el producto que abra, para las migas de la ficha. Se arma aquí y no
  // dentro de la ficha porque los filtros —y las funciones para deshacerlos— viven en esta pantalla.
  // Ver useRastroTienda.
  const rastro = useRastroTienda({
    moduloSeleccionado, setModuloSeleccionado, nombrePasillo,
    categoriaSeleccionada, setCategoriaSeleccionada,
    terminoBusqueda, setTerminoBusqueda,
    promoSeleccionada, setPromoSeleccionada,
  });

  return (
    <Container>

      {/* Overlay del Asistente por Voz (Modo Kiosco) — con entrada/salida suave */}
      <AnimatePresence>
        {mostrarAsistente && (
          <Suspense key="asistente-voz" fallback={null}>
          <AsistenteVoz
            onClose={() => setMostrarAsistente(false)}
            productos={productos}
            agregarAlCarrito={agregarAlCarrito}
            eliminarDelCarrito={eliminarDelCarrito}
            actualizarCantidad={actualizarCantidad}
            limpiarCarrito={limpiarCarrito}
            carrito={carrito}
            totalCarrito={totalCarrito}
            // A dónde puede llevar la voz. La tienda es la que sabe abrir un producto o cambiar de pasillo sin
            // recargar la página, así que el asistente pide y ella mueve.
            categorias={categorias}
            // Lo que abre Tiqui reemplaza a lo que había abierto: antes "quiero ver fresas" y después "las
            // promociones" dejaba la ficha de las fresas encima de lo nuevo.
            irAProducto={(producto) => { cerrarPromo(); handleAbrirDetalle(producto); }}
            irACategoria={(cat) => {
              handleCerrarDetalle();
              cerrarPromo();
              setCategoriaSeleccionada(cat);
              // Que el pasillo elegido quede a la vista: si la persona está
              // abajo mirando otra fila, cambiar el filtro sin subir no se
              // nota y parece que el asistente no hizo nada.
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            irARuta={(ruta) => navigate(ruta)}
            // "Las promociones": la portada sin filtros, que es donde están, y a la vista.
            irAPromociones={() => {
              handleCerrarDetalle();
              cerrarPromo();
              setPromoSeleccionada(null);
              setCategoriaSeleccionada(null);
              setTerminoBusqueda('');
              // Después de pintar: sin filtros la portada recién aparece.
              setTimeout(() => {
                document.getElementById('promociones-tienda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 120);
            }}
            irAPagar={irAPagar}
          />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ── Header ── Es el mismo componente que usa Impresiones. Vivía escrito aquí adentro, y por eso
         Impresiones había terminado con una barra propia de dos botones, sin pasillos ni carrito. Ver
         HeaderTienda. */}
      <HeaderTienda
        moduloSeleccionado={moduloSeleccionado}
        onElegirModulo={setModuloSeleccionado}
        terminoBusqueda={terminoBusqueda}
        onBuscar={setTerminoBusqueda}
        cantidadItems={cantidadItems}
        onAbrirCarrito={() => setMostrarCarrito(true)}
        onAbrirAsistente={() => setMostrarAsistente(true)}
      />

      {/* La barra de pasillos se fue: ahora los pasillos viven en el menú del nombre de la tienda. Tener
         las dos era decir lo mismo dos veces y empujaba los productos media pantalla hacia abajo. */}

      {/* Todo lo que va entre el encabezado y el pie: es lo que crece y empuja
          el pie hasta abajo cuando hay pocos productos que mostrar. */}
      <Cuerpo>

      {/* ── Category Bar ── */}
      <CategoryZona>
        <CategoryBar
          ref={engancharCategorias}
          $izq={filaCategorias.puedeIzq}
          $der={filaCategorias.puedeDer}
        >
          <CategoryPista>
            <CatBtn
              $active={!categoriaSeleccionada}
              aria-pressed={!categoriaSeleccionada}
              onClick={() => setCategoriaSeleccionada(null)}
            >
              {t('Todos')}
            </CatBtn>
            {/* Cargando, pastillas vacías donde van a caer las categorías: sin ellas "Todos" salía solo en el
               centro y se corría a la orilla al llegar las demás. */}
            {cargando && categorias.length === 0 && ANCHOS_CAT_CARGANDO.map((ancho, i) => (
              <CatCargando key={i} className="esqueleto" style={{ width: ancho }} aria-hidden="true" />
            ))}
            {categorias.map(cat => (
              <CatBtn
                key={cat}
                $active={categoriaSeleccionada === cat}
                aria-pressed={categoriaSeleccionada === cat}
                onClick={() => setCategoriaSeleccionada(cat)}
              >
                {cat}
              </CatBtn>
            ))}
          </CategoryPista>
        </CategoryBar>
        {filaCategorias.puedeIzq && (
          <CatFlecha
            type="button"
            $lado="izquierda"
            onClick={filaCategorias.izquierda}
            aria-label={t('Ver las categorías anteriores')}
            title={t('Ver las categorías anteriores')}
          >
            <ChevronLeft size={17} strokeWidth={2.2} />
          </CatFlecha>
        )}
        {filaCategorias.puedeDer && (
          <CatFlecha
            type="button"
            $lado="derecha"
            onClick={filaCategorias.derecha}
            aria-label={t('Ver más categorías')}
            title={t('Ver más categorías')}
          >
            <ChevronRight size={17} strokeWidth={2.2} />
          </CatFlecha>
        )}
      </CategoryZona>

      {/* Chip para limpiar el filtro de promo */}
      {promoSeleccionada && (
        <div style={{ padding: '12px 28px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, color: 'var(--marca-texto)', fontWeight: 600 }}>
            {t('Promo:')} {promoSeleccionada.title || promoSeleccionada.promoDescription}
          </span>
          <button
            onClick={() => setPromoSeleccionada(null)}
            style={{ border: '1px solid var(--linea-fuerte)', background: 'var(--papel)', borderRadius: 20, padding: '4px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--tinta-suave)' }}
          >
            ✕ {t('Ver todos')}
          </button>
        </div>
      )}

      {/* ── La portada, en el orden que decidió el panel ──
         El orden de las filas y cuáles se muestran salen de los ajustes de la tienda (Personalización). */}
      {showTrending && (
        <Portada>
          {portadaVisible.map((bloque) => {
            if (bloque.clave === 'promos') {
              // De orilla a orilla y sin carril: su carrusel asoma las
              // tarjetas de los lados y con relleno se le cortarían.
              return <PromoBanners key={bloque.clave} moduloId={moduloSeleccionado} onSelectPromo={abrirPromo} />;
            }

            // Cargando, las filas guardan su lugar (ver FilaCargando).
            if (cargando) {
              return filasQueEsperan.has(bloque.clave)
                ? <Franja key={bloque.clave}><FilaCargando /></Franja>
                : null;
            }

            if (bloque.clave === 'mas-vendidos') {
              if (productosDestacados.length === 0) return null;
              return (
                <Franja key={bloque.clave}>
                  <TrendingSection>
                    <TrendingHeader>
                      <TrendingBadge>
                        <LiveDot />
                        <SectionTitle>{t('Más vendidos')}</SectionTitle>
                      </TrendingBadge>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <SectionCount>{t('{n} productos', { n: productosDestacados.length })}</SectionCount>
                        <SectionNav>
                          <NavCircle onClick={destacados.izquierda} disabled={!destacados.puedeIzq} aria-label={t('Ver anteriores')}>
                            <ChevronLeft size={19} strokeWidth={2.2} />
                          </NavCircle>
                          <NavCircle onClick={destacados.derecha} disabled={!destacados.puedeDer} aria-label={t('Ver siguientes')}>
                            <ChevronRight size={19} strokeWidth={2.2} />
                          </NavCircle>
                        </SectionNav>
                      </div>
                    </TrendingHeader>
                    <TrendingGrid ref={destacados.fila}>
                      {productosDestacados.map(producto => (
                        <ProductCard
                          key={producto.id}
                          producto={producto}
                          onVerDetalle={handleAbrirDetalle}
                          onAgregarAlCarrito={agregarAlCarrito}
                        />
                      ))}
                    </TrendingGrid>
                  </TrendingSection>
                </Franja>
              );
            }

            // El resto son filas que se arman solas con el inventario: "Volver a comprar", "Se están
            // acabando", "Nuevos" y los estantes de familia (Quesos, Leches...). Si en este momento no hay
            // datos para armarla —un cliente nuevo no tiene qué volver a comprar—, simplemente no se pinta.
            const delBloque = seccionesPorBloque.get(bloque.clave) || [];
            if (delBloque.length === 0) return null;

            return (
              <Franja key={bloque.clave}>
                {delBloque.map((seccion) => (
                  <FilaProductos
                    key={seccion.clave}
                    titulo={seccion.titulo}
                    subtitulo={seccion.subtitulo}
                    subtituloVars={seccion.subtituloVars}
                    productos={seccion.productos}
                    total={seccion.todos?.length}
                    // El nombre de la sección y "Ver todos" abren la misma
                    // pantalla: son dos puertas a lo mismo.
                    onVerTodos={() => navigate(`/seccion/${seccion.clave}`)}
                    onVerDetalle={handleAbrirDetalle}
                    onAgregarAlCarrito={agregarAlCarrito}
                  />
                ))}
              </Franja>
            );
          })}
        </Portada>
      )}

      <Content>
        {/* ── All / Filtered Products ──
            El catálogo completo NO es un bloque configurable: es la tienda en
            sí. Siempre va al final y siempre está. */}
        <div>
          {/* Título, cantidad y Filtros en UNA sola línea. */}
          <SectionHeader>
            <SectionTitle>
              {categoriaSeleccionada || terminoBusqueda
                ? (categoriaSeleccionada || `"${terminoBusqueda}"`)
                : (nombrePasillo ? t('Todo en {pasillo}', { pasillo: nombrePasillo }) : t('Todos los productos'))}
              <SectionCount>{t('{n} productos', { n: productosFiltrados.length })}</SectionCount>
            </SectionTitle>

            <FilterBar ref={filterRef}>
              <FilterBtn $open={filterOpen} onClick={() => setFilterOpen(o => !o)} aria-expanded={filterOpen}>
                <SlidersHorizontal size={15} strokeWidth={2.2} /> {filtrosPuestos ? t('Filtros ({n})', { n: filtrosPuestos }) : t('Filtros')}
              </FilterBtn>

              {/* Orden, precio, ofertas, disponibles y marca. Se queda abierto al elegir: se suelen combinar
                 varios. Ver utils/filtrosTienda.js (la app filtra igual). */}
              {filterOpen && (
                <FilterDropdown role="dialog" aria-label={t('Filtros')}>
                  <FilterGrupo>
                    <FilterDropTitle>{t('Ordenar')}</FilterDropTitle>
                    {ORDENES_TIENDA.map((o) => (
                      <FilterOption key={o.valor} $active={filtros.orden === o.valor} onClick={() => cambiarFiltro('orden', o.valor)} aria-pressed={filtros.orden === o.valor}>
                        <FilterToggle $active={filtros.orden === o.valor} />
                        {t(o.texto)}
                      </FilterOption>
                    ))}
                  </FilterGrupo>
                  <FilterGrupo>
                    <FilterDropTitle>{t('Precio')}</FilterDropTitle>
                    {RANGOS_PRECIO.map((r) => (
                      <FilterOption key={r.valor} $active={filtros.precio === r.valor} onClick={() => cambiarFiltro('precio', r.valor)} aria-pressed={filtros.precio === r.valor}>
                        <FilterToggle $active={filtros.precio === r.valor} />
                        {t(r.texto)}
                      </FilterOption>
                    ))}
                  </FilterGrupo>
                  <FilterGrupo>
                    <FilterDropTitle>{t('Mostrar')}</FilterDropTitle>
                    <FilterOption $active={filtros.soloOferta} onClick={() => cambiarFiltro('soloOferta', !filtros.soloOferta)} aria-pressed={filtros.soloOferta}>
                      <FilterToggle $active={filtros.soloOferta} />
                      {t('Solo en oferta')}
                    </FilterOption>
                    <FilterOption $active={filtros.soloDisponibles} onClick={() => cambiarFiltro('soloDisponibles', !filtros.soloDisponibles)} aria-pressed={filtros.soloDisponibles}>
                      <FilterToggle $active={filtros.soloDisponibles} />
                      {t('Solo disponibles')}
                    </FilterOption>
                  </FilterGrupo>
                  {marcasDisponibles.length > 1 && (
                    <FilterGrupo>
                      <FilterDropTitle>{t('Marca')}</FilterDropTitle>
                      <FilterMarca value={filtros.marca} onChange={(e) => cambiarFiltro('marca', e.target.value)} aria-label={t('Marca')}>
                        <option value="">{t('Todas las marcas')}</option>
                        {marcasDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
                      </FilterMarca>
                    </FilterGrupo>
                  )}
                  {(filtrosPuestos > 0 || filtros.orden !== 'recomendados') && (
                    <FilterLimpiar type="button" onClick={limpiarFiltros}>{t('Quitar filtros')}</FilterLimpiar>
                  )}
                </FilterDropdown>
              )}
            </FilterBar>
          </SectionHeader>

          {/* CARGANDO Y VACÍO NO SON LO MISMO, y confundirlos costaba caro: si el servidor tardaba en
             contestar, la tienda anunciaba "Todavía no hay productos en la tienda". Un arranque lento se
             leía como un negocio sin nada que vender. */}
          {cargando ? (
            <ProductsGrid>
              <EsqueletoProductos />
            </ProductsGrid>
          ) : errorCarga ? (
            // No llegó el catálogo. Se dice que fue la conexión y se ofrece reintentar aquí mismo, sin
            // recargar la página (el carrito sigue donde estaba).
            <EmptyState role="alert">
              <Mascota pose="error" alto={170} />
              <strong>{t('Ups, algo salió mal')}</strong>
              <span>{t('No pudimos cargar los productos. Revisa tu conexión e inténtalo otra vez.')}</span>
              <BotonReintentar type="button" onClick={reintentarCarga}>{t('Reintentar')}</BotonReintentar>
            </EmptyState>
          ) : productosFiltrados.length === 0 ? (
            <EmptyState>
              {/* Buscó algo y no está: la mascota con la lupa. Un pasillo o una tienda sin productos todavía no
                 es una búsqueda fallida: ahí mira para los lados. Un pasillo recién creado está vacío hasta que
                 le carguen productos. Decir 'No hay productos para ""' hacía parecer que la tienda estaba rota. */}
              <Mascota pose={terminoBusqueda || categoriaSeleccionada || filtrosPuestos ? 'buscando' : 'perdida'} alto={150} />
              <strong>
                {filtrosPuestos && !terminoBusqueda
                  ? t('Ningún producto coincide con los filtros')
                  : terminoBusqueda
                  ? t('No encontramos “{busqueda}”', { busqueda: terminoBusqueda })
                  : categoriaSeleccionada
                    ? t('No hay productos en “{categoria}”', { categoria: categoriaSeleccionada })
                    : nombrePasillo
                      ? t('{pasillo} todavía no tiene productos', { pasillo: nombrePasillo })
                      : t('Todavía no hay productos en la tienda')}
              </strong>
              <span>
                {filtrosPuestos && !terminoBusqueda
                  ? t('Quita alguno para ver más productos.')
                  : terminoBusqueda
                    ? t('Revisa cómo lo escribiste o prueba con otra palabra.')
                    : categoriaSeleccionada
                      ? t('Prueba con otra categoría.')
                      : t('Pronto van a ir llegando.')}
              </span>
              {filtrosPuestos > 0 && (
                <BotonReintentar type="button" onClick={limpiarFiltros}>{t('Quitar filtros')}</BotonReintentar>
              )}
            </EmptyState>
          ) : (
            <ProductsGrid>
              {productosFiltrados.map((producto, i) => (
                <ProductCard
                  key={producto.id}
                  className="card-in"
                  style={{ '--i': i }}
                  producto={producto}
                  onVerDetalle={handleAbrirDetalle}
                  onAgregarAlCarrito={agregarAlCarrito}
                />
              ))}
            </ProductsGrid>
          )}
        </div>
      </Content>

      </Cuerpo>

      {/* El cierre de la página: sin esto los productos se acababan y quedaba
          el blanco, como si la tienda se hubiera cortado a medias. */}
      <PieTienda />

      {/* ── Modals ── */}
      {/* Detalle de la promo, a pantalla completa como la ficha de un producto y con el mismo encabezado.
         Al dar Enter en el buscador se cierra: de nada sirve filtrar una lista que está tapada por la
         promo. */}
      {promoDetalle && (
        <Suspense fallback={null}>
        <PromoDetailModal
          promo={promoDetalle}
          productos={productosDePromo}
          onCerrar={cerrarPromo}
          onVerEnTienda={() => verPromoEnTienda(promoDetalle)}
          onVerProducto={handleAbrirDetalle}
          onAgregarAlCarrito={agregarAlCarrito}
          header={{
            moduloSeleccionado,
            onElegirModulo: (modulo) => { setModuloSeleccionado(modulo); cerrarPromo(); },
            terminoBusqueda,
            onBuscar: setTerminoBusqueda,
            onEnviarBusqueda: cerrarPromo,
            cantidadItems,
            onAbrirCarrito: () => setMostrarCarrito(true),
            onAbrirAsistente: () => setMostrarAsistente(true),
          }}
        />
        </Suspense>
      )}

      {productoSeleccionado && (
        <Suspense fallback={null}>
        <ProductDetailModal
          producto={productoSeleccionado}
          onClose={handleCerrarDetalle}
          onAgregarAlCarrito={agregarAlCarrito}
          // Click en una recomendación: cambia el producto del mismo modal.
          onVerProducto={handleAbrirDetalle}
          todosLosProductos={productosDelPasillo?.length ? productosDelPasillo : productos}
          // Por dónde pasó hasta llegar aquí, con cada escalón pisable.
          rastro={rastro}
          // La ficha lleva el MISMO encabezado de la tienda, así que necesita los mismos mandos: el pasillo,
          // la búsqueda y el carrito. Y al dar Enter en el buscador la ficha se cierra sola — de nada sirve
          // filtrar una lista que está tapada por la foto de un producto.
          header={{
            moduloSeleccionado,
            onElegirModulo: setModuloSeleccionado,
            terminoBusqueda,
            onBuscar: setTerminoBusqueda,
            onEnviarBusqueda: handleCerrarDetalle,
            cantidadItems,
            onAbrirCarrito: () => setMostrarCarrito(true),
            onAbrirAsistente: () => setMostrarAsistente(true),
          }}
        />
        </Suspense>
      )}

      {(mostrarCarrito || abrirPagoPendiente) && (
        <Suspense fallback={null}>
        <ShoppingCart
          items={carrito}
          total={totalCarrito}
          onCerrar={cerrarCarrito}
          onActualizarCantidad={actualizarCantidad}
          onEliminarItem={eliminarDelCarrito}
          onLimpiarCarrito={limpiarCarrito}
          abrirEnPago={carritoEnPago || abrirPagoPendiente}
          onCheckout={() => {
            // Sin aviso: a estas alturas el pedido ya se hizo y el carrito ya
            // se vació solo al confirmarlo. Ver limpiarCarrito en useStore.
            limpiarCarrito({ avisar: false });
            cerrarCarrito();
          }}
        />
        </Suspense>
      )}
    </Container>
  );
};

export default Store;