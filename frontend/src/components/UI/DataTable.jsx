import { Children, isValidElement } from 'react';
import { motion } from 'framer-motion';
import { DUR, EASE_OUT, stagger } from '../../utils/motion';

// DataTable — la vista de catálogo del panel Y abajo, una paginación de mentira que siempre decía
// "Página 1 de 10" con botones que no hacían nada. Ahora son tarjetas en grilla: el nombre manda,
// los demás datos van debajo con su etiqueta, y las acciones a la derecha del título.

// Las celdas traen clases de tabla (py-4 px-4) que aquí sobran y romperían el espaciado de la
// tarjeta. Se les quita el relleno y se respeta el resto —el text-red-500 del estado "Inactivo",
// por ejemplo, tiene que sobrevivir.
const SIN_ESPACIADO = /^(p|px|py|pt|pb|pl|pr|w|min-w|max-w|whitespace)-/;

const limpiarClases = (clases = '') =>
  clases.split(' ').filter((c) => c && !SIN_ESPACIADO.test(c)).join(' ');

// renderRow devuelve un fragmento con <td>: sacamos las celdas de adentro.
const celdasDe = (fila) => {
  if (!isValidElement(fila)) return [];
  return Children.toArray(fila.props.children).filter(isValidElement);
};

const DataTable = ({ columns, data, renderRow }) => {
  if (!data?.length) return null;

  // Por convención la última columna son las acciones y la primera, el nombre.
  const iAcciones = columns.length - 1;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((item, index) => {
        const celdas = celdasDe(renderRow(item));
        const titulo = celdas[0];
        const acciones = celdas[iAcciones];
        const datos = celdas.slice(1, iAcciones);

        return (
          <motion.div
            key={item._id || item.id || index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.modal, ease: EASE_OUT, delay: stagger(index) }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 transition-colors hover:border-gray-300"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Un nombre largo sin espacios ("MERMELADA-FRESA-500G") no tiene dónde cortarse y en un teléfono
                 estiraba la tarjeta entera. */}
              <div className={`min-w-0 break-words text-base font-bold text-gray-800 leading-tight ${limpiarClases(titulo?.props?.className)}`}>
                {titulo?.props?.children}
              </div>
              {acciones && <div className="flex-shrink-0">{acciones.props.children}</div>}
            </div>

            {/* Los datos del medio, en pares etiqueta/valor. Con la etiqueta encima ya no hace falta el
               encabezado de la tabla para saber que ese "Activo" es el estado y no otra cosa. */}
            {datos.length > 0 && (
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {datos.map((celda, i) => (
                  <div key={i} className="min-w-0 max-w-full">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      {columns[i + 1]}
                    </div>
                    <div className={`text-sm text-gray-700 truncate ${limpiarClases(celda.props.className)}`}>
                      {celda.props.children}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default DataTable;
