import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { X, Minus, Plus, Trash2, ShoppingBag, ChevronLeft, CreditCard, MapPin, ChevronRight, Package, MessageCircle, Store as StoreFront, Hash, Wallet, Gift, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useLoyalty } from '../../hooks/useLoyalty';
import { useSaldo } from '../../hooks/useSaldo';
import { useDireccionCtx } from '../../context/DireccionContext';
import { usePedidoActivoCtx } from '../../context/PedidoActivoContext';
import { useTiempoPorZona } from '../../hooks/useTiempoPorZona';
import { orderService } from '../../api/orderService';
import { esPorLibra, pasoDe, ajustarCantidad, cantidadConUnidad } from '../../utils/unidades';
import { calcularEnvio } from '../../utils/envio.js';
import { calcularServicio } from '../../utils/servicio.js';
import SeguimientoConfirmacion from './SeguimientoConfirmacion';
import CodigoEntrega from './CodigoEntrega';
import MapaDireccion from './MapaDireccion';
import MarcaTienda from './MarcaTienda';
import Mascota, { EsperaMascota } from '../UI/Mascota';
// El nombre de la tienda sale de los ajustes; el carrito y el recibo se habían
// quedado con el escrito a mano. Ver AjustesContext.
import { useAjustesCtx } from '../../context/AjustesContext';
import { enlaceWhatsApp } from '../../utils/tienda';
import { useIdioma } from '../../hooks/useIdioma';
import { foto, ANCHO } from '../../utils/fotos';
import { formatoCodigoTarjeta, LARGO_CODIGO_TARJETA } from '../../utils/tarjetaRegalo';

// Productos por página en el resumen del pedido confirmado.
const POR_PAGINA = 4;

const BROWN = 'var(--marca-600)';
const BROWN_DARK = 'var(--marca-700)';
const BROWN_LIGHT = 'var(--marca-100)';

/*
 * El carrito entra con TRANSICIONES, no con @keyframes.
 * Motivo: una transición se puede interrumpir y retomar desde donde va; los
 * keyframes reinician desde cero. Si el cliente abre y cierra rápido, esto se
 * siente natural en vez de dar un brinco.
 */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  /* Desenfoque ligero: a 4px el navegador repintaba toda la pantalla detrás en
     cada cuadro y la apertura se sentía pesada. 2px da la sensación de foco sin
     ese costo. */
  backdrop-filter: blur(2px);
  /*
   * POR ENCIMA de la ficha de producto (1000), no debajo.
   *
   * Desde que la ficha lleva el encabezado completo de la tienda, ahí adentro
   * hay un botón de carrito — y con 999 el carrito se abría DETRÁS de la
   * ficha: la pantalla se oscurecía, el pedido se movía y no se veía nada.
   * Por debajo del candado de los +18 (1100), que tiene que poder preguntar
   * la edad incluso con el carrito abierto.
   */
  z-index: 1050;
  display: flex;
  justify-content: flex-end;
  opacity: ${p => (p.$montado ? 1 : 0)};
  transition: opacity var(--dur-popover) var(--ease-out);
`;

/*
 * 100dvh y no 100vh, en los dos paneles.
 *
 * En el teléfono 100vh mide la pantalla SIN la barra de direcciones del
 * navegador, así que el panel quedaba más alto que lo que de verdad se ve y su
 * último tramo caía por debajo. En el carrito ese último tramo es justo el
 * botón de pagar: la persona llenaba el carrito, abría el panel y el botón no
 * estaba en ninguna parte. La unidad dvh sí mide lo visible.
 *
 * Se deja el 100vh arriba como respaldo para el navegador que no la conozca.
 */
const ALTO_PANTALLA = `
  height: 100vh;
  height: 100dvh;
`;

/* Full-width panel for checkout & confirmation */
const FullPanel = styled.div`
  background: var(--papel-gris);
  width: 100%;
  ${ALTO_PANTALLA}
  display: flex;
  flex-direction: column;
  transform: translateX(${p => (p.$montado ? '0' : '100%')});
  /* Más ágil: la curva de "drawer" tenía una cola muy lenta que se sentía
     pesada al abrir. Con dur-popover + ease-out entra rápido y limpio. */
  transition: transform var(--dur-popover) var(--ease-out);
  overflow-y: auto;
  overscroll-behavior: contain;
`;

/* Slide-in cart panel */
const CartPanel = styled.div`
  background: var(--papel);
  width: 100%;
  max-width: 440px;
  ${ALTO_PANTALLA}
  display: flex;
  flex-direction: column;
  box-shadow: -12px 0 40px rgba(0,0,0,0.12);
  transform: translateX(${p => (p.$montado ? '0' : '100%')});
  /* Más ágil: la curva de "drawer" tenía una cola muy lenta que se sentía
     pesada al abrir. Con dur-popover + ease-out entra rápido y limpio. */
  transition: transform var(--dur-popover) var(--ease-out);
`;

/* ── SHARED TOP BAR ── */
const PageTopBar = styled.div`
  background: var(--papel);
  border-bottom: 1px solid var(--linea);
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 10px;

  @media (max-width: 560px) { padding: 10px 14px; }
`;

const BrandTitle = styled.div`
  text-align: center;
  flex: 1;
`;

/* La marca la pinta MarcaTienda.jsx, igual que en el resto de las barras. */

const BackBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: var(--tinta-suave);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  /* Volver del checkout al carrito con el pulgar: 28px no alcanzaban. */
  min-width: 44px;
  min-height: 44px;

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto); }
  }
  &:active { transform: scale(0.94); }
`;

/*
 * "Ayuda" abre el WhatsApp de la tienda. Es un enlace y no un botón porque
 * lleva a otro lado; antes era un botón que no hacía nada al tocarlo.
 */
const HelpBtn = styled.a`
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1.5px solid var(--linea-fuerte);
  border-radius: 30px;
  background: var(--papel);
  font-size: 12px;
  color: var(--tinta-suave);
  cursor: pointer;
  flex-shrink: 0;
  min-height: 40px;
  white-space: nowrap;

  @media (hover: hover) and (pointer: fine) {
    &:hover { border-color: ${BROWN}; color: var(--marca-texto); }
  }
  &:active { transform: scale(0.97); }
`;

/* ── CART PANEL elements ── */
const CartHeader = styled.div`
  padding: 18px 22px;
  border-bottom: 1px solid var(--linea);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  gap: 10px;

  /* 12px menos de margen a cada lado es un producto más ancho por renglón. */
  @media (max-width: 480px) { padding: 14px 16px; }
`;

const CartTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: var(--tinta);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ItemCount = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: var(--tinta-tenue);
`;

const CloseButton = styled.button`
  background: var(--papel-gris);
  border: none;
  cursor: pointer;
  color: var(--tinta-suave);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), transform var(--dur-press) var(--ease-out), box-shadow var(--dur-press) var(--ease-out);
  &:hover { background: var(--papel-gris); color: var(--tinta); }
`;

const CartItemsScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 10px 22px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--linea-fuerte); border-radius: 4px; }

  @media (max-width: 480px) { padding: 10px 16px; }
`;

const StoreName = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 10px;
  border-bottom: 1px solid var(--linea);
  margin-bottom: 6px;
`;

const StoreIcon = styled.div`
  width: 38px;
  height: 38px;
  background: ${BROWN_LIGHT};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
`;

const StoreInfo = styled.div`
  .name { font-size: 14px; font-weight: 600; color: var(--tinta); }
  .sub { font-size: 11px; color: var(--tinta-tenue); }
`;

const ProductsLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: var(--tinta-tenue);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 8px 0 6px;
`;

const CartItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--linea);
`;

const ItemImgBox = styled.div`
  width: 52px;
  height: 52px;
  background: var(--papel-gris);
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Mismo criterio que las tarjetas: la foto entra entera, no recortada */
  padding: 5px;
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .emoji { font-size: 26px; }
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--tinta);
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemPriceLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
`;

const ItemOldPrice = styled.span`
  font-size: 11px;
  color: var(--tinta-tenue);
  text-decoration: line-through;
`;

const ItemPrice = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--marca-texto);
`;

// El "/lb" acompaña al precio sin competir con él.
const UnidadChica = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: var(--tinta-tenue);
`;

const QtyControls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

/*
 * Los botones de cantidad crecen en el teléfono.
 *
 * A 26px son dos blancos de la mitad del pulgar, pegados uno al otro y con el
 * bote de basura al lado: equivocarse aquí no es un tropiezo, es borrar un
 * producto que se quería llevar. En pantalla táctil pasan a 34px de caja y
 * 44px de área de toque; con el ratón se quedan como estaban.
 */
const QtyBtn = styled.button`
  width: 26px;
  height: 26px;
  border: 1px solid var(--linea);
  border-radius: 7px;
  background: var(--papel);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  transition: background-color var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), transform var(--dur-press) var(--ease-out), box-shadow var(--dur-press) var(--ease-out);
  color: var(--tinta-suave);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: ${BROWN_LIGHT}; border-color: ${BROWN}; color: var(--marca-texto); }
  }
  &:active:not(:disabled) { transform: scale(0.94); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  @media (pointer: coarse), (max-width: 560px) {
    width: 34px;
    height: 34px;
    &::after { content: ''; position: absolute; inset: -5px; }
  }
`;

const QtyNum = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: var(--tinta);
  min-width: 22px;
  text-align: center;
`;

const ItemTotal = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--tinta);
  text-align: right;
  flex-shrink: 0;
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: var(--tinta-apagada);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  flex-shrink: 0;
  position: relative;

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--peligro); }
  }

  /*
   * Separado del menos, no pegado: es el único botón de esta fila que no se
   * puede deshacer, y estaba a 6px del que solo baja la cantidad.
   */
  @media (pointer: coarse), (max-width: 560px) {
    width: 34px;
    height: 34px;
    margin-right: 6px;
    &::after { content: ''; position: absolute; inset: -5px; }
  }
`;

const EmptyCart = styled.div`
  /*
   * Columna centrada, no solo text-align. Tailwind pone svg { display:block },
   * así que el icono es un bloque y text-align no lo centra: quedaba pegado a
   * la izquierda mientras el texto sí se centraba. Con flex se centran los tres.
   */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 60vh;      /* lo deja a media altura del panel, no pegado arriba */
  padding: 40px 20px;
  color: var(--tinta-tenue);
  .mascota { margin-bottom: 18px; }
  .title { font-size: 16px; font-weight: 600; color: var(--tinta-suave); margin-bottom: 6px; }
  .sub { font-size: 13px; }
`;

/* Cart footer */
const CartFooter = styled.div`
  border-top: 1px solid var(--linea);
  flex-shrink: 0;
  background: var(--papel);

  /*
   * El área segura del iPhone. Sin esto la barra de gestos de abajo se come el
   * borde del botón de pagar, y aunque se alcance a tocar, un botón mordido
   * por el borde de la pantalla no invita a apretarlo con la plata de por
   * medio.
   */
  padding-bottom: env(safe-area-inset-bottom);
`;

const OrderSummaryBox = styled.div`
  padding: 16px 22px 12px;

  @media (max-width: 480px) { padding: 14px 16px 10px; }
`;

const SummaryTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: var(--tinta);
  margin-bottom: 10px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--tinta-suave);
  margin-bottom: 6px;
  span:last-child { color: var(--tinta); font-weight: 500; }
`;

/*
 * "Se calcula al pagar": un dato pendiente, no un monto, así que va más tenue.
 * Con !important porque SummaryRow pinta en negrita a su último <span> con un
 * selector más fuerte que una clase sola.
 */
const PorCalcular = styled.span`
  color: var(--tinta-tenue) !important;
  font-weight: 400 !important;
  font-style: italic;
`;

const Divider = styled.div`
  height: 1px;
  background: var(--papel-gris);
  margin: 10px 0;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`;

const TotalLabel = styled.span`font-size: 15px; font-weight: 700; color: var(--tinta);`;
const TotalPrice = styled.span`font-size: 22px; font-weight: 800; color: var(--tinta);`;

const BtnRow = styled.div`
  padding: 0 22px 20px;
  display: flex;
  gap: 10px;

  @media (max-width: 480px) { padding: 0 16px 16px; }
`;

const ClearBtn = styled.button`
  padding: 13px 16px;
  min-height: 48px;
  flex-shrink: 0;
  border: 1.5px solid var(--linea);
  border-radius: 14px;
  background: var(--papel);
  color: var(--tinta-suave);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), transform var(--dur-press) var(--ease-out), box-shadow var(--dur-press) var(--ease-out);
  white-space: nowrap;
  &:hover { background: var(--peligro-fondo); border-color: var(--peligro-borde); color: var(--peligro); }
`;

const CheckoutBtn = styled.button`
  flex: 1;
  padding: 13px;
  /* El botón que cobra: nunca por debajo del pulgar. */
  min-height: 48px;
  min-width: 0;
  border: none;
  border-radius: 14px;
  background: ${BROWN};
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: ${BROWN_DARK}; }
  }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.7; cursor: not-allowed; }
`;

/* ── CHECKOUT VIEW ── */
const CheckoutLayout = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 28px 60px;
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 28px;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  /*
   * En el teléfono el margen baja a 14px y el de abajo sube, con el área
   * segura incluida: el resumen con el botón de pagar es lo último de la
   * página, y sin este colchón quedaba pegado al borde inferior.
   */
  @media (max-width: 560px) {
    padding: 18px 14px calc(40px + env(safe-area-inset-bottom));
    gap: 16px;
  }
`;

const CheckoutLeft = styled.div``;

const CheckoutCard = styled.div`
  background: var(--papel);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const CheckoutSectionTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: var(--tinta);
  margin-bottom: 2px;
`;

const CheckoutIconBox = styled.div`
  width: 42px;
  height: 42px;
  background: ${BROWN_LIGHT};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
`;

const OrderThumbsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 24px;

  /*
   * Seis miniaturas de 48px no caben en 347px de tarjeta, y como la tarjeta
   * recorta lo que se sale, las últimas desaparecían sin dejar rastro. Que
   * bajen de renglón.
   */
  flex-wrap: wrap;

  @media (max-width: 560px) { padding: 14px 16px; }
`;

const OrderThumb = styled.div`
  width: 48px;
  height: 48px;
  background: var(--papel-gris);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  overflow: hidden;
  padding: 4px;
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
`;

const MoreBadge = styled.div`
  width: 48px;
  height: 48px;
  background: ${BROWN_LIGHT};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--marca-texto);
`;

/* Checkout right: order summary */
const SummaryCard = styled.div`
  background: var(--papel);
  border-radius: 16px;
  padding: 24px;
  position: sticky;
  top: 20px;

  /*
   * En una sola columna el sticky no tiene contra qué pegarse (es el último
   * bloque del flujo) y encima lo dejaba flotando raro al rebotar el scroll.
   * Abajo del formulario, quieto, que es donde se lee el total y se paga.
   */
  @media (max-width: 768px) { position: static; }
  @media (max-width: 560px) { padding: 18px 16px; }
`;

const SummaryCardTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: var(--tinta);
  margin-bottom: 16px;
`;

const SummaryCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--tinta-suave);
  margin-bottom: 8px;
  span:last-child { color: var(--tinta); font-weight: 500; }
`;

const TotalBig = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--tinta);
`;

const PlaceOrderBtn = styled.button`
  width: 100%;
  padding: 15px;
  min-height: 52px;
  border: none;
  border-radius: 14px;
  background: ${BROWN};
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 18px;
  /* En flex para que la mascota de "Procesando…" quede al lado del texto. */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: ${BROWN_DARK}; }
  }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.7; cursor: not-allowed; }
`;

/* ── CONFIRMATION VIEW ── */
const ConfirmLayout = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 28px 60px;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 28px;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 560px) {
    padding: 18px 14px calc(40px + env(safe-area-inset-bottom));
    gap: 16px;
  }
`;

const ConfirmCard = styled.div`
  background: var(--papel);
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 16px;

  @media (max-width: 560px) { padding: 20px 16px; }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--exito-fondo);
  color: var(--exito-texto);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
`;

const ConfirmTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: var(--tinta);
  margin: 0 0 4px;
`;

const ConfirmDate = styled.div`
  font-size: 13px;
  color: var(--tinta-tenue);
  margin-bottom: 24px;
`;

const Festejo = styled.div`
  display: flex;
  justify-content: center;
  margin: 4px 0 14px;
`;

const AcceptedMsg = styled.div`
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--tinta);
  margin-bottom: 24px;
`;

/* Products table */
const ProductsTable = styled.div``;

const PTableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--tinta-tenue);
  font-weight: 600;
  padding: 10px 0;
  border-bottom: 1px solid var(--linea);
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const PTableRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--linea);
`;

const PImgBox = styled.div`
  width: 42px;
  height: 42px;
  background: var(--papel-gris);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  overflow: hidden;
  padding: 4px;
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
`;

const PName = styled.div`flex: 1; font-size: 13px; font-weight: 500; color: var(--tinta);`;
const POldPrice = styled.div`font-size: 11px; color: var(--tinta-tenue); text-decoration: line-through;`;
const PPrice = styled.div`font-size: 13px; color: var(--tinta); font-weight: 600;`;

const PQty = styled.div`font-size: 13px; color: var(--tinta-tenue); text-align: right; min-width: 32px;`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
`;

const PageBtn = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid ${props => props.$active ? BROWN : 'var(--linea-fuerte)'};
  background: ${props => props.$active ? BROWN_LIGHT : 'var(--papel)'};
  color: ${props => props.$active ? BROWN : 'var(--tinta-suave)'};
  border-radius: 8px;
  font-size: 13px;
  font-weight: ${props => props.$active ? '700' : '400'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* Right panel for confirmation */
const ConfirmSummaryCard = styled.div`
  background: var(--papel);
  border-radius: 16px;
  padding: 24px;
  position: sticky;
  top: 20px;

  @media (max-width: 768px) { position: static; }
  @media (max-width: 560px) { padding: 18px 16px; }
`;

const ConfirmSummaryTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: var(--tinta);
  margin-bottom: 4px;
`;

const OrderNumber = styled.div`
  font-size: 12px;
  color: var(--marca-texto);
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const PayMethod = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tinta);
  margin-top: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--linea);
`;


/*
 * Opción del checkout (retiro/delivery, efectivo/tarjeta/saldo).
 * Tarjeta seleccionable con borde café, no un radio button suelto: en pantalla
 * táctil el área de toque es toda la tarjeta y no un círculo de 12px.
 */
const OpcionBtn = styled.button`
  /*
   * En el teléfono cada opción se lleva el renglón entero: dos de estas a la
   * par miden 130px cada una, y "Envío a domicilio · +$4.78 de envío" en 130px
   * se parte en cuatro líneas. Son cuatro decisiones en toda la compra
   * (retiro/envío, efectivo/tarjeta/saldo): bien vale un renglón cada una.
   */
  flex: 1 1 150px;
  min-width: 0;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1.5px solid ${p => (p.$activa ? BROWN : 'var(--linea)')};
  background: ${p => (p.$activa ? BROWN_LIGHT : 'var(--papel)')};
  color: ${p => (p.$activa ? BROWN : 'var(--tinta-suave)')};
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background-color var(--dur-press) var(--ease-out),
              border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) { border-color: ${BROWN}; }
  }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }

  @media (max-width: 560px) { flex: 1 1 100%; }
`;

const DeliveryAddress = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--tinta);
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--linea);
`;

/* ── MAIN COMPONENT ── */
const ShoppingCart = ({
  items,
  total,
  onCerrar,
  onActualizarCantidad,
  onEliminarItem,
  onLimpiarCarrito,
  onCheckout,
  /*
   * Abrir directo en el pago, sin pasar por la lista. Lo pide Tiqui cuando
   * la persona le confirma la compra por voz: ya dijo que sí, hacerla tocar
   * "Pagar" otra vez sería preguntarle dos veces lo mismo.
   */
  abrirEnPago = false,
}) => {
  const navigate = useNavigate();
  /*
   * A dónde hay que volver si por algo se sale de aquí. Antes estaba escrito
   * "/store" a mano, pero la tienda también vive en "/" y en "/seccion/…":
   * quien entraba desde la portada terminaba en otra pantalla que no era la
   * suya. La ruta de verdad la sabe el router, no nosotros.
   */
  const location = useLocation();
  const rutaActual = `${location.pathname}${location.search}`;

  // Va aquí arriba y no con el canje de puntos: la vista inicial ya la necesita.
  const { user, esCliente } = useAuth();
  const { t, locale } = useIdioma();

  /*
   * El pago exige sesión de cliente y algo que pagar (ver irAlCheckout). Si
   * falta cualquiera de las dos, se abre la lista como siempre.
   */
  const [view, setView] = useState(() => (abrirEnPago && esCliente && items.length ? 'checkout' : 'cart')); // 'cart' | 'checkout' | 'confirmation'
  const [procesando, setProcesando] = useState(false);
  // El pedido que devolvió el backend al crearlo: de aquí salen el número real,
  // el total real y el envío real que se muestran en la confirmación.
  const [ordenCreada, setOrdenCreada] = useState(null);
  const [imgErrors, setImgErrors] = useState({});
  const [orderPage, setOrderPage] = useState(1);

  /*
   * LA FOTO DE LO QUE SE PIDIÓ.
   *
   * La confirmación se pintaba leyendo el carrito EN VIVO, y por eso el
   * carrito no se podía vaciar hasta que la persona cerrara el panel con el
   * botón — si se vaciaba antes, la confirmación se quedaba sin productos.
   *
   * El problema es que nadie cierra las cosas con el botón: se va para atrás,
   * cierra la pestaña, toca un enlace. Y entonces el carrito seguía lleno de
   * lo YA PAGADO, así que en la siguiente visita se encontraba el mismo pedido
   * esperando y se podía pagar dos veces.
   *
   * Con la foto tomada al confirmar, la confirmación deja de depender del
   * carrito y el carrito se puede vaciar en el momento en que corresponde: en
   * cuanto el servidor dice que el pedido existe.
   */
  const [itemsPedido, setItemsPedido] = useState([]);
  const itemsAMostrar = view === 'confirmation' ? itemsPedido : items;

  // Páginas reales del resumen de productos del pedido.
  const totalPaginas = Math.max(1, Math.ceil(itemsAMostrar.length / POR_PAGINA));

  // Marcamos "montado" en el siguiente frame para que la transición de entrada
  // corra (si pintáramos ya en su posición final, no habría nada que animar).
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /*
   * ── Entrega y pago ──
   * El envío solo se cobra si se lo llevan a la casa. Antes se cobraba
   * siempre, así que pasar a traerlo al local costaba lo mismo que el
   * delivery — no tenía sentido elegirlo.
   */
  const [entrega, setEntrega] = useState('retiro');   // 'retiro' | 'delivery'
  /*
   * La dirección se elige de las guardadas, y es la MISMA que muestra el
   * encabezado de la tienda: viene del contexto. Cambiarla aquí la cambia
   * arriba y al revés — dos lugares diciendo cosas distintas sobre a dónde
   * va el pedido es la peor manera de perder una entrega.
   */
  const {
    direcciones,
    indice: indiceDireccion,
    activa: direccionElegida,
    elegir: setIndiceDireccion,
    agregar: agregarDireccion,
    guardando: guardandoDireccion,
  } = useDireccionCtx();

  /*
   * ── Agregar una dirección SIN salir del carrito ──
   *
   * Antes este botón mandaba a la pantalla del mapa, en medio del pago. Salir
   * de la tienda para volver a entrar es el peor momento para pedirle un
   * viaje a alguien que ya tenía la plata en la mano — y el carrito, que no
   * se guardaba en ningún lado, se quedaba en el camino.
   *
   * Ahora se escribe aquí mismo. El mapa sigue estando para quien quiera
   * marcar el punto exacto, pero como una opción, no como el único camino.
   */
  const [agregandoDireccion, setAgregandoDireccion] = useState(false);

  /*
   * La dirección se marca EN EL MAPA, aquí mismo.
   *
   * Antes había dos caminos: escribirla a ciegas en tres cajas de texto, o
   * irse a otra pantalla a marcarla. El primero dejaba direcciones sin
   * coordenadas —el repartidor sale con un texto y sin saber a qué portón
   * tocar, el envío se cobra solo la base en vez de por distancia, y el
   * cliente no puede seguir su pedido en el mapa— y el segundo sacaba a la
   * persona del pago para mandarla de viaje.
   *
   * Ahora el mapa está incrustado: no se sale de aquí Y la dirección queda
   * con su punto. Ver MapaDireccion.jsx.
   */
  const guardarNuevaDireccion = (dir) => {
    // Las direcciones se guardan en la cuenta: sin sesión no hay dónde ponerlas.
    if (!user?.id) {
      toast(t('Inicia sesión para guardar tu dirección'));
      navigate(`/iniciar-sesion?volver=${encodeURIComponent(rutaActual)}`);
      return;
    }
    /*
     * Se deja elegida la que acaba de marcar: agregarla y que el pedido
     * siguiera saliendo a la anterior es exactamente el error que se quiso
     * evitar. Va por el índice que ocupará al final de la lista.
     */
    setIndiceDireccion(direcciones.length);
    agregarDireccion(dir);
    setAgregandoDireccion(false);
  };

  // Cuánto hemos tardado de verdad en llegar a esa zona (no un rango inventado).
  const zona = useTiempoPorZona(direccionElegida?.lat, direccionElegida?.lng);
  const [metodoPago, setMetodoPago] = useState('efectivo'); // 'efectivo' | 'tarjeta' | 'saldo'

  // ── Canje de puntos ──
  // `esCliente` (de más arriba) distingue "hay sesión" de "hay sesión DE
  // CLIENTE": en la tienda la activa puede ser la del personal. Ver useAuth.
  const { ajustes } = useAjustesCtx();
  // La burbuja de seguimiento vive montada desde antes de abrir el carrito y
  // no se entera sola de un pedido recién pagado: aquí se le avisa. Ver
  // PedidoActivoContext.
  const { refrescar: refrescarPedidoActivo } = usePedidoActivoCtx();

  // El costo del envío se calcula por DISTANCIA (zona → por km → plano) con la
  // ubicación de la dirección elegida. Es el MISMO cálculo que hace el backend,
  // así que lo que se ve aquí es lo que se va a cobrar. Si aún no cargan los
  // ajustes o la dirección no tiene coordenadas, se cobra solo la tarifa base.
  const envioCalc = calcularEnvio(ajustes, { lat: direccionElegida?.lat, lng: direccionElegida?.lng });
  const COSTO_ENVIO = envioCalc.costo;
  const ENVIO = items.length > 0 && entrega === 'delivery' ? COSTO_ENVIO : 0;
  const subtotal = total;
  // La tarifa de servicio la fija el panel (apagada, fija o % del subtotal). Es
  // el mismo cálculo del backend, así que lo que se ve aquí es lo que se cobra.
  const SERVICIO = items.length > 0 ? calcularServicio(ajustes, subtotal) : 0;
  const totalFinal = subtotal + ENVIO + SERVICIO;
  const { saldo, canjeando, canjear, recargar: recargarSaldo } = useSaldo();
  const [codigoTarjeta, setCodigoTarjeta] = useState('');

  /*
   * Canjear la tarjeta sin salir del checkout: si el cliente tuviera que irse
   * a "Métodos de pago" a canjearla, pierde el carrito de vista y muchos no
   * vuelven. Al canjear, si el saldo alcanza, se selecciona solo como pago.
   */
  const onCanjearEnCheckout = async (e) => {
    e.preventDefault();
    if (await canjear(codigoTarjeta)) {
      setCodigoTarjeta('');
      setMetodoPago('saldo');
    }
  };
  const { points: puntosDisponibles, redeemRate, minRedeem } = useLoyalty();
  const [usarPuntos, setUsarPuntos] = useState(false);

  const puedeCanjear = puntosDisponibles >= minRedeem;
  // No dejamos canjear más de lo que valen los productos.
  const maxPuntosUtiles = Math.floor(subtotal * redeemRate);
  const puntosAUsar = usarPuntos && puedeCanjear ? Math.min(puntosDisponibles, maxPuntosUtiles) : 0;
  const descuento = Number((puntosAUsar / (redeemRate || 100)).toFixed(2));
  const totalAPagar = Math.max(0, Number((totalFinal - descuento).toFixed(2)));

  /*
   * Precio efectivo por unidad. Para las promos NxM (2x1) el cliente paga menos
   * unidades de las que lleva, así que repartimos el total de la línea entre la
   * cantidad — de esa forma el backend calcula el mismo total que ve en pantalla.
   */
  const precioEfectivo = (item) => {
    if (item.promo?.type === 'nxm') {
      const b = item.promo.buyQty || 2;
      const m = item.promo.payQty || 1;
      const grupos = Math.floor(item.cantidad / b);
      const pagados = grupos * m + (item.cantidad % b);
      return Number(((item.precio * pagados) / item.cantidad).toFixed(4));
    }
    return item.precio;
  };

  // Crea el pedido REAL. (El cobro con pasarela todavía no se conecta.)
  const handlePlaceOrder = async () => {
    /*
     * La tienda se recorre sin cuenta, pero para pagar sí hace falta: el
     * pedido tiene que ir a nombre de alguien y a una dirección. En vez de
     * dejar el aviso y que la persona busque dónde entrar, se la lleva al
     * login y se la devuelve al carrito con todo lo que ya había puesto.
     */
    /*
     * `esCliente`, no `user?.id`.
     *
     * Fuera del panel la sesión activa puede ser la del PERSONAL —un admin
     * mirando su propia tienda, que es lo normal aquí—. Con `user?.id` a secas
     * esa sesión pasaba el guarda y el pedido se guardaba con el _id del admin
     * como clientId: un pedido a nombre de alguien que no existe en la tabla de
     * clientes, con su stock descontado y su lote de puntos escrito.
     */
    if (!esCliente) {
      toast(t('Inicia sesión para terminar tu pedido'));
      // Vuelve a la pantalla en la que estaba, no a "/" a secas: la tienda
      // también se abre desde "/store" y desde una sección.
      navigate(`/iniciar-sesion?volver=${encodeURIComponent(rutaActual)}`);
      return;
    }
    // Con envío a domicilio la dirección es obligatoria; el servidor también
    // lo revisa, pero avisar acá evita que llene todo y falle al final.
    if (entrega === 'delivery' && !direccionElegida) {
      toast.error(t('Elige una dirección de entrega'));
      return;
    }
    // Muy lejos de la tienda no se entrega (el servidor tampoco lo acepta).
    if (entrega === 'delivery' && envioCalc.fueraDeCobertura) {
      toast.error(t('Esa dirección queda fuera de la zona de entrega. Puedes elegir recogerlo en la tienda.'));
      return;
    }
    // Se compara contra totalAPagar (ya con el descuento de puntos aplicado),
    // que es lo que de verdad se va a cobrar.
    if (metodoPago === 'saldo' && saldo < totalAPagar) {
      toast.error(t('Tu saldo es de {saldo} y el pedido cuesta {total}', { saldo: `$${saldo.toFixed(2)}`, total: `$${totalAPagar.toFixed(2)}` }));
      return;
    }

    setProcesando(true);
    try {
      const res = await orderService.createOrder({
        clientId: user.id,
        items: items.map((i) => ({
          productId: i.id,
          name: i.nombre,
          price: precioEfectivo(i),
          amount: i.cantidad,
        })),
        paymentMethod: metodoPago,
        deliveryType: entrega,
        // Van el texto, la referencia y el punto: con las coordenadas, el
        // "cómo llegar" del repartidor cae en el portón y no a media cuadra.
        deliveryAddress: entrega === 'delivery' ? direccionElegida.direccion : undefined,
        deliveryReference: entrega === 'delivery' ? direccionElegida.referencia : undefined,
        deliveryLat: entrega === 'delivery' ? direccionElegida.lat : undefined,
        deliveryLng: entrega === 'delivery' ? direccionElegida.lng : undefined,
        channel: 'web',
        pointsToRedeem: puntosAUsar,
      });
      // El pedido creado, con su número y sus totales reales (el backend calcula
      // el total, no el navegador). La confirmación se pinta con esto.
      setOrdenCreada(res?.order || null);
      // Si pagó con saldo, el del servidor ya bajó: lo volvemos a leer para
      // que no se quede mostrando el de antes.
      if (metodoPago === 'saldo') recargarSaldo();
      // Con esto la burbuja ya sabe que hay un pedido en curso apenas se
      // cierre el carrito, sin esperar a recargar la página.
      refrescarPedidoActivo();

      /*
       * La foto ANTES de vaciar, y el vaciado justo después.
       *
       * El orden importa: la confirmación se pinta de `itemsPedido`, así que
       * primero se guarda lo que se pidió y recién entonces se suelta el
       * carrito. A partir de aquí lo comprado ya no está pendiente de pagar,
       * y el carrito no tiene por qué seguir cargándolo.
       */
      setItemsPedido(items);
      setView('confirmation');
      // Sin aviso: el carrito se vacía porque la compra SALIÓ BIEN, y decirle
      // "se vació el carrito" a quien acaba de pagar suena a que perdió algo.
      onLimpiarCarrito?.({ avisar: false });
    } catch (error) {
      console.error(error); // el interceptor de Axios ya avisa al usuario
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmClose = () => {
    onCheckout?.();
    onCerrar();
  };

  /*
   * Escape hace lo mismo que la flecha o la X de cada vista: en la lista
   * cierra, en el pago vuelve a la lista y en la confirmación cierra. Mientras
   * se procesa el pago no hace nada, para no salir a medio cobro.
   */
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key !== 'Escape' || procesando) return;
      if (view === 'cart') onCerrar();
      else if (view === 'checkout') setView('cart');
      else handleConfirmClose();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  // La ayuda va al WhatsApp que la tienda puso en el panel. Sin número, no sale.
  const enlaceAyuda = enlaceWhatsApp(t('Hola, necesito ayuda con mi pedido.'), ajustes?.negocio?.whatsapp);
  const botonAyuda = enlaceAyuda && (
    <HelpBtn href={enlaceAyuda} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={15} strokeWidth={2} aria-hidden="true" /> {t('Ayuda')}
    </HelpBtn>
  );

  /*
   * Ir al checkout exige sesión de cliente.
   *
   * El servidor ya rechaza el pedido sin sesión, y "Realizar pedido" también lo
   * revisa; pero dejar entrar al checkout, llenar la dirección y el pago para
   * recién ahí rebotar al login es hacer trabajar en balde. Se corta antes: al
   * tocar "Checkout" sin sesión, directo al login y de vuelta al carrito.
   */
  const irAlCheckout = () => {
    if (!esCliente) {
      toast(t('Inicia sesión para continuar con tu pedido'));
      navigate(`/iniciar-sesion?volver=${encodeURIComponent(rutaActual)}`);
      return;
    }
    setView('checkout');
  };

  // ── CART VIEW ──
  if (view === 'cart') {
    return (
      <Overlay $montado={montado} onClick={onCerrar}>
        <CartPanel $montado={montado} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Carrito')}>
          <CartHeader>
            <CartTitle>
              <ShoppingBag size={18} />
              {t('Carrito')}
              <ItemCount>({t(items.length === 1 ? '{n} artículo' : '{n} artículos', { n: items.length })})</ItemCount>
            </CartTitle>
            <CloseButton type="button" onClick={onCerrar} aria-label={t('Cerrar el carrito')} autoFocus><X size={18} aria-hidden="true" /></CloseButton>
          </CartHeader>

          <CartItemsScroll>
            {items.length === 0 ? (
              <EmptyCart>
                <Mascota pose="vacio" alto={130} />
                <div className="title">{t('Tu carrito está vacío')}</div>
                <div className="sub">{t('¡Agrega productos para comenzar!')}</div>
              </EmptyCart>
            ) : (
              <>
                <StoreName>
                  <StoreIcon><StoreFront size={19} strokeWidth={1.8} /></StoreIcon>
                  <StoreInfo>
                    <div className="name">{`${ajustes.nombreLinea1} ${ajustes.nombreLinea2}`.trim()}</div>
                    {/* La misma dirección del pie (Personalización → Datos del negocio). */}
                    {ajustes.direccion && <div className="sub">{ajustes.direccion}</div>}
                  </StoreInfo>
                </StoreName>

                <ProductsLabel>{t('Productos')}</ProductsLabel>

                {items.map(item => (
                  <CartItemRow key={item.id}>
                    <ItemImgBox>
                      {item.imagen && !imgErrors[item.id]
                        ? <img src={foto(item.imagen, ANCHO.miniatura)} alt={item.nombre} onError={() => setImgErrors(p => ({ ...p, [item.id]: true }))} />
                        : <span className="emoji"><Package size={26} strokeWidth={1.4} /></span>
                      }
                    </ItemImgBox>
                    <ItemInfo>
                      <ItemName>{item.nombre}</ItemName>
                      <ItemPriceLine>
                        {item.precioAnterior && <ItemOldPrice>${Number(item.precioAnterior).toFixed(2)}</ItemOldPrice>}
                        <ItemPrice>
                          ${Number(item.precio).toFixed(2)}
                          {esPorLibra(item) && <UnidadChica>/lb</UnidadChica>}
                        </ItemPrice>
                      </ItemPriceLine>
                      {/*
                        El "+" y el "−" se mueven al paso de SU unidad: de uno
                        en uno las piezas, de media en media las libras. Pedir
                        media libra de queso es lo normal en el mostrador, y
                        obligar a llevar una libra entera es cobrar de más.
                        Ver utils/unidades.js.
                      */}
                      <QtyControls>
                        <RemoveBtn onClick={() => onEliminarItem(item.id)} aria-label={t('Quitar {nombre} del carrito', { nombre: item.nombre })}><Trash2 size={14} /></RemoveBtn>
                        <QtyBtn
                          onClick={() => onActualizarCantidad(item.id, ajustarCantidad(item, item.cantidad - pasoDe(item)))}
                          disabled={item.cantidad <= pasoDe(item)}
                          aria-label={t('Menos {nombre}', { nombre: item.nombre })}
                        ><Minus size={12} /></QtyBtn>
                        <QtyNum>{cantidadConUnidad(item, item.cantidad)}</QtyNum>
                        <QtyBtn
                          onClick={() => onActualizarCantidad(item.id, ajustarCantidad(item, item.cantidad + pasoDe(item)))}
                          disabled={item.cantidad >= item.stock}
                          aria-label={t('Más {nombre}', { nombre: item.nombre })}
                        ><Plus size={12} /></QtyBtn>
                      </QtyControls>
                    </ItemInfo>
                    <ItemTotal>${(item.precio * item.cantidad).toFixed(2)}</ItemTotal>
                  </CartItemRow>
                ))}
              </>
            )}
          </CartItemsScroll>

          {items.length > 0 && (
            <CartFooter>
              <OrderSummaryBox>
                <SummaryTitle>{t('Resumen de orden')}</SummaryTitle>
                <SummaryRow><span>{t('Total de artículos')}</span><span>${subtotal.toFixed(2)}</span></SummaryRow>
                {/* Se cobra en el total, así que se muestra: si no, los renglones no cuadraban con él. */}
                {SERVICIO > 0 && (
                  <SummaryRow><span>{t('Tarifa de servicio')}</span><span>${SERVICIO.toFixed(2)}</span></SummaryRow>
                )}
                {/*
                  Aquí todavía no se eligió cómo se entrega (eso es al pagar),
                  así que no hay envío que cobrar. Antes decía "$0.00", que se
                  leía como envío gratis y luego aparecía el cobro. Si ya eligió
                  domicilio, se muestra el monto y el total lo incluye.
                */}
                <SummaryRow>
                  <span>{t('Costo de envío')}</span>
                  {entrega === 'delivery'
                    ? <span>${ENVIO.toFixed(2)}</span>
                    : <PorCalcular>{t('Se calcula al pagar')}</PorCalcular>}
                </SummaryRow>
                <Divider />
                <TotalRow>
                  <TotalLabel>{entrega === 'delivery' ? t('Total') : t('Subtotal')}</TotalLabel>
                  <TotalPrice>${totalFinal.toFixed(2)}</TotalPrice>
                </TotalRow>
              </OrderSummaryBox>
              <BtnRow>
                <ClearBtn onClick={onLimpiarCarrito}>{t('Vaciar')}</ClearBtn>
                {/*
                  "Pagar" y no "Checkout": la tienda entera está en español y
                  esta era una de las dos últimas palabras en inglés que
                  quedaban a la vista. Corta a propósito —el botón lleva el
                  monto al lado y en un teléfono compiten por el mismo renglón.
                */}
                <CheckoutBtn onClick={irAlCheckout}>
                  {t('Pagar')} · ${totalFinal.toFixed(2)}
                </CheckoutBtn>
              </BtnRow>
            </CartFooter>
          )}
        </CartPanel>
      </Overlay>
    );
  }

  // ── CHECKOUT VIEW ──
  if (view === 'checkout') {
    return (
      <Overlay $montado={montado} onClick={() => {}}>
        <FullPanel $montado={montado} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Pago del pedido')}>
          <PageTopBar>
            <BackBtn type="button" onClick={() => setView('cart')} aria-label={t('Volver al carrito')} autoFocus><ChevronLeft size={20} aria-hidden="true" /></BackBtn>
            {/* La misma marca que el menú. Antes aquí decía "Tienda" en gris
                a 11px encima de "la 635" a 18px — ni parecido. */}
            <BrandTitle>
              <MarcaTienda tamano={19} alto={38} />
            </BrandTitle>
            {botonAyuda}
          </PageTopBar>

          <CheckoutLayout>
            <CheckoutLeft>
              <CheckoutCard>
                {/* Header row */}
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--linea)' }}>
                  {/*
                    Con flexWrap la franja de la fecha se baja de renglón en vez
                    de empujar el título fuera de la tarjeta: la tarjeta recorta
                    lo que se sale, así que antes en el teléfono no se cortaba
                    la página pero sí se comía media leyenda.
                  */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <CheckoutIconBox style={{ width: 42, height: 42, marginRight: 0 }}>
                      <ShoppingBag size={20} color={BROWN} />
                    </CheckoutIconBox>
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      {/* Antes decía "Checkout". Ver el botón del carrito. */}
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--tinta)' }}>{t('Finalizar compra')}</div>
                    </div>
                    {/* Se quitó el badge "Deliver Tomorrow…": era texto en inglés y una
                        franja horaria inventada. La tienda entrega el mismo día contra
                        entrega; el tiempo real a la zona ya se muestra más abajo. */}
                  </div>
                </div>

                {/* ── Cómo lo recibe ── */}
                <div style={{ padding: '18px 20px', borderTop: '1px solid var(--linea)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <CheckoutIconBox><MapPin size={18} color={BROWN} /></CheckoutIconBox>
                    <CheckoutSectionTitle>{t('¿Cómo lo recibes?')}</CheckoutSectionTitle>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <OpcionBtn
                      type="button"
                      $activa={entrega === 'retiro'}
                      onClick={() => setEntrega('retiro')}
                    >
                      <StoreFront size={16} strokeWidth={2} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{t('Retiro en el local')}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{t('Sin costo de envío')}</div>
                      </div>
                    </OpcionBtn>

                    <OpcionBtn
                      type="button"
                      $activa={entrega === 'delivery'}
                      onClick={() => setEntrega('delivery')}
                    >
                      <MapPin size={16} strokeWidth={2} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{t('Envío a domicilio')}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{t('+{costo} de envío', { costo: `$${COSTO_ENVIO.toFixed(2)}` })}</div>
                      </div>
                    </OpcionBtn>
                  </div>

                  {/*
                    El tiempo REAL a su zona, sacado de las entregas que ya
                    hicimos por ahí. Va aquí, junto al botón de envío, porque
                    este es el momento en que la persona se pregunta "¿y en
                    cuánto me llega?" — responderlo después, en el correo de
                    confirmación, ya no le sirve para decidir.
                  */}
                  {entrega === 'delivery' && envioCalc.fueraDeCobertura && (
                    <div
                      role="alert"
                      style={{
                        marginTop: 10, padding: '10px 12px', borderRadius: 12, fontSize: 12.5,
                        background: 'rgba(220,38,38,.08)', color: 'var(--peligro)', fontWeight: 600,
                      }}
                    >
                      {t('Esa dirección queda a {km} km de la tienda, fuera de la zona de entrega. Puedes elegir recogerlo en la tienda.', { km: envioCalc.distanciaKm })}
                    </div>
                  )}

                  {entrega === 'delivery' && zona.hayDatos && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      marginTop: 10, padding: '10px 12px', borderRadius: 12,
                      background: 'var(--exito-fondo)', border: '1px solid var(--exito-borde)',
                    }}>
                      <Clock size={15} color="var(--exito-texto)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--exito-texto)' }}>
                          {t('{tiempo} a {lugar}', { tiempo: zona.texto, lugar: direccionElegida?.nombre || t('tu dirección') })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--exito-suave)', marginTop: 1 }}>
                          {zona.respaldo}. {t('No es una promesa: es lo que hemos tardado.')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/*
                    Se elige entre las direcciones que ya guardó, no se escribe
                    de nuevo. Antes era una caja en blanco: el cliente marcaba
                    su casa en el mapa, la guardaba, y al pagar la tecleaba
                    otra vez — con lo cual las coordenadas nunca llegaban al
                    pedido y el repartidor salía con un texto a medias.
                  */}
                  {entrega === 'delivery' && (
                    <div style={{ marginTop: 12 }}>
                      {direcciones.length === 0 && !agregandoDireccion ? (
                        <div style={{
                          padding: '14px', border: '1px dashed var(--linea-fuerte)', borderRadius: 12,
                          background: 'var(--marca-50)', textAlign: 'center',
                        }}>
                          <p style={{ fontSize: 13, color: 'var(--tinta-suave)', margin: '0 0 10px' }}>
                            {t('Todavía no tienes direcciones guardadas.')}
                          </p>
                          {/*
                            UN SOLO CAMINO: el mapa. Ya no se ofrece escribirla
                            a ciegas —eso daba direcciones sin punto, que el
                            repartidor no encuentra— y tampoco hay que irse a
                            otra pantalla. Ver MapaDireccion.jsx.
                          */}
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setAgregandoDireccion(true)}
                              style={{
                                padding: '9px 16px', borderRadius: 999, border: 'none',
                                background: BROWN, color: '#fff', fontSize: 13, fontWeight: 700,
                                fontFamily: 'inherit', cursor: 'pointer',
                              }}
                            >
                              {t('Marcar mi dirección en el mapa')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {direcciones.map((dir, i) => {
                              const elegida = indiceDireccion === i;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setIndiceDireccion(i)}
                                  style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                    padding: '11px 13px', borderRadius: 12, textAlign: 'left',
                                    border: `1px solid ${elegida ? BROWN : 'var(--linea)'}`,
                                    background: elegida ? 'var(--marca-50)' : 'var(--papel)',
                                  }}
                                >
                                  <MapPin size={15} color={elegida ? BROWN : 'var(--tinta-tenue)'} style={{ marginTop: 2, flexShrink: 0 }} />
                                  <span style={{ flex: 1, minWidth: 0 }}>
                                    {dir.nombre && (
                                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--tinta)' }}>
                                        {dir.nombre}
                                      </span>
                                    )}
                                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--tinta-suave)' }}>
                                      {dir.direccion}
                                    </span>
                                    {dir.referencia && (
                                      <span style={{ display: 'block', fontSize: 11, color: 'var(--tinta-tenue)', marginTop: 2 }}>
                                        {dir.referencia}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {agregandoDireccion ? (
                            /*
                              El mapa, aquí mismo. La referencia ("portón verde,
                              frente a la cancha") sigue siendo opcional: es lo
                              que de verdad usa el repartidor, pero nadie se
                              queda sin pedir por no saber describir su cuadra.
                              El PUNTO sí es obligatorio, y ese es el cambio:
                              una dirección sin punto no se puede repartir bien
                              ni cobrar bien. Ver MapaDireccion.jsx.
                            */
                            <div
                              style={{
                                marginTop: 10, padding: 12, borderRadius: 12,
                                border: '1px solid var(--linea-fuerte)', background: 'var(--marca-50)',
                              }}
                            >
                              <MapaDireccion
                                onGuardar={guardarNuevaDireccion}
                                onCancelar={() => setAgregandoDireccion(false)}
                                guardando={guardandoDireccion}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAgregandoDireccion(true)}
                              style={{
                                marginTop: 8, background: 'none', border: 'none', padding: 0,
                                color: 'var(--marca-texto)', fontSize: 12, fontWeight: 700,
                                fontFamily: 'inherit', cursor: 'pointer',
                              }}
                            >
                              + {t('Agregar otra dirección')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Con qué paga ── */}
                <div style={{ padding: '18px 20px', borderTop: '1px solid var(--linea)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <CheckoutIconBox><CreditCard size={18} color={BROWN} /></CheckoutIconBox>
                    <CheckoutSectionTitle>{t('¿Con qué paga?')}</CheckoutSectionTitle>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <OpcionBtn type="button" $activa={metodoPago === 'efectivo'} onClick={() => setMetodoPago('efectivo')}>
                      <Wallet size={16} strokeWidth={2} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{t('Efectivo')}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          {entrega === 'delivery' ? t('Al recibirlo') : t('En el local')}
                        </div>
                      </div>
                    </OpcionBtn>

                    <OpcionBtn type="button" $activa={metodoPago === 'tarjeta'} onClick={() => setMetodoPago('tarjeta')}>
                      <CreditCard size={16} strokeWidth={2} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{t('Tarjeta')}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          {entrega === 'delivery' ? t('Al recibirlo') : t('En el local')}
                        </div>
                      </div>
                    </OpcionBtn>

                    {/* Saldo: se deshabilita si no alcanza, con el motivo a la vista */}
                    <OpcionBtn
                      type="button"
                      $activa={metodoPago === 'saldo'}
                      disabled={saldo < totalAPagar}
                      title={saldo < totalAPagar ? t('Tu saldo no alcanza para este pedido') : t('Pagar con tu saldo')}
                      onClick={() => setMetodoPago('saldo')}
                    >
                      <Gift size={16} strokeWidth={2} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{t('Mi saldo')}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          ${saldo.toFixed(2)} {saldo < totalAPagar ? t('· no alcanza') : t('disponible')}
                        </div>
                      </div>
                    </OpcionBtn>
                  </div>

                  {metodoPago === 'saldo' && (
                    <p style={{ fontSize: 12, color: 'var(--marca-texto)', margin: '10px 0 0', fontWeight: 500 }}>
                      {t('Te quedarán {monto} después de este pedido.', { monto: `$${(saldo - totalAPagar).toFixed(2)}` })}
                    </p>
                  )}

                  {/*
                    Los puntos no son un método aparte sino un descuento: se
                    restan del total y el resto se paga con lo de arriba. Se
                    muestra acá porque es donde el cliente decide cómo pagar.
                  */}
                  {puedeCanjear && (
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
                        padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                        border: `1.5px solid ${usarPuntos ? BROWN : 'var(--linea)'}`,
                        background: usarPuntos ? BROWN_LIGHT : 'var(--papel)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={usarPuntos}
                        onChange={(e) => setUsarPuntos(e.target.checked)}
                        style={{ accentColor: BROWN, width: 16, height: 16 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: usarPuntos ? BROWN : 'var(--tinta-suave)' }}>
                          {t('Usar mis {n} puntos', { n: puntosDisponibles })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--tinta-tenue)' }}>
                          {usarPuntos
                            ? t('Descuenta {monto} de este pedido', { monto: `$${descuento.toFixed(2)}` })
                            : t('Equivalen a {monto} en esta compra', { monto: `$${(Math.min(puntosDisponibles, maxPuntosUtiles) / (redeemRate || 100)).toFixed(2)}` })}
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Canjear una tarjeta sin salir del checkout */}
                  <form onSubmit={onCanjearEnCheckout} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <input
                      value={codigoTarjeta}
                      // Los guiones se ponen solos (ver utils/tarjetaRegalo.js).
                      onChange={(e) => setCodigoTarjeta(formatoCodigoTarjeta(e.target.value))}
                      maxLength={LARGO_CODIGO_TARJETA}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={t('¿Tienes una tarjeta de regalo? 635-XXXX-XXXX')}
                      aria-label={t('Código de tarjeta de regalo')}
                      style={{
                        flex: 1, padding: '11px 14px', fontSize: 13, fontFamily: 'inherit',
                        border: '1px solid var(--linea)', borderRadius: 12, outline: 'none',
                        letterSpacing: '0.05em',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={canjeando || !codigoTarjeta.trim()}
                      className="press"
                      style={{
                        padding: '0 18px', borderRadius: 12, border: `1.5px solid ${BROWN}`,
                        background: 'var(--papel)', color: 'var(--marca-texto)', fontSize: 13, fontWeight: 600,
                        fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
                        opacity: canjeando || !codigoTarjeta.trim() ? 0.5 : 1,
                      }}
                    >
                      {canjeando ? t('Canjeando…') : t('Canjear')}
                    </button>
                  </form>
                </div>

                {/* Order thumbnails */}
                <div style={{ borderTop: '1px solid var(--linea)' }}>
                  <div style={{ padding: '14px 24px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <CheckoutSectionTitle>{t('Orden')} ⓘ</CheckoutSectionTitle>
                    <ChevronRight size={16} color="var(--tinta-tenue)" />
                  </div>
                  <OrderThumbsRow>
                    {items.slice(0, 6).map(item => (
                      <OrderThumb key={item.id}>
                        {item.imagen && !imgErrors[item.id]
                          ? <img src={foto(item.imagen, ANCHO.miniatura)} alt="" onError={() => setImgErrors(p => ({ ...p, [item.id]: true }))} />
                          : <Package size={24} strokeWidth={1.4} />
                        }
                      </OrderThumb>
                    ))}
                    {items.length > 6 && <MoreBadge>+{items.length - 6}</MoreBadge>}
                  </OrderThumbsRow>
                </div>
              </CheckoutCard>
            </CheckoutLeft>

            {/* Right summary */}
            <SummaryCard>
              <SummaryCardTitle>{t('Resumen de orden')}</SummaryCardTitle>
              <SummaryCardRow>
                <span>{t('Costo de envío')}</span>
                {/* Quien recoge no paga envío: se dice así y no con un "$0.00". */}
                <span>{entrega === 'delivery' ? `${ENVIO.toFixed(2)}` : t('Recoges en tienda')}</span>
              </SummaryCardRow>
              {/* La tarifa de servicio solo se muestra si la tienda la cobra. */}
              {SERVICIO > 0 && (
                <SummaryCardRow><span>{t('Tarifa de servicio')}</span><span>${SERVICIO.toFixed(2)}</span></SummaryCardRow>
              )}
              <SummaryCardRow><span>{t('Total de artículos')}</span><span>${subtotal.toFixed(2)}</span></SummaryCardRow>
              <Divider />
              <TotalBig>
                <span>Total</span>
                <span>${totalFinal.toFixed(2)}</span>
              </TotalBig>

              {/* ── Usar puntos de fidelidad ── */}
              {puntosDisponibles > 0 && (
                <div style={{ padding: '12px 0', borderTop: '1px solid var(--linea)', marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: puedeCanjear ? 'pointer' : 'not-allowed', opacity: puedeCanjear ? 1 : 0.6 }}>
                    <input
                      type="checkbox"
                      checked={usarPuntos}
                      disabled={!puedeCanjear}
                      onChange={(e) => setUsarPuntos(e.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--tinta)', lineHeight: 1.4 }}>
                      <strong>{t('Usar mis puntos')}</strong><br />
                      <span style={{ color: 'var(--tinta-suave)' }}>
                        {t('Tienes {n} puntos', { n: puntosDisponibles })}
                        {puedeCanjear
                          ? ` = $${(puntosDisponibles / (redeemRate || 100)).toFixed(2)}`
                          : ` ${t('(necesitas {n} para canjear)', { n: minRedeem })}`}
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {descuento > 0 && (
                <SummaryCardRow style={{ color: 'var(--exito-vivo)', fontWeight: 600 }}>
                  <span>{t('Descuento por puntos')}</span>
                  <span>−${descuento.toFixed(2)}</span>
                </SummaryCardRow>
              )}

              <Divider />
              <TotalBig>
                <span>Total</span>
                <span style={{ fontSize: 22 }}>${totalAPagar.toFixed(2)}</span>
              </TotalBig>

              {/*
                Qué se acepta al pagar, con los dos documentos a un toque. Se
                abren en otra pestaña para no perder lo elegido en el pago. A
                12,5 px y en el gris de texto: a 11 px y en el gris más tenue
                casi no se leía, y es justo lo que alguien debería poder leer.
              */}
              <p style={{ fontSize: 12.5, color: 'var(--tinta-suave)', marginTop: 12, lineHeight: 1.55 }}>
                {t('Al hacer este pedido, aceptas los')}{' '}
                <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--marca-texto-fuerte)', fontWeight: 600, textDecoration: 'underline' }}>
                  {t('términos y condiciones')}
                </a>{' '}{t('y la')}{' '}
                <a href="/devoluciones" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--marca-texto-fuerte)', fontWeight: 600, textDecoration: 'underline' }}>
                  {t('política de cambios y devoluciones')}
                </a>.
              </p>

              <PlaceOrderBtn onClick={handlePlaceOrder} disabled={procesando}>
                {procesando ? <><EsperaMascota sobre="color" /> {t('Procesando…')}</> : t('Realizar pedido')}
              </PlaceOrderBtn>
            </SummaryCard>
          </CheckoutLayout>
        </FullPanel>
      </Overlay>
    );
  }

  // ── CONFIRMATION VIEW ──
  if (view === 'confirmation') {
    // Todo sale del pedido que devolvió el backend; si por algo no llegó, se cae
    // a lo que se eligió en pantalla. Nada de esto es inventado.
    const fechaPedido = ordenCreada?.createdAt ? new Date(ordenCreada.createdAt) : new Date();
    const orderDate = fechaPedido.toLocaleString(locale, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const numeroPedido = ordenCreada?._id ? String(ordenCreada._id).slice(-6).toUpperCase() : '——————';
    const envioReal = Number(ordenCreada?.shippingCost ?? ENVIO);
    const subtotalReal = Number(ordenCreada?.subtotal ?? subtotal);
    const totalReal = Number(ordenCreada?.total ?? totalAPagar);
    const metodoReal = ordenCreada?.paymentMethod || metodoPago;
    const esDomicilioReal = (ordenCreada?.deliveryType || entrega) === 'delivery';
    const direccionReal = ordenCreada?.deliveryAddress
      || (entrega === 'delivery' ? direccionElegida?.direccion : null);
    // Nombre de la forma de pago tal como se muestra al cliente.
    const nombrePago = t({ efectivo: 'Efectivo', tarjeta: 'Tarjeta', saldo: 'Saldo / Gift card' }[metodoReal] || 'Efectivo');

    return (
      <Overlay $montado={montado} onClick={() => {}}>
        <FullPanel $montado={montado} role="dialog" aria-modal="true" aria-label={t('Pedido confirmado')}>
          <PageTopBar>
            <BackBtn type="button" onClick={handleConfirmClose} aria-label={t('Cerrar y volver a la tienda')} autoFocus><ChevronLeft size={20} aria-hidden="true" /></BackBtn>
            <BrandTitle>
              {/* Igual que el checkout y que el menú. Ver MarcaTienda. */}
              <MarcaTienda tamano={19} alto={38} />
            </BrandTitle>
            {botonAyuda}
          </PageTopBar>

          <ConfirmLayout>
            <div>
              <ConfirmCard>
                <StatusBadge><span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} /> {t('En proceso')}</StatusBadge>
                <ConfirmTitle>{t('Orden en curso')}</ConfirmTitle>
                <ConfirmDate>{t('Pedido recibido el {fecha}', { fecha: orderDate })}</ConfirmDate>

                {/* La mascota festejando en lugar del círculo verde con el ✓. */}
                <Festejo><Mascota pose="fiesta" alto={130} /></Festejo>
                <AcceptedMsg>{t('Tu orden ha sido aceptada')}</AcceptedMsg>

                {/* Seguimiento en vivo: el avance del pedido y, a domicilio, el
                    mapa del repartidor — aquí mismo y actualizándose solo, sin
                    tener que ir a otra pantalla. */}
                <SeguimientoConfirmacion orderId={ordenCreada?._id} esDomicilio={esDomicilioReal} />

                {/*
                  El código de entrega, aquí mismo y no solo en "Mis pedidos".
                  Esta es la pantalla que la gente deja abierta —o de la que
                  hace captura— justo después de pagar, así que es donde el
                  código tiene que aparecer sin que haya que ir a buscarlo.

                  Sale del pedido que acaba de devolver el servidor: el código
                  lo emite él, nunca el navegador. Ver utils/codigoEntrega.js.
                */}
                <CodigoEntrega
                  codigo={ordenCreada?.deliveryCode}
                  deliveryType={ordenCreada?.deliveryType}
                  estado={ordenCreada?.status}
                />
              </ConfirmCard>

              {/* Products card */}
              <ConfirmCard>
                <PTableHeader>
                  <span>{t('Productos')}</span>
                  <span>{t('N.º Items')}</span>
                </PTableHeader>
                <ProductsTable>
                  {itemsAMostrar.slice((orderPage - 1) * POR_PAGINA, orderPage * POR_PAGINA).map(item => (
                    <PTableRow key={item.id}>
                      <PImgBox>
                        {item.imagen && !imgErrors[item.id]
                          ? <img src={foto(item.imagen, ANCHO.miniatura)} alt="" onError={() => setImgErrors(p => ({ ...p, [item.id]: true }))} />
                          : <Package size={24} strokeWidth={1.4} />
                        }
                      </PImgBox>
                      <PName>
                        {item.nombre}
                        <div style={{ display: 'flex', gap: 6 }}>
                          {item.precioAnterior && (
                            <POldPrice>${Number(item.precioAnterior).toFixed(2)}</POldPrice>
                          )}
                          <PPrice>${Number(item.precio).toFixed(2)}</PPrice>
                        </div>
                      </PName>
                      <PQty>{cantidadConUnidad(item, item.cantidad)}</PQty>
                    </PTableRow>
                  ))}
                </ProductsTable>

                {/*
                  Los números salen de cuántos productos hay, no de un "1, 2"
                  escrito a mano: antes con 3 productos la página 2 salía vacía
                  y con 12 no se podía llegar a la 3. Con una sola página no se
                  muestra nada, que es lo normal en la mayoría de compras.
                */}
                {totalPaginas > 1 && (
                  <Pagination>
                    <PageBtn
                      onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                      disabled={orderPage === 1}
                      aria-label={t('Página anterior')}
                    >
                      <ChevronLeft size={14} />
                    </PageBtn>
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                      <PageBtn key={p} $active={orderPage === p} onClick={() => setOrderPage(p)}>{p}</PageBtn>
                    ))}
                    <PageBtn
                      onClick={() => setOrderPage(p => Math.min(totalPaginas, p + 1))}
                      disabled={orderPage === totalPaginas}
                      aria-label={t('Página siguiente')}
                    >
                      <ChevronRight size={14} />
                    </PageBtn>
                  </Pagination>
                )}
              </ConfirmCard>
            </div>

            {/* Right: summary — todo con datos reales del pedido creado */}
            <ConfirmSummaryCard>
              <ConfirmSummaryTitle>{t('Resumen del pedido')}</ConfirmSummaryTitle>
              <OrderNumber><Hash size={14} strokeWidth={2.2} /> {numeroPedido}</OrderNumber>

              <SummaryCardRow><span>{t('Total de artículos')}</span><span>${subtotalReal.toFixed(2)}</span></SummaryCardRow>
              <SummaryCardRow>
                <span>{t('Gastos de envío')}</span>
                <span>{envioReal > 0 ? `$${envioReal.toFixed(2)}` : t('Gratis')}</span>
              </SummaryCardRow>
              {Number(ordenCreada?.discount || descuento) > 0 && (
                <SummaryCardRow style={{ color: 'var(--exito-vivo)', fontWeight: 600 }}>
                  <span>{t('Descuento por puntos')}</span>
                  <span>−${Number(ordenCreada?.discount || descuento).toFixed(2)}</span>
                </SummaryCardRow>
              )}
              <Divider />
              <TotalBig>
                <span>Total</span>
                <span>${totalReal.toFixed(2)}</span>
              </TotalBig>

              {/* La forma de pago que de verdad se eligió, no una tarjeta fija */}
              <PayMethod>
                {metodoReal === 'tarjeta'
                  ? <CreditCard size={18} color={BROWN} />
                  : metodoReal === 'saldo'
                    ? <Wallet size={18} color={BROWN} />
                    : <Wallet size={18} color={BROWN} />}
                <span>{nombrePago}</span>
              </PayMethod>

              {/* Entrega real: la dirección elegida, o el retiro en el local */}
              <DeliveryAddress>
                {esDomicilioReal
                  ? <MapPin size={16} color={BROWN} style={{ marginTop: 2, flexShrink: 0 }} />
                  : <StoreFront size={16} color={BROWN} style={{ marginTop: 2, flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                    {esDomicilioReal ? t('Dirección de entrega') : t('Retiro en el local')}
                  </div>
                  {esDomicilioReal && (
                    <div style={{ color: 'var(--marca-texto)', fontSize: 13 }}>{direccionReal || t('Sin dirección')}</div>
                  )}
                </div>
              </DeliveryAddress>

              {/* Se quitó "Ver el estado del pedido": el avance y el mapa ya se ven
                  arriba, en la misma confirmación, y se actualizan solos. */}
              <PlaceOrderBtn style={{ marginTop: 18 }} onClick={handleConfirmClose}>
                {t('Volver a la tienda')}
              </PlaceOrderBtn>
            </ConfirmSummaryCard>
          </ConfirmLayout>
        </FullPanel>
      </Overlay>
    );
  }

  return null;
};

export default ShoppingCart;