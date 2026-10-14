import { useCallback, useState } from 'react';
import { useAjustesCtx } from '../context/AjustesContext';
import { datosDeLaTienda } from '../utils/reportesPdf';
import { construirComprobante, nombreDelComprobante } from '../utils/comprobantePedido';
import { descargarArchivo } from '../utils/descargar';

/*
 * ============================================================
 * BAJAR EL COMPROBANTE DE UN PEDIDO — useComprobante.js
 * ============================================================
 * Solo en el panel (Pedidos). El PDF se arma aquí, con el pedido que ya está
 * en pantalla y los datos de la tienda de Personalización (ver
 * utils/comprobantePedido.js). descargarArchivo se encarga de que también
 * funcione con el panel abierto dentro de la app del teléfono.
 *
 * `descargando` es el id del pedido que se está bajando, para apagar solo su
 * botón. `descargar` devuelve true o false; el aviso lo da la pantalla.
 * ============================================================
 */

export const useComprobante = () => {
  const { ajustes } = useAjustesCtx();
  const [descargando, setDescargando] = useState(null);

  const descargar = useCallback(async (pedido) => {
    setDescargando(pedido._id);
    try {
      const doc = construirComprobante(pedido, await datosDeLaTienda(ajustes));
      // No doc.save(): dentro de la app del teléfono no descargaría nada (ver utils/descargar.js).
      await descargarArchivo(doc.output('blob'), nombreDelComprobante(pedido._id));
      return true;
    } catch (e) {
      console.error('Error armando el comprobante:', e);
      return false;
    } finally {
      setDescargando(null);
    }
  }, [ajustes]);

  return { descargar, descargando };
};
