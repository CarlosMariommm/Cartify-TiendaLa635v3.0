import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import FilterSelect from '../UI/FilterSelect';
import OrdenSelect from '../UI/OrdenSelect';
import { productService } from '../../api/productService';
import { coincide, ordenarLista, ORDEN_INICIAL } from '../../utils/listasPanel';
import { gananciaDeProducto, resumenDeGanancias, ORDENES_GANANCIA } from '../../utils/gananciaProductos';

// GANANCIA POR PRODUCTO (Admin) — GananciaPorProducto.jsx
// En el dashboard: cuánto deja cada producto por unidad y todo su stock, al precio normal. Los
// costos son del administrador, así que el empleado no ve esta parte.

const money = (n) => `${n < 0 ? '-' : ''}$${Math.abs(Number(n) || 0).toFixed(2)}`;
const porciento = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);
const CUANTOS = 10;

const ORDENES = [
  { value: 'ganancia-stock', label: 'Ordenar: Más ganancia del stock' },
  { value: 'ganancia-unidad', label: 'Ordenar: Más ganancia por unidad' },
  { value: 'margen-alto', label: 'Ordenar: Mayor margen' },
  { value: 'margen-bajo', label: 'Ordenar: Menor margen' },
];

const GananciaPorProducto = () => {
  const [filas, setFilas] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [orden, setOrden] = useState(ORDEN_INICIAL);
  const [todos, setTodos] = useState(false);

  useEffect(() => {
    let vivo = true;
    productService.getInventario()
      .then((productos) => {
        if (!vivo) return;
        setFilas((Array.isArray(productos) ? productos : []).filter((p) => p.isActive !== false).map(gananciaDeProducto));
      })
      .catch(() => vivo && setFilas([]));
    return () => { vivo = false; };
  }, []);

  const resumen = useMemo(() => resumenDeGanancias(filas || []), [filas]);

  const visibles = useMemo(() => ordenarLista(
    (filas || []).filter((f) =>
      coincide(buscar, f.nombre, f.categoria) &&
      (filtro === 'Todos' ||
        (filtro === 'ganancia' && !f.sinCosto && f.porUnidad > 0) ||
        (filtro === 'perdida' && !f.sinCosto && f.porUnidad <= 0) ||
        (filtro === 'sin-costo' && f.sinCosto))),
    orden,
    { nombre: (f) => f.nombre, extras: ORDENES_GANANCIA },
  ), [filas, buscar, filtro, orden]);

  const mostrados = todos ? visibles : visibles.slice(0, CUANTOS);

  return (
    <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-800 mb-1">Ganancia por producto</h3>
      <p className="text-xs text-gray-500 mb-4">
        Lo que deja cada uno por unidad y con todo lo que tienes en bodega, al precio normal (sin promociones).
      </p>

      {filas === null ? (
        <p className="text-sm text-gray-500">Calculando…</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay productos en el inventario.</p>
      ) : (
        <>
          {/* Los totales de la bodega. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Invertido en bodega', valor: money(resumen.invertido), sub: 'Lo que costó lo que tienes' },
              { label: 'Si vendes todo', valor: money(resumen.valorVenta), sub: 'Al precio normal' },
              { label: 'Ganancia del stock', valor: money(resumen.ganancia), sub: 'Lo que te quedaría', rojo: resumen.ganancia < 0 },
              { label: 'Margen de la bodega', valor: porciento(resumen.margen), sub: 'De cada dólar que entraría' },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-xs font-bold text-gray-500 mb-1">{m.label}</div>
                <div className={`text-2xl font-extrabold ${m.rojo ? 'text-red-500' : 'text-gray-900'}`}>{m.valor}</div>
                <div className="text-xs text-gray-500">{m.sub}</div>
              </div>
            ))}
          </div>
          {(resumen.conPerdida > 0 || resumen.sinCosto > 0) && (
            <p className="text-xs text-gray-600 mb-4">
              {resumen.conPerdida > 0 && <span className="font-bold text-red-500">{resumen.conPerdida} se venden a su costo o por debajo. </span>}
              {resumen.sinCosto > 0 && `${resumen.sinCosto} no tienen costo registrado y no entran en las cuentas.`}
            </p>
          )}

          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-full text-sm outline-none focus:border-[#003049] transition-colors w-56 shadow-sm"
              />
            </div>
            <FilterSelect
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: 'ganancia', label: 'Dejan ganancia' },
                { value: 'perdida', label: 'Sin ganancia o con pérdida' },
                { value: 'sin-costo', label: 'Sin costo registrado' },
              ]}
            />
            <OrdenSelect value={orden} onChange={setOrden} extras={ORDENES} />
          </div>

          {visibles.length === 0 ? (
            <p className="text-sm text-gray-500">Ningún producto coincide con la búsqueda.</p>
          ) : (
            // La tabla se corre de lado dentro de su caja en el teléfono, como "Productos más vendidos".
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Producto', 'Costo', 'Precio', 'Ganancia por unidad', 'En bodega', 'Ganancia del stock'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mostrados.map((f) => {
                    const unidad = f.porLibra ? ' /lb' : '';
                    const rojo = !f.sinCosto && f.porUnidad <= 0;
                    return (
                      <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">
                          {f.nombre}
                          {f.categoria && <div className="text-xs font-normal text-gray-500">{f.categoria}</div>}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{f.sinCosto ? 'Sin costo' : `${money(f.costo)}${unidad}`}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{money(f.precio)}{unidad}</td>
                        <td className={`py-3 px-4 text-sm font-bold ${rojo ? 'text-red-500' : 'text-gray-800'}`}>
                          {f.sinCosto ? '—' : `${money(f.porUnidad)}${unidad}`}
                          {!f.sinCosto && <span className="ml-1 text-xs font-medium text-gray-500">({porciento(f.margen)})</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{f.stock}{f.porLibra ? ' lb' : ''}</td>
                        <td className={`py-3 px-4 text-sm font-bold ${rojo ? 'text-red-500' : 'text-gray-800'}`}>
                          {f.sinCosto ? '—' : money(f.delStock)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {visibles.length > CUANTOS && (
            <button
              onClick={() => setTodos((t) => !t)}
              className="mt-4 text-sm font-medium text-[#003049] hover:underline"
            >
              {todos ? 'Ver menos' : `Ver los ${visibles.length} productos`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default GananciaPorProducto;
