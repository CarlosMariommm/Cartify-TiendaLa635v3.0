import { createElement, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { ChevronLeft, Clock, Tag, ArrowRight, MapPin } from 'lucide-react';
import HeaderTienda from './HeaderTienda';
import PieTienda from './PieTienda';
import ProductCard from './ProductCard';
import { coloresDePromo } from '../../utils/temasPromo';
import { iconoDePromo } from '../../utils/iconosPromo';
import { etiquetaPromo, textoVencimiento, promoVencida } from '../../utils/promos';
import { useIdioma } from '../../hooks/useIdioma';
import { foto, ANCHO } from '../../utils/fotos';

// UNA PROMOCIÓN, A PANTALLA COMPLETA — PromoDetailModal.jsx
// Lo que se abre al tocar un banner del carrusel. Una caja dentro de una caja: la promo, que es lo
// que la persona quería ver en grande, quedaba del mismo tamaño que en el carrusel.

const aparecer = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const subir = keyframes`from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; }`;

// Por debajo de la ficha de producto (1000): desde aquí se puede abrir un producto, y ese tiene
// que quedar encima, no debajo. El carrito (1050) y el asistente también quedan por encima, que se
// abren desde este encabezado.
const Capa = styled.div`
  position: fixed;
  inset: 0;
  z-index: 900;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--papel);
  animation: ${aparecer} 0.18s var(--ease-out);
`;

const Pagina = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--papel);
`;

/* ── La promo, a todo el ancho ────────────────────────────── */

const Portada = styled.section`
  position: relative;
  overflow: hidden;
  background: ${(p) => p.$fondo};
  color: ${(p) => p.$texto};
`;

const PortadaInterior = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1240px;
  min-height: clamp(340px, 52vh, 520px);
  margin: 0 auto;
  padding: 20px 28px 48px;
  display: flex;
  flex-direction: column;

  @media (max-width: 620px) {
    min-height: 420px;
    padding: 14px 16px 30px;
  }
`;

// El botón de volver vive DENTRO de la página, igual que en la ficha de producto: en el teléfono
// la flecha del navegador queda lejos del pulgar, y en el kiosco directamente no existe. Toma el
// color del texto de la promo para leerse sobre cualquier tema.
const Volver = styled.button`
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: 1px solid currentColor;
  border-radius: var(--radio-pill);
  padding: 8px 15px 8px 11px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: inherit;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { opacity: 1; }
  }
  &:active { transform: scale(0.97); }

  /* En el teléfono la foto sube detrás del botón: ahí necesita fondo propio */
  @media (max-width: 620px) {
    ${(p) => p.$sobreFoto && `
      background: rgba(255, 255, 255, 0.94);
      border-color: transparent;
      color: #1c1614;
      opacity: 1;
    `}
  }
`;

// Sobre una imagen a sangre el borde no alcanza: la foto puede ser clara u oscura en esa esquina.
// Ahí el botón lleva su propio fondo.
const VolverSobreFoto = styled(Volver)`
  position: absolute;
  top: 20px;
  left: max(28px, calc((100% - 1240px) / 2 + 28px));
  z-index: 2;
  background: rgba(255, 255, 255, 0.94);
  border-color: transparent;
  color: #1c1614;
  opacity: 1;

  @media (max-width: 620px) { top: 14px; left: 16px; }
`;

const Texto = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: ${(p) => (p.$conFoto ? '54%' : '680px')};
  padding-top: 28px;
  animation: ${subir} 0.24s var(--ease-out);

  /* En el teléfono la foto sube arriba y el texto baja al pie de la portada */
  @media (max-width: 620px) {
    max-width: 100%;
    justify-content: flex-end;
  }
`;

const Sellos = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const Sello = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: ${(p) => (p.$fuerte ? 800 : 600)};
  white-space: nowrap;
  background: ${(p) => (p.$fuerte ? p.$acento : 'transparent')};
  color: ${(p) => (p.$fuerte ? p.$sobreAcento : 'inherit')};
  border: 1px solid ${(p) => p.$acento};
`;

const Titulo = styled.h1`
  font-size: clamp(30px, 4.6vw, 58px);
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.025em;
  margin: 0;
  text-wrap: balance;
`;

const Bajada = styled.p`
  font-size: clamp(15px, 1.5vw, 19px);
  line-height: 1.5;
  opacity: 0.88;
  margin: 16px 0 0;
  max-width: 560px;
  text-wrap: pretty;
`;

// La marca de agua: el icono de la promo en grande, apenas visible, detrás del texto. Es la misma
// idea que en el banner del carrusel (PromoCard).
const MarcaDeAgua = styled.span`
  position: absolute;
  right: max(4%, calc((100% - 1240px) / 2));
  top: 50%;
  transform: translateY(-50%);
  width: clamp(200px, 30vw, 420px);
  height: clamp(200px, 30vw, 420px);
  opacity: 0.17;
  line-height: 0;
  pointer-events: none;
  z-index: 0;

  @media (max-width: 620px) {
    top: 28%;
    right: -6%;
    width: 220px;
    height: 220px;
  }
`;

// La foto que acompaña al texto se funde con el fondo hacia la izquierda, como en el carrusel. En
// el teléfono no hay lado que darle: sube arriba y se funde hacia abajo, y el texto se lee debajo.
const FotoAcompana = styled.img`
  position: absolute;
  top: 0;
  right: 0;
  width: 48%;
  height: 100%;
  object-fit: cover;
  mask-image: linear-gradient(to right, transparent 0%, #000 42%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 42%);
  z-index: 0;

  @media (max-width: 620px) {
    width: 100%;
    height: 62%;
    mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 40%, transparent 100%);
  }
`;

// El banner diseñado completo (1200 × 480) ya trae su texto: se muestra entero y a todo el ancho,
// sin recortarle nada.
const FotoASangre = styled.img`
  display: block;
  width: 100%;
  max-height: 72vh;
  object-fit: cover;
  animation: ${aparecer} 0.24s var(--ease-out);
`;

/* ── Lo que entra en la promo ─────────────────────────────── */

const Contenido = styled.main`
  flex: 1;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 30px 28px 56px;
  animation: ${subir} 0.24s var(--ease-out);

  @media (max-width: 620px) { padding: 22px 16px 40px; }
`;

// Solo cuando la portada es una imagen: su texto no se puede leer como texto.
const TituloTexto = styled.h1`
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--tinta);
  margin: 0 0 8px;
`;

const BajadaTexto = styled.p`
  font-size: 15px;
  line-height: 1.5;
  color: var(--tinta-suave);
  margin: 0 0 14px;
  max-width: 640px;
`;

// Los datos sueltos —cuántos productos, en qué pasillo— van en una línea de texto y no en
// pastillas ni recuadros: son para leer de pasada. "Lo encontrás en": La 635 es una tienda de
// verdad, y saber que el 2x1 está en Lácteos le ahorra al cliente dar vueltas buscándolo.
const Datos = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  font-size: 14px;
  color: var(--tinta-suave);

  span { display: inline-flex; align-items: center; gap: 6px; }
  svg { flex-shrink: 0; color: var(--marca-texto); }
  strong { color: var(--tinta); font-weight: 700; }
`;

const TituloSeccion = styled.h2`
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--tinta);
  margin: 30px 0 16px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 18px;

  @media (max-width: 620px) { grid-template-columns: repeat(2, 1fr); gap: 12px; }
`;

const Vacio = styled.p`
  margin: 0;
  color: var(--tinta-tenue);
  font-size: 15px;
`;

const VerTienda = styled.button`
  margin-top: 30px;
  padding: 14px 26px;
  border: none;
  border-radius: 999px;
  background: var(--marca-600);
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: var(--marca-700); }
  }
  &:active { transform: scale(0.97); }
`;

// El icono elegido para la promo. Sale de una tabla fija (iconosPromo), no se fabrica en cada
// render; va con createElement para que el linter no lo confunda con un componente creado al
// vuelo.
const IconoPromo = ({ icono, ...props }) => {
  const Icono = iconoDePromo(icono);
  return Icono ? createElement(Icono, props) : null;
};

/* ── Componente ───────────────────────────────────────────── */

const PromoDetailModal = ({
  promo,
  productos = [],
  onCerrar,
  onVerEnTienda,
  onVerProducto,
  onAgregarAlCarrito,
  // Lo que el encabezado necesita de la tienda: el pasillo, la búsqueda y el carrito. Igual que en
  // la ficha de producto. Ver HeaderTienda.
  header = {},
}) => {
  const { t, locale } = useIdioma();
  // UN SOLO SCROLL: esta capa scrollea por dentro, y sin congelar el de la tienda de atrás quedaban
  // dos barras peleando. Mismo candado que la ficha de producto; como las dos guardan lo que había
  // antes, abrir un producto desde aquí y cerrarlo devuelve el candado de la promo intacto.
  useEffect(() => {
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflowPrevio; };
  }, []);

  if (!promo) return null;

  const colores = coloresDePromo(promo);
  const etiqueta = etiquetaPromo(promo, t);
  const vencimiento = textoVencimiento(promo, t, locale);
  const vencida = promoVencida(promo);

  const imagen = promo.image;
  const aSangre = !!imagen && !!promo.imagenCompleta;   // el banner diseñado manda solo
  const acompana = !!imagen && !promo.imagenCompleta;   // la foto acompaña al texto
  const hayIcono = !!iconoDePromo(promo.icono);

  // Sobre fondos oscuros el texto es blanco; el acento entonces necesita
  // letra oscura para leerse (y al revés en el tema claro). Igual que PromoCard.
  const textoSobreAcento = colores.texto === '#FFFFFF' ? '#101820' : colores.texto;

  // Pasillos distintos donde vive lo de la promo. Se sacan de los productos ya mapeados (cada uno
  // trae su `modulo`), así que no hace falta pedir nada más. Se ordenan para que "Lácteos ·
  // Panadería" salga siempre igual y no baile.
  const pasillos = [...new Set(productos.map((p) => p.modulo).filter(Boolean))].sort();

  return (
    <Capa role="dialog" aria-modal="true" aria-label={promo.title || t('Promoción')}>
      <Pagina>
        <HeaderTienda {...header} />

        {aSangre ? (
          <Portada $fondo="#ECE7E1" $texto="#1c1614">
            <VolverSobreFoto onClick={onCerrar}>
              <ChevronLeft size={17} strokeWidth={2.4} />
              {t('Volver')}
            </VolverSobreFoto>
            <FotoASangre src={foto(imagen, ANCHO.promo)} alt={promo.title || promo.promoDescription || t('Promoción')} draggable={false} />
          </Portada>
        ) : (
          <Portada $fondo={colores.fondo} $texto={colores.texto}>
            {acompana && <FotoAcompana src={foto(imagen, ANCHO.promo)} alt="" aria-hidden="true" draggable={false} />}
            {hayIcono && !imagen && (
              <MarcaDeAgua aria-hidden="true" style={{ color: colores.acento }}>
                <IconoPromo icono={promo.icono} size="100%" strokeWidth={1.6} />
              </MarcaDeAgua>
            )}

            <PortadaInterior>
              <Volver onClick={onCerrar} $sobreFoto={acompana}>
                <ChevronLeft size={17} strokeWidth={2.4} />
                {t('Volver')}
              </Volver>

              <Texto $conFoto={acompana}>
                {(etiqueta || vencimiento) && (
                  <Sellos>
                    {etiqueta && (
                      <Sello $fuerte $acento={colores.acento} $sobreAcento={colores.fondo.startsWith('linear') ? textoSobreAcento : colores.texto}>
                        {hayIcono ? <IconoPromo icono={promo.icono} size="1em" strokeWidth={2.6} /> : <Tag size={14} strokeWidth={2.4} />}
                        {etiqueta}
                      </Sello>
                    )}
                    {/* La urgencia va junto al ahorro: es la mitad del argumento */}
                    {vencimiento && (
                      <Sello $acento={colores.acento}>
                        <Clock size={14} strokeWidth={2.4} />
                        {vencimiento}
                      </Sello>
                    )}
                  </Sellos>
                )}

                <Titulo>{promo.title || t('Promoción')}</Titulo>
                {/* Aquí va completa: en el carrusel se corta a dos renglones */}
                {promo.promoDescription && <Bajada>{promo.promoDescription}</Bajada>}
              </Texto>
            </PortadaInterior>
          </Portada>
        )}

        <Contenido>
          {aSangre && (
            <>
              <TituloTexto>{promo.title || t('Promoción')}</TituloTexto>
              {promo.promoDescription && <BajadaTexto>{promo.promoDescription}</BajadaTexto>}
            </>
          )}

          <Datos>
            {aSangre && etiqueta && (
              <span><Tag size={15} strokeWidth={2.3} /><strong>{etiqueta}</strong></span>
            )}
            {aSangre && vencimiento && (
              <span><Clock size={15} strokeWidth={2.3} />{vencimiento}</span>
            )}
            <span>
              <strong>{productos.length}</strong> {productos.length === 1 ? t('producto') : t('productos')}
            </span>
            {pasillos.length > 0 && (
              <span>
                <MapPin size={15} strokeWidth={2.3} />
                {pasillos.length === 1 ? t('Lo encontrás en') : t('Lo encontrás en los pasillos')}
                <strong>{pasillos.join(' · ')}</strong>
              </span>
            )}
          </Datos>

          <TituloSeccion>{t('Productos en esta promoción')}</TituloSeccion>

          {productos.length === 0 ? (
            <Vacio>
              {vencida
                ? t('Esta promoción ya venció.')
                : t('Los productos de esta promoción no están disponibles en este momento.')}
            </Vacio>
          ) : (
            <Grid>
              {productos.map((producto, i) => (
                <ProductCard
                  key={producto.id}
                  className="card-in"
                  style={{ '--i': i }}
                  producto={producto}
                  onVerDetalle={onVerProducto}
                  onAgregarAlCarrito={onAgregarAlCarrito}
                />
              ))}
            </Grid>
          )}

          {productos.length > 0 && (
            <VerTienda onClick={onVerEnTienda}>
              {t('Ver todos en la tienda')}
              <ArrowRight size={17} strokeWidth={2.4} />
            </VerTienda>
          )}
        </Contenido>

        <PieTienda />
      </Pagina>
    </Capa>
  );
};

export default PromoDetailModal;
