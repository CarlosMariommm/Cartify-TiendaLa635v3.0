import { motion, useReducedMotion } from 'framer-motion';
import { usePromoCarousel, useCabenTres } from '../../hooks/usePromoCarousel';
import { etiquetaPromo, textoVencimiento } from '../../utils/promos';
import { EASE_OUT } from '../../utils/motion';
import PromoCard from './PromoCard';
import { useIdioma } from '../../hooks/useIdioma';

// PromoBanners — carrusel 3D de las promociones anunciadas. Las tarjetas viven en un anillo: la
// del centro se ve de frente y las de los lados giran hacia adentro, como los discos de una
// rocola. Click al centro filtra la tienda a esa promo; click a un lado la trae al frente.

// Dos maneras de mostrar las promociones: ANILLO en el teléfono (la del centro de frente y las
// demás giradas detrás) y FILA en pantalla ancha. El ancho y la proporción de las tarjetas van
// juntos para que el alto del carrusel nunca corte una tarjeta.
const ANCHO_FILA = 'clamp(285px, 29vw, 430px)';
const PROPORCION_PROMO = 2.2;

const ANILLO = {
  VISIBLES: 1,        // tarjetas a cada lado
  SEPARACION: 46,     // % de ancho que se corre cada paso
  GIRO: 42,           // grados de rotación en Y
  PROFUNDIDAD: 180,   // px que se alejan del ojo (esto las manda atrás)
  ENCOGE: 0.08,
  APAGA: 0.35,
  ancho: 'clamp(260px, 58vw, 600px)',
  margen: 'clamp(-300px, -29vw, -130px)',
};

const FILA = {
  // Una fila plana que se desliza, no un anillo que gira. Sin 3D: todas las tarjetas miden lo mismo,
  // están a la misma altura y separadas por la misma distancia.
  VISIBLES: 3,
  // La MISMA distancia entre todas, con aire entre una y otra. A 100% quedan pegadas y las tres se
  // leen como un solo bloque de color; el 107% deja el respiro justo para que cada promoción se vea
  // como una pieza aparte.
  SEPARACION: 107,
  ENCOGE: 0,          // todas del mismo tamaño
  APAGA: 0,           // y con la misma fuerza de color

  // Un toque de 3D, no una rocola. La del centro va derecha y las de los lados apenas se inclinan
  // hacia adentro. Siete grados no se notan como "giro": se notan como que la fila tiene volumen y
  // sigue más allá de la pantalla.
  GIRO: 7,
  GIRO_ORILLA: 14,
  PROFUNDIDAD: 45,    // apenas se van hacia atrás, para acompañar el giro

  // Lo único que distingue a las que vienen es un desenfoque suave: dice "esta todavía no te toca"
  // sin sacarla de la fila ni mandarla al fondo.
  BORROSO: 3,


  // El ancho de la fila deja ver el asomo de las promociones que vienen: tres tarjetas a 29vw
  // ocupan el 91% de la pantalla y el 9% que sobra es por donde asoman las demás.
  ancho: ANCHO_FILA,
  margen: 'clamp(-215px, -14.5vw, -142px)',
  // El alto se DERIVA del ancho y de la proporción de la tarjeta, no se escribe a mano. Escrito a
  // mano se desincronizó al cambiar la proporción de PromoCard y el carrusel empezó a cortar las
  // promociones por abajo: la tarjeta medía más de lo que el contenedor recortaba.
  alto: `calc(${ANCHO_FILA} / ${PROPORCION_PROMO})`,
};

// Los primeros y últimos centímetros se van difuminando hasta transparente. El 7% deja pasar el
// asomo de las tarjetas que vienen sin que ninguna se corte a filo contra el borde.
const DEGRADADO_ORILLAS =
  'linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)';

const PromoBanners = ({ onSelectPromo, moduloId = null }) => {
  const reducirMovimiento = useReducedMotion();
  const { t, locale } = useIdioma();
  const cabenTres = useCabenTres();
  // moduloId: si el cliente está parado en un pasillo, solo salen sus promos.
  const { promos, cargando, activa, total, irA, siguiente, anterior, distancia, pausar, reanudar } =
    usePromoCarousel({ autoplay: !reducirMovimiento, moduloId });

  if (cargando) return <PromosCargando enFila={cabenTres} />;
  if (total === 0) return null;

  const unaSola = total === 1;
  // La fila (el MISMO formato que el carrusel de toda la tienda) se usa siempre que quepa en
  // pantalla, aunque en el pasillo haya una sola promo. En pantalla angosta se sigue usando el
  // anillo.
  const enFila = cabenTres;
  const L = enFila ? FILA : ANILLO;

  return (
    <section
      // Ancla para que Tiqui las ponga a la vista ("las promociones").
      id="promociones-tienda"
      aria-label={t('Promociones de la tienda')}
      onMouseEnter={pausar}
      onMouseLeave={reanudar}
      onFocus={pausar}
      onBlur={reanudar}
      style={{ padding: '22px 0 6px', overflow: 'hidden' }}
    >
      {/* Escenario 3D. La perspectiva es lo que da la sensación de profundidad. */}
      <div
        style={{
          position: 'relative',
          // Alto de la tarjeta MÁS un respiro, sobre todo abajo.
          height: enFila ? `calc(${FILA.alto} + 52px)` : 'clamp(120px, 25vw, 256px)',
          // La perspectiva es lo que hace que las del fondo se vean atrás y no solo más chicas. Con una sola
          // promo no hay fondo que mostrar. En fila se abre más el lente (1600) que en el anillo: con las
          // tarjetas casi de frente, una perspectiva corta las deformaría.
          perspective: unaSola ? 'none' : enFila ? 1600 : 1250,
          transformStyle: 'preserve-3d',
          // El degradado de las orillas. Es lo que arregla que las que vienen se vieran "por detrás": en vez
          // de cortarse a filo contra el borde de la pantalla —que es lo que las hacía parecer mal
          // dibujadas— se desvanecen.
          ...(enFila && {
            maskImage: DEGRADADO_ORILLAS,
            WebkitMaskImage: DEGRADADO_ORILLAS,
          }),
        }}
      >
        {promos.map((promo, i) => {
          const d = distancia(i);
          const ad = Math.abs(d);
          const lejos = ad > L.VISIBLES;
          const esCentro = d === 0;

          // En fila hay dos planos: las tres del frente (|d| ≤ 1), derechas y legibles, y las de la orilla
          // (|d| ≥ 2), que se asoman borrosas por los lados.
          const enOrilla = enFila && ad >= 2;

          // En fila, la MISMA distancia entre todas: es lo que hace que se lean como una cinta que corre de
          // lado. Acercar las de la orilla se probó y quedaban DETRÁS de las del frente en vez de al lado,
          // que es justo lo que se veía mal.
          const x = d * L.SEPARACION;

          // El giro y la profundidad son leves y a propósito: dan volumen sin mandar nada al fondo. Las de
          // la orilla se inclinan un punto más para que se lean como "vienen entrando por el lado".
          const z = -ad * L.PROFUNDIDAD;

          // El giro va al revés que en el anillo: las laterales abren su cara HACIA el centro en vez de
          // esconderla. Así las tres se leen de frente y el volumen se siente como un abanico que se abre,
          // no como tarjetas dándose la vuelta.
          const giro = enOrilla
            ? Math.sign(d) * L.GIRO_ORILLA
            : d * L.GIRO;
          const escala = Math.max(0.6, 1 - ad * L.ENCOGE);
          const opacidad = lejos ? 0 : 1 - ad * L.APAGA;

          // El desenfoque crece con la distancia: la de más allá se lee como
          // "y todavía hay otra".
          const desenfoque = enOrilla ? L.BORROSO * (ad - 1) : 0;

          return (
            <motion.button
              key={promo._id}
              type="button"
              aria-hidden={lejos}
              tabIndex={lejos ? -1 : 0}
              // En fila las tres están de frente y se leen igual, así que tocar cualquiera abre sus productos.
              // En el anillo, tocar una lateral primero la trae al centro: está girada y a medias, y abrir algo
              // que no se alcanza a leer se siente a trampa.
              onClick={() => ((enFila && !enOrilla) || esCentro ? onSelectPromo(promo) : irA(i))}
              title={(enFila && !enOrilla) || esCentro ? t('Ver los productos de esta promoción') : t('Ver esta promoción')}
              animate={{
                x: `${x}%`,
                // z (translateZ) es lo que arregla que las laterales taparan a la del centro.
                z: reducirMovimiento ? 0 : z,
                rotateY: reducirMovimiento ? 0 : giro,
                scale: escala,
                opacity: opacidad,
                filter: `blur(${desenfoque}px)`,
                zIndex: 10 - ad,
              }}
              // Al pasar el cursor la tarjeta crece un poquito: es la señal de que se puede tocar. Solo en las
              // que de verdad se pueden abrir — agrandar una borrosa de la orilla prometería algo que ese clic
              // no hace.
              whileHover={
                reducirMovimiento || (enFila && enOrilla)
                  ? undefined
                  : { scale: escala * 1.035 }
              }
              transition={{ duration: reducirMovimiento ? 0.2 : 0.55, ease: EASE_OUT }}
              style={{
                position: 'absolute',
                // Arriba del respiro: el aire que sobra va abajo, que es
                // hacia donde cae la sombra.
                top: enFila ? 10 : 0,
                left: '50%',
                width: L.ancho,
                marginLeft: L.margen,
                padding: 0,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                transformStyle: 'preserve-3d',
                pointerEvents: lejos ? 'none' : 'auto',
              }}
            >
              <PromoCard
                promo={promo}
                imagen={promo.image}
                imagenCompleta={promo.imagenCompleta}
                title={promo.title}
                descripcion={promo.promoDescription}
                etiqueta={etiquetaPromo(promo, t)}
                vencimiento={textoVencimiento(promo, t, locale)}
                icono={promo.icono}
                atenuada={enOrilla || (!enFila && !esCentro)}
                mostrarFlecha={(enFila && !enOrilla) || esCentro}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Controles: solo tienen sentido si hay más de una promo. En fila se suben con margen negativo,
         porque el aire de abajo del carrusel es para que quepa la sombra, no para separar los botones. */}
      {!unaSola && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: enFila ? -20 : 14 }}>
          <button
            onClick={anterior}
            aria-label={t('Promoción anterior')}
            className="press"
            style={flecha}
          >‹</button>

          {/* El punto se ve de 8px pero se toca de 44. El botón es alto y transparente, y adentro va la
             rayita: así el indicador sigue siendo discreto —es un indicador, no un control protagonista— sin
             obligar a acertarle a ocho píxeles con el pulgar. */}
          <div style={{ display: 'flex' }}>
            {promos.map((promo, i) => (
              <button
                key={promo._id}
                onClick={() => irA(i)}
                aria-label={t('Ir a la promoción {n}', { n: i + 1 })}
                aria-current={i === activa}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 44,
                  // 24 px de ancho para el dedo como mínimo (el punto mide 8).
                  padding: '0 8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: i === activa ? 22 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === activa ? 'var(--marca-700)' : 'var(--linea-fuerte)',
                    transition: 'width var(--dur-popover) var(--ease-out), background var(--dur-popover) var(--ease-out)',
                  }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={siguiente}
            aria-label={t('Siguiente promoción')}
            className="press"
            style={flecha}
          >›</button>
        </div>
      )}
    </section>
  );
};

// El lugar del carrusel mientras llegan las promociones. Mide EXACTAMENTE lo mismo que el de
// verdad —el mismo escenario, las tarjetas en el mismo sitio y el renglón de los puntos— para que
// al llegar no se mueva nada: solo se rellena.
const PromosCargando = ({ enFila }) => {
  const L = enFila ? FILA : ANILLO;
  const posiciones = enFila ? [-1, 0, 1] : [0];
  return (
    <section aria-hidden="true" style={{ padding: '22px 0 6px', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          height: enFila ? `calc(${FILA.alto} + 52px)` : 'clamp(120px, 25vw, 256px)',
        }}
      >
        {posiciones.map((d) => (
          <div
            key={d}
            className="esqueleto"
            style={{
              position: 'absolute',
              top: enFila ? 10 : 0,
              left: '50%',
              width: L.ancho,
              marginLeft: L.margen,
              aspectRatio: PROPORCION_PROMO,
              borderRadius: 20,
              transform: `translateX(${d * L.SEPARACION}%)`,
            }}
          />
        ))}
      </div>
      <div style={{ height: 44, marginTop: enFila ? -20 : 14 }} />
    </section>
  );
};

// 44px y no 34: son los hermanos de los puntos de al lado, que ya se tocan de 44. Tenerlos de 34
// dejaba los dos controles del mismo carrusel con distinta facilidad de acierto, y justamente el
// que hace algo —cambiar de promo— era el más difícil de atinar.
const flecha = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: '1px solid var(--linea)',
  background: 'var(--papel)',
  color: 'var(--marca-texto-fuerte)',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default PromoBanners;
