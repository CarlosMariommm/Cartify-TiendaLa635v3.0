import { useState } from 'react';
import { Star, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewService } from '../../api/reviewService';
import { useAuth } from '../../hooks/useAuth';
import { useIdioma } from '../../hooks/useIdioma';

// VALORAR EL PEDIDO — ValoracionPedido.jsx
// Cuando un pedido ya está ENTREGADO, el cliente lo califica EN GENERAL: unas estrellas y un
// comentario para todo el pedido, no producto por producto.
const ESTRELLAS = [1, 2, 3, 4, 5];

// Una clave por pedido: omitir uno no debe ocultar el aviso de los demás.
const claveOmitida = (pedidoId) => `valoracion-omitida-${pedidoId}`;

const ValoracionPedido = ({ items = [], pedidoId = '' }) => {
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { t } = useIdioma();
  // Se recuerda entre visitas: si ya dijo "ahora no", no se le vuelve a
  // preguntar cada vez que entra a ver su pedido entregado.
  const [omitido, setOmitido] = useState(
    () => !!pedidoId && localStorage.getItem(claveOmitida(pedidoId)) === '1'
  );

  const omitir = () => {
    if (pedidoId) localStorage.setItem(claveOmitida(pedidoId), '1');
    setOmitido(true);
  };

  // Los productos únicos del pedido (uno puede venir repetido).
  const vistos = new Set();
  const productosIds = items
    .map((it) => String(it.productId?._id || it.productId || ''))
    .filter((id) => {
      if (!id || vistos.has(id)) return false;
      vistos.add(id);
      return true;
    });

  if (!user?.id || productosIds.length === 0 || omitido) return null;

  const enviar = async () => {
    if (rating < 1) {
      toast.error(t('Elige cuántas estrellas antes de enviar'));
      return;
    }
    setGuardando(true);
    try {
      // La misma calificación del pedido se guarda para cada producto que llevó.
      await Promise.all(
        productosIds.map((productId) =>
          reviewService.guardar({ productId, clientId: user.id, rating, comment: comentario.trim() })
        )
      );
      setEnviado(true);
      toast.success(t('¡Gracias por calificar tu pedido!'));
    } catch {
      toast.error(t('No se pudo guardar tu valoración. Intenta de nuevo.'));
    } finally {
      setGuardando(false);
    }
  };

  const marcadas = hover || rating;

  return (
    <div
      className="p-6 rounded-2xl border"
      style={{ backgroundColor: 'var(--papel)', borderColor: 'var(--linea)' }}
    >
      <h2 className="text-lg font-bold" style={{ color: 'var(--tinta)' }}>{t('¿Qué te pareció tu pedido?')}</h2>

      {enviado ? (
        <div className="flex items-center gap-2 mt-3 text-sm font-semibold" style={{ color: 'var(--exito)' }}>
          <Check className="w-5 h-5" /> {t('¡Gracias por calificar tu pedido!')}
        </div>
      ) : (
        <>
          <p className="text-sm mt-0.5 mb-4" style={{ color: 'var(--tinta-suave)' }}>
            {t('Tu pedido ya llegó. Cuéntanos qué tal estuvo, para que otros vecinos se animen.')}
          </p>

          {/* Una sola fila de estrellas para todo el pedido */}
          <div className="flex items-center gap-1.5 mb-4" onMouseLeave={() => setHover(0)}>
            {ESTRELLAS.map((n) => {
              const activa = marcadas >= n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={guardando}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  aria-label={t(n > 1 ? '{n} estrellas' : '{n} estrella', { n })}
                  className="press disabled:opacity-60"
                >
                  <Star
                    className="w-9 h-9 transition-colors"
                    style={{ color: activa ? '#F5A623' : 'var(--tinta-tenue)' }}
                    fill={activa ? '#F5A623' : 'none'}
                  />
                </button>
              );
            })}
          </div>

          <textarea
            rows={2}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={t('¿Algo que quiera contar? (opcional)')}
            className="w-full px-3 py-2.5 rounded-xl border outline-none resize-none text-sm mb-3"
            style={{ backgroundColor: 'var(--papel)', borderColor: 'var(--linea)', color: 'var(--tinta)' }}
          />

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={enviar}
              disabled={guardando}
              className="press px-6 py-2.5 rounded-full text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--marca-600)' }}
            >
              {guardando ? t('Enviando…') : t('Enviar valoración')}
            </button>
            <button
              type="button"
              onClick={omitir}
              disabled={guardando}
              className="press text-sm font-semibold disabled:opacity-60"
              style={{ color: 'var(--tinta-suave)' }}
            >
              {t('Ahora no')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ValoracionPedido;
