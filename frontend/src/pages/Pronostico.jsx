import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, RotateCw, Search } from 'lucide-react';
import { BarChart, Bar, Cell, ErrorBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { dashboardService } from '../api/dashboardService';
import { useAjustesCtx } from '../context/AjustesContext';
import { useTheme } from '../context/ThemeContext';
import { dinero, fechaCorta, fechaLarga } from '../utils/reportesPdf';
import { cantidad, rango, resumenDelPronostico } from '../utils/reportePredictivo';
import { descargarReportePredictivo } from '../utils/descargarPredictivo';

/*
 * ============================================================
 * PRONÓSTICO — Ventas › Pronóstico (solo administrador)
 * ============================================================
 * Lo mismo que el reporte predictivo en PDF, pero en pantalla y sin
 * descargar nada: cuánto se espera vender las próximas 4 semanas (con su
 * rango), qué se agotaría y qué conviene pedirle a cada proveedor. Lo
 * calcula el servicio de analítica en Python (analitica/) con el historial de
 * ventas; el resumen en palabras es el mismo del PDF (resumenDelPronostico).
 *
 * El servicio duerme si nadie lo usa: la primera vez del día puede tardar
 * cerca de un minuto, y la pantalla lo dice mientras espera. Después queda
 * guardado un rato en el servidor y abre al instante; "Actualizar" lo vuelve
 * a calcular con las ventas más recientes.
 * ============================================================
 */

const CONFIANZA = {
  alta: { texto: 'Alta', clase: 'text-green-700' },
  media: { texto: 'Media', clase: 'text-gray-700' },
  baja: { texto: 'Baja', clase: 'text-amber-700' },
};

// $1.2k en el eje si algún día la venta semanal pasa de mil.
const ejeMoneda = (v) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`);

const horaDeCalculo = (iso) =>
  new Date(iso).toLocaleString('es-SV', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

const METODO = {
  'holt-winters': 'Venta de la tienda con Holt-Winters (tendencia y patrón semanal); por producto, con el método TSB para ventas intermitentes; rangos con 2,000 escenarios simulados.',
  'promedio-semanal': 'Con menos de 3 semanas de historial, la venta de la tienda sale del promedio reciente ajustado por día de la semana; por producto, con el método TSB; rangos con 2,000 escenarios simulados.',
};

const Encabezado = ({ children, derecha }) => (
  <th className={`py-2 px-3 font-semibold ${derecha ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Celda = ({ children, derecha, clase = '' }) => (
  <td className={`py-2.5 px-3 ${derecha ? 'text-right tabular-nums' : ''} ${clase}`}>{children}</td>
);
const Tabla = ({ columnas, children, pie }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-300">
          {columnas.map(([texto, derecha]) => <Encabezado key={texto} derecha={derecha}>{texto}</Encabezado>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 text-gray-800">{children}</tbody>
      {pie && <tfoot className="border-t border-gray-300 font-semibold text-gray-900">{pie}</tfoot>}
    </table>
  </div>
);

const Seccion = ({ titulo, children, nota }) => (
  <section className="flex flex-col gap-3">
    <div>
      <h2 className="text-xl font-bold text-gray-800">{titulo}</h2>
      {nota && <p className="text-sm text-gray-500 mt-1 max-w-3xl">{nota}</p>}
    </div>
    {children}
  </section>
);

const Cifra = ({ etiqueta, valor, detalle }) => (
  <div>
    <p className="text-sm text-gray-500">{etiqueta}</p>
    <p className="text-3xl font-extrabold text-gray-900 tabular-nums mt-1">{valor}</p>
    {detalle && <p className="text-sm text-gray-500 mt-1">{detalle}</p>}
  </div>
);

const Pronostico = () => {
  const { ajustes } = useAjustesCtx();
  const { palette } = useTheme();
  const c = palette.colors;
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [buscar, setBuscar] = useState('');

  const cargar = useCallback(async (forzar = false) => {
    setCargando(true);
    setError('');
    try {
      setDatos(await dashboardService.getPronostico({ forzar }));
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo calcular el pronóstico. Intente de nuevo en un minuto.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarReportePredictivo(datos, ajustes);
    } catch (e) {
      console.error('Error generando el reporte predictivo:', e);
      toast.error('No se pudo generar el PDF. Intente de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  const listo = datos && !datos.vacio;

  // Las semanas de la gráfica: las que pasaron y las que vienen, en una sola fila.
  const barras = useMemo(() => (listo ? [
    ...(datos.historial.semanas || []).map((s) => ({ clave: `r${s.desde}`, semana: fechaCorta(s.desde), valor: s.total, real: true })),
    ...datos.tienda.semanas.map((s) => ({
      clave: `p${s.desde}`, semana: fechaCorta(s.desde), valor: s.esperado, bajo: s.bajo, alto: s.alto,
      rango: [s.esperado - s.bajo, s.alto - s.esperado],
    })),
  ] : []), [datos, listo]);

  const productos = useMemo(() => {
    if (!listo) return [];
    const q = buscar.trim().toLowerCase();
    return [...datos.productos]
      .sort((a, b) => b.periodo.esperado - a.periodo.esperado)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q));
  }, [datos, listo, buscar]);

  return (
    <div className="flex flex-col gap-8 w-full pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#066494]">Pronóstico</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Lo que se espera vender las próximas 4 semanas, qué se agotaría y qué conviene pedir a cada proveedor, calculado con el historial de ventas.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => cargar(true)}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
          </button>
          <button
            onClick={descargar}
            disabled={!listo || descargando}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D] disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {descargando ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {cargando && !datos ? (
        <div className="py-16 text-center" role="status">
          <p className="font-semibold text-gray-800">Calculando el pronóstico…</p>
          <p className="text-sm text-gray-500 mt-1">Si el servicio de análisis estaba en reposo, puede tardar hasta un minuto.</p>
        </div>
      ) : error && !datos ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-gray-800">{error}</p>
          <button onClick={() => cargar()} className="mt-4 px-5 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D]">
            Reintentar
          </button>
        </div>
      ) : datos?.vacio ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-gray-800">Todavía no hay ventas de las que aprender.</p>
          <p className="text-sm text-gray-500 mt-1">El pronóstico aparece con las primeras ventas, y mejora con cada semana.</p>
        </div>
      ) : listo ? (
        <>
          {error && <p className="text-sm text-amber-700">{error} Se muestra el último que se calculó.</p>}

          {/* Las cifras, sin recuadros: el número es lo que importa */}
          <div className="grid gap-6 sm:grid-cols-3">
            <Cifra
              etiqueta="Próximas 4 semanas"
              valor={dinero(datos.tienda.periodo.esperado)}
              detalle={`entre ${dinero(datos.tienda.periodo.bajo)} y ${dinero(datos.tienda.periodo.alto)}`}
            />
            <Cifra
              etiqueta={`Próxima semana · desde el ${fechaCorta(datos.tienda.semanas[0].desde)}`}
              valor={dinero(datos.tienda.semanas[0].esperado)}
              detalle={`entre ${dinero(datos.tienda.semanas[0].bajo)} y ${dinero(datos.tienda.semanas[0].alto)}`}
            />
            <Cifra
              etiqueta="Las 4 semanas anteriores"
              valor={datos.tienda.periodo_anterior == null ? '—' : dinero(datos.tienda.periodo_anterior)}
              detalle={datos.tienda.periodo_anterior == null ? 'todavía no hay 4 semanas de ventas' : 'lo que de verdad se vendió'}
            />
          </div>

          <Seccion titulo="Resumen">
            <ul className="list-disc pl-5 space-y-2 text-gray-700 max-w-4xl">
              {resumenDelPronostico(datos).map((punto) => <li key={punto}>{punto}</li>)}
            </ul>
          </Seccion>

          <Seccion titulo="Venta por semana">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {/*
                  Una sola serie, cada barra con su color: gris lo que se vendió,
                  azul lo pronosticado (con la línea del rango). Con dos series
                  apiladas, recharts corría las barras y la línea del rango.
                */}
                <BarChart data={barras} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={c.cardBorder} />
                  <XAxis dataKey="semana" tick={{ fontSize: 12, fill: c.textSecondary }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: c.textSecondary }} tickFormatter={ejeMoneda} width={56} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: c.cardBorder, opacity: 0.4 }}
                    contentStyle={{ backgroundColor: c.cardBg, border: `1px solid ${c.cardBorder}`, borderRadius: 12, color: c.textPrimary }}
                    formatter={(valor, _nombre, { payload }) => (payload.real
                      ? [dinero(valor), 'Venta real']
                      : [`${dinero(valor)} (entre ${dinero(payload.bajo)} y ${dinero(payload.alto)})`, 'Pronóstico'])}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {barras.map((b) => <Cell key={b.clave} fill={b.real ? c.textMuted : c.primary} />)}
                    <ErrorBar dataKey="rango" width={8} stroke={c.textSecondary} strokeWidth={1.5} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.textMuted }} /> Venta real</span>
              <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.primary }} /> Pronóstico, con su rango probable (80%)</span>
            </div>
          </Seccion>

          <Seccion titulo="Productos que se agotarían">
            {datos.productos.some((p) => p.se_acaba?.agotado || p.se_acaba?.probable) ? (
              <Tabla columnas={[['Producto'], ['Existencia', true], ['Venta por semana', true], ['Se agota (probable)'], ['Lo antes posible'], ['Confianza']]}>
                {datos.productos.filter((p) => p.se_acaba?.agotado || p.se_acaba?.probable).map((p) => (
                  <tr key={p.id}>
                    <Celda>{p.nombre}</Celda>
                    <Celda derecha>{cantidad(p.stock, p.unidad)}</Celda>
                    <Celda derecha>{cantidad(p.semana.esperado, p.unidad, { promedio: true })}</Celda>
                    <Celda clase={p.se_acaba.agotado ? 'font-semibold text-red-700' : ''}>
                      {p.se_acaba.agotado ? 'Ya agotado' : fechaLarga(p.se_acaba.probable)}
                    </Celda>
                    <Celda>{p.se_acaba.agotado ? '—' : fechaLarga(p.se_acaba.pronto || p.se_acaba.probable)}</Celda>
                    <Celda clase={CONFIANZA[p.confianza]?.clase}>{CONFIANZA[p.confianza]?.texto}</Celda>
                  </tr>
                ))}
              </Tabla>
            ) : (
              <p className="text-gray-600">Con la venta esperada, ningún producto se agota en las próximas 4 semanas.</p>
            )}
          </Seccion>

          <Seccion
            titulo="Compra sugerida por proveedor"
            nota="Lo que conviene pedir para llegar a la próxima compra, cubriendo el 90% de los escenarios, menos lo que ya hay. Cada cuántos días se le compra a cada proveedor sale de su historial de compras (sin historial, una vez por semana)."
          >
            {datos.proveedores?.length ? datos.proveedores.map((g) => (
              <div key={g.id || 'sin-proveedor'} className="flex flex-col gap-2">
                <h3 className="font-semibold text-gray-800">
                  {g.nombre || 'Sin proveedor asignado'} <span className="font-normal text-gray-500">· se le compra cada {g.ciclo_dias} días</span>
                </h3>
                <Tabla
                  columnas={[['Producto'], ['Existencia', true], ['Pedir', true], ['Costo estimado', true]]}
                  pie={<tr><Celda>Total</Celda><Celda /><Celda /><Celda derecha>{dinero(g.costo_total)}</Celda></tr>}
                >
                  {g.productos.map((p) => (
                    <tr key={p.id}>
                      <Celda>{p.nombre}</Celda>
                      <Celda derecha>{cantidad(p.stock, p.unidad)}</Celda>
                      <Celda derecha clase="font-semibold">{cantidad(p.pedir, p.unidad)}</Celda>
                      <Celda derecha>{dinero(p.costo_pedido)}</Celda>
                    </tr>
                  ))}
                </Tabla>
              </div>
            )) : (
              <p className="text-gray-600">Con la existencia actual no hace falta pedir nada antes de la próxima compra.</p>
            )}
          </Seccion>

          <Seccion titulo="Pronóstico por producto">
            <label className="relative max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar producto"
                aria-label="Buscar producto"
                className="w-full pl-9 pr-3 py-2 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-[#066494]"
              />
            </label>
            <Tabla columnas={[['Producto'], ['Vendido', true], ['Días con venta', true], ['Próxima semana', true], ['Rango (80%)', true], ['Próximas 4 semanas', true], ['Confianza']]}>
              {productos.map((p) => (
                <tr key={p.id}>
                  <Celda>
                    {p.nombre}
                    {p.al_por_mayor > 0 && <span className="text-gray-400" title="Tuvo ventas al por mayor: cuentan en lo vendido, no en el ritmo de todos los días"> *</span>}
                  </Celda>
                  <Celda derecha>{cantidad(p.vendido, p.unidad)}</Celda>
                  <Celda derecha>{p.dias_con_venta}</Celda>
                  <Celda derecha>{cantidad(p.semana.esperado, p.unidad, { promedio: true })}</Celda>
                  <Celda derecha clase="text-gray-500">{rango(p.semana.bajo, p.semana.alto, p.unidad)}</Celda>
                  <Celda derecha>{cantidad(p.periodo.esperado, p.unidad, { promedio: true })}</Celda>
                  <Celda clase={CONFIANZA[p.confianza]?.clase}>{CONFIANZA[p.confianza]?.texto}</Celda>
                </tr>
              ))}
            </Tabla>
            <p className="text-sm text-gray-500 max-w-4xl">
              Confianza alta: 8 días o más con venta y 4 semanas de historial. Media: de 3 a 7 días con venta. Baja: menos de 3; se pronostica, pero no se sugiere cuánto pedir.
              {datos.productos.some((p) => p.al_por_mayor > 0) && ' * Tuvo ventas al por mayor (más del triple de lo normal): cuentan en lo vendido, pero no en el ritmo de todos los días.'}
            </p>
          </Seccion>

          <p className="text-sm text-gray-500 border-t border-gray-200 pt-4 max-w-4xl">
            Calculado el {horaDeCalculo(datos.generado)} con {datos.historial.dias} días de ventas ({datos.historial.pedidos} pedidos). {METODO[datos.tienda.metodo]}{' '}
            <Link to="/ayuda?tema=pronostico" className="text-[#066494] font-medium hover:underline">Cómo leerlo</Link>
          </p>
        </>
      ) : null}
    </div>
  );
};

export default Pronostico;
