import { useRef, useState } from 'react';
import { Package, Lock } from 'lucide-react';
import styled from 'styled-components';
import { useFavoritosCtx } from '../../context/FavoritosContext';
import { useEdad } from '../../context/EdadContext';
import { esPorLibra, esSoloAdultos, piezasEnTexto } from '../../utils/unidades';
import { useIdioma } from '../../hooks/useIdioma';
import { foto, ANCHO } from '../../utils/fotos';

// Paleta del diseño (WEB.pdf), medida sobre el mockup.
const BROWN = 'var(--marca-600)';

const Card = styled.div`
  background: var(--papel);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  /* El levantarse dura más que un "press" (350ms y no 160): es la misma tarjeta de la landing page,
     que sube despacio y con la sombra difusa de abajo, no un salto. */
  transition: background-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), border-color 300ms var(--ease-out), transform 350ms var(--ease-out), box-shadow 350ms var(--ease-out);
  border: 1px solid var(--linea);
  display: flex;
  flex-direction: column;

  /* El levantarse al pasar el cursor es solo del ratón: en pantalla táctil un toque deja el hover
     pegado, y la tarjeta se quedaba flotando y con sombra después de haberla soltado, como si
     siguiera seleccionada. */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: transparent;
      box-shadow: 0 18px 40px -18px rgba(0, 26, 41, 0.28);
      transform: translateY(-5px);
    }
  }

  /* Lo que el dedo sí recibe a cambio: el hundido al apretar. */
  &:active { transform: scale(0.98); }
`;

// El recuadro de la foto: un panel redondeado DENTRO de la tarjeta, con aire blanco alrededor, en
// vez de la imagen pegada a los bordes de arriba. No es adorno: el marco le da a cada producto el
// mismo escenario.
const ImageWrapper = styled.div`
  background: var(--papel-gris);
  height: 165px;
  margin: 10px 10px 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  /* El margen interno que hace que todas las fotos respiren igual */
  padding: 14px;
`;

const ProductImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  /* contain y no cover: con cover el navegador recorta lo que le sobra para llenar la caja, y a una
     foto vertical le comía la mitad — a la pera se le perdía la punta y a las uvas los bordes. */
  object-fit: contain;
  transition: transform 600ms var(--ease-out);

  /* La foto se acerca y se ladea un poco, como en la landing page. */
  @media (hover: hover) and (pointer: fine) {
    ${Card}:hover & {
      transform: scale(1.08) rotate(-4deg);
    }
  }
`;

// Cobertura de los productos +18: tapa la foto con desenfoque hasta que la persona confirme su
// edad.
const CoberturaEdad = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(28, 22, 20, 0.72);
  backdrop-filter: blur(6px);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  text-align: center;
  padding: 10px;
  z-index: 3;
`;

/* Marcador de producto sin foto: icono de línea, no un emoji de sistema. */
const ImageFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tinta-tenue);
  user-select: none;
`;

// El corazón y la etiqueta se anclan a la TARJETA, no al recuadro: si fueran hijos del recuadro,
// el margen nuevo los empujaría hacia adentro y quedarían flotando en medio de la foto.
const WishlistButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--papel);
  border: none;
  font-size: 17px;
  cursor: pointer;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transition: background-color var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), transform var(--dur-press) var(--ease-out), box-shadow var(--dur-press) var(--ease-out);
  z-index: 2;
  color: ${props => props.$liked ? '#ff4d6d' : 'var(--tinta-apagada)'};

  /* El corazón mide 34px porque a 34px se ve bien: más grande le robaría protagonismo a la foto del
     producto. Pero un dedo necesita 44px, y entre los clientes hay personas mayores. */
  @media (pointer: coarse) {
    &::after {
      content: '';
      position: absolute;
      inset: -5px;
    }
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: scale(1.15);
      color: #ff4d6d;
    }
  }
  &:active { transform: scale(0.92); }

  /* El corazón mide 34px y con el dedo eso se falla — y fallarlo aquí no es inocente: el toque cae
     en la tarjeta y abre el producto. Se le agranda el área de toque con un rectángulo invisible,
     sin tocar lo que se ve: 34px es lo que el diseño pide, 46px es lo que el pulgar necesita. */
  @media (pointer: coarse), (max-width: 560px) {
    &::after {
      content: '';
      position: absolute;
      inset: -6px;
    }
  }
`;

const BestSellerBadge = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  background: ${BROWN};
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: var(--radio-pill);
  letter-spacing: 0.2px;
  z-index: 2;
`;

const CardBody = styled.div`
  padding: 12px 14px 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ProductBrand = styled.div`
  font-size: 10px;
  color: var(--tinta-tenue);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
`;

const ProductName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--tinta);
  margin-bottom: 2px;
  line-height: 1.3;
`;

// El nombre es el botón que abre el producto. Con el mouse da igual —la tarjeta entera responde al
// clic—, pero la tarjeta es un div y el teclado no llega a un div: sin esto, quien navega con Tab
// saltaba de corazón en "+" sin poder abrir nunca un producto. Se ve igual que el texto que era.
const NombreBoton = styled.button`
  all: unset;
  cursor: pointer;
  border-radius: 4px;

  &:focus-visible {
    outline: 2px solid var(--marca-600);
    outline-offset: 2px;
  }
`;

/* En el diseño el "quedan N" siempre va en rojo: es lo que empuja a comprar.
   El token de alerta y no los naranjas que había (#E0763F daba 2,9:1): a 11 px
   la letra tiene que llegar a 4,5:1. Lo escaso, además, en negrita. */
const StockInfo = styled.div`
  font-size: 11px;
  font-weight: ${props => (props.$bajoStock ? 700 : 500)};
  color: var(--alerta);
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 3px;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
`;

const PriceBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const OldPrice = styled.span`
  font-size: 11px;
  color: var(--tinta-tenue);
  text-decoration: line-through;
  line-height: 1;
`;

const NewPrice = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: var(--tinta);
  line-height: 1.1;
`;

// El "/lb" va más chico y más tenue que el número: acompaña al precio, no compite con él. Del
// mismo tamaño se leería como parte de la cifra.
const PorUnidad = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--tinta-tenue);
  margin-left: 1px;
`;

/* Cuántas trae el paquete. Va debajo del precio, chiquito: acompaña, no compite. */
const Contenido = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--tinta-tenue);
  margin-top: 1px;
`;

// El +18. Va en el rojo de los avisos y no en el café de la marca: no es una característica que se
// presume, es una condición para poder comprarlo.
const Marca18 = styled.span`
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: var(--radio-pill);
  background: var(--alerta);
  color: var(--sobre-alerta);
  font-size: 10px;
  font-weight: 800;
  vertical-align: middle;
`;

// En el diseño este botón es NEGRO, no café. Es a propósito: el acento de la marca es el café, y
// el negro hace que la acción de agregar resalte sobre él en vez de competirle.
const AddButton = styled.button`
  background: var(--tinta);
  color: var(--sobre-tinta);
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-size: 21px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), transform var(--dur-press) var(--ease-out), box-shadow var(--dur-press) var(--ease-out);
  flex-shrink: 0;
  line-height: 1;
  position: relative;

  /* Agregar al carrito es LA acción de la tienda, y con el pulgar medía 38px. Mismo truco que el
     corazón: el cuadro negro se queda en 38 —que es lo que pide el diseño— y el área que responde al
     dedo llega a 44. */
  @media (pointer: coarse) {
    &::after {
      content: '';
      position: absolute;
      inset: -3px;
    }
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: var(--marca-600);
      color: #fff;
      transform: scale(1.08);
    }
  }

  &:active {
    transform: scale(0.9);
  }

  /* Mismo criterio que el corazón: 38px se ven, 48px se tocan. Este botón es
     el que mete el producto al carrito — errarle cuesta una venta. */
  @media (pointer: coarse), (max-width: 560px) {
    &::after {
      content: '';
      position: absolute;
      inset: -5px;
    }
  }
`;

// Acepta className/style para que la grilla pueda escalonar su entrada.
const ProductCard = ({ producto, onVerDetalle, onAgregarAlCarrito, className, style }) => {
  // El corazón sale del contexto, no de un useState local: así lo que se marcó queda guardado en la
  // cuenta y sigue encendido al volver mañana.
  const { esFavorito, alternar } = useFavoritosCtx();
  const liked = esFavorito(producto.id);
  const [imgError, setImgError] = useState(false);
  // De aquí sale la foto que vuela al carrito (ver utils/volarAlCarrito.js).
  const fotoRef = useRef(null);

  // Candado +18: si el producto es restringido y aún no confirmó su edad, se
  // tapa y cada intento (ver o agregar) pasa antes por la confirmación.
  const { mayorConfirmado, pedirConfirmacion } = useEdad();
  const { t } = useIdioma();
  const tapado = esSoloAdultos(producto) && !mayorConfirmado;

  const bajoStock = producto.stock < 10;

  const verDetalle = () => {
    if (tapado) { pedirConfirmacion(() => onVerDetalle(producto)); return; }
    onVerDetalle(producto);
  };

  const handleClickCard = (e) => {
    if (e.target.closest('.add-button')) return;
    if (e.target.closest('.wishlist-button')) return;
    verDetalle();
  };

  const handleNombre = (e) => {
    e.stopPropagation();
    verDetalle();
  };

  const handleAgregar = (e) => {
    e.stopPropagation();
    if (tapado) { pedirConfirmacion(() => onAgregarAlCarrito(producto)); return; }
    // Vuela la foto sola; sin foto (el ícono de paquete), el recuadro entero.
    const origen = fotoRef.current?.querySelector('img') || fotoRef.current;
    onAgregarAlCarrito(producto, 1, { origen });
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    alternar(producto.id, producto.nombre);
  };

  return (
    <Card onClick={handleClickCard} className={className} style={style}>
      {producto.promo && (
        <BestSellerBadge>
          {producto.promo.type === 'nxm'
            ? `${producto.promo.buyQty}x${producto.promo.payQty}`
            : producto.promo.type === 'descuento'
              ? `-${producto.promo.discount}%`
              : producto.promo.type === 'anuncio'
                ? (producto.promo.etiqueta || t('Nuevo'))
                : t('Oferta')}
        </BestSellerBadge>
      )}
      <WishlistButton
        className="wishlist-button"
        onClick={handleWishlist}
        $liked={liked}
        aria-label={t('Guardar {nombre} en favoritos', { nombre: producto.nombre })}
        aria-pressed={liked}
      >
        {/* El símbolo solo se ve: el lector lo leía "palo de corazones". */}
        <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
      </WishlistButton>

      <ImageWrapper ref={fotoRef}>
        {producto.imagen && !imgError ? (
          <ProductImage
            src={foto(producto.imagen, ANCHO.tarjeta)}
            alt={producto.nombre}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImageFallback><Package size={38} strokeWidth={1.4} /></ImageFallback>
        )}

        {tapado && (
          <CoberturaEdad>
            <Lock size={20} />
            <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>{t('Mayores de 18')}</span>
            <span style={{ fontSize: 10.5, opacity: 0.85, lineHeight: 1.25 }}>{t('Toca para confirmar tu edad')}</span>
          </CoberturaEdad>
        )}
      </ImageWrapper>

      <CardBody>
        <ProductBrand>{producto.marca}</ProductBrand>
        <ProductName>
          <NombreBoton type="button" onClick={handleNombre}>{producto.nombre}</NombreBoton>
          {/* +18 pegado al nombre: es una condición para comprarlo, no un
              adorno. Mejor enterarse aquí que en la puerta de la casa. */}
          {esSoloAdultos(producto) && <Marca18>+18</Marca18>}
        </ProductName>
        {/* Solo se avisa cuando se está acabando o cuando ya no hay. Poner "100 disponibles" en cada
           tarjeta le enseña el inventario al cliente sin que le sirva de nada; lo que sí lo mueve es saber
           que quedan pocas. */}
        {producto.stock === 0 ? (
          <StockInfo $bajoStock>{t('Agotado')}</StockInfo>
        ) : bajoStock ? (
          <StockInfo $bajoStock>{t('¡Quedan pocas!')}</StockInfo>
        ) : null}

        <PriceRow>
          <PriceBlock>
            {producto.precioAnterior && (
              <OldPrice>${Number(producto.precioAnterior).toFixed(2)}</OldPrice>
            )}
            {/* El "/lb" pegado al precio y no en un renglón aparte: es parte del precio, no un dato adicional.
               Sin él, "$1.25" en un tomate se lee como lo que cuesta ese tomate — y eso es cobrar una cosa
               aparentando otra. Ver utils/unidades.js. */}
            <NewPrice>
              ${Number(producto.precio).toFixed(2)}
              {esPorLibra(producto) && <PorUnidad>/lb</PorUnidad>}
            </NewPrice>
            {/* "Trae 6 unidades" debajo del precio: sin eso, $3.00 se lee igual para un six-pack que para una
               lata suelta, y el cliente no tiene cómo comparar. Solo sale si la tienda lo declaró. */}
            {!esPorLibra(producto) && piezasEnTexto(producto) && (
              <Contenido>{piezasEnTexto(producto, t)}</Contenido>
            )}
          </PriceBlock>
          <AddButton
            className="add-button"
            onClick={handleAgregar}
            aria-label={t('Agregar {nombre} al carrito', { nombre: producto.nombre })}
          >
            <span aria-hidden="true">+</span>
          </AddButton>
        </PriceRow>
      </CardBody>
    </Card>
  );
};

export default ProductCard;