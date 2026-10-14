import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DataTable from '../components/UI/DataTable';
import TableActions from '../components/UI/TableActions';
import GenericConfirmModal from '../components/Admin/GenericConfirmModal';
import MaterialesImpresion from '../components/Admin/MaterialesImpresion';
import { printServiceService } from '../api/printServiceService';
import { useMaterialesImpresion } from '../hooks/useMaterialesImpresion';
import { numeroEnRango, bloquearTeclasNumero } from '../utils/validaciones';
import { cmDesdePx, pxDesdeCm } from '../utils/pxImpresion';
import { Search } from 'lucide-react';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import { coincide, ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';

/*
 * ServiciosImpresion (Admin) — catálogo de formatos de impresión con precio.
 * El cliente elige estos formatos en /impresiones.
 *
 * La medida se escribe y se muestra en PÍXELES — es lo que se conoce, como
 * una foto (1200×1200) — y se convierte a centímetros solo para guardarla:
 * el editor y el PDF final necesitan el tamaño real en papel. Ver
 * utils/pxImpresion.js.
 */
const emptyForm = { name: '', widthPx: pxDesdeCm(21.6), heightPx: pxDesdeCm(27.9), pricePerCopy: '', allowsColor: true, colorSurcharge: '', isActive: true, materialId: '' };

const ServiciosImpresion = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  // Buscar, filtrar y ordenar los formatos (lo más reciente primero). Ver utils/listasPanel.js.
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('Todos');
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  // Los papeles cargados, para poder decir en qué se imprime cada formato.
  const { papeles } = useMaterialesImpresion();

  const cargar = async () => {
    setLoading(true);
    try { const d = await printServiceService.getServices(); setServicios(Array.isArray(d) ? d : []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const abrirEditar = (s) => {
    setEditId(s._id);
    setForm({
      name: s.name || '', widthPx: pxDesdeCm(s.widthCm ?? 21.6), heightPx: pxDesdeCm(s.heightCm ?? 27.9),
      pricePerCopy: s.pricePerCopy ?? '', allowsColor: s.allowsColor !== false,
      colorSurcharge: s.colorSurcharge ?? '', isActive: s.isActive !== false,
      // Puede venir poblado (objeto) o como puro id, según cómo lo traiga la API.
      materialId: (typeof s.materialId === 'object' ? s.materialId?._id : s.materialId) || '',
    });
    setModalOpen(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.pricePerCopy === '') { toast.error('Nombre y precio por copia son requeridos'); return; }

    // Las medidas se piden en píxeles y se guardan en centímetros: el editor
    // y el PDF final necesitan el tamaño real en papel. Si vienen en 0 o con
    // letras, el canvas quedaría sin tamaño.
    const anchoPx = numeroEnRango(form.widthPx, { min: 10, max: 20000, entero: true });
    if (anchoPx === null) { toast.error('El ancho debe ser un número entero entre 10 y 20000 px'); return; }

    const altoPx = numeroEnRango(form.heightPx, { min: 10, max: 20000, entero: true });
    if (altoPx === null) { toast.error('El alto debe ser un número entero entre 10 y 20000 px'); return; }

    const precio = numeroEnRango(form.pricePerCopy, { min: 0, max: 1000 });
    if (precio === null) { toast.error('El precio por copia debe ser un número de 0 o más'); return; }

    const recargo = numeroEnRango(form.colorSurcharge === '' ? 0 : form.colorSurcharge, { min: 0, max: 1000 });
    if (recargo === null) { toast.error('El recargo de color debe ser un número de 0 o más'); return; }

    const { widthPx, heightPx, ...resto } = form;
    const datos = { ...resto, widthCm: cmDesdePx(anchoPx), heightCm: cmDesdePx(altoPx), pricePerCopy: precio, colorSurcharge: recargo };

    try {
      if (editId) { await printServiceService.updateService(editId, datos); toast.success('Formato actualizado'); }
      else { await printServiceService.createService(datos); toast.success('Formato creado'); }
      setModalOpen(false); cargar();
    } catch (e) { console.error(e); }
  };

  const eliminar = async () => {
    if (!toDelete) return;
    try { await printServiceService.deleteService(toDelete._id); toast.success('Formato eliminado'); }
    catch (e) { console.error(e); }
    finally { setConfirmOpen(false); setToDelete(null); cargar(); }
  };

  const inputSm = 'w-40 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#00283D]';

  // Misma fila para las dos tablas — solo cambia qué formatos entran en cada una.
  const filaDeFormato = (item) => (
    <>
      <td className="py-4 px-4 text-sm text-gray-800">{item.name}</td>
      <td className="py-4 px-4 text-sm text-gray-600">{pxDesdeCm(item.widthCm ?? 21.6)} × {pxDesdeCm(item.heightCm ?? 27.9)} px</td>
      <td className="py-4 px-4 text-sm text-gray-600">${Number(item.pricePerCopy).toFixed(2)}</td>
      <td className="py-4 px-4 text-sm text-gray-600">{item.allowsColor ? `Sí (+$${Number(item.colorSurcharge || 0).toFixed(2)})` : 'No'}</td>
      <td className={`py-4 px-4 text-sm font-medium ${item.isActive ? 'text-green-500' : 'text-red-500'}`}>{item.isActive ? 'Activo' : 'Inactivo'}</td>
      <td className="py-4 px-4 text-sm">
        <TableActions onEdit={() => abrirEditar(item)} onDelete={() => { setToDelete(item); setConfirmOpen(true); }} />
      </td>
    </>
  );

  const columnasFormato = ['Formato', 'Tamaño', 'Precio/copia', 'Color', 'Estado', 'Acciones'];
  const pasa = (s) =>
    coincide(busqueda, s.name)
    && (estado === 'Todos' || (estado === 'Activo' ? s.isActive !== false : estado === 'Inactivo' ? s.isActive === false : estado === 'Color' ? s.allowsColor : !s.allowsColor));
  const extras = { precio: (a, b) => (Number(a.pricePerCopy) || 0) - (Number(b.pricePerCopy) || 0) };
  const formatosBase = ordenarLista(servicios.filter((s) => s.esBase && pasa(s)), orden, { extras });
  const formatosPropios = ordenarLista(servicios.filter((s) => !s.esBase && pasa(s)), orden, { extras });
  const hayFiltro = Boolean(busqueda.trim()) || estado !== 'Todos';

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-4xl font-extrabold text-[#066494]">Impresiones</h1>
        <button onClick={abrirNuevo} className="px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm">Agregar formato</button>
      </div>

      {servicios.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar formato..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-full text-sm outline-none focus:border-[#003049] w-56 shadow-sm"
            />
          </div>
          <FilterSelect
            value={estado}
            onChange={setEstado}
            options={[
              { value: 'Activo', label: 'Activos' },
              { value: 'Inactivo', label: 'Inactivos' },
              { value: 'Color', label: 'A color' },
              { value: 'SoloBN', label: 'Solo blanco y negro' },
            ]}
          />
          <OrdenSelect value={orden} onChange={setOrden} extras={[{ value: 'precio', label: 'Ordenar: Menor precio' }]} />
        </div>
      )}

      {loading ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500">Cargando...</p>
        </div>
      ) : (
        <>
          {/*
            Base primero: son los tamaños de uso general (Carta, Oficio, DUI...)
            que ya vienen cargados — lo que casi cualquier tienda va a usar.
            Se pueden editar o borrar igual que cualquier otro, esto es solo
            para que no se pierdan entre los que el dueño va agregando.
          */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Formatos base</h3>
            <p className="text-xs text-gray-400 mb-6">De uso general — ya vienen cargados, revise sus precios antes de usarlos.</p>
            {formatosBase.length === 0 && hayFiltro ? (
              <p className="text-gray-400 text-sm">Ninguno coincide con la búsqueda o el filtro.</p>
            ) : formatosBase.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Ninguno todavía. Corra <code className="bg-gray-100 px-1.5 py-0.5 rounded">node src/scripts/seedFormatosBaseImpresion.js</code> en el backend para cargarlos.
              </p>
            ) : (
              <DataTable columns={columnasFormato} data={formatosBase} renderRow={filaDeFormato} />
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-1">Tus formatos</h3>
            <p className="text-xs text-gray-400 mb-6">Los que agregó usted, aparte de los de uso general.</p>
            {formatosPropios.length === 0 ? (
              <p className="text-gray-400 text-sm">{hayFiltro ? 'Ninguno coincide con la búsqueda o el filtro.' : 'Todavía no agregó ningún formato propio.'}</p>
            ) : (
              <DataTable columns={columnasFormato} data={formatosPropios} renderRow={filaDeFormato} />
            )}
          </div>
        </>
      )}

      {/* El papel y la tinta. Va DEBAJO de los formatos porque se consulta
          menos seguido, pero en la misma pantalla: son la misma conversación
          —qué puedo imprimir hoy— y separarlas obligaría a saltar de pantalla
          para entender por qué un formato está apagado. */}
      <MaterialesImpresion />

      {/* Modal crear/editar */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden relative z-10">
              <div className="bg-[#00283D] text-white p-5"><h2 className="text-2xl font-bold text-center">{editId ? 'Editar formato' : 'Nuevo formato'}</h2></div>
              <form onSubmit={guardar} className="p-6 bg-[#F1F6F9] space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del formato</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#00283D]" placeholder="Ej. Carta, A4, Póster, DUI" />
                </div>
                {/* Medidas de la plantilla: definen la hoja del editor del cliente */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tamaño de la plantilla (px)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="10" step="1" onKeyDown={bloquearTeclasNumero} value={form.widthPx} onChange={(e) => setForm({ ...form, widthPx: e.target.value })}
                      className="w-28 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm text-center focus:outline-none focus:border-[#00283D]" placeholder="Ancho" />
                    <span className="text-gray-500">×</span>
                    <input type="number" min="10" step="1" onKeyDown={bloquearTeclasNumero} value={form.heightPx} onChange={(e) => setForm({ ...form, heightPx: e.target.value })}
                      className="w-28 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm text-center focus:outline-none focus:border-[#00283D]" placeholder="Alto" />
                    <span className="text-xs text-gray-400">px</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Ej. DUI 1004 × 638 · Carta 2551 × 3295 · A4 2480 × 3508</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Precio por copia ($)</label>
                  <input type="number" min="0" step="0.01" onKeyDown={bloquearTeclasNumero} value={form.pricePerCopy} onChange={(e) => setForm({ ...form, pricePerCopy: e.target.value })} className={inputSm} placeholder="0.00" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.allowsColor} onChange={(e) => setForm({ ...form, allowsColor: e.target.checked })} /> Permite color
                </label>
                {form.allowsColor && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Recargo por color ($/copia)</label>
                    <input type="number" min="0" step="0.01" onKeyDown={bloquearTeclasNumero} value={form.colorSurcharge} onChange={(e) => setForm({ ...form, colorSurcharge: e.target.value })} className={inputSm} placeholder="0.00" />
                  </div>
                )}

                {/*
                  En qué papel se imprime. Es opcional a propósito: los formatos
                  que ya estaban cargados no tienen material y tienen que seguir
                  ofreciéndose igual. Solo al elegir uno, el formato empieza a
                  apagarse solo cuando ese papel llega a cero.
                */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Papel que usa</label>
                  <select
                    value={form.materialId}
                    onChange={(e) => setForm({ ...form, materialId: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#00283D]"
                  >
                    <option value="">Sin control de material</option>
                    {papeles.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {papeles.length === 0
                      ? 'Agregue papeles en "Materiales", más abajo, para poder elegir uno.'
                      : 'Si el papel elegido llega a cero, este formato se apaga solo en la tienda.'}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Activo
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-6 py-2 rounded-full">Cancelar</button>
                  <button type="submit" className="bg-[#003049] hover:bg-[#00283D] text-white font-medium px-8 py-2 rounded-full">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GenericConfirmModal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={eliminar} data={toDelete} actionType="delete" entityName="Formato" />
    </div>
  );
};

export default ServiciosImpresion;
