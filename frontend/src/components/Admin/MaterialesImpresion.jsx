import { useState } from 'react';
import FilterSelect from '../UI/FilterSelect';
import OrdenSelect from '../UI/OrdenSelect';
import { ordenarLista, ORDEN_INICIAL } from '../../utils/listasPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { useMaterialesImpresion, hayMaterial, vaQuedandoPoco } from '../../hooks/useMaterialesImpresion';
import { DUR, EASE_OUT } from '../../utils/motion';

// MATERIALES DE IMPRESIÓN — MaterialesImpresion.jsx
// El apartado del panel donde se lleva la cuenta del papel y la tinta.

const VACIO = { name: '', tipo: 'papel', esColor: false, existencia: 0, minimo: 0, unidad: '', isActive: true };

const MaterialesImpresion = () => {
  const { materiales, cargando, guardando, guardar, ajustar, eliminar } = useMaterialesImpresion();
  const [form, setForm] = useState(VACIO);
  const [editId, setEditId] = useState(null);
  const [abierto, setAbierto] = useState(false);
  // Filtrar y ordenar (lo más reciente primero). Ver utils/listasPanel.js.
  const [filtro, setFiltro] = useState('Todos');
  const [orden, setOrden] = useState(ORDEN_INICIAL);
  const visibles = ordenarLista(
    materiales.filter((m) => filtro === 'Todos'
      || (filtro === 'agotados' ? !hayMaterial(m) : filtro === 'poco' ? vaQuedandoPoco(m) : (m.tipo || 'papel') === filtro)),
    orden,
  );

  const abrirNuevo = () => { setForm(VACIO); setEditId(null); setAbierto(true); };
  const abrirEdicion = (m) => {
    setForm({
      name: m.name, tipo: m.tipo || 'papel', esColor: !!m.esColor,
      existencia: m.existencia ?? 0, minimo: m.minimo ?? 0,
      unidad: m.unidad || '', isActive: m.isActive !== false,
    });
    setEditId(m._id);
    setAbierto(true);
  };

  const enviar = async (e) => {
    e.preventDefault();
    const ok = await guardar(form, editId);
    if (ok) { setAbierto(false); setEditId(null); setForm(VACIO); }
  };

  const campo = 'w-full bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#00283D]';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h3 className="text-xl font-bold text-gray-800">Materiales</h3>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Agregar material
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        El papel y la tinta con los que se imprime. Cuando un material llega a cero,
        los formatos que lo usan se apagan solos en la tienda y el cliente ve por qué,
        en vez de pagar y enterarse en el mostrador.
      </p>

      {materiales.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <FilterSelect
            value={filtro}
            onChange={setFiltro}
            options={[
              { value: 'papel', label: 'Papel' },
              { value: 'tinta', label: 'Tinta' },
              { value: 'poco', label: 'Se están acabando' },
              { value: 'agotados', label: 'Agotados' },
            ]}
          />
          <OrdenSelect value={orden} onChange={setOrden} />
        </div>
      )}

      {cargando ? (
        <p className="text-gray-500">Cargando materiales...</p>
      ) : materiales.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-800 font-semibold mb-1">Todavía no hay materiales cargados</p>
          <p className="text-sm text-gray-500">
            Mientras no haya ninguno, todos los formatos se ofrecen normalmente.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.length === 0 && <p className="text-sm text-gray-500">Ninguno coincide con el filtro.</p>}
          {visibles.map((m, i) => {
            const agotado = !hayMaterial(m);
            const poco = vaQuedandoPoco(m);
            return (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.modal, ease: EASE_OUT, delay: i * 0.04 }}
                className={`rounded-2xl border p-4 flex flex-col gap-3 transition-colors ${
                  agotado ? 'border-red-200 bg-red-50/40' : poco ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 leading-tight truncate">{m.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold mt-0.5">
                      {m.tipo === 'tinta' ? (m.esColor ? 'Tinta de color' : 'Tinta negra') : 'Papel'}
                      {m.isActive === false && ' · Inactivo'}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => abrirEdicion(m)} title="Editar"
                      className="p-2 rounded-lg text-gray-500 hover:text-[#00283D] hover:bg-gray-50 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminar(m._id)} title="Eliminar"
                      className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* El número se corrige aquí mismo. Se guarda al salir del campo (onBlur) y no en cada tecla:
                   escribir "120" dispararía tres guardados, y el de "1" dejaría el material casi en cero por un
                   instante — suficiente para apagar un formato sin razón. */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    defaultValue={m.existencia ?? 0}
                    onBlur={(e) => {
                      if (Number(e.target.value) !== Number(m.existencia)) ajustar(m._id, e.target.value);
                    }}
                    className="w-24 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:border-[#00283D]"
                    aria-label={`Existencia de ${m.name}`}
                  />
                  <span className="text-sm text-gray-500">{m.unidad || 'unidades'}</span>
                </div>

                {agotado && (
                  <p className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                    <AlertTriangle className="w-3.5 h-3.5" /> Agotado — los formatos que lo usan están apagados
                  </p>
                )}
                {poco && (
                  <p className="text-xs font-bold text-amber-700">
                    Va quedando poco (avisa desde {m.minimo})
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {abierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40" onClick={() => setAbierto(false)}
            />
            {/* Entra desde 0.96, nunca desde 0: nada aparece de la nada. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: DUR.modal, ease: EASE_OUT }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden relative z-10"
            >
              <div className="bg-[#00283D] text-white p-5">
                <h2 className="text-2xl font-bold text-center">{editId ? 'Editar material' : 'Nuevo material'}</h2>
              </div>
              <form onSubmit={enviar} className="p-6 bg-[#F1F6F9] space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={campo}
                    placeholder="Ej. Papel bond carta, Papel fotográfico, Tóner de color"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value, esColor: false })}
                    className={campo}
                  >
                    <option value="papel">Papel</option>
                    <option value="tinta">Tinta</option>
                  </select>
                </div>

                {/* Solo en la tinta: es lo que decide si se puede ofrecer color. */}
                {form.tipo === 'tinta' && (
                  <label className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.esColor}
                      onChange={(e) => setForm({ ...form, esColor: e.target.checked })}
                      className="w-4 h-4 accent-[#00283D]"
                    />
                    Es tinta de color (si se acaba, no se puede imprimir a color)
                  </label>
                )}

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cuánto queda</label>
                    <input type="number" min="0" value={form.existencia}
                      onChange={(e) => setForm({ ...form, existencia: e.target.value })} className={campo} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Avisar desde</label>
                    <input type="number" min="0" value={form.minimo}
                      onChange={(e) => setForm({ ...form, minimo: e.target.value })} className={campo} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 -mt-2">
                  "Avisar desde" solo pinta una advertencia. Lo único que apaga un formato es llegar a cero.
                </p>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Unidad</label>
                  <input value={form.unidad}
                    onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                    className={campo} placeholder={form.tipo === 'tinta' ? 'cartuchos' : 'hojas'} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setAbierto(false)}
                    className="flex-1 py-2.5 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardando}
                    className="flex-1 py-2.5 rounded-full bg-[#003049] hover:bg-[#00283D] text-white text-sm font-medium transition-colors disabled:opacity-60">
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MaterialesImpresion;
