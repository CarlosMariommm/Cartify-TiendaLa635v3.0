import { ArrowRight, Clock } from 'lucide-react';
import { coloresDePromo } from '../../utils/temasPromo';
import { iconoDePromo } from '../../utils/iconosPromo';
import { foto, ANCHO } from '../../utils/fotos';

// PromoCard — la cara de una promoción, dibujada con los colores del tema y el texto de la promo;
// si hay foto, va a la derecha difuminada. Proporción 2.2 a 1.
const PROPORCION = '2.2 / 1';

// Cuánto ocupa la foto cuando acompaña al texto.
const ANCHO_IMAGEN = '46%';

const PromoCard = ({
  promo,
  imagen,
  title,
  descripcion,
  etiqueta,
  vencimiento,
  icono,
  imagenCompleta = false,
  atenuada = false,
  mostrarFlecha = true,
}) => {
  const colores = coloresDePromo(promo);
  const aSangre = imagen && imagenCompleta;      // la foto manda sola
  const acompaña = imagen && !imagenCompleta;    // la foto acompaña al texto

  // Sobre fondos oscuros el texto es blanco; el acento entonces necesita
  // letra oscura para que se lea (y al revés en el tema claro).
  const textoSobreAcento = colores.texto === '#FFFFFF' ? '#101820' : colores.texto;

  // El icono sale de una lista fija (iconosPromo.js): se elige, no se crea al pintar.
  // Por eso las dos líneas que lo dibujan callan el aviso de static-components.
  const Icono = iconoDePromo(icono);
  // La marca de agua se dibuja siempre que haya icono y no haya foto: son capas, no vecinos. El
  // icono va al fondo y el texto encima, así que un título largo simplemente pasa por arriba en vez
  // de echar al icono.
  const marcaDeAgua = Icono && !imagen;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: PROPORCION,
        borderRadius: 20,
        overflow: 'hidden',
        background: aSangre ? '#ECE7E1' : colores.fondo,
        // Sombra en dos capas y bajita. La de antes era una sola mancha café a 16 px hacia abajo: se veía
        // como una alfombra sucia debajo de la tarjeta, sobre todo en el carrusel donde hay tres seguidas.
        boxShadow: atenuada
          ? '0 2px 6px rgba(0,0,0,0.10), 0 8px 20px rgba(0,0,0,0.07)'
          : '0 2px 8px rgba(90,55,25,0.12), 0 12px 28px rgba(90,55,25,0.13)',
        // La letra se mide contra el ancho de ESTA tarjeta (cqw), no contra el de la ventana.
        containerType: 'inline-size',
      }}
    >
      {/* La foto que acompaña se enmascara con un degradado hacia la izquierda: así se funde con el fondo
         sea cual sea el tema (que muchas veces ES un degradado, y no se puede repetir a mano encima de
         la imagen). */}
      {acompaña && (
        <img
          src={foto(imagen, ANCHO.promo)}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: ANCHO_IMAGEN,
            height: '100%',
            objectFit: 'cover',
            maskImage: 'linear-gradient(to right, transparent 0%, #000 46%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 46%)',
          }}
        />
      )}

      {/* Marca de agua: el icono en grande, apenas visible, detrás de todo. Es una CAPA de fondo, no un
         vecino que pelea por el espacio: el texto se dibuja encima (zIndex 1), así que un título largo
         lo cruza sin problema y el icono nunca le quita lugar. */}
      {marcaDeAgua && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '5%',
            top: '50%',
            transform: 'translateY(-50%)',
            /* El tamaño va en el contenedor: el atributo del SVG no entiende cqw */
            width: '31cqw',
            height: '31cqw',
            color: colores.acento,
            opacity: 0.17,
            lineHeight: 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {/* eslint-disable-next-line react-hooks/static-components -- ver arriba, junto a Icono */}
          <Icono size="100%" strokeWidth={1.6} />
        </span>
      )}

      {aSangre ? (
        <img
          src={foto(imagen, ANCHO.promo)}
          alt={title || descripcion || 'Promoción'}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'clamp(16px, 4.5%, 40px)',
            textAlign: 'left',
            // La capa de arriba: siempre por encima de la marca de agua.
            zIndex: 1,
          }}
        >
          {(etiqueta || vencimiento) && (
            <div className="promo-etiquetas" style={{ display: 'flex', alignItems: 'center' }}>
              {etiqueta && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: colores.acento,
                    color: colores.fondo.startsWith('linear') ? textoSobreAcento : colores.texto,
                    fontWeight: 800,
                    fontSize: 'clamp(10px, 3cqw, 16px)',
                    padding: '4px 12px',
                    borderRadius: 999,
                    letterSpacing: 0.3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* El mismo icono, en chiquito: acompaña al ahorro */}
                  {/* eslint-disable-next-line react-hooks/static-components -- ver arriba, junto a Icono */}
                  {Icono && <Icono size="1em" strokeWidth={2.6} />}
                  {etiqueta}
                </span>
              )}

              {/* La urgencia va junto al ahorro: es la mitad del argumento */}
              {vencimiento && (
                <span
                  className="promo-vence"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    border: `1px solid ${colores.acento}`,
                    color: colores.texto,
                    opacity: 0.92,
                    fontWeight: 600,
                    fontSize: 'clamp(9px, 2.4cqw, 13px)',
                    padding: '3px 10px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Clock size={12} strokeWidth={2.4} />
                  <span className="promo-vence-texto">{vencimiento}</span>
                </span>
              )}
            </div>
          )}

          {/* El tamaño de letra, el tope de dos líneas y qué se esconde en una tarjeta angosta viven en
             index.css (.promo-titulo, .promo-descripcion): dependen del ancho de la tarjeta y eso solo lo
             sabe una consulta @container, que no se puede escribir en un style. */}
          <span
            className="promo-titulo"
            style={{
              color: colores.texto,
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
              maxWidth: acompaña ? '62%' : '100%',
            }}
          >
            {title || 'Su promoción se verá aquí'}
          </span>

          {descripcion && (
            <span
              className="promo-descripcion"
              style={{
                color: colores.texto,
                opacity: 0.85,
                marginTop: 6,
                lineHeight: 1.35,
                maxWidth: acompaña ? '58%' : '78%',
              }}
            >
              {descripcion}
            </span>
          )}
        </div>
      )}

      {mostrarFlecha && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 'clamp(12px, 2.4%, 24px)',
            bottom: 'clamp(12px, 2.4%, 24px)',
            width: 'clamp(30px, 4.4%, 44px)',
            height: 'clamp(30px, 4.4%, 44px)',
            borderRadius: '50%',
            background: aSangre ? 'rgba(255,255,255,0.94)' : colores.flecha,
            color: aSangre ? '#1C1614' : textoSobreAcento,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 12px rgba(0,0,0,0.18)',
          }}
        >
          <ArrowRight size={18} strokeWidth={2.4} />
        </span>
      )}
    </div>
  );
};

export default PromoCard;
