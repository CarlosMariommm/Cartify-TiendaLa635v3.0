import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { TEMAS_AYUDA, temaDeRuta } from '../../utils/ayudaPanel';
import { apagarTutoriales, diapositivasDe, marcarVisto, tocaTutorial } from '../../utils/tutorialesPanel';
import { useTurno } from '../../utils/turnoPanel';
import { modalTransition } from '../../utils/motion';

// EL TUTORIAL DE CADA APARTADO — TutorialApartado.jsx
// La primera vez que el administrador entra a un apartado del panel (Pedidos, Inventario,
// Promociones…), le sale un recorrido corto: para qué sirve, los pasos uno por uno y un consejo.

const ESPERA_MS = 700;

const TutorialApartado = ({ espera = ESPERA_MS }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const esAdmin = user?.type === 'admin';
  const quien = user?.id || user?.email || 'admin';

  const [tema, setTema] = useState(null);
  const [indice, setIndice] = useState(0);
  const botonPrincipal = useRef(null);

  // Al entrar a un apartado que todavía no vio, después de un momento.
  useEffect(() => {
    if (!esAdmin) return undefined;
    const candidato = TEMAS_AYUDA.find((t) => t.id === temaDeRuta(pathname));
    if (!candidato || !tocaTutorial(quien, candidato.id)) return undefined;
    const reloj = setTimeout(() => {
      setTema(candidato);
      setIndice(0);
    }, espera);
    return () => clearTimeout(reloj);
  }, [esAdmin, pathname, quien, espera]);

  // Solo mientras se está en SU apartado, y cuando le toca (ver turnoPanel).
  const enSuApartado = Boolean(tema) && temaDeRuta(pathname) === tema.id;
  const visible = useTurno('tutorial', enSuApartado);

  const diapositivas = diapositivasDe(tema);
  const actual = diapositivas[indice];
  const esUltima = indice === diapositivas.length - 1;

  const cerrar = () => {
    if (tema) marcarVisto(quien, tema.id);
    setTema(null);
  };
  const siguiente = () => (esUltima ? cerrar() : setIndice((i) => i + 1));
  const anterior = () => setIndice((i) => Math.max(0, i - 1));
  const noMostrarMas = () => {
    apagarTutoriales(quien);
    cerrar();
  };

  // El foco en el botón principal: Enter avanza sin buscar el mouse.
  useEffect(() => {
    if (visible) botonPrincipal.current?.focus();
  }, [visible, indice]);

  // Esc cierra; las flechas recorren los pasos.
  useEffect(() => {
    if (!visible) return undefined;
    const alTeclear = (e) => {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowRight') siguiente();
      if (e.key === 'ArrowLeft') anterior();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  const Icono = tema?.Icono;

  return (
    <AnimatePresence>
      {visible && actual && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={cerrar}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-apartado-titulo"
            aria-describedby="tutorial-apartado-texto"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={modalTransition}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              {Icono && <Icono className="w-8 h-8 text-[#066494]" aria-hidden="true" />}
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Primera vez aquí</p>
            </div>
            <h2 id="tutorial-apartado-titulo" className="text-xl font-bold text-gray-900">
              {tema.titulo}
            </h2>

            {/* El alto mínimo evita que la ventana salte de tamaño entre un paso y otro. */}
            <div className="min-h-[7.5rem]">
              <p className="text-sm font-semibold text-[#066494] mb-1.5">{actual.etiqueta}</p>
              <p id="tutorial-apartado-texto" className="text-gray-700 leading-relaxed" aria-live="polite">
                {actual.texto}
              </p>
            </div>

            {/* Por dónde va: un punto por diapositiva. */}
            <div className="flex justify-center gap-1.5" aria-hidden="true">
              {diapositivas.map((d, i) => (
                <span
                  key={`${d.tipo}-${i}`}
                  className={`h-1.5 rounded-full transition-all ${i === indice ? 'w-5 bg-[#003049]' : 'w-1.5 bg-gray-300'}`}
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row-reverse gap-2 pt-1">
              <button
                ref={botonPrincipal}
                onClick={siguiente}
                className="px-5 py-2 rounded-full text-sm font-medium bg-[#003049] text-white hover:bg-[#00283D]"
              >
                {esUltima ? 'Entendido' : 'Siguiente'}
              </button>
              {indice > 0 && (
                <button
                  onClick={anterior}
                  className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100"
                >
                  Anterior
                </button>
              )}
              {!esUltima && (
                <button onClick={cerrar} className="px-3 py-2 text-sm text-gray-500 hover:underline sm:mr-auto">
                  Saltar
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm">
              <Link to={`/ayuda?tema=${tema.id}`} onClick={cerrar} className="text-[#066494] hover:underline">
                Ver la ayuda completa
              </Link>
              <button onClick={noMostrarMas} className="text-gray-500 hover:underline">
                No mostrar más tutoriales
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TutorialApartado;
