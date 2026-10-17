import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, ImageOff, Sparkles, Upload, X } from 'lucide-react';
import { modalTransition } from '../../utils/motion';
import { productService } from '../../api/productService';
import { descargarArchivo } from '../../utils/descargar';
import {
  CAMPOS, MAXIMO_DE_FILAS, PLANTILLA_CSV, aProductos, buscarEncabezado, faltaLoEsencial, leerArchivo, mapearColumnas,
} from '../../utils/importarExcel';

// IMPORTAR EL INVENTARIO DESDE EXCEL — ImportarExcel.jsx
// Panel › Inventario, solo el dueño. Cinco pasos en la misma ventana: 1. Archivo elegir el .xlsx o
// .csv (o bajar la plantilla); 2.

const TANDA = 20;

// La foto de Open Food Facts en chico para la vista previa (la grande pesa).
const miniatura = (url) => String(url || '').replace(/\.full\.jpg$/, '.200.jpg');

const dinero = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);

const puedeEntrar = (f) => Boolean(f.nombre) && f.precio > 0 && !f.duplicado;

// Si una tanda no se pudo revisar, sus filas siguen con lo que trae el Excel.
const sinRevisar = (f) => ({
  ...f,
  pasillo: f.pasillo || 'General',
  categoria: f.categoria || 'General',
  unidadVenta: /^(lb|libras?)$/i.test(f.unidad) ? 'libra' : 'unidad',
  soloAdultos: false,
  descripcion: f.descripcion || f.nombre,
  foto: null,
  duplicado: null,
  avisos: f.precio > 0 ? [] : ['Sin precio de venta'],
  ia: false,
});

const Chapa = ({ children, tono = 'gris' }) => {
  const tonos = {
    gris: 'bg-gray-100 text-gray-600',
    rojo: 'bg-red-50 text-red-700',
    ambar: 'bg-amber-50 text-amber-800',
    azul: 'bg-[#E8F1F6] text-[#00283D]',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${tonos[tono]}`}>{children}</span>;
};

const ImportarExcel = ({ isOpen, onClose, onImportado }) => {
  const [paso, setPaso] = useState('archivo');
  const [error, setError] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [hoja, setHoja] = useState(null); // { encabezados, filas, inicio, nombreArchivo }
  const [mapa, setMapa] = useState({});
  const [mapaDeIA, setMapaDeIA] = useState(false);
  const [progreso, setProgreso] = useState({ hecho: 0, total: 0 });
  const [revisadas, setRevisadas] = useState([]);
  const [conIA, setConIA] = useState(true);
  const [resultados, setResultados] = useState([]);
  const cancelado = useRef(false);
  const entrada = useRef(null);

  const productos = useMemo(() => (hoja ? aProductos(hoja.filas, hoja.inicio, mapa) : []), [hoja, mapa]);
  const elegidas = revisadas.filter((f) => f.elegida);

  const reiniciar = () => {
    cancelado.current = false;
    setPaso('archivo');
    setError('');
    setHoja(null);
    setMapa({});
    setMapaDeIA(false);
    setRevisadas([]);
    setResultados([]);
    setConIA(true);
  };

  const cerrar = () => {
    // Si estaba revisando o importando, se deja de mandar tandas.
    cancelado.current = true;
    onClose();
    setTimeout(reiniciar, 300);
  };

  const bajarPlantilla = () => {
    // Con BOM, para que Excel lea bien las tildes.
    descargarArchivo(new Blob([`\uFEFF${PLANTILLA_CSV}`], { type: 'text/csv' }), 'plantilla-inventario.csv').catch(() => {});
  };

  /* 1. El archivo */
  const elegirArchivo = async (archivo) => {
    if (!archivo) return;
    setError('');
    setLeyendo(true);
    try {
      const todas = await leerArchivo(archivo);
      const i = buscarEncabezado(todas);
      const encabezados = (todas[i] || []).map((v) => String(v ?? '').trim());
      const filas = todas.slice(i + 1);
      if (!filas.length) throw new Error('El archivo no tiene filas debajo de los títulos.');
      let nuevoMapa = mapearColumnas(encabezados);
      let deIA = false;
      // No se reconoció el nombre o el precio: que la IA mire los títulos y unas filas.
      if (faltaLoEsencial(nuevoMapa)) {
        try {
          const ejemplos = filas.slice(0, 5).map((f) => f.map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)));
          const respuesta = await productService.importarColumnas(encabezados, ejemplos);
          nuevoMapa = respuesta.mapa || nuevoMapa;
          deIA = true;
        } catch {
          // Sin IA, las columnas se eligen a mano en el paso siguiente.
        }
      }
      setHoja({ encabezados, filas, inicio: i + 1, nombreArchivo: archivo.name });
      setMapa(nuevoMapa);
      setMapaDeIA(deIA);
      setPaso('columnas');
    } catch (e) {
      setError(e?.message || 'No se pudo leer el archivo.');
    } finally {
      setLeyendo(false);
    }
  };

  const cambiarColumna = (campo, valor) => {
    setMapa((m) => {
      const nuevo = { ...m };
      // Una columna no sirve para dos datos.
      Object.keys(nuevo).forEach((k) => { if (nuevo[k] === Number(valor)) delete nuevo[k]; });
      if (valor === '') delete nuevo[campo];
      else nuevo[campo] = Number(valor);
      return nuevo;
    });
  };

  /* 3. La IA completa y se buscan las fotos, de 20 en 20 */
  const analizar = async () => {
    cancelado.current = false;
    const lista = productos.slice(0, MAXIMO_DE_FILAS);
    setPaso('analizando');
    setProgreso({ hecho: 0, total: lista.length });
    const salida = [];
    let todasConIA = true;
    for (let i = 0; i < lista.length; i += TANDA) {
      if (cancelado.current) return;
      const tanda = lista.slice(i, i + TANDA);
      try {
        const respuesta = await productService.analizarImportacion(tanda);
        if (!respuesta.ia) todasConIA = false;
        salida.push(...respuesta.filas);
      } catch {
        todasConIA = false;
        salida.push(...tanda.map(sinRevisar));
      }
      setProgreso({ hecho: Math.min(i + TANDA, lista.length), total: lista.length });
    }
    if (cancelado.current) return;
    setConIA(todasConIA);
    setRevisadas(salida.map((f) => ({ ...f, elegida: puedeEntrar(f), conFoto: Boolean(f.foto) })));
    setPaso('revisar');
  };

  const alternar = (fila, campo) => setRevisadas((lista) => lista.map((f) => (f.fila === fila ? { ...f, [campo]: !f[campo] } : f)));
  const elegirTodas = (si) => setRevisadas((lista) => lista.map((f) => ({ ...f, elegida: si && puedeEntrar(f) })));

  /* 5. Guardar lo aprobado, de 20 en 20 */
  const importar = async () => {
    cancelado.current = false;
    const lista = elegidas;
    setPaso('importando');
    setProgreso({ hecho: 0, total: lista.length });
    const salida = [];
    for (let i = 0; i < lista.length; i += TANDA) {
      if (cancelado.current) break;
      const tanda = lista.slice(i, i + TANDA).map((f) => ({
        fila: f.fila, nombre: f.nombre, precio: f.precio, costo: f.costo, existencia: f.existencia, codigo: f.codigo,
        pasillo: f.pasillo, categoria: f.categoria, marca: f.marca, proveedor: f.proveedor, unidadVenta: f.unidadVenta,
        soloAdultos: f.soloAdultos, descripcion: f.descripcion, vence: f.vence, foto: f.conFoto ? f.foto : null,
      }));
      try {
        const respuesta = await productService.importarProductos(tanda);
        salida.push(...respuesta.resultados);
      } catch {
        salida.push(...tanda.map((f) => ({ fila: f.fila, nombre: f.nombre, estado: 'error', motivo: 'No se pudo guardar' })));
      }
      setProgreso({ hecho: Math.min(i + TANDA, lista.length), total: lista.length });
    }
    const huboNuevos = salida.some((r) => r.estado === 'creado');
    // Lo que alcanzó a entrar antes de "Detener" también se ve en el inventario.
    if (huboNuevos) onImportado?.();
    if (cancelado.current) return;
    setResultados(salida);
    setPaso('listo');
  };

  const creados = resultados.filter((r) => r.estado === 'creado');
  const noEntraron = resultados.filter((r) => r.estado !== 'creado');

  const resumen = useMemo(() => ({
    listas: revisadas.filter(puedeEntrar).length,
    conFoto: revisadas.filter((f) => f.foto).length,
    existen: revisadas.filter((f) => f.duplicado).length,
    conProblemas: revisadas.filter((f) => !f.duplicado && !puedeEntrar(f)).length,
  }), [revisadas]);

  const pasos = [['archivo', 'Archivo'], ['columnas', 'Columnas'], ['revisar', 'Revisar'], ['listo', 'Listo']];
  const pasoVisible = { analizando: 'columnas', importando: 'revisar' }[paso] || paso;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={paso === 'analizando' || paso === 'importando' ? undefined : cerrar}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="importar-excel-titulo"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={modalTransition}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative z-10"
          >
            <div className="bg-[#00283D] text-white px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="importar-excel-titulo" className="text-xl font-bold flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" /> Importar desde Excel
                </h2>
                <ol className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs" aria-label="Pasos">
                  {pasos.map(([clave, texto], i) => (
                    <li key={clave} className={clave === pasoVisible ? 'font-bold text-white' : 'text-white/60'} aria-current={clave === pasoVisible ? 'step' : undefined}>
                      {i + 1}. {texto}
                    </li>
                  ))}
                </ol>
              </div>
              <button onClick={cerrar} aria-label="Cerrar" className="p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-[#F1F6F9] flex-1 overflow-y-auto">
              {/* ── 1. Archivo ── */}
              {paso === 'archivo' && (
                <div className="flex flex-col gap-5">
                  <p className="text-gray-700">
                    Suba el Excel donde lleva sus productos. La IA reconoce las columnas, completa la marca, el pasillo y la
                    categoría de cada uno, y busca su foto. Antes de guardar, usted revisa todo.
                  </p>
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); elegirArchivo(e.dataTransfer.files?.[0]); }}
                    className="flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:border-[#003049] transition-colors text-center px-4"
                  >
                    <Upload className="w-8 h-8 text-[#066494]" aria-hidden="true" />
                    <span className="font-semibold text-gray-800">{leyendo ? 'Leyendo el archivo…' : 'Elija su archivo o arrástrelo aquí'}</span>
                    <span className="text-sm text-gray-500">Excel (.xlsx) o .csv, hasta {MAXIMO_DE_FILAS} productos</span>
                    <input
                      ref={entrada}
                      type="file"
                      accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      className="sr-only"
                      disabled={leyendo}
                      onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = ''; }}
                    />
                  </label>
                  {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
                  <div className="text-sm text-gray-600 flex flex-col gap-1">
                    <p>Basta con que tenga el nombre y el precio de venta. Si además trae costo, existencia, código de barras, categoría, marca o proveedor, se usan.</p>
                    <p>
                      Con código de barras la foto sale exacta.{' '}
                      <button type="button" onClick={bajarPlantilla} className="inline-flex items-center gap-1 font-semibold text-[#066494] hover:underline">
                        <Download className="w-3.5 h-3.5" /> Bajar una plantilla
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {/* ── 2. Columnas ── */}
              {(paso === 'columnas' || paso === 'analizando') && hoja && (
                <div className="flex flex-col gap-5">
                  <p className="text-gray-700">
                    En <span className="font-semibold">{hoja.nombreArchivo}</span> hay{' '}
                    <span className="font-semibold">{productos.length} {productos.length === 1 ? 'producto' : 'productos'}</span>.
                    {productos.length > MAXIMO_DE_FILAS && ` Se importan los primeros ${MAXIMO_DE_FILAS}; el resto, en otra importación.`}
                    {' '}Revise qué columna es cuál.
                  </p>
                  {mapaDeIA && (
                    <p className="text-sm text-[#066494] flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Los títulos no eran los de siempre: la IA eligió las columnas.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {CAMPOS.map(({ campo, texto, obligatorio }) => (
                      <label key={campo} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-700">{texto}{obligatorio && <span className="text-red-600"> *</span>}</span>
                        <select
                          value={mapa[campo] ?? ''}
                          onChange={(e) => cambiarColumna(campo, e.target.value)}
                          disabled={paso === 'analizando'}
                          className="w-48 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:border-[#00283D]"
                        >
                          <option value="">No viene</option>
                          {hoja.encabezados.map((titulo, i) => (
                            <option key={i} value={i}>{titulo || `Columna ${i + 1}`}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {productos.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <p className="font-semibold text-gray-700 mb-1">Así se leen los primeros:</p>
                      <ul className="flex flex-col gap-0.5">
                        {productos.slice(0, 3).map((p) => (
                          <li key={p.fila}>Fila {p.fila}: {p.nombre} · {dinero(p.precio)}{p.existencia != null ? ` · ${p.existencia} en existencia` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {paso === 'analizando' && (
                    <div role="status" className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#066494]" /> La IA está completando y buscando fotos… {progreso.hecho} de {progreso.total}
                      </p>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full bg-[#003049] transition-all" style={{ width: `${progreso.total ? (progreso.hecho / progreso.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 4. Revisar ── */}
              {(paso === 'revisar' || paso === 'importando') && (
                <div className="flex flex-col gap-4">
                  <p className="text-gray-700">
                    <span className="font-semibold">{resumen.listas}</span> listos para importar, {resumen.conFoto} con foto.
                    {resumen.existen > 0 && ` ${resumen.existen} ya están en el inventario y se omiten.`}
                    {resumen.conProblemas > 0 && ` ${resumen.conProblemas} no tienen nombre o precio.`}
                  </p>
                  {!conIA && (
                    <p className="text-sm text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> La IA no respondió en algunas filas: quedaron con lo que trae el Excel y “General” como pasillo. Puede corregirlas después en el inventario.
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Las fotos salen de Open Food Facts, una base abierta de productos; la tienda menciona de dónde son. Las marcadas “revise la foto” se encontraron por el nombre.
                  </p>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => elegirTodas(true)} className="font-semibold text-[#066494] hover:underline" disabled={paso === 'importando'}>Elegir todos</button>
                    <button type="button" onClick={() => elegirTodas(false)} className="font-semibold text-[#066494] hover:underline" disabled={paso === 'importando'}>Ninguno</button>
                  </div>

                  <ul className="divide-y divide-gray-200 border-y border-gray-200">
                    {revisadas.map((f) => (
                      <li key={f.fila} className={`py-3 flex items-start gap-3 ${puedeEntrar(f) ? '' : 'opacity-60'}`}>
                        <input
                          type="checkbox"
                          checked={f.elegida}
                          disabled={!puedeEntrar(f) || paso === 'importando'}
                          onChange={() => alternar(f.fila, 'elegida')}
                          aria-label={`Importar ${f.nombre || `la fila ${f.fila}`}`}
                          className="mt-4 w-4 h-4 accent-[#003049]"
                        />
                        <div className="w-14 flex-none flex flex-col items-center gap-1">
                          <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                            {f.foto && f.conFoto
                              ? <img src={miniatura(f.foto.url)} alt="" className="w-full h-full object-contain" loading="lazy" />
                              : <ImageOff className="w-5 h-5 text-gray-300" aria-hidden="true" />}
                          </div>
                          {f.foto && (
                            <button type="button" onClick={() => alternar(f.fila, 'conFoto')} disabled={paso === 'importando'} className="text-[11px] text-[#066494] hover:underline">
                              {f.conFoto ? 'Quitar' : 'Poner'}
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 break-words">{f.nombre || <span className="text-gray-400">Sin nombre</span>}</p>
                          <p className="text-xs text-gray-500 break-words">
                            Fila {f.fila} · {[f.marca, `${f.pasillo} › ${f.categoria}`].filter(Boolean).join(' · ')}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {f.duplicado && <Chapa>Ya existe: {f.duplicado.nombre}</Chapa>}
                            {f.avisos?.map((a) => <Chapa key={a} tono="rojo">{a}</Chapa>)}
                            {f.foto?.por === 'nombre' && f.conFoto && <Chapa tono="ambar">Revise la foto</Chapa>}
                            {f.soloAdultos && <Chapa tono="azul">+18</Chapa>}
                            {f.unidadVenta === 'libra' && <Chapa tono="azul">Por libra</Chapa>}
                          </div>
                        </div>
                        <div className="text-right text-sm flex-none">
                          <p className="font-semibold text-gray-900">{dinero(f.precio)}</p>
                          <p className="text-xs text-gray-500">{f.existencia ?? 0} en existencia</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {paso === 'importando' && (
                    <div role="status" className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-800">Importando… {progreso.hecho} de {progreso.total}</p>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full bg-[#003049] transition-all" style={{ width: `${progreso.total ? (progreso.hecho / progreso.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 5. Listo ── */}
              {paso === 'listo' && (
                <div className="flex flex-col gap-4">
                  <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    {creados.length === 1 ? 'Se agregó 1 producto' : `Se agregaron ${creados.length} productos`}
                    {creados.length > 0 && `, ${creados.filter((r) => r.conFoto).length} con foto`}.
                  </p>
                  {creados.length > 0 && (
                    <p className="text-sm text-gray-600">Los que quedaron sin foto se la puede poner desde el inventario, con “Editar”.</p>
                  )}
                  {noEntraron.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-800 mb-1">No entraron:</p>
                      <ul className="text-sm text-gray-600 flex flex-col gap-0.5">
                        {noEntraron.map((r) => <li key={r.fila}>Fila {r.fila} · {r.nombre}: {r.motivo}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-wrap justify-end gap-3">
              {paso === 'columnas' && (
                <>
                  <button onClick={reiniciar} className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100">Otro archivo</button>
                  <button
                    onClick={analizar}
                    disabled={faltaLoEsencial(mapa) || !productos.length}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D] disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" /> Completar con IA y buscar fotos
                  </button>
                </>
              )}
              {paso === 'revisar' && (
                <>
                  <button onClick={reiniciar} className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100">Empezar de nuevo</button>
                  <button
                    onClick={importar}
                    disabled={!elegidas.length}
                    className="px-5 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D] disabled:opacity-50"
                  >
                    Importar {elegidas.length} {elegidas.length === 1 ? 'producto' : 'productos'}
                  </button>
                </>
              )}
              {paso === 'listo' && (
                <button onClick={cerrar} className="px-5 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D]">Ver el inventario</button>
              )}
              {(paso === 'archivo' || paso === 'analizando' || paso === 'importando') && (
                <button onClick={cerrar} className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100">
                  {paso === 'archivo' ? 'Cancelar' : 'Detener'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ImportarExcel;
