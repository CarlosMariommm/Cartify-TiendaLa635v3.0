import { usePedidoActivoCtx } from '../../context/PedidoActivoContext';
import ModalPedido from './ModalPedido';

// PEDIDO DETALLE FLOTANTE — un solo lugar para el modal de detalle
// Va en App.js junto a la burbuja y solo pinta el detalle del pedido que indique
// PedidoActivoContext; no decide cuándo abrirlo.
const PedidoDetalleFlotante = () => {
  const { pedidoAbierto, cerrarPedidoAbierto } = usePedidoActivoCtx();

  if (!pedidoAbierto) return null;

  return <ModalPedido pedido={pedidoAbierto} alCerrar={cerrarPedidoAbierto} />;
};

export default PedidoDetalleFlotante;
