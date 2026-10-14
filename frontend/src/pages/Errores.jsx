import { useCallback, useEffect, useState } from 'react';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import { coincide, ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';
import { ChevronDown, CheckCircle2, RotateCcw, Globe, Smartphone, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorService } from '../api/errorService';

/*
 * ============================================================
 * ERRORES — Sistema → Errores (solo administrador)
 * ============================================================
 * Lo que falló en la web, la app o el servidor, agrupado por tipo: cada
 * renglón es UN error con cuántas veces pasó, no cada vez que pasó. Cuando
 * aparece uno nuevo, al administrador le llega un correo; aquí se ve el
 * detalle y se marca como resuelto al arreglarlo. Si vuelve a pasar, se
 * reabre solo y vuelve a avisar.
 *
 * Ver backend/src/utils/registroErrores.js.
 * ============================================================
 */

const ORIGENES = {
  web: { texto: 'Web', Icono: Globe },
  app: { texto: 'App', Icono: Smartphone },
  servidor: { texto: 'Servidor', Icono: Server },
};

// "hace 5 min", "hace 3 h", "hace 2 días": lo que importa es qué tan fresco es.
const hace = (fecha) => {
  const s = Math.max(0, (Date.now() - new Date(fecha).getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
};

const fechaCompleta = (fecha) =>
  new Date(fecha).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });

const Errores = () => {
  const [estado, setEstado] = useState('abiertos');
  const [errores, setErrores] = useState([]);
  const [abiertos, setAbiertos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(null);
  // Buscar, filtrar por origen y ordenar: de entrada, lo que pasó más recién.
  const [busqueda, setBusqueda] = useState('');
  const [origen, setOrigen] = useState('Todos');
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  const visibles = ordenarLista(
    errores.filter((e) => (origen === 'Todos' || (e.origen || 'web') === origen) && coincide(busqueda, e.mensaje, e.donde)),
    orden,
    {
      extras: {
        // Un error vuelve a ser reciente cada vez que vuelve a pasar.
        recientes: (a, b) => new Date(b.ultimaVez) - new Date(a.ultimaVez),
        antiguos: (a, b) => new Date(a.ultimaVez) - new Date(b.ultimaVez),
        veces: (a, b) => (b.veces || 0) - (a.veces || 0),
      },
    },
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await errorService.listar(estado);
      setErrores(datos.errores || []);
      setAbiertos(datos.abiertos || 0);
    } catch {
      toast.error('No se pudieron cargar los errores');
    } finally {
      setCargando(false);
    }
  }, [estado]);

  useEffect(() => { cargar(); }, [cargar]);

  const marcar = async (error, resuelto) => {
    try {
      await errorService.marcar(error._id, resuelto);
      // Sale de esta lista: pasó a la otra pestaña.
      setErrores((lista) => lista.filter((e) => e._id !== error._id));
      setAbiertos((n) => n + (resuelto ? -1 : 1));
      toast.success(resuelto ? 'Marcado como resuelto' : 'Reabierto');
    } catch {
      toast.error('No se pudo cambiar');
    }
  };

  const pestaña = (clave, texto) => (
    <button
      type="button"
      onClick={() => { setEstado(clave); setAbierto(null); }}
      aria-pressed={estado === clave}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        estado === clave ? 'bg-[#003049] text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <div>
        <h1 className="text-4xl font-extrabold text-[#066494]">Errores</h1>
        <p className="text-gray-500 mt-2 max-w-2xl">
          Lo que falló en la tienda, la app o el servidor. Cuando aparece uno nuevo te llega un correo;
          márcalo como resuelto al arreglarlo. Si vuelve a pasar, se reabre solo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {pestaña('abiertos', `Por revisar${abiertos ? ` (${abiertos})` : ''}`)}
        {pestaña('resueltos', 'Resueltos')}
        <div className="flex flex-wrap gap-3 items-center sm:ml-auto">
          <input
            type="text"
            placeholder="Buscar en los errores..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar en los errores"
            className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm outline-none focus:border-[#003049] w-56 shadow-sm"
          />
          <FilterSelect
            value={origen}
            onChange={setOrigen}
            defaultLabel="Todos los orígenes"
            options={Object.entries(ORIGENES).map(([value, { texto }]) => ({ value, label: texto }))}
          />
          <OrdenSelect value={orden} onChange={setOrden} conNombre={false} extras={[{ value: 'veces', label: 'Ordenar: Más repetidos' }]} />
        </div>
      </div>

      {cargando ? (
        <p className="text-gray-500">Cargando…</p>
      ) : visibles.length === 0 && errores.length > 0 ? (
        <p className="text-gray-500">Ninguno coincide con la búsqueda o el filtro.</p>
      ) : errores.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-green-500" />
          <p className="mt-3 font-semibold text-gray-800">
            {estado === 'abiertos' ? 'Nada por revisar' : 'Todavía no hay errores resueltos'}
          </p>
          {estado === 'abiertos' && (
            <p className="text-sm text-gray-500 mt-1">Si algo falla en la tienda, aparece aquí y te avisamos por correo.</p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 border-y border-gray-200">
          {visibles.map((e) => {
            const { texto, Icono } = ORIGENES[e.origen] || ORIGENES.web;
            const expandido = abierto === e._id;
            return (
              <li key={e._id} className="py-4">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 w-24 flex-shrink-0">
                    <Icono className="w-4 h-4" /> {texto}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 break-words">{e.mensaje}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {e.donde && <><span className="font-mono">{e.donde}</span> · </>}
                      <span title={fechaCompleta(e.ultimaVez)}>{hace(e.ultimaVez)}</span>
                      {' · '}{e.veces === 1 ? '1 vez' : `${e.veces} veces`}
                    </p>

                    {expandido && (
                      <div className="mt-3 text-sm text-gray-600 space-y-1">
                        <p>Primera vez: {fechaCompleta(e.primeraVez)}</p>
                        {e.version && <p>Versión: {e.version}</p>}
                        {e.dispositivo && <p>Dispositivo: {e.dispositivo}</p>}
                        {e.pila && (
                          <pre className="mt-2 p-3 rounded-lg bg-gray-50 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words max-h-72">
                            {e.pila}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setAbierto(expandido ? null : e._id)}
                      aria-expanded={expandido}
                      className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                      title={expandido ? 'Ocultar detalle' : 'Ver detalle'}
                      aria-label={expandido ? 'Ocultar detalle' : 'Ver detalle'}
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                    </button>
                    {e.resuelto ? (
                      <button
                        type="button"
                        onClick={() => marcar(e, false)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        <RotateCcw className="w-4 h-4" /> Reabrir
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => marcar(e, true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D]"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Resuelto
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Errores;
