import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, X, AlertTriangle, Clock, ClipboardList, Printer, Star, Users, Wallet } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { descargarArchivo } from '../utils/descargar';
import { datosDeLaTienda, hoyLocal } from '../utils/reportesPdf';
import { construirInventario, construirResumenTienda } from '../utils/reportesTienda';
import { useAjustesCtx } from '../context/AjustesContext';
import StatCard from '../components/UI/StatCard';
import DescargaPredictiva from '../components/Admin/DescargaPredictiva';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import { useResumenCredito } from '../hooks/useCreditoProveedor';
import { useTheme } from '../context/ThemeContext';
import { dashboardService } from '../api/dashboardService';
import { productService } from '../api/productService';
import { modalTransition, overlayTransition, modalInitial, modalAnimate } from '../utils/motion';
import { formatearFecha } from '../utils/fechas';

// AdminDashboard — el resumen operativo de la tienda, con datos REALES. La idea no es lucir
// números bonitos, sino decir qué hay que hacer hoy: qué reponer, qué caduca, qué preparar y qué
// ya no se vende. Toda la carga vive en useDashboard; aquí solo pintamos.

const PERIODOS = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'anio', label: 'Año' },
];

const fechaLarga = () =>
  new Date().toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Formato corto para el eje de la gráfica: con montos reales de una tienda de barrio ($152) se ve
// el número tal cual; si algún día crece a miles, se abrevia ($1.2k) para que el eje no se
// amontone.
const ejeMoneda = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n % 1 === 0 ? n : n.toFixed(0)}`;
};

// Muestra la variación con su flechita y color (verde sube, rojo baja).
const Variacion = ({ valor, sufijo = 'vs ayer', esDinero = false }) => {
  const sube = valor >= 0;
  const texto = esDinero ? `${sube ? '+' : '-'}$${Math.abs(valor).toFixed(2)}` : `${sube ? '▲' : '▼'} ${Math.abs(valor)}%`;
  return (
    <span className={`text-xs font-bold ${sube ? 'text-green-500' : 'text-red-500'}`}>
      {texto} <span className="text-gray-500 font-medium">{sufijo}</span>
    </span>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data, grafica, loading, loadingGrafica, periodo, setPeriodo } = useDashboard();
  const { totales: creditoTotales } = useResumenCredito();
  // El reporte predictivo es de compras y proveedores: solo el administrador (como su ruta).
  const { user } = useAuth();
  const esAdmin = user?.type === 'admin';
  const { palette } = useTheme();
  const c = palette.colors; // las barras y acentos siguen la paleta activa
  const [modal, setModal] = useState(null); // 'reponer' | 'caducar' | 'pdf'
  // Periodo elegido DENTRO del modal de descarga — no depende del que esté
  // activo en pantalla, así que se le pone su propio estado (arranca igual al
  // de pantalla, que es lo más probable que quiera).
  const [periodoDescarga, setPeriodoDescarga] = useState(periodo);
  const [descargando, setDescargando] = useState(false);
  const [descargandoInventario, setDescargandoInventario] = useState(false);

  // Los datos de la tienda para el encabezado de los reportes (Personalización).
  const { ajustes } = useAjustesCtx();

  // ── Reporte "Resumen de la tienda" ── Pide el resumen DE VERDAD para el periodo elegido en el
  // modal —semanal, mensual o anual—, así que el PDF trae esos números aunque en pantalla se esté
  // viendo otro.
  const handleDescargarResumen = async () => {
    setDescargando(true);
    try {
      const datosReporte = await dashboardService.getSummary(periodoDescarga);
      const doc = construirResumenTienda(datosReporte, periodoDescarga, await datosDeLaTienda(ajustes));
      // No doc.save(): dentro de la app del teléfono no descargaría nada (ver utils/descargar.js).
      await descargarArchivo(doc.output('blob'), `resumen-tienda-la635-${hoyLocal()}.pdf`);
      setModal(null);
    } catch (error) {
      console.error('Error generando el reporte:', error);
      toast.error('No se pudo generar el reporte. Intente de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  // ── Reporte "Inventario completo" ── Todo el catálogo activo con precio, costo, margen y
  // existencia —sin imágenes: es para leer o imprimir—, por categoría y en horizontal.
  const handleDescargarInventario = async () => {
    setDescargandoInventario(true);
    try {
      const productos = await productService.getInventario();
      const doc = construirInventario(productos, await datosDeLaTienda(ajustes));
      await descargarArchivo(doc.output('blob'), `inventario-la635-${hoyLocal()}.pdf`);
      setModal(null);
    } catch (error) {
      console.error('Error generando el inventario:', error);
      toast.error('No se pudo generar el inventario. Intente de nuevo.');
    } finally {
      setDescargandoInventario(false);
    }
  };

  if (loading || !data) {
    return <p className="text-gray-500">Cargando el resumen de la tienda…</p>;
  }

  const mayorModulo = data.ventasPorModulo[0]?.total || 1; // escala de las barras

  const alertas = [
    {
      icon: AlertTriangle, color: '#d97706', bg: 'rgba(217,119,6,.12)',
      titulo: `${data.porReponer.total} productos por reponer`,
      sub: data.porReponer.lista.slice(0, 2).map((p) => p.name).join(', ') || 'Todo con stock suficiente',
      accion: data.porReponer.total > 0 ? () => setModal('reponer') : null,
    },
    {
      icon: Clock, color: '#6b7280', bg: 'rgba(107,114,128,.12)',
      titulo: `${data.porCaducar.total} lotes caducan esta semana`,
      sub: 'Revisar antes de que se pierdan',
      accion: data.porCaducar.total > 0 ? () => setModal('caducar') : null,
    },
    {
      icon: ClipboardList, color: '#16a34a', bg: 'rgba(22,163,74,.12)',
      titulo: `${data.pedidosPorPreparar} pedidos por preparar`,
      sub: 'Ir a la pantalla de pedidos',
      accion: () => navigate('/pedidos'),
    },
    {
      icon: Printer, color: '#2563eb', bg: 'rgba(37,99,235,.12)',
      titulo: `${data.impresionesPendientes} impresiones pendientes`,
      sub: 'Trabajos de impresión sin entregar',
      accion: () => navigate('/pedidos'),
    },
    // Mismo umbral y mismo tono que el banner de Proveedores: lo vencido manda (rojo, urge) y si no
    // hay nada vencido pero sí hay deuda, se avisa en un tono más tranquilo. Sin deuda, la alerta ni
    // aparece.
    ...(creditoTotales.deuda > 0 ? [{
      icon: Wallet,
      color: creditoTotales.vencido > 0 ? '#dc2626' : '#7c3aed',
      bg: creditoTotales.vencido > 0 ? 'rgba(220,38,38,.12)' : 'rgba(124,58,237,.12)',
      titulo: creditoTotales.vencido > 0
        ? `$${creditoTotales.vencido.toFixed(2)} vencidos con proveedores`
        : `$${creditoTotales.deuda.toFixed(2)} en deuda con proveedores`,
      sub: 'Ir a Proveedores',
      accion: () => navigate('/proveedores'),
    }] : []),
  ];

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {/* ── Encabezado ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-[#066494]">{fechaLarga()}</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#066494]">Resumen de hoy</h1>
        </div>
        <button
          onClick={() => { setPeriodoDescarga(periodo); setModal('pdf'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Descargar PDF
        </button>
      </div>

      {/* ── Tarjetas principales ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pedidos de hoy" value={data.pedidosHoy.valor}
          extra={<Variacion valor={data.pedidosHoy.variacion} />} />
        <StatCard title="Entregados (7 días)" value={data.entregados.valor}
          extra={<Variacion valor={data.entregados.variacion} sufijo="vs semana pasada" />} />
        {/* Tres números: lo que entró, lo que costó y lo que quedó de ganancia. */}
        <StatCard title="Ingresos del día" value={money(data.ingresos?.valor ?? 0)}
          extra={<Variacion valor={data.ingresos?.delta ?? 0} esDinero />} />
        <StatCard title="Por reponer" value={data.porReponer.total}
          extra={
            data.porReponer.total > 0
              ? <button onClick={() => setModal('reponer')} className="text-xs font-bold text-[#003049] hover:underline">Ver la lista →</button>
              : <span className="text-xs text-gray-500">Todo surtido</span>
          } />
      </div>

      {/* ── Inversión y ganancia real ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Inversión del día"
          value={money(data.inversion?.valor ?? 0)}
          extra={<span className="text-xs text-gray-500">Lo que costaron los productos vendidos</span>}
        />
        <StatCard
          title="Ganancia real"
          value={money(data.ganancia?.valor ?? 0)}
          extra={<Variacion valor={data.ganancia?.delta ?? 0} esDinero />}
        />
        <StatCard
          title="Margen"
          value={`${data.ganancia?.margen ?? 0}%`}
          extra={
            (data.ganancia?.margen ?? 0) < 0
              ? <span className="text-xs font-bold text-red-500">Está vendiendo por debajo del costo</span>
              : <span className="text-xs text-gray-500">De cada dólar que entra</span>
          }
        />
      </div>

      {/* ── Segunda fila: métricas de apoyo ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ticket promedio', valor: money(data.ticketPromedio), icon: null },
          { label: 'Clientes nuevos', valor: data.clientesNuevos, icon: Users },
          { label: 'Puntos canjeados', valor: data.puntosCanjeados, icon: Star },
          { label: 'Descuento por puntos', valor: money(data.descuentoPorPuntos), icon: null },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                {Icon && <Icon className="w-3.5 h-3.5" />} {m.label}
              </div>
              <div className="text-2xl font-extrabold text-gray-900">{m.valor}</div>
            </div>
          );
        })}
      </div>

      {/* ── Gráfica + alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* min-w-0 en la caja de la gráfica: el ResponsiveContainer mide a su padre para saber cuánto ancho
           tiene, y sin esto el padre se estiraba hasta el ancho que la gráfica pedía en vez de al revés.
           La página entera terminaba corriéndose de lado en teléfono. */}
        <div className="lg:col-span-2 min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h3 className="text-xl font-bold text-gray-800">Ventas y compras</h3>
            <div className="flex flex-wrap gap-1">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border ${periodo === p.id ? 'bg-[#003049] text-white border-[#003049]' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Solo esta caja se actualiza al cambiar el periodo */}
          {loadingGrafica ? (
            <p className="text-sm text-gray-500 py-24 text-center">Actualizando…</p>
          ) : grafica.length === 0 ? (
            <p className="text-sm text-gray-500 py-24 text-center">Todavía no hay ventas ni compras en este periodo.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              {/* Gráfica de línea: cada mes se ve con su punto y su tooltip aunque uno se dispare y los demás
                 queden casi en cero. */}
              <LineChart data={grafica} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                {/* La cuadrícula con el borde de la paleta: gris claro fijo, en Modo oscuro brillaba. */}
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.cardBorder} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: c.textSecondary }} />
                <YAxis tick={{ fontSize: 12, fill: c.textSecondary }} tickFormatter={ejeMoneda} width={60} />
                <RechartsTooltip
                  formatter={(v) => money(v)}
                  contentStyle={{ backgroundColor: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 12, color: c.textPrimary }}
                />
                <Legend />
                {/* Colores tomados de la paleta activa, no fijos */}
                {/* type="linear" (recta entre puntos), no "monotone": con meses en cero seguidos de un pico, una
                   curva suavizada insinúa un crecimiento gradual que nunca pasó. La recta cuenta solo lo que hay,
                   sin inventar el tramo de en medio. */}
                <Line type="linear" dataKey="ventas" name="Ventas" stroke={c.primary} strokeWidth={2}
                  dot={{ r: 4, fill: c.primary, strokeWidth: 2, stroke: c.cardBg }}
                  activeDot={{ r: 6, fill: c.primary, strokeWidth: 2, stroke: c.cardBg }} />
                <Line type="linear" dataKey="compras" name="Compras" stroke={c.textMuted} strokeWidth={2}
                  dot={{ r: 4, fill: c.textMuted, strokeWidth: 2, stroke: c.cardBg }}
                  activeDot={{ r: 6, fill: c.textMuted, strokeWidth: 2, stroke: c.cardBg }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Requiere tu atención */}
        <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Requiere tu atención</h3>
          <div className="flex flex-col gap-3">
            {alertas.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.titulo}
                  onClick={a.accion || undefined}
                  disabled={!a.accion}
                  className="flex items-start gap-3 p-3 rounded-xl text-left disabled:cursor-default"
                  style={{ backgroundColor: a.bg }}
                >
                  <Icon className="w-5 h-5 flex-none mt-0.5" style={{ color: a.color }} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-800">{a.titulo}</div>
                    <div className="text-xs text-gray-600 break-words">{a.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Productos más vendidos ── */}
      <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-xl font-bold text-gray-800">Productos más vendidos</h3>
          <button onClick={() => navigate('/inventario')} className="text-sm font-medium text-[#003049] hover:underline">Ver todo</button>
        </div>
        {data.masVendidos.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay ventas registradas.</p>
        ) : (
          // Seis columnas no caben en un teléfono y no hay forma de que quepan. En vez de dejar que estiren
          // la página, la tabla se corre de lado DENTRO de su caja: lo que no cabe se busca deslizando aquí,
          // y el resto del panel se queda quieto.
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Producto', 'Categoría', 'Vendidos', 'En bodega', 'Precio', 'Estado'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.masVendidos.map((p) => {
                  // "Bajo" según SU propio máximo, no un número fijo para todos.
                  const stockNum = Number(p.stock) || 0;
                  const maxNum = Number(p.maxQuantity) || 0;
                  const bajo = maxNum > 0
                    ? stockNum <= maxNum * data.umbrales.ratioBajo
                    : stockNum <= data.umbrales.stockBajoAbs;
                  return (
                    <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm font-medium text-gray-800">{p.nombre}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{p.categoria || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{p.vendidos}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{p.stock ?? '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{money(p.precio)}</td>
                      <td className="py-4 px-4 text-sm">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${bajo ? 'text-red-500' : 'text-green-500'}`}
                              style={{ backgroundColor: bajo ? 'rgba(239,68,68,.1)' : 'rgba(34,197,94,.1)' }}>
                          {bajo ? `Quedan ${p.stock ?? 0}` : 'En stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Ventas por módulo + sin movimiento ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-1">Ventas por módulo</h3>
          <p className="text-xs text-gray-500 mb-4">Cuál área de la tienda está rindiendo</p>
          {data.ventasPorModulo.length === 0 ? (
            <p className="text-sm text-gray-500">Sin ventas todavía.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.ventasPorModulo.map((m) => (
                <div key={m.modulo}>
                  <div className="flex justify-between gap-3 text-sm mb-1">
                    <span className="font-medium text-gray-800 truncate">{m.modulo}</span>
                    <span className="text-gray-600 flex-none">{money(m.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#003049]" style={{ width: `${(m.total / mayorModulo) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-1">Sin movimiento</h3>
          <p className="text-xs text-gray-500 mb-4">Nadie los ha comprado — evalúa dejar de surtirlos</p>
          {data.sinMovimiento.length === 0 ? (
            <p className="text-sm text-gray-500">Todos los productos han tenido ventas.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.sinMovimiento.map((p) => (
                <div key={p._id} className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-800 truncate">{p.name}</span>
                  <span className="text-gray-500 flex-none">{p.stock} en bodega · {money(p.salePrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modales (misma entrada suave que el resto de la app) ── */}
      <AnimatePresence>
      {(modal === 'reponer' || modal === 'caducar') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={overlayTransition} className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <motion.div
            initial={modalInitial} animate={modalAnimate} exit={modalInitial} transition={modalTransition}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 max-h-[80vh] flex flex-col"
          >
            <div className="bg-[#00283D] text-white p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {modal === 'reponer' ? 'Productos por reponer' : 'Lotes que caducan pronto'}
              </h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              {(modal === 'reponer' ? data.porReponer.lista : data.porCaducar.lista).map((p) => (
                <div key={p._id} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-800">{p.name}</span>
                  <span className="text-gray-500">
                    {modal === 'reponer'
                      ? `${p.stock}${p.maxQuantity ? ` de ${p.maxQuantity}` : ''} en bodega`
                      : formatearFecha(p.expirationDate) || 'Sin fecha'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {modal === 'pdf' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={overlayTransition} className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <motion.div
            initial={modalInitial} animate={modalAnimate} exit={modalInitial} transition={modalTransition}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
          >
            <div className="bg-[#00283D] text-white p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">Descargar</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 flex flex-col gap-6">
              {/* Resumen de la tienda, con periodo real */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Resumen de la tienda</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {PERIODOS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPeriodoDescarga(p.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border ${periodoDescarga === p.id ? 'bg-[#003049] text-white border-[#003049]' : 'bg-white text-gray-600 border-gray-300'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleDescargarResumen}
                  disabled={descargando}
                  className="w-full bg-[#003049] hover:bg-[#00283D] disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-full"
                >
                  {descargando ? 'Generando…' : 'Descargar resumen'}
                </button>
              </div>

              {/* Inventario completo, sin imágenes */}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-bold text-gray-700 mb-1">Inventario completo</p>
                <p className="text-xs text-gray-500 mb-3">Todos los productos activos, con precio, costo y existencia. Sin imágenes.</p>
                <button
                  onClick={handleDescargarInventario}
                  disabled={descargandoInventario}
                  className="w-full bg-gray-800 hover:bg-black disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-full"
                >
                  {descargandoInventario ? 'Generando…' : 'Descargar inventario'}
                </button>
              </div>

              {/* El pronóstico: compras y proveedores, solo el administrador */}
              {esAdmin && <DescargaPredictiva alTerminar={() => setModal(null)} />}
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
