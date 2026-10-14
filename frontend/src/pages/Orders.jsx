import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Package, CheckCircle2, ChefHat, Printer, Eye, Download,
  MapPin, Store as StoreIcon, Bike, Banknote, CreditCard, Wallet, Clock, X, CircleX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE_OUT, DUR, stagger } from '../utils/motion';
import { useOrders } from '../hooks/useOrders';
import ModalCodigoEntrega from '../components/Admin/ModalCodigoEntrega';
import ModalCancelarPedido from '../components/Admin/ModalCancelarPedido';
import toast from 'react-hot-toast';
import { useComprobante } from '../hooks/useComprobante';

// Los que todavía se pueden cancelar: los entregados ya no, y los cancelados ya lo están.
const SE_PUEDE_CANCELAR = ['pagado', 'preparando', 'en_camino', 'listo'];

/*
 * Orders (Admin/Empleado) — pantalla de PREPARACIÓN de pedidos.
 * El empleado ve los pedidos pagados, la lista de productos a juntar, y avanza
 * el estado: pagado → preparando → entregado. Datos reales (modelo Order).
 * La lógica vive en useOrders; aquí solo pintamos.
 */

/*
 * Cada estado con su color, icono y etiqueta. El color se usa en el chip y en
 * el filo izquierdo de la tarjeta, para que el empleado ubique de un vistazo qué
 * hay que hacer con cada pedido. Son los colores de estado protegidos en
 * index.css (no los repinta ninguna paleta).
 */
const estadoInfo = {
  pagado:     { label: 'Por preparar',   corto: 'Por preparar',   Icono: Package,      color: '#3b82f6' },
  preparando: { label: 'En preparación', corto: 'Preparando',     Icono: ChefHat,      color: '#f97316' },
  en_camino:  { label: 'En camino',      corto: 'En camino',      Icono: Bike,         color: '#1D4ED8' },
  // Solo retiro en la tienda: ya está armado y el cliente puede pasar.
  listo:      { label: 'Listo para recoger', corto: 'Listo',       Icono: StoreIcon,    color: '#7c3aed' },
  entregado:  { label: 'Entregado',      corto: 'Entregado',      Icono: CheckCircle2, color: '#22c55e' },
  cancelado:  { label: 'Cancelado',      corto: 'Cancelado',      Icono: X,            color: '#ef4444' },
};

const filtros = [
  { id: 'pagado',     label: 'Por preparar' },
  { id: 'preparando', label: 'En preparación' },
  { id: 'en_camino',  label: 'En camino' },
  { id: 'listo',      label: 'Listos para recoger' },
  { id: 'entregado',  label: 'Entregados' },
  { id: 'cancelado',  label: 'Cancelados' },
  { id: 'todos',      label: 'Todos' },
];

// Cómo se paga, para que el repartidor sepa si cobra.
const pagoInfo = {
  efectivo: { Icono: Banknote,   label: 'Efectivo' },
  tarjeta:  { Icono: CreditCard, label: 'Tarjeta' },
  saldo:    { Icono: Wallet,     label: 'Saldo / gift card' },
};

const formatFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-SV', { day: '2-digit', month: 'short' }) : '';

// "hace 10 min", "hace 2 h", "hace 3 d" — para priorizar lo más viejo.
const haceCuanto = (iso) => {
  if (!iso) return '';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
};

// "Lo canceló Ana · hace 5 min · se devolvieron $4.50 al saldo y 200 puntos"
const detalleCancelacion = (order) => {
  const saldo = Number(order.reembolso?.saldo) || 0;
  const puntos = Number(order.reembolso?.puntos) || 0;
  const devuelto = [saldo > 0 ? `$${saldo.toFixed(2)} al saldo` : '', puntos > 0 ? `${puntos} puntos` : '']
    .filter(Boolean).join(' y ');
  return [
    order.cancelledBy ? `Lo canceló ${order.cancelledBy}` : '',
    order.cancelledAt ? haceCuanto(order.cancelledAt) : '',
    devuelto ? `se devolvieron ${devuelto}` : '',
  ].filter(Boolean).join(' · ');
};

// Abre el archivo listo para imprimir. Si es imagen, abre una ventana con la
// imagen y lanza el diálogo de impresión; si es PDF, el visor del navegador
// ya trae su propio botón de imprimir.
const imprimirArchivo = (url) => {
  const esPdf = /\.pdf(\?|$)/i.test(url);
  if (esPdf) { window.open(url, '_blank', 'noopener'); return; }
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(
    `<html><head><title>Imprimir</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center">` +
    `<img src="${url}" style="max-width:100%" onload="window.focus();window.print();" /></body></html>`
  );
  win.document.close();
};

/*
 * La descarga de un trabajo de impresión SIEMPRE sale en PDF, con un nombre
 * que dice de qué pedido es.
 *
 * Antes se bajaba tal cual se guardó: las hojas armadas en el editor viejo y
 * las fotos que suben los clientes llegaban como PNG o JPG sueltos, con el
 * nombre al azar de Cloudinary ("f1xpr6sgbcnk2ri0xsvb.png"). Un documento que
 * se va a imprimir tiene que llegar como documento.
 *
 * No hace falta convertir nada aquí: Cloudinary entrega una imagen como PDF
 * con solo pedirle la extensión .pdf, y fl_attachment:<nombre> hace que el
 * navegador lo descargue con ese nombre en vez de abrirlo. Los que ya eran
 * PDF quedan igual, solo con el nombre nuevo.
 */
const urlDescarga = (order) => {
  const url = order.printJob.fileUrl;
  if (!url.includes('/image/upload/')) {
    return url.includes('/upload/') ? url.replace('/upload/', '/upload/fl_attachment/') : url;
  }
  const nombre = `impresion-pedido-${String(order._id).slice(-6)}`;
  return url
    .replace('/image/upload/', `/image/upload/fl_attachment:${nombre}/`)
    .replace(/\.(png|jpe?g|webp|gif)(\?.*)?$/i, '.pdf$2');
};

const Orders = () => {
  const { orders, loading, cambiarEstado } = useOrders();
  const { descargar, descargando: descargandoComprobante } = useComprobante();
  const bajarComprobante = async (pedido) => {
    if (!(await descargar(pedido))) toast.error('No se pudo descargar el comprobante. Intente de nuevo.');
  };
  const [filtro, setFiltro] = useState('pagado');
  const [busqueda, setBusqueda] = useState('');

  /*
   * ?estado=… y ?buscar=… en la dirección: así llega Tiqui del panel cuando le
   * piden "muéstrame los pedidos por preparar" o "el pedido de María". Se lee
   * también si ya se estaba en Pedidos: la dirección cambia sin recargar, y
   * al cambiar se ajusta el filtro en el mismo render (sin un efecto de más).
   */
  const [params] = useSearchParams();
  const [dirLeida, setDirLeida] = useState(null);
  if (params.toString() !== dirLeida) {
    setDirLeida(params.toString());
    const estado = params.get('estado');
    if (estado && filtros.some((f) => f.id === estado)) setFiltro(estado);
    if (params.has('buscar')) setBusqueda(params.get('buscar') || '');
  }
  /*
   * El pedido que se está por entregar, esperando que el cliente dicte su
   * código. `null` = el modal está cerrado. Ver ModalCodigoEntrega.
   */
  const [pedidoAEntregar, setPedidoAEntregar] = useState(null);

  /*
   * Confirmar la entrega. Si el código no coincide, el backend responde 400,
   * el hook relanza el error y el modal se queda ABIERTO para volver a
   * intentar — cerrarlo obligaría a buscar el pedido otra vez en la lista con
   * el cliente esperando en la puerta.
   */
  const confirmarEntrega = async (extras) => {
    try {
      await cambiarEstado(pedidoAEntregar._id, 'entregado', extras);
      setPedidoAEntregar(null);
    } catch {
      // El aviso ya lo pintó el interceptor de api.js. Aquí solo se decide
      // no cerrar.
    }
  };

  /*
   * El pedido que se está por cancelar, esperando el motivo. Como en la
   * entrega, si el servidor dice que no, el modal se queda abierto.
   */
  const [pedidoACancelar, setPedidoACancelar] = useState(null);
  const confirmarCancelacion = async (motivo) => {
    try {
      await cambiarEstado(pedidoACancelar._id, 'cancelado', { motivoCancelacion: motivo });
      setPedidoACancelar(null);
    } catch {
      // El aviso ya lo pintó el interceptor de api.js.
    }
  };

  // Conteos reales para las tarjetas de resumen (ahora clicables para filtrar).
  const counts = {
    total: orders.length,
    pagado: orders.filter((o) => o.status === 'pagado').length,
    preparando: orders.filter((o) => o.status === 'preparando').length,
    en_camino: orders.filter((o) => o.status === 'en_camino').length,
    listo: orders.filter((o) => o.status === 'listo').length,
    entregado: orders.filter((o) => o.status === 'entregado').length,
  };

  const resumen = [
    { id: 'pagado',     label: 'Por preparar',   valor: counts.pagado,     color: '#3b82f6' },
    { id: 'preparando', label: 'En preparación', valor: counts.preparando, color: '#f97316' },
    { id: 'en_camino',  label: 'En camino',      valor: counts.en_camino,  color: '#1D4ED8' },
    { id: 'listo',      label: 'Listos',         valor: counts.listo,      color: '#7c3aed' },
    { id: 'entregado',  label: 'Entregados',     valor: counts.entregado,  color: '#22c55e' },
    { id: 'todos',      label: 'Total',          valor: counts.total,      color: '#6b7280' },
  ];

  const visibles = orders.filter((o) => {
    const nombre = (o.clientId?.fullName || '').toLowerCase();
    // Por cliente o por número de pedido (el #A1B2C3 de la tarjeta).
    const buscado = busqueda.toLowerCase().replace(/^#/, '').trim();
    const coincide = nombre.includes(buscado) || String(o._id).slice(-6).toLowerCase().includes(buscado);
    if (filtro === 'todos') return coincide;
    return coincide && o.status === filtro;
  });

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#066494]">Pedidos</h1>

      {/* Resumen: cada número es un botón que filtra la lista. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
        {resumen.map((r) => {
          const activo = filtro === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setFiltro(r.id)}
              className="text-left p-4 rounded-2xl border shadow-sm transition-colors"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: activo ? r.color : 'var(--theme-card-border)',
                boxShadow: activo ? `inset 0 0 0 1px ${r.color}` : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: r.color }} />
                <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>{r.label}</span>
              </div>
              <p className="text-3xl font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>{r.valor}</p>
            </button>
          );
        })}
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filtros.map((f) => {
            const activo = filtro === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${activo ? 'bg-[#003049] text-white border-[#003049]' : 'bg-white text-gray-600 border-gray-300'}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 min-w-[12rem] sm:flex-none">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o número..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-full text-sm outline-none focus:border-[#003049] w-full sm:w-56 shadow-sm"
          />
        </div>
      </div>

      {/* Lista de pedidos */}
      {loading ? (
        <p className="text-sm text-gray-500">Cargando pedidos…</p>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-10 h-10 mb-3 text-gray-400" />
          <p className="text-sm font-semibold text-gray-800 mb-1">No hay pedidos en esta vista</p>
          <p className="text-sm text-gray-500">Cuando entren pedidos pagados, aparecerán aquí para prepararlos.</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
          {visibles.map((order, i) => {
            const estado = estadoInfo[order.status] || estadoInfo.pagado;
            const EstadoIcono = estado.Icono;
            const esDomicilio = order.deliveryType === 'delivery';
            const pago = pagoInfo[order.paymentMethod] || pagoInfo.efectivo;
            const PagoIcono = pago.Icono;
            return (
              <motion.div
                key={order._id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: DUR.modal, ease: EASE_OUT, delay: stagger(i) }}
                className="rounded-2xl shadow-sm border overflow-hidden"
                style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}
              >
                <div className="p-5">
                  {/* Encabezado: cliente + chip de estado */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold break-words" style={{ color: 'var(--theme-text-primary)' }}>
                        {order.clientId?.fullName || (order.clienteEliminado ? 'Cliente eliminado' : 'Cliente')}
                      </div>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {haceCuanto(order.createdAt)}</span>
                        <span>·</span>
                        <span>#{String(order._id).slice(-6).toUpperCase()}</span>
                        <span>·</span>
                        <span>{order.clientId?.phoneNumber || 's/tel'}</span>
                        <span>·</span>
                        <span>{formatFecha(order.createdAt)}</span>
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-none"
                      style={{ color: estado.color, backgroundColor: `${estado.color}1a` }}
                    >
                      <EstadoIcono className="w-3.5 h-3.5" /> {estado.corto}
                    </span>
                  </div>

                  {/* Info operativa: entrega + pago (lo que el empleado necesita saber ya) */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: esDomicilio ? 'var(--theme-primary)' : 'var(--theme-text-secondary)', backgroundColor: 'var(--theme-primary-light)' }}
                    >
                      {esDomicilio ? <Bike className="w-3.5 h-3.5" /> : <StoreIcon className="w-3.5 h-3.5" />}
                      {esDomicilio ? 'Domicilio' : 'Retiro en local'}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: 'var(--theme-text-secondary)', backgroundColor: 'var(--theme-primary-light)' }}
                    >
                      <PagoIcono className="w-3.5 h-3.5" /> {pago.label}
                    </span>
                  </div>

                  {/* Dirección, solo cuando va a domicilio */}
                  {esDomicilio && order.deliveryAddress && (
                    <div className="flex items-start gap-1.5 text-xs mb-3" style={{ color: 'var(--theme-text-secondary)' }}>
                      <MapPin className="w-3.5 h-3.5 flex-none mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                      <span className="break-words">{order.deliveryAddress}</span>
                    </div>
                  )}

                  {/* Impresión (con archivo) o productos a preparar */}
                  {order.channel === 'impresion' && order.printJob ? (
                    <div className="rounded-xl p-3 mb-3 text-sm" style={{ backgroundColor: 'var(--theme-primary-light)' }}>
                      <div className="flex items-center gap-2 mb-1 font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                        <Printer className="w-4 h-4 text-[#003049]" /> Impresión — {order.printJob.serviceName}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                        {order.printJob.copies} copia(s) · {order.printJob.pages > 1 ? `${order.printJob.pages} págs · ` : ''}
                        {order.printJob.color ? 'Color' : 'B/N'} · {order.printJob.doubleSided ? 'Doble cara' : 'Una cara'} · {order.printJob.paper || 'Normal'}
                      </div>

                      {order.printJob.fileUrl && (
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <button
                            onClick={() => imprimirArchivo(order.printJob.fileUrl)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#003049] text-white transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" /> Imprimir
                          </button>
                          <a
                            href={order.printJob.fileUrl} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver archivo
                          </a>
                          <a
                            href={urlDescarga(order)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Descargar PDF
                          </a>
                          <span className="text-xs ml-1" style={{ color: order.printJob.emailedToPrinter ? '#16a34a' : '#d97706' }}>
                            {order.printJob.emailedToPrinter ? '✓ Ya enviado a impresora' : 'Pendiente de imprimir'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: 'var(--theme-primary-light)' }}>
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 text-sm py-0.5">
                          <span className="font-medium min-w-0 truncate" style={{ color: 'var(--theme-text-primary)' }}>
                            <span className="font-bold" style={{ color: 'var(--theme-primary)' }}>{item.amount}×</span> {item.name || item.productId?.name || 'Producto'}
                            {/*
                              La marca: sin ella "Oreja" o "Semita" no dicen de
                              cuál producto se trata cuando hay más de uno con
                              el mismo nombre. Solo sale si el producto sigue
                              en el catálogo — uno eliminado no tiene de dónde
                              sacarla.
                            */}
                            {item.productId?.brandId?.name && (
                              // text-muted se perdía sobre el fondo rosado de la fila; secondary tiene más contraste.
                              <span className="font-normal" style={{ color: 'var(--theme-text-secondary)' }}> · {item.productId.brandId.name}</span>
                            )}
                          </span>
                          <span className="flex-none" style={{ color: 'var(--theme-text-secondary)' }}>${(item.price * item.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/*
                    Cancelado: el motivo que se le mandó al cliente, quién y
                    cuándo, y lo que se le devolvió. Es lo primero que se
                    pregunta si el cliente llama.
                  */}
                  {order.status === 'cancelado' && (
                    <div className="rounded-xl p-3 mb-3 text-sm bg-red-50 border border-red-200">
                      <div className="font-semibold text-red-600 mb-0.5">Motivo de la cancelación</div>
                      <div style={{ color: 'var(--theme-text-primary)' }}>
                        {order.cancelReason || 'Se canceló sin motivo (antes de que se pidiera).'}
                      </div>
                      {detalleCancelacion(order) && (
                        <div className="text-xs mt-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
                          {detalleCancelacion(order)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pie: total + acción */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                      Total: ${Number(order.total).toFixed(2)}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                    {/*
                      El comprobante en PDF, para imprimirlo o mandárselo al
                      cliente si lo pide (él no lo baja por su cuenta). Sin
                      relleno: es una consulta, no el paso siguiente. Uno
                      cancelado no tiene.
                    */}
                    {order.status !== 'cancelado' && (
                      <button
                        onClick={() => bajarComprobante(order)}
                        disabled={descargandoComprobante === order._id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-colors hover:bg-black/5 disabled:opacity-50"
                        style={{ color: 'var(--theme-text-secondary)' }}
                      >
                        <Download className="w-4 h-4" /> {descargandoComprobante === order._id ? 'Preparando…' : 'Comprobante'}
                      </button>
                    )}
                    {/*
                      Cancelar va de segundo y sin relleno: es la salida, no el
                      paso siguiente, y no tiene que competir con él.
                    */}
                    {SE_PUEDE_CANCELAR.includes(order.status) && (
                      <button
                        onClick={() => setPedidoACancelar(order)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <CircleX className="w-4 h-4" /> Cancelar
                      </button>
                    )}

                    {order.status === 'pagado' && (
                      <button
                        onClick={() => { cambiarEstado(order._id, 'preparando').catch(() => {}); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-[#003049] text-white transition-colors"
                      >
                        <ChefHat className="w-4 h-4" /> Empezar a preparar
                      </button>
                    )}
                    {/*
                      "En camino" solo existe para domicilio: un retiro en
                      local no tiene a quién seguirle el mapa. El retiro pasa
                      por "Listo para recoger", que es cuando al cliente le
                      llega el aviso de que ya puede pasar por él.
                    */}
                    {order.status === 'preparando' && esDomicilio && (
                      <button
                        onClick={() => { cambiarEstado(order._id, 'en_camino').catch(() => {}); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white transition-colors"
                        style={{ backgroundColor: '#1D4ED8' }}
                      >
                        <Bike className="w-4 h-4" /> Salió a reparto
                      </button>
                    )}
                    {order.status === 'preparando' && !esDomicilio && (
                      <button
                        onClick={() => { cambiarEstado(order._id, 'listo').catch(() => {}); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white transition-colors"
                        style={{ backgroundColor: '#7c3aed' }}
                      >
                        <StoreIcon className="w-4 h-4" /> Listo para recoger
                      </button>
                    )}
                    {order.status === 'listo' && (
                      <button
                        onClick={() => setPedidoAEntregar(order)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-green-500 text-white transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Marcar entregado
                      </button>
                    )}
                    {order.status === 'en_camino' && (
                      <button
                        onClick={() => setPedidoAEntregar(order)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-green-500 text-white transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Marcar entregado
                      </button>
                    )}
                    {order.status === 'entregado' && (
                      <span className="flex items-center gap-1 text-sm font-semibold text-green-500">
                        <CheckCircle2 className="w-4 h-4" /> Entregado
                      </span>
                    )}
                    {order.status === 'cancelado' && (
                      <span className="flex items-center gap-1 text-sm font-semibold text-red-500">
                        <X className="w-4 h-4" /> Cancelado
                      </span>
                    )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </motion.div>
      )}

      {/*
        Se le piden al cliente los cuatro dígitos antes de dar el pedido por
        entregado.

        El `key` atado al id es lo que reinicia el formulario entre un pedido y
        el siguiente: sin él, el código del anterior se quedaba escrito y el
        siguiente se confirmaba con un número que no era suyo. Ver el comentario
        de ModalCodigoEntrega.
      */}
      <ModalCodigoEntrega
        key={pedidoAEntregar?._id || 'sin-pedido'}
        isOpen={!!pedidoAEntregar}
        pedido={pedidoAEntregar}
        onClose={() => setPedidoAEntregar(null)}
        onConfirm={confirmarEntrega}
      />

      {/* El mismo truco del `key`: el motivo del pedido anterior no se queda escrito. */}
      <ModalCancelarPedido
        key={`cancelar-${pedidoACancelar?._id || 'ninguno'}`}
        isOpen={!!pedidoACancelar}
        pedido={pedidoACancelar}
        onClose={() => setPedidoACancelar(null)}
        onConfirm={confirmarCancelacion}
      />
    </div>
  );
};

export default Orders;
