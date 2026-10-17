import { useTheme } from '../../context/ThemeContext';
import { TAMANOS_TEXTO } from '../../utils/lecturaPanel';

// OpcionesLectura — texto más grande, más espacio entre líneas, menos animaciones y resaltar
// enlaces y foco. Lo que hace cada una está en ThemeContext (LECTURA) e index.css.

// La "A" de cada tamaño se dibuja más grande: se entiende sin leer la etiqueta.
const TAMANO_DE_LA_A = { normal: 13, grande: 16, 'muy-grande': 19 };

const OPCIONES = [
  { id: 'espaciado', nombre: 'Más espacio entre líneas', ayuda: 'Ayuda a no perder el renglón al leer.' },
  { id: 'movimiento', nombre: 'Menos animaciones', ayuda: 'Las pantallas cambian sin moverse ni deslizarse.' },
  { id: 'foco', nombre: 'Resaltar enlaces y foco', ayuda: 'Subraya los enlaces y marca dónde está el teclado.' },
];

const OpcionesLectura = ({ compacto = false }) => {
  const { lectura, cambiarLectura } = useTheme();

  return (
    <div className={compacto ? 'space-y-3' : 'space-y-5'}>
      <div>
        <p className={`${compacto ? 'text-xs' : 'text-sm'} font-bold mb-2`} style={{ color: 'var(--theme-text-primary)' }}>
          Tamaño del texto
        </p>
        <div className="flex gap-2" role="radiogroup" aria-label="Tamaño del texto">
          {TAMANOS_TEXTO.map((t) => {
            const activo = lectura.texto === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => cambiarLectura({ texto: t.id })}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border-2 transition-colors"
                style={{
                  borderColor: activo ? 'var(--theme-primary)' : 'var(--theme-card-border)',
                  backgroundColor: activo ? 'var(--theme-primary-light)' : 'transparent',
                  color: 'var(--theme-text-primary)',
                }}
              >
                <span className="font-bold leading-none" style={{ fontSize: TAMANO_DE_LA_A[t.id] }} aria-hidden="true">A</span>
                <span className="text-[11px]" style={{ color: 'var(--theme-text-secondary)' }}>{t.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={compacto ? 'space-y-1' : 'space-y-3'}>
        {OPCIONES.map((o) => {
          const encendida = !!lectura[o.id];
          return (
            <label key={o.id} className="flex items-center justify-between gap-3 cursor-pointer py-1">
              <span className="min-w-0">
                <span className={`block ${compacto ? 'text-xs' : 'text-sm'} font-semibold`} style={{ color: 'var(--theme-text-primary)' }}>
                  {o.nombre}
                </span>
                {!compacto && (
                  <span className="block text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{o.ayuda}</span>
                )}
              </span>
              {/* Un interruptor de verdad: el checkbox queda para el lector de pantalla y el teclado. */}
              <input
                type="checkbox"
                role="switch"
                checked={encendida}
                onChange={() => cambiarLectura({ [o.id]: !encendida })}
                className="sr-only peer"
              />
              <span
                aria-hidden="true"
                className="relative flex-none w-10 h-6 rounded-full transition-colors peer-focus-visible:ring-2"
                style={{ backgroundColor: encendida ? 'var(--theme-primary)' : 'var(--theme-card-border)' }}
              >
                <span
                  className="absolute top-1 w-4 h-4 rounded-full transition-all"
                  style={{ left: encendida ? 20 : 4, backgroundColor: encendida ? 'var(--theme-button-text)' : 'var(--theme-card-bg)' }}
                />
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default OpcionesLectura;
