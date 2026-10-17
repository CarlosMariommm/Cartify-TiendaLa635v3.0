import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, X, ChevronRight, Clock, Store } from 'lucide-react';
import { usePedidoActivoCtx } from '../../context/PedidoActivoContext';
import { useAuth } from '../../hooks/useAuth';
import { useSeguimientoEnVivo } from '../../hooks/useSeguimientoEnVivo';
import { pasosDe, indiceDePaso } from '../../utils/pasosPedido';
import { pedidosEnCurso, pedidosNuevos } from '../../utils/pedidosEnCurso';
import MapaSeguimiento from './MapaSeguimiento';
import CodigoEntrega from './CodigoEntrega';
import Mascota from '../UI/Mascota';
import { useTiempoPorZona } from '../../hooks/useTiempoPorZona';
import { useIdioma } from '../../hooks/useIdioma';

// BURBUJA DE PEDIDO — el seguimiento sin salir de la tienda
// Mientras un pedido no esté entregado, el cliente lo ve flotando en la esquina. Va abajo a la
// IZQUIERDA porque el botón de WhatsApp ya ocupa la derecha.

// La sombra que separa a la mascota de lo que tenga detrás en la tienda.
const SOMBRA_MASCOTA = { filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.18))' };

// Los pasos del pedido salen de utils/pasosPedido.js; "En camino" solo aplica a domicilio, así que
// se filtra según el pedido.

const BROWN = 'var(--marca-600)';

// Los pines y el encuadre del mapa se mudaron a MapaSeguimiento.jsx: estaban
// copiados en tres pantallas y esta era una de las copias.

const BurbujaPedido = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders } = usePedidoActivoCtx();
  const [abierta, setAbierta] = useState(false);

  // Cerrar NO desaparece la burbuja: la encoge. Ahora queda un botón chiquito, y si el pedido avanza
  // (lo empiezan a preparar, sale el repartidor) se reabre sola: eso es justo lo que la persona
  // quería saber.
  const [encogidaEn, setEncogidaEn] = useState(null); // { id, estado }

  // Los pedidos en curso, del que más importa ahora al que menos: primero el que va en camino,
  // después el listo para recoger (ver utils/pedidosEnCurso.js). Se sigue el que el cliente eligió
  // en la tarjeta; si no eligió (o ese ya se cerró), el primero.
  const lista = user?.type === 'client' ? pedidosEnCurso(orders) : [];
  const [elegidoId, setElegidoId] = useState(null);
  const enCurso = lista.find((o) => String(o._id) === elegidoId) || lista[0] || null;

  // Un pedido NUEVO (recién hecho) vuelve a lo automático; cambiar de paso no.
  const idsAbiertos = lista.map((o) => String(o._id)).join(',');
  const idsAnterioresRef = useRef(idsAbiertos ? idsAbiertos.split(',') : []);
  useEffect(() => {
    const ahora = idsAbiertos ? idsAbiertos.split(',') : [];
    const anteriores = idsAnterioresRef.current;
    idsAnterioresRef.current = ahora;
    if (anteriores.length && pedidosNuevos(anteriores, ahora).length) setElegidoId(null);
  }, [idsAbiertos]);

  const seguimiento = useSeguimientoEnVivo(enCurso?._id, !!enCurso);

  // Cuánto se ha tardado en llegar a esa zona, según las entregas pasadas. Es la respuesta para el
  // rato en que todavía nadie ha salido: el pedido está "Preparando" y no hay puntito que mirar,
  // pero la persona igual quiere saber si le da tiempo de bañarse.
  const zona = useTiempoPorZona(enCurso?.deliveryLat, enCurso?.deliveryLng);
  const { t } = useIdioma();

  // Solo los clientes tienen pedidos que seguir.
  if (user?.type !== 'client') return null;
  if (!enCurso) return null;

  // El estado que manda es el que acaba de traer el seguimiento: la lista de pedidos se cargó una
  // vez al abrir la tienda y para cuando la tienda empieza a preparar, ya está vieja.
  const estado = seguimiento.estado || enCurso.status;
  const esDomicilio = enCurso.deliveryType === 'delivery';
  const PASOS = pasosDe(enCurso.deliveryType);
  const pasoActual = indiceDePaso(PASOS, estado);
  const paso = PASOS[pasoActual] || PASOS[0];
  // "En camino" ya es un estado real, no una adivinanza con el GPS — el mapa
  // sale con el punto fresco del repartidor o, sin él, con la ruta aproximada
  // desde la tienda.
  const estaEnCamino = estado === 'en_camino';
  const enCamino = estaEnCamino && (seguimiento.enVivo || seguimiento.estimado);
  // La ilustración del estado. "En camino" va aparte porque solo existe en la
  // lista de domicilio, y `paso` cae al primero si el estado no está en ella.
  const pose = estaEnCamino ? 'en-camino' : paso.pose;

  // Entregado o cancelado: la burbuja se va sola.
  if (estado === 'cancelado' || estado === 'entregado') return null;

  // La "novedad" del pedido: si cambió desde que la encogieron, se reabre.
  const novedad = `${estado}|${enCamino ? 'en-camino' : ''}`;
  const encogida = encogidaEn?.id === String(enCurso._id) && encogidaEn?.novedad === novedad;

  const encoger = () => {
    setAbierta(false);
    setEncogidaEn({ id: String(enCurso._id), novedad });
  };

  const agrandar = () => {
    setEncogidaEn(null);
    setAbierta(true);
  };

  // Encogida: la mascota sola y más chica, sin la etiqueta. Ocupa poco, no tapa la tienda y siempre
  // se puede volver.
  if (encogida) {
    return (
      <button
        type="button"
        onClick={agrandar}
        aria-label={t('Ver tu pedido: {estado}', { estado: enCamino ? seguimiento.espera : t(paso.label) })}
        style={{
          position: 'fixed',
          left: 'max(20px, env(safe-area-inset-left))',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          zIndex: 900,
          border: 'none', background: 'none', padding: 0, cursor: 'pointer',
        }}
      >
        <Mascota pose={pose} alto={56} style={SOMBRA_MASCOTA} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 'max(20px, env(safe-area-inset-left))',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      {abierta && (
        <div
          style={{
            width: 'min(300px, calc(100vw - 40px))',
            // La mascota de abajo es más alta que la pastilla de antes: en
            // pantallas bajas el panel se desplaza en vez de salirse por arriba.
            maxHeight: 'calc(100dvh - 180px)',
            overflowY: 'auto',
            background: 'var(--papel)',
            borderRadius: 18,
            boxShadow: '0 18px 44px rgba(0,0,0,0.22)',
            border: '1px solid var(--linea)',
            animation: 'cardIn 220ms var(--ease-out)',
          }}
        >
          <div style={{ background: BROWN, color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              {t('Pedido #{numero}', { numero: String(enCurso._id).slice(-6).toUpperCase() })}
            </span>
            <button
              type="button"
              onClick={encoger}
              aria-label={t('Encoger el seguimiento')}
              style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Con más de un pedido abierto, todos aquí: el icono dice si es a domicilio o para recoger, y el
             texto en qué paso va. Tocar uno lo sigue en la tarjeta (con su mapa, si va en camino). */}
          {lista.length > 1 && (
            <div role="tablist" aria-label={t('Tienes {n} pedidos en curso', { n: lista.length })} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 12px 0' }}>
              {lista.map((o) => {
                const esEste = String(o._id) === String(enCurso._id);
                const Icono = o.deliveryType === 'delivery' ? Bike : Store;
                const pasos = pasosDe(o.deliveryType);
                const suPaso = pasos[indiceDePaso(pasos, esEste ? estado : o.status)] || pasos[0];
                return (
                  <button
                    key={String(o._id)}
                    type="button"
                    role="tab"
                    aria-selected={esEste}
                    aria-label={`${t(o.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Retiro en el local')}: ${t(suPaso.label)}`}
                    onClick={() => setElegidoId(String(o._id))}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%',
                      padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                      border: `1.5px solid ${esEste ? BROWN : 'var(--linea)'}`,
                      background: esEste ? 'var(--marca-50)' : 'transparent',
                      color: esEste ? 'var(--marca-texto)' : 'var(--tinta-suave)',
                      fontSize: 12, fontWeight: 700,
                    }}
                  >
                    <Icono size={13} strokeWidth={2.2} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t(suPaso.label)}
                      {/* El número: dos pedidos en el mismo paso se distinguen igual. */}
                      <span style={{ fontWeight: 500, opacity: 0.75 }}> · #{String(o._id).slice(-6).toUpperCase()}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* El mapa solo aparece cuando de verdad hay alguien en camino con la novedad fresca. Un mapa con
             un punto viejo es peor que no tener mapa: el cliente sale a la banqueta a esperar a alguien que
             va tres calles atrás. */}
          {enCamino && (
            <div>
              {/* Sin arrastrar ni zoom: es una miniatura que se mira de reojo,
                  y arrastrable robaba el desplazamiento de la pagina. */}
              <MapaSeguimiento
                punto={seguimiento.punto}
                destino={seguimiento.destino}
                ruta={seguimiento.ruta}
                origen={seguimiento.origen}
                alto={132}
                borde="transparent"
                interactivo={false}
              />
              {/* En las últimas cuadras la franja se pone verde y cambia el texto. No es adorno: es la diferencia
                 entre "está en camino" (información) y "levántese" (una instrucción). */}
              <div style={{
                padding: '10px 14px',
                background: seguimiento.yaCasi ? 'var(--exito-fondo)' : 'var(--info-fondo)',
                borderBottom: `1px solid ${seguimiento.yaCasi ? 'var(--exito-borde)' : 'var(--info-borde)'}`,
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 800,
                  color: seguimiento.yaCasi ? 'var(--exito-texto)' : 'var(--info-texto)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Bike size={15} strokeWidth={2.4} />
                  {seguimiento.yaCasi ? t('Ya casi toca tu puerta') : seguimiento.espera}
                </div>
                <div style={{ fontSize: 11.5, color: seguimiento.yaCasi ? 'var(--exito-suave)' : 'var(--info-suave)', marginTop: 2 }}>
                  {seguimiento.repartidor ? `${seguimiento.repartidor} · ` : ''}
                  {/* La distancia solo sale si el pedido guardó su punto en el
                      mapa; los viejos traen nada más la dirección escrita */}
                  {seguimiento.estimado
                    ? t('Calculado desde que salió de la tienda')
                    : seguimiento.distancia
                      ? t('a {distancia} de tu dirección', { distancia: seguimiento.distancia })
                      : t('Te llevan tu pedido')}
                </div>
              </div>
            </div>
          )}

          {/* El tiempo real a su zona, mientras nadie ha salido todavía. Desaparece en cuanto hay repartidor
             en vivo: ahí el dato bueno es el de arriba, calculado con dónde va de verdad, y dos tiempos
             distintos en la misma tarjeta solo confunden. */}
          {!enCamino && esDomicilio && estado !== 'entregado' && zona.hayDatos && (
            <div style={{
              padding: '10px 14px', background: 'var(--exito-fondo)',
              borderBottom: '1px solid var(--exito-borde)',
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--exito-texto)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} strokeWidth={2.4} />
                {zona.texto}
              </div>
              <div style={{ fontSize: 11, color: 'var(--exito-suave)', marginTop: 1 }}>
                {zona.respaldo}
              </div>
            </div>
          )}

          {/* El código con el que recibe el pedido. Mismo lugar que en EstadoPedido: justo después de lo que
             se está mirando ahora mismo —el mapa o el tiempo estimado—, para no tener que ir a buscarlo
             cuando el repartidor ya está tocando el timbre. */}
          <CodigoEntrega
            codigo={enCurso.deliveryCode}
            deliveryType={enCurso.deliveryType}
            estado={estado}
            enBurbuja
          />

          <div style={{ padding: 14 }}>
            {/* Los pasos, con el actual resaltado */}
            {PASOS.map((p, i) => {
              const hecho = i < pasoActual;
              const actual = i === pasoActual;
              const color = hecho || actual ? BROWN : 'var(--tinta-apagada)';
              return (
                <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: hecho || actual ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: actual ? BROWN : hecho ? 'var(--marca-100)' : 'var(--marca-50)',
                      color: actual ? '#fff' : color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <p.Icono size={14} strokeWidth={2.4} />
                    </div>
                    {i < PASOS.length - 1 && (
                      <div style={{ width: 2, flex: 1, minHeight: 14, background: hecho ? 'var(--marca-100)' : 'var(--marca-50)' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < PASOS.length - 1 ? 12 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: actual ? 800 : 600, color: actual ? 'var(--tinta)' : 'var(--tinta-suave)' }}>
                      {t(p.label)}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--tinta-tenue)' }}>{t(p.detalle)}</div>
                  </div>
                </div>
              );
            })}

            {/* La honestidad del seguimiento: si el repartidor salió pero su teléfono dejó de reportar (se
               bloqueó la pantalla, se quedó sin novedad), se dice tal cual en vez de disimular. */}
            {esDomicilio && seguimiento.senalFria && (
              <p style={{ fontSize: 11.5, color: 'var(--tinta-tenue)', margin: '10px 0 0', lineHeight: 1.45 }}>
                {t('Tu pedido va en camino. La última novedad del repartidor fue hace {n} min.', { n: seguimiento.minutosDesdeUltimoDato || 1 })}
              </p>
            )}

            {esDomicilio && enCurso.deliveryAddress && (
              <p style={{ fontSize: 11.5, color: 'var(--tinta-tenue)', margin: '10px 0 0', lineHeight: 1.45 }}>
                {t('Te lo llevamos a: {direccion}', { direccion: enCurso.deliveryAddress })}
              </p>
            )}

            <button
              type="button"
              onClick={() => navigate(`/mi-cuenta/pedido/${enCurso._id}`)}
              style={{
                marginTop: 12, width: '100%', padding: '9px 0', borderRadius: 999,
                border: '1px solid var(--linea)', background: 'var(--papel)', color: 'var(--marca-texto)',
                fontSize: 12.5, fontWeight: 700, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              {t('Ver el pedido')} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* La burbuja: la mascota haciendo lo que pasa con el pedido, y su nombre debajo */}
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-label={enCamino ? t('Tu pedido va en camino. {espera}', { espera: seguimiento.espera }) : t('Tu pedido: {estado}', { estado: t(paso.label) })}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <Mascota pose={pose} alto={84} style={SOMBRA_MASCOTA} />
        <span style={{
          marginTop: -2,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          height: 28,
          padding: '0 12px',
          borderRadius: 999,
          // Verde cuando está por tocar: se distingue de un vistazo, aunque
          // la persona esté al otro lado del cuarto.
          background: seguimiento.yaCasi ? '#14663A' : BROWN,
          color: '#fff',
          boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
          fontSize: 12.5,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {/* Cuando alguien ya va en la calle con el pedido, la burbuja cerrada lo dice sin que haya que
             abrirla: es la información que el cliente está esperando, y hacerlo tocar para verla sería
             mezquino. */}
          {enCamino ? (seguimiento.yaCasi ? t('Ya casi llega') : seguimiento.espera) : t(paso.label)}
          {/* Con más de un pedido abierto, cuántos: los demás están en la tarjeta. */}
          {lista.length > 1 && (
            <span
              aria-label={t('Tienes {n} pedidos en curso', { n: lista.length })}
              style={{
                minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#fff',
                color: seguimiento.yaCasi ? '#14663A' : BROWN, fontSize: 11, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {lista.length}
            </span>
          )}
          {/* El puntito que respira: dice "esto sigue en curso" sin decir nada */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#8ee6a8',
            boxShadow: '0 0 0 0 rgba(142,230,168,.7)',
            animation: 'latido 1.8s ease-out infinite',
          }} />
        </span>
      </button>

      <style>{`
        @keyframes latido {
          0%   { box-shadow: 0 0 0 0 rgba(142,230,168,.7); }
          70%  { box-shadow: 0 0 0 9px rgba(142,230,168,0); }
          100% { box-shadow: 0 0 0 0 rgba(142,230,168,0); }
        }
      `}</style>
    </div>
  );
};

export default BurbujaPedido;
