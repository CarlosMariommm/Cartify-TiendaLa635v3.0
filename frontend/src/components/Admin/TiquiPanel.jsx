import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SendHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import MascotaAsistente from '../Store/MascotaAsistente';
import { useTiquiPanel } from '../../hooks/useTiquiPanel';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

/*
 * ============================================================
 * TIQUI DEL PANEL — la que flota en la esquina (TiquiPanel.jsx)
 * ============================================================
 * La asistente del equipo, como un Jarvis de la tienda: se le pregunta cómo
 * va el día, qué pedidos esperan o qué se está acabando, y contesta hablando
 * (y si hace falta, abre la pantalla). Es otra asistente que la de la tienda:
 * ver useTiquiPanel y backend/src/controller/tiquiPanelController.js.
 *
 * Vive en AdminLayout, en la esquina de abajo a la derecha, en todas las
 * pantallas del panel. Tocarla la despierta y se pone a escuchar; lo que
 * contesta sale en su globo, arriba de ella. Nada de ventana ni recuadro: es
 * ella y lo que dice, como en el asistente de la tienda.
 *
 * Va en z-[25]: por encima de la página, pero debajo del velo del menú en el
 * teléfono (z-30) y de los modales (z-50), que tienen que taparla.
 *
 * Solo pinta. La conversación vive en useTiquiPanel.
 * ============================================================
 */

const EASE_OUT = [0.23, 1, 0.32, 1];

// Lo que se le puede preguntar, para quien no sabe por dónde empezar.
// "¿Qué me recomiendas?" la vuelve ayudante de ventas: promos que pierden, lo que no se mueve.
const SUGERENCIAS_ADMIN = ['¿Cómo vamos hoy?', '¿Qué tengo que pedir esta semana?', '¿Qué me recomiendas para vender más?', '¿Cómo van las promociones?', '¿Qué pedidos esperan?'];
const SUGERENCIAS_EMPLEADO = ['¿Cómo vamos hoy?', '¿Qué pedidos esperan?', '¿Qué va en camino?'];

// Si el fondo del panel es claro, Tiqui va navy (como en el modo claro de la tienda).
const esClaro = (hex) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex || '').trim());
  if (!m) return true;
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
};

const BOTON_CHICO = {
  backgroundColor: 'var(--theme-card-bg)',
  color: 'var(--theme-text-primary)',
  border: '1px solid var(--theme-card-border)',
};

const TiquiPanel = () => {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const { palette } = useTheme() || {};
  const t = useTiquiPanel();
  const [texto, setTexto] = useState('');
  const campoRef = useRef(null);

  const esEmpleado = user?.type === 'employee';
  const nombre = String(user?.fullnName || user?.userName || '').trim().split(/\s+/)[0];
  const sobreClaro = esClaro(palette?.colors?.mainBg);

  // Escape la duerme, como cerrar cualquier cosa que flota.
  const { abierta, cerrar } = t;
  useEffect(() => {
    if (!abierta) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierta, cerrar]);

  const ultimoTiqui = [...t.mensajes].reverse().find((m) => m.quien === 'tiqui');
  const ultimoPersona = [...t.mensajes].reverse().find((m) => m.quien === 'persona');
  const enVivo = t.escuchando && !!t.transcripcion;
  const textoPersona = enVivo ? t.transcripcion : t.pensando ? ultimoPersona?.texto : null;

  const saludo = t.soportado
    ? `¡Hola${nombre ? `, ${nombre}` : ''}! Soy Tiqui. Pregúntame cómo va la tienda, qué pedidos esperan o qué se está acabando.`
    : `¡Hola${nombre ? `, ${nombre}` : ''}! Este navegador no me deja escucharte, pero puedes escribirme aquí abajo.`;

  const estado = t.pensando ? 'pensando' : t.hablando ? 'hablando' : t.escuchando ? 'escuchando' : 'reposo';
  const animo = t.confundida && !t.escuchando && !t.pensando ? 'confundido' : 'normal';

  const estadoTexto = t.escuchando ? 'Te escucho…'
    : t.pensando ? 'Pensando…'
    : t.hablando ? 'Tócame para interrumpirme'
    : t.soportado ? 'Tócame para hablar' : '';

  const etiqueta = !t.abierta ? 'Hablar con Tiqui, la asistente del panel'
    : t.hablando ? 'Interrumpir a Tiqui y hablar'
    : t.escuchando ? 'Dejar de escuchar' : 'Hablarle a Tiqui';

  const enviar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    t.escribir(texto);
    setTexto('');
  };

  const sugerencias = esEmpleado ? SUGERENCIAS_EMPLEADO : SUGERENCIAS_ADMIN;

  return (
    <div className="tiqui-panel fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-[25] flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {t.abierta && (
          <motion.section
            aria-label="Conversación con Tiqui"
            className="pointer-events-auto flex flex-col items-end gap-2 w-[min(340px,calc(100vw-1.5rem))]"
            initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            style={{ transformOrigin: 'bottom right' }}
          >
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={t.alternarVoz}
                aria-label={t.muteada ? 'Que Tiqui hable en voz alta' : 'Que Tiqui conteste sin voz'}
                title={t.muteada ? 'Sin voz' : 'Con voz'}
                className="w-9 h-9 rounded-full grid place-items-center shadow-sm transition-transform active:scale-95"
                style={BOTON_CHICO}
              >
                {t.muteada ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={t.cerrar}
                aria-label="Dormir a Tiqui"
                title="Cerrar"
                className="w-9 h-9 rounded-full grid place-items-center shadow-sm transition-transform active:scale-95"
                style={BOTON_CHICO}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lo que dice Tiqui: su globo, con la cola hacia ella. */}
            <motion.div
              key={t.pensando ? 'pensando' : (ultimoTiqui?.id ?? 'saludo')}
              className="tiqui-panel-globo relative w-full px-4 py-3 rounded-[20px] text-[15px] font-medium leading-snug shadow-lg"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                color: 'var(--theme-text-primary)',
                border: '1px solid var(--theme-card-border)',
              }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
              // Siempre opaco: con 0.55 mientras escuchaba, las tablas del
              // panel se veían a través del globo y no se podía leer.
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              aria-live="polite"
            >
              {t.pensando
                ? <span className="masc-puntos" aria-label="Tiqui está pensando"><i /><i /><i /></span>
                : (ultimoTiqui?.texto || saludo)}
            </motion.div>

            {/* Lo que dice la persona, en vivo mientras habla. */}
            {textoPersona && (
              /* Con fondo propio: suelto, el texto caía encima de la página y no se leía. */
              <p
                className={`max-w-[92%] text-sm leading-snug text-right px-3 py-2 rounded-2xl shadow-sm ${enVivo ? 'italic' : ''}`}
                style={{ ...BOTON_CHICO, color: 'var(--theme-text-secondary)' }}
              >
                “{textoPersona}{enVivo ? <span className="masc-cursor" /> : '”'}
              </p>
            )}

            {/*
              Tiqui propuso un cambio ("¿Lo hago?"): se contesta con un toque o
              diciendo "sí" / "no". Nada se cambia sin esto.
            */}
            {t.pendiente && !t.pensando && (
              <div className="flex gap-2" role="group" aria-label="Confirmar el cambio">
                <button
                  type="button"
                  onClick={t.descartar}
                  className="px-4 h-9 rounded-full text-sm font-semibold shadow-sm transition-transform active:scale-95"
                  style={BOTON_CHICO}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={t.confirmar}
                  className="px-4 h-9 rounded-full text-sm font-bold shadow-sm transition-transform active:scale-95"
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
                >
                  Sí, hazlo
                </button>
              </div>
            )}

            {/* Por dónde empezar: solo antes de la primera pregunta. */}
            {!t.mensajes.length && !t.escuchando && !t.pendiente && (
              <div className="flex flex-wrap justify-end gap-1.5">
                {sugerencias.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => t.escribir(s)}
                    className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-transform active:scale-95"
                    style={{ ...BOTON_CHICO, color: 'var(--theme-primary)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Escribirle, en vez de hablarle. */}
            <form onSubmit={enviar} className="w-full flex items-center gap-2">
              <input
                ref={campoRef}
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escríbele a Tiqui…"
                aria-label="Escríbele a Tiqui"
                maxLength={300}
                className="flex-1 min-w-0 h-10 px-4 rounded-full text-sm outline-none shadow-sm"
                style={BOTON_CHICO}
              />
              <button
                type="submit"
                disabled={!texto.trim() || t.pensando}
                aria-label="Enviar"
                className="w-10 h-10 flex-none rounded-full grid place-items-center shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-button-text)' }}
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {t.abierta && estadoTexto && (
          <span className="pointer-events-none mb-3 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm" style={{ ...BOTON_CHICO, color: 'var(--theme-text-secondary)' }}>
            {estadoTexto}
          </span>
        )}
        {/* Ella. Tocarla la despierta, la interrumpe o la deja de escuchar. */}
        <button
          type="button"
          onClick={t.tocar}
          aria-label={etiqueta}
          title={t.abierta ? undefined : 'Habla con Tiqui'}
          className={`tiqui-panel-avatar pointer-events-auto relative w-[64px] h-[98px] flex items-end justify-center rounded-2xl outline-none ${t.escuchando ? 'tiqui-panel-escucha' : ''}`}
        >
          <span className="tiqui-panel-sombra" aria-hidden="true" />
          <MascotaAsistente
            estado={estado}
            animo={animo}
            latido={t.transcripcion}
            vozReal={t.sonandoTiqui}
            sobreClaro={sobreClaro}
            className="relative h-[96px] w-auto"
          />
        </button>
      </div>
    </div>
  );
};

export default TiquiPanel;
