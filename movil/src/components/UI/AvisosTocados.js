// AL TOCAR UN AVISO — a dónde lleva cada uno
// Cada notificación lleva justo a lo que avisaba: "va en camino" abre la burbuja con el mapa, los
// demás estados abren el detalle de ese pedido, y una oferta abre su promoción.

import { useEffect, useRef, useState } from 'react';
import { escucharToques } from '../../utils/notificaciones';
import { irATabs, navegarA, useArranqueResuelto } from '../../navigation/navigationRef';
import { usePedidoActivoCtx } from '../../context/PedidoActivoContext';
import { useTienda } from '../../context/TiendaContext';

const AvisosTocados = () => {
  const arranque = useArranqueResuelto();
  const { orders, refrescar, abrirPedido, seguirPedido } = usePedidoActivoCtx();
  const { secciones, promociones, refrescarCatalogo, abrirPromo, cargando } = useTienda();
  const [pendiente, setPendiente] = useState(null);
  // Si ya se volvió a pedir la lista una vez, no se insiste: se va a la pestaña.
  const refrescado = useRef(false);

  useEffect(() => escucharToques((datos) => {
    refrescado.current = false;
    setPendiente({ ...datos });
  }), []);

  useEffect(() => {
    if (!pendiente || !arranque) return;
    const { tipo, pedidoId, promoId, estado } = pendiente;
    const listo = () => setPendiente(null);

    // ── Un pedido ──
    if (tipo === 'pedido' || tipo === 'pedidoEnCamino') {
      const pedido = (orders || []).find((o) => String(o._id) === String(pedidoId));
      if (!pedido) {
        if (!refrescado.current) {
          refrescado.current = true;
          refrescar();
          return;
        }
        irATabs('pedidos');
        listo();
        return;
      }
      const vaEnCamino = (tipo === 'pedidoEnCamino' || estado === 'en_camino') && pedido.status === 'en_camino';
      if (vaEnCamino) {
        irATabs('inicio');
        seguirPedido(pedido._id);
      } else {
        irATabs('pedidos');
        abrirPedido(pedido);
      }
      listo();
      return;
    }

    // ── Una promoción ──
    if (tipo === 'promo') {
      if (cargando) return;
      const promo = (promociones || []).find((p) => String(p._id) === String(promoId));
      if (!promo && !refrescado.current) {
        refrescado.current = true;
        refrescarCatalogo();
        return;
      }
      irATabs('inicio');
      // Después de armar las pestañas, encima la página de la promo.
      if (promo) setTimeout(() => abrirPromo(promo), 0);
      listo();
      return;
    }

    // ── Productos nuevos ──
    if (tipo === 'productosNuevos') {
      if (cargando) return;
      const nuevos = (secciones || []).find((s) => s.clave === 'nuevos');
      irATabs('inicio');
      // Después de armar las pestañas, encima la sección.
      if (nuevos) setTimeout(() => navegarA('Seccion', { seccion: nuevos }), 0);
      listo();
      return;
    }

    // Un aviso que esta versión no conoce: a la tienda.
    irATabs('inicio');
    listo();
  }, [pendiente, arranque, orders, promociones, secciones, cargando, refrescar, refrescarCatalogo, abrirPedido, abrirPromo, seguirPedido]);

  return null;
};

export default AvisosTocados;
