import { useCallback, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  User, ShoppingBag, MapPin, CreditCard, Bell, Star, Receipt, HelpCircle, Heart, SlidersHorizontal,
  ArrowLeft, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../hooks/useClientTheme';
import { useFilaDeslizable } from '../../hooks/useFilaDeslizable';
import HeaderTienda from '../Store/HeaderTienda';
import { useIdioma } from '../../hooks/useIdioma';

// ClienteLayout — el marco compartido de "Mi Cuenta": cada página pone su contenido en <Outlet />.
// En el menú, `label` es el nombre corto y `titulo` el largo, que sale al pasar el cursor.
const navItems = [
  { to: '/mi-cuenta',                label: 'Mis datos',      titulo: 'Detalles de la cuenta', icon: User,        ready: true },
  { to: '/mi-cuenta/pedidos',        label: 'Pedidos',        titulo: 'Mis pedidos',           icon: ShoppingBag, ready: true },
  { to: '/mi-cuenta/favoritos',      label: 'Favoritos',      titulo: 'Mis favoritos',         icon: Heart,       ready: true },
  { to: '/mi-cuenta/direcciones',    label: 'Direcciones',    titulo: 'Direcciones de entrega',icon: MapPin,      ready: true },
  { to: '/mi-cuenta/pagos',          label: 'Pagos',          titulo: 'Métodos de pago',       icon: CreditCard,  ready: true },
  { to: '/mi-cuenta/notificaciones', label: 'Avisos',         titulo: 'Notificaciones',        icon: Bell,        ready: true },
  { to: '/mi-cuenta/puntos',         label: 'Puntos',         titulo: 'Puntos de fidelidad',   icon: Star,        ready: true },
  { to: '/mi-cuenta/recibidos',      label: 'Recibos',        titulo: 'Recibos',               icon: Receipt,     ready: true },
  { to: '/mi-cuenta/preferencias',   label: 'Preferencias',   titulo: 'Apariencia e idioma',   icon: SlidersHorizontal, ready: true },
];

// Lo que tapa cada flecha: al llevar la pestaña activa a la vista, se deja ese margen.
const ANCHO_FLECHA = 48;

// La flecha de cada orilla, sobre un degradado del color de la barra: el degradado dice "aquí
// sigue" aunque la flecha no se mire, y deja ver que la pestaña de abajo está cortada en vez de
// taparla de golpe.
const FlechaMenu = ({ lado, onClick, etiqueta, c }) => {
  const izquierda = lado === 'izquierda';
  const Icono = izquierda ? ChevronLeft : ChevronRight;
  return (
    <div
      className={`pointer-events-none absolute top-0 bottom-0 flex items-center ${izquierda ? 'left-0 justify-start' : 'right-0 justify-end'}`}
      style={{
        width: ANCHO_FLECHA,
        background: `linear-gradient(to ${izquierda ? 'right' : 'left'}, ${c.topbarBg} 55%, transparent)`,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={etiqueta}
        title={etiqueta}
        className="press pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full shadow-sm"
        style={{ backgroundColor: c.cardBg, border: `1px solid ${c.cardBorder}`, color: c.textPrimary }}
      >
        <Icono className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

const ClienteLayout = () => {
  const { palette } = useTheme();
  const c = palette.colors;
  const { t } = useIdioma();
  const location = useLocation();
  const reduce = useReducedMotion();

  // Mi Cuenta es SOLO del cliente. Aquí vivía también el Reparto del personal: quien entraba con su
  // cuenta de empleado veía solo esa pestaña (primero con un interruptor, "Estoy trabajando", y
  // después según el tipo de cuenta).

  // EL MENÚ CON EL MOUSE.
  // Si las secciones no caben, se llega a las escondidas con las flechas de las orillas, la rueda
  // del mouse encima del menú o trayendo sola a la vista la pestaña abierta.
  const { fila, puedeIzq, puedeDer, izquierda, derecha } = useFilaDeslizable({ rueda: true });
  const nav = useRef(null);
  const engancharNav = useCallback((el) => {
    nav.current = el;
    fila(el);
  }, [fila]);

  useEffect(() => {
    const el = nav.current;
    const activa = el?.querySelector('[aria-current="page"]');
    if (!el || !activa) return;
    const desde = activa.offsetLeft;
    const hasta = desde + activa.offsetWidth;
    const comportamiento = reduce ? 'auto' : 'smooth';
    if (desde - ANCHO_FLECHA < el.scrollLeft) {
      el.scrollTo({ left: Math.max(0, desde - ANCHO_FLECHA), behavior: comportamiento });
    } else if (hasta + ANCHO_FLECHA > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: hasta + ANCHO_FLECHA - el.clientWidth, behavior: comportamiento });
    }
  }, [location.pathname, reduce]);

  // El sombreado al pasar el mouse se fue con el menú lateral: en pestañas horizontales el subrayado
  // ya dice cuál está activa, y pintarles el fondo encima las volvía botones apretados uno contra
  // otro.

  const enAyuda = location.pathname === '/mi-cuenta/ayuda';

  return (
    <div className="min-h-screen" style={{ backgroundColor: c.mainBg, color: c.textPrimary }}>
      {/* ── Barra superior ── La MISMA de la tienda. Con HeaderTienda el carrito y el buscador siguen
         donde siempre (llevan a la tienda, igual que en Impresiones). */}
      <HeaderTienda />

      {/* ── Menú de secciones ── Va ARRIBA, en horizontal, y el contenido al centro con aire a los lados.
         Con el menú de lado, cada página arrancaba corrida a la derecha y el ojo tenía que saltar la
         columna del menú antes de llegar a lo que venía a ver. */}
      <div className="px-4 sm:px-6" style={{ backgroundColor: c.topbarBg }}>
        <div className="relative max-w-6xl mx-auto">
          {/* Deslizable cuando no cabe: en un teléfono no caben las pestañas, y partirlas en dos filas movía
             el contenido hacia abajo cada vez. `relative` es para que cada pestaña mida su posición desde
             aquí (ver el efecto que trae la activa a la vista). */}
          <nav
            ref={engancharNav}
            aria-label={t('Mi cuenta')}
            className="relative flex items-center gap-1 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* La vuelta a comprar, primera y siempre a la vista. Con el encabezado de la tienda arriba parecía
               que ya no hacía falta, pero ahí el nombre abre los pasillos (no lleva a la tienda) y el buscador
               y el carrito solo llevan de rebote: no había un "volver" que se viera como tal. */}
            <Link
              to="/"
              title={t('Volver a la tienda')}
              className="flex items-center gap-1.5 pl-1 pr-3 py-3 text-[13.5px] font-bold whitespace-nowrap transition-colors"
              style={{ color: c.primary }}
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> {t('Ir a la tienda')}
            </Link>
            <span className="w-px h-5 mr-1 flex-shrink-0" style={{ backgroundColor: c.cardBorder }} aria-hidden="true" />

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;

              // Ítems aún no cableados: visibles pero deshabilitados.
              if (!item.ready) {
                return (
                  <div
                    key={item.to}
                    title={t('Próximamente')}
                    className="flex items-center gap-2 px-3 py-3 text-sm whitespace-nowrap cursor-not-allowed opacity-50"
                    style={{ color: c.textMuted }}
                  >
                    <Icon className="w-4 h-4" /> {t(item.label)}
                  </div>
                );
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={t(item.titulo || item.label)}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-center gap-1.5 px-2 py-3 text-[13.5px] whitespace-nowrap transition-colors relative"
                  style={{
                    color: active ? c.primary : c.textSecondary,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" /> {t(item.label)}
                  {/* La rayita de abajo: dice dónde está uno sin pintar toda la
                      pestaña, que en horizontal se ve pesado */}
                  {active && (
                    <span
                      className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t"
                      style={{ backgroundColor: c.primary }}
                    />
                  )}
                </Link>
              );
            })}

            {/* La ayuda se va al final, separada: no es una sección de la
                cuenta sino algo que se consulta desde ella. */}
            <span className="flex-1 min-w-[8px]" />

            <Link
              to="/mi-cuenta/ayuda"
              title={t('Centro de ayuda')}
              aria-current={enAyuda ? 'page' : undefined}
              className="flex items-center gap-1.5 px-2 py-3 text-[13.5px] whitespace-nowrap transition-colors"
              style={{
                color: enAyuda ? c.primary : c.textSecondary,
                fontWeight: enAyuda ? 700 : 500,
              }}
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0" /> {t('Ayuda')}
            </Link>
          </nav>

          {puedeIzq && <FlechaMenu lado="izquierda" onClick={izquierda} etiqueta={t('Ver las secciones anteriores')} c={c} />}
          {puedeDer && <FlechaMenu lado="derecha" onClick={derecha} etiqueta={t('Ver más secciones')} c={c} />}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7">
        {/* Contenido de la página activa */}
        <main
          className="min-w-0 rounded-2xl p-6 sm:p-8"
          style={{ backgroundColor: c.cardBg, border: `1px solid ${c.cardBorder}` }}
        >
          {/* Transición sutil entre páginas del cliente (criterio de Emil) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ClienteLayout;
