import { Bike, Radio } from 'lucide-react';
import { useTheme } from '../../hooks/useClientTheme';
import { useSeguimientoEnVivo } from '../../hooks/useSeguimientoEnVivo';
import { pasosDe, indiceDePaso } from '../../utils/pasosPedido';
import MapaSeguimiento from './MapaSeguimiento';
import { useIdioma } from '../../hooks/useIdioma';

/*
 * ============================================================
 * SEGUIMIENTO COMPACTO — SeguimientoCompacto.jsx
 * ============================================================
 * Por dónde va el pedido, en el alto de una tarjeta.
 *
 * POR QUÉ EXISTE
 * "Mis pedidos" era la única pantalla donde se ven pedidos EN CURSO y no
 * decía nada de por dónde iban: una etiqueta de estado ("Pagado") y un enlace
 * a otra pantalla. Para saber si su pedido ya salió, el cliente tenía que
 * entrar a cada uno. La burbuja y la confirmación del pago sí lo mostraban;
 * la lista, no.
 *
 * QUÉ MUESTRA
 * La línea de tiempo siempre y, cuando el repartidor ya salió y está
 * compartiendo su punto, cuánto falta MÁS el mapa en vivo — que es lo que de
 * verdad se viene a mirar mientras uno espera.
 *
 * El mapa se pinta SOLO en el pedido que va en camino, nunca en todas las
 * tarjetas. La diferencia importa: cinco mapas de Leaflet montados a la vez en
 * una lista arrastran un teléfono, y en la práctica solo hay un pedido en la
 * calle a la vez. Así se ve el seguimiento sin pagar el precio de la lista.
 *
 * Se calla solo en los pedidos entregados o cancelados: ahí ya no hay nada que
 * seguir y la tarjeta se queda con su historial, que es lo que toca.
 * ============================================================
 */
const SeguimientoCompacto = ({ pedido }) => {
  const { palette } = useTheme();
  const c = palette.colors;
  const { t } = useIdioma();

  const enCurso = ['pagado', 'preparando', 'en_camino', 'listo'].includes(pedido?.status);

  /*
   * El hook va SIEMPRE, aunque el pedido esté entregado: llamarlo dentro de un
   * `if` rompe la regla de los hooks de React. El segundo argumento es el que
   * decide si de verdad sale a preguntar, así que un pedido terminado no gasta
   * ni una petición.
   */
  const seguimiento = useSeguimientoEnVivo(pedido?._id, !!enCurso);

  if (!pedido || !enCurso) return null;

  const estado = seguimiento.estado || pedido.status;
  const pasos = pasosDe(pedido.deliveryType);
  const actual = indiceDePaso(pasos, estado);
  // Con el punto fresco del repartidor, o con la ruta aproximada desde la tienda.
  const enCamino = estado === 'en_camino' && (seguimiento.enVivo || seguimiento.estimado);

  return (
    <div className="mb-3">
      {/* La línea de tiempo */}
      <div className="flex items-start">
        {pasos.map((p, i) => {
          const activo = i <= actual;
          return (
            <div key={p.id} className="flex-1 flex flex-col items-center relative">
              {/* El tramo que une este punto con el siguiente */}
              {i < pasos.length - 1 && (
                <div
                  className="absolute h-0.5"
                  style={{
                    top: 5,
                    left: '50%',
                    right: '-50%',
                    background: i < actual ? 'var(--marca-600)' : c.cardBorder,
                  }}
                />
              )}
              <div
                className="w-3 h-3 rounded-full mb-1.5 relative z-10"
                style={{ background: activo ? 'var(--marca-600)' : c.cardBorder }}
              />
              <div
                className="text-[11px] text-center leading-tight"
                style={{
                  color: activo ? 'var(--marca-600)' : c.textMuted,
                  fontWeight: activo ? 600 : 400,
                }}
              >
                {t(p.label)}
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Cuánto falta, solo cuando de verdad hay alguien moviéndose y mandando
        su punto. Sin esa comprobación se mostraría una cuenta regresiva
        calculada sobre una posición vieja, que es peor que no mostrar nada:
        el cliente sale a la puerta y no hay nadie.
      */}
      {enCamino && (
        <div
          className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-xl text-xs"
          style={{
            background: 'color-mix(in srgb, var(--marca-600) 7%, transparent)',
            color: c.textSecondary,
          }}
        >
          <Bike className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--marca-texto)' }} />
          <span style={{ fontWeight: 600, color: c.textPrimary }}>
            {seguimiento.yaCasi ? t('Ya casi llega a tu puerta') : seguimiento.espera}
          </span>
          {seguimiento.distancia && (
            <span style={{ color: c.textMuted }}>· {t('a {distancia}', { distancia: seguimiento.distancia })}</span>
          )}
          {seguimiento.estimado && (
            <span style={{ color: c.textMuted }}>· {t('calculado desde la tienda')}</span>
          )}
          {/* La señal "en vivo" solo con el GPS del repartidor de verdad. */}
          {seguimiento.enVivo && <Radio className="w-3 h-3 ml-auto flex-none" style={{ color: 'var(--marca-texto)' }} />}
        </div>
      )}

      {/*
        El mapa, aquí mismo. Va debajo del "cuánto falta" porque primero se
        quiere el dato y después el dibujo: quien mira esto en la puerta ya
        sabe que viene, lo que quiere saber es por dónde.
      */}
      {enCamino && (
        <div className="mt-2.5">
          <MapaSeguimiento
            punto={seguimiento.punto}
            destino={seguimiento.destino}
            ruta={seguimiento.ruta}
            origen={seguimiento.origen}
            alto={170}
            borde={c.cardBorder}
          />
        </div>
      )}
    </div>
  );
};

export default SeguimientoCompacto;
