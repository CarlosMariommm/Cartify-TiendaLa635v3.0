import { Bike, Check } from 'lucide-react';
import { useSeguimientoEnVivo } from '../../hooks/useSeguimientoEnVivo';
import { pasosDe, indiceDePaso } from '../../utils/pasosPedido';
import MapaSeguimiento from './MapaSeguimiento';
import { useIdioma } from '../../hooks/useIdioma';

/*
 * ============================================================
 * SEGUIMIENTO EN LA CONFIRMACIÓN — SeguimientoConfirmacion.jsx
 * ============================================================
 * Lo que antes obligaba a tocar "Ver el estado del pedido": el avance del
 * pedido y el mapa del repartidor, AHORA MISMO en la pantalla de confirmación
 * y actualizándose solo (el hook consulta cada 10 s, sin recargar).
 *
 * En un pedido a domicilio el mapa muestra siempre la dirección de entrega, y
 * cuando el repartidor sale a la calle aparece su punto y el tiempo estimado.
 * ============================================================
 */

const BROWN = 'var(--marca-600)';

// Esta lista se habia quedado SIN el paso "En camino", asi que un pedido a
// domicilio que ya iba en la moto se le mostraba al cliente como "Recibido"
// —justo en la pantalla que mira mientras espera—. Ahora sale de
// utils/pasosPedido.js, que es la unica lista que existe.

// Los pines y el encuadre del mapa se mudaron a MapaSeguimiento.jsx: estaban
// copiados en tres pantallas y esta era una de las copias.

const SeguimientoConfirmacion = ({ orderId, esDomicilio }) => {
  const seg = useSeguimientoEnVivo(orderId, !!orderId);
  const { t } = useIdioma();

  const estado = seg.estado || 'pagado';
  const PASOS = pasosDe(esDomicilio ? 'delivery' : 'retiro');
  const pasoActual = indiceDePaso(PASOS, estado);
  // Con el punto fresco del repartidor, o con la ruta aproximada desde la tienda.
  const enCamino = esDomicilio && (seg.enVivo || seg.estimado);
  const tieneDestino = esDomicilio && seg.destino?.lat != null && seg.destino?.lng != null;

  return (
    <div>
      {/* Línea de tiempo, viva */}
      <div style={{ display: 'flex', margin: '4px 0 6px' }}>
        {PASOS.map((p, i) => {
          const activo = i <= pasoActual;
          return (
            <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < PASOS.length - 1 && (
                <div style={{
                  position: 'absolute', height: 2, top: 6, left: '50%', right: '-50%',
                  background: i < pasoActual ? BROWN : 'var(--linea)',
                }} />
              )}
              <div style={{
                width: 14, height: 14, borderRadius: '50%', marginBottom: 6, position: 'relative', zIndex: 1,
                background: activo ? BROWN : 'var(--linea)',
              }} />
              <div style={{ fontSize: 12, textAlign: 'center', color: activo ? BROWN : 'var(--tinta-tenue)', fontWeight: activo ? 600 : 400 }}>
                {t(p.label)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mapa: la dirección siempre; el repartidor cuando sale a la calle. */}
      {tieneDestino && (
        <div style={{ marginTop: 16, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--linea)' }}>
          <MapaSeguimiento
            punto={enCamino ? seg.punto : null}
            destino={seg.destino}
            ruta={enCamino ? seg.ruta : null}
            origen={enCamino ? seg.origen : null}
            alto={200}
            borde="transparent"
          />
          <div style={{
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 700,
            color: enCamino ? (seg.yaCasi ? 'var(--exito-texto)' : 'var(--info-texto)') : 'var(--tinta-suave)',
            background: 'var(--papel)',
          }}>
            {enCamino
              ? <><Bike size={15} strokeWidth={2.4} /> {seg.yaCasi ? t('Ya casi toca tu puerta') : seg.espera}{seg.distancia ? ` · ${t('a {distancia}', { distancia: seg.distancia })}` : ''}{seg.estimado ? ` · ${t('calculado desde la tienda')}` : ''}</>
              : (estado === 'entregado'
                  ? <><Check size={15} strokeWidth={2.4} /> {t('Entregado en tu dirección')}</>
                  : <>{t('Aquí te llevaremos tu pedido. En cuanto el repartidor salga, verás su punto moverse.')}</>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeguimientoConfirmacion;
