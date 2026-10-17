import { Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useDropdown } from '../../hooks/useDropdown';
import OpcionesLectura from './OpcionesLectura';

// ThemeSwitcher — acceso rápido a la accesibilidad desde el TopBar: las paletas y, debajo, las
// opciones de lectura (texto más grande y demás). Pensado para cuidar la vista: baja visión,
// lectura larga, migrañas, cansancio.
const ThemeSwitcher = () => {
  const { palette, paletteId, setPaletteId, palettes } = useTheme();
  const { isOpen, toggle, close, ref } = useDropdown();

  return (
    <div className="relative" ref={ref}>
      {/* Botón disparador: icono + una probadita de la paleta activa */}
      <button
        onClick={toggle}
        aria-label="Cambiar paleta de accesibilidad"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Accesibilidad / Tema"
        className="flex items-center gap-2 h-10 px-3 rounded-full border transition-colors bg-[var(--theme-card-bg)] hover:bg-[var(--theme-primary-light)]"
        style={{ borderColor: 'var(--theme-card-border)' }}
      >
        <Palette className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
        <div className="hidden sm:flex items-center gap-1">
          {palette.swatches.slice(0, 3).map((color, i) => (
            <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </div>
      </button>

      {/* Panel desplegable con las 5 paletas — animado con Framer Motion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 rounded-2xl border shadow-xl overflow-y-auto max-h-[75vh] z-50"
            style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-card-border)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Accesibilidad</p>
              <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>Colores y lectura cómodos para su vista</p>
            </div>

            <div className="p-2">
              {palettes.map((p) => {
                const isActive = paletteId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setPaletteId(p.id); close(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${!isActive ? 'hover:bg-[var(--theme-primary-light)]' : ''}`}
                    style={{ backgroundColor: isActive ? p.colors.primaryLight : undefined }}
                  >
                    {/* Mini muestras de color de la paleta */}
                    <div className="flex items-center gap-1 flex-none">
                      {p.swatches.slice(0, 4).map((color, i) => (
                        <span key={i} className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                      ))}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{p.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>{p.description}</p>
                    </div>

                    {isActive && (
                      <span className="flex-none w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: p.colors.primary }}>
                        <Check className="w-3.5 h-3.5" style={{ color: p.colors.buttonText }} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Texto más grande y demás: se combinan con cualquier paleta. */}
            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
              <OpcionesLectura compacto />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
