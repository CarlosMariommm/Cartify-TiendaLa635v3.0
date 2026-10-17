import { useState } from 'react';
import { Gift, Copy, Trash2, Plus, Search, ArrowDownUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../components/UI/DataTable';
import FilterSelect from '../components/UI/FilterSelect';
import GenericConfirmModal from '../components/Admin/GenericConfirmModal';
import { useGiftCards } from '../hooks/useGiftCards';
import { bloquearTeclasNumero } from '../utils/validaciones';
import { modalTransition, modalInitial, modalAnimate } from '../utils/motion';

// GiftCards (Admin) — tarjetas de regalo que cargan saldo al cliente. El gerente crea tarjetas por
// un monto, se imprimen o se dictan, y el cliente canjea el código para cargar saldo. La lógica
// vive en useGiftCards.
const formVacio = { amount: '', cantidad: 1, note: '', expiresAt: '' };

const GiftCards = () => {
  const {
    tarjetas, resumen, cargando, creando, crear, anular, copiar,
    visibles, conteos, filtro, setFiltro, busqueda, setBusqueda, orden, setOrden,
  } = useGiftCards();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(formVacio);
  const [recienCreadas, setRecienCreadas] = useState([]);
  const [porAnular, setPorAnular] = useState(null);

  const guardar = async (e) => {
    e.preventDefault();
    const nuevas = await crear(form);
    if (nuevas) {
      // Las mostramos aparte para que se puedan copiar antes de cerrar:
      // en la tabla se pierden entre las demás.
      setRecienCreadas(nuevas);
      setForm(formVacio);
      setModalOpen(false);
    }
  };

  const dinero = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const inputCls = 'w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-[#00283D]';

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8" style={{ color: 'var(--theme-accent-text)' }} />
          <h1 className="text-4xl font-extrabold" style={{ color: 'var(--theme-accent-text)' }}>Tarjetas de regalo</h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="hover-scale press flex items-center gap-2 px-4 py-2 bg-[#003049] hover:bg-[#00283D] text-white rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Crear tarjetas
        </button>
      </div>

      {/* Resumen: lo pendiente es plata que la tienda ya prometió */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Tarjetas creadas', v: resumen.total },
          { l: 'Sin canjear', v: resumen.sinCanjear },
          { l: 'Saldo por entregar', v: dinero(resumen.montoPendiente), destacar: true },
          { l: 'Ya canjeado', v: dinero(resumen.montoCanjeado) },
        ].map((c) => (
          <div key={c.l} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{c.l}</div>
            <div className={`text-2xl font-bold ${c.destacar ? 'text-[#003049]' : 'text-gray-800'}`}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Las recién creadas, grandes y copiables */}
      <AnimatePresence>
        {recienCreadas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#F1F6F9] border border-[#E4D5C3] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700">
                Listas para entregar — copie o anote los códigos antes de cerrar
              </p>
              <button onClick={() => setRecienCreadas([])} className="text-xs text-gray-500 hover:text-gray-700">
                Ocultar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recienCreadas.map((t) => (
                <button
                  key={t._id}
                  onClick={() => copiar(t.code)}
                  title="Copiar código"
                  className="press flex items-center gap-2 bg-white border border-[#E4D5C3] rounded-xl px-4 py-2.5 hover:border-[#003049] transition-colors"
                >
                  <span className="font-mono font-bold tracking-wider text-gray-800">{t.code}</span>
                  <span className="text-sm font-bold text-[#003049]">{dinero(t.amount)}</span>
                  <Copy size={14} className="text-gray-400" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {/* Las canjeadas ya no son trabajo pendiente: solo estorban al buscar una que sirva. Por eso la
           pantalla abre en "Disponibles" y las canjeadas quedan a un click, sin desaparecer. */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex flex-wrap gap-2 flex-1">
            {[
              { id: 'disponibles', label: 'Disponibles' },
              { id: 'canjeadas', label: 'Canjeadas' },
              { id: 'todas', label: 'Todas' },
            ].map((f) => {
              const activo = filtro === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  aria-pressed={activo}
                  className="press px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                  style={{
                    borderColor: activo ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                    background: activo ? 'var(--theme-primary-light)' : 'var(--theme-card-bg)',
                    color: activo ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                  }}
                >
                  {f.label}
                  <span className="ml-2 text-xs opacity-70">{conteos[f.id]}</span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Código, cliente, monto…"
              className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-full text-sm outline-none focus:border-[#003049] w-60"
            />
          </div>

          <FilterSelect
            value={orden}
            onChange={setOrden}
            defaultValue="nuevas"
            defaultLabel="Ordenar: Más nuevas"
            icon={ArrowDownUp}
            options={[
              { value: 'monto-mayor', label: 'Ordenar: Mayor monto' },
              { value: 'monto-menor', label: 'Ordenar: Menor monto' },
            ]}
          />
        </div>

        {cargando ? (
          <p className="text-gray-500">Cargando...</p>
        ) : tarjetas.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-800 font-semibold mb-1">Todavía no hay tarjetas</p>
            <p className="text-gray-500 text-sm">Cree la primera: elija un monto y cuántas quiere generar.</p>
          </div>
        ) : visibles.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-800 font-semibold mb-1">Ninguna tarjeta coincide</p>
            <p className="text-gray-500 text-sm">Pruebe con otro código, otro cliente o cambie de pestaña.</p>
          </div>
        ) : (
          <DataTable
            columns={['Código', 'Monto', 'Estado', 'Canjeada por', 'Nota', 'Acciones']}
            data={visibles}
            renderRow={(t) => (
              <>
                <td className="py-4 px-4">
                  <button
                    onClick={() => copiar(t.code)}
                    className="font-mono font-bold tracking-wider text-sm text-gray-800 hover:text-[#003049] transition-colors flex items-center gap-2"
                    title="Copiar código"
                  >
                    {t.code} <Copy size={13} className="text-gray-300" />
                  </button>
                </td>
                <td className="py-4 px-4 text-sm font-bold text-gray-700">{dinero(t.amount)}</td>
                <td className="py-4 px-4 text-sm">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    t.isRedeemed ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'
                  }`}>
                    {t.isRedeemed ? 'Canjeada' : 'Disponible'}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {t.redeemedBy?.fullName || (t.isRedeemed ? 'Cliente' : '—')}
                </td>
                <td className="py-4 px-4 text-sm text-gray-400">{t.note || '—'}</td>
                <td className="py-4 px-4 text-sm">
                  {/* Una tarjeta canjeada no se borra: ese saldo ya es de alguien */}
                  {t.isRedeemed ? (
                    <span className="text-xs text-gray-300">—</span>
                  ) : (
                    <button
                      onClick={() => setPorAnular(t)}
                      className="text-red-500 hover:text-red-600 transition-colors"
                      title="Anular tarjeta"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </>
            )}
          />
        )}
      </div>

      {/* Crear */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
            <motion.div
              initial={modalInitial} animate={modalAnimate} exit={modalInitial} transition={modalTransition}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden relative z-10"
            >
              <div className="bg-[#00283D] text-white p-5">
                <h2 className="text-2xl font-bold text-center">Crear tarjetas</h2>
              </div>
              <form onSubmit={guardar} className="p-6 bg-[#F1F6F9] space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Monto de cada tarjeta</label>
                  <input type="number" min="0.01" step="0.01" onKeyDown={bloquearTeclasNumero}
                    value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className={inputCls} placeholder="5.00" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">¿Cuántas generar?</label>
                  <input type="number" min="1" max="100" step="1" onKeyDown={bloquearTeclasNumero}
                    value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                    className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1">Cada una lleva su propio código. Máximo 100 por vez.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Vencimiento (opcional)</label>
                  <input type="date" value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1">Si lo deja vacío, la tarjeta no vence.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nota (opcional)</label>
                  <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className={inputCls} placeholder="Ej. Rifa de aniversario" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-6 py-2 rounded-full transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={creando}
                    className="bg-[#003049] hover:bg-[#00283D] text-white font-medium px-8 py-2 rounded-full transition-colors disabled:opacity-60">
                    {creando ? 'Creando…' : 'Crear'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GenericConfirmModal
        isOpen={!!porAnular}
        onClose={() => setPorAnular(null)}
        onConfirm={async () => { await anular(porAnular._id); setPorAnular(null); }}
        actionType="delete"
        entityName="tarjeta"
        data={porAnular}
      />
    </div>
  );
};

export default GiftCards;
