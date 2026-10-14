import { Fragment } from 'react';
import styled, { keyframes } from 'styled-components';
import { ChevronLeft, ChevronRight, ShoppingBag, Package, Heart, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import HeaderTienda from './HeaderTienda';
import PieTienda from './PieTienda';
import ProductCard from './ProductCard';
import { useDetalleProducto } from '../../hooks/useDetalleProducto';
import { unidadDe, piezasEnTexto } from '../../utils/unidades';
import { useIdioma } from '../../hooks/useIdioma';
import { foto, ANCHO } from '../../utils/fotos';
import { enlaceDeProducto, compartirEnlace } from '../../utils/compartir';
import { useAjustesCtx } from '../../context/AjustesContext';

/*
 * ============================================================
 * FICHA DE UN PRODUCTO — ProductDetailModal.jsx
 * ============================================================
 * La pantalla de UN producto: su foto, su precio y el botón de agregarlo.
 *
 * QUÉ SE ARREGLÓ AQUÍ
 *
 * 1. La barra de arriba era OTRA. Tenía su propio "Volver", unas migas de pan
 *    y un botón de "Ayuda" que no hacía nada: ni buscador, ni pasillos, ni
 *    dirección de entrega, ni carrito. Abrir un producto era salirse de la
 *    tienda. Ahora arriba va el MISMO HeaderTienda de la portada, igual que en
 *    Seccion e Impresiones, y esta pantalla deja de ser una isla.
 *
 * 2. La foto flotaba en un rectángulo gris enorme. La columna de la izquierda
 *    era `1fr` —unos 800px en un monitor— con la imagen limitada a 340px de
 *    alto: quedaba un cuadro gris del ancho de media pantalla con el producto
 *    perdido en el centro. Ahora la galería es un cuadrado acotado y centrado.
 *
 * 3. Las recomendaciones vivían DENTRO de la columna izquierda, debajo de la
 *    foto, mientras la ficha de la derecha era pegajosa. Al bajar a verlas, la
 *    mitad derecha de la pantalla quedaba vacía con un precio flotando solo.
 *    Ahora son una franja a todo el ancho, debajo de las dos columnas.
 *
 * 4. Los colores estaban a mano (#111, #F5F5F5, #888). Se pintaban igual en
 *    Navidad que en agosto, porque no pasaban por las variables de marca.
 *
 * La lógica —el candado del scroll, el "atrás", los recomendados, el +18 y el
 * corazón— vive en useDetalleProducto. Aquí solo se pinta.
 * ============================================================
 */

const aparecer = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const subir = keyframes`from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; }`;

/*
 * La capa que tapa la tienda. Ella es la que scrollea —por eso el hook le
 * congela el scroll al body— y por eso recibe el ref: al saltar de un producto
 * a otro hay que devolverla arriba.
 */
const Capa = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
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

/* ── Migas de pan ─────────────────────────────────────────── */

/*
 * La franja del "Volver". Va por FUERA del encabezado y no es pegajosa: el
 * encabezado ya lo es, y dos barras clavadas arriba se montan una sobre otra
 * —que es exactamente lo que pasaba antes—. Esta se va con el scroll, como en
 * Seccion.
 */
/*
 * Sin línea abajo. La tenía, y entre ella y la del encabezado las migas
 * quedaban metidas en un sándwich de dos rayas paralelas a 56px de distancia
 * —una franja que se anunciaba como si fuera una sección, cuando es solo el
 * camino de vuelta—. Con la del encabezado basta para separar la barra
 * pegajosa de lo que se desplaza; el respiro hasta la foto lo pone el padding
 * del contenido.
 */
const Franja = styled.div`
  background: var(--papel);
`;

const FranjaInterior = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 28px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 620px) { padding: 0 16px; gap: 10px; }
`;

/*
 * El botón de volver vive DENTRO de la página, no se deja a la flecha del
 * navegador. En el teléfono esa flecha queda lejos del pulgar, y en el kiosco
 * directamente no existe.
 */
const Volver = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: 1px solid var(--linea);
  border-radius: var(--radio-pill);
  padding: 8px 15px 8px 11px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--tinta);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color var(--dur-press) var(--ease-out),
              color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { border-color: var(--marca-600); color: var(--marca-texto-fuerte); }
  }
  &:active { transform: scale(0.97); }
`;

/*
 * Dónde estoy parado. En el teléfono se esconde: con el nombre del producto
 * completo ocupaba dos renglones y empujaba la foto fuera de la pantalla, que
 * es lo único que la persona vino a ver.
 */
const Migas = styled.nav`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 13px;
  color: var(--tinta-tenue);

  svg { flex-shrink: 0; opacity: 0.55; }

  @media (max-width: 780px) { display: none; }
`;

const MigaEnlace = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--tinta-suave);
  cursor: pointer;

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto); text-decoration: underline; }
  }
`;

/* El último escalón: se corta con puntos suspensivos en vez de partir la fila. */
const MigaActual = styled.span`
  color: var(--marca-texto-fuerte);
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/* ── El cuerpo ────────────────────────────────────────────── */

const Contenido = styled.main`
  flex: 1;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 34px 28px 48px;
  animation: ${subir} 0.24s var(--ease-out);

  @media (max-width: 620px) { padding: 22px 16px 36px; }
`;

/*
 * Las dos columnas de la ficha: la foto y lo que se puede hacer con ella.
 *
 * La segunda columna es FIJA en 420px y la primera se estira, pero con
 * minmax(0, 1fr) para que un nombre larguísimo sin espacios no le gane el
 * ancho a la otra. Debajo de 980px se apilan: a esa altura 420px de ficha
 * dejan a la foto en menos de la mitad de la pantalla.
 */
const Ficha = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 56px;
  align-items: start;

  @media (max-width: 1080px) { grid-template-columns: minmax(0, 1fr) 360px; gap: 36px; }
  @media (max-width: 980px)  { grid-template-columns: minmax(0, 1fr); gap: 28px; }
`;

/*
 * La foto, en un cuadrado acotado y centrado.
 *
 * El `max-width` es lo que arregla el rectángulo gris gigante: sin él, con
 * `1fr` de columna, el marco medía 800px de ancho por 380 de alto y el
 * producto quedaba flotando en medio de la nada.
 */
const Galeria = styled.div`
  position: relative;
  width: 100%;
  max-width: 540px;
  /*
   * Pegada a la IZQUIERDA, no centrada en su columna.
   *
   * Centrada dejaba unos 70px de aire a su izquierda, y en pantalla ancha eso
   * la desalineaba de todo lo demás: "Volver", las migas y "Del mismo pasillo"
   * arrancan en el borde del contenido y la foto arrancaba más adentro, como
   * si fuera de otra página. Al apilarse en pantalla angosta sí se centra —
   * ahí no hay borde con quien alinearse.
   */
  margin: 0;
  aspect-ratio: 1 / 1;
  background: var(--papel-gris);
  border: 1px solid var(--linea);
  border-radius: var(--radio-panel);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  @media (max-width: 980px) { max-width: 440px; margin: 0 auto; }
  /* En el teléfono se achata: un cuadrado de 375px de lado se come la pantalla
     entera y el precio queda debajo del pliegue. */
  @media (max-width: 620px) { aspect-ratio: 4 / 3; max-width: none; }
`;

const Foto = styled.img`
  max-width: 78%;
  max-height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 14px 30px rgba(28, 22, 20, 0.16));
`;

// El crédito de una foto que no es de la tienda (Open Food Facts lo pide en su licencia).
const CreditoFoto = styled.span`
  position: absolute;
  right: 14px;
  bottom: 10px;
  font-size: 11px;
  color: var(--tinta-tenue);
`;

const SinFoto = styled.div`
  color: var(--tinta-tenue);
  display: flex;
  align-items: center;
  justify-content: center;
`;

/* Los sellos de la esquina: cuánto se ahorra y si es de los que más se venden. */
const Sellos = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
`;

const Sello = styled.span`
  background: ${(p) => (p.$oferta ? 'var(--alerta)' : 'var(--marca-600)')};
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: var(--radio-pill);
`;

/*
 * El corazón. Se podía guardar un producto desde su tarjeta pero no desde su
 * ficha, que es justo donde uno termina de decidir si lo quiere.
 */
const Corazon = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--linea);
  background: var(--papel);
  color: ${(p) => (p.$activo ? 'var(--alerta)' : 'var(--tinta-tenue)')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--sombra-tarjeta);
  transition: color var(--dur-press) var(--ease-out),
              border-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  svg { fill: ${(p) => (p.$activo ? 'var(--alerta)' : 'none')}; }

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--alerta); border-color: var(--alerta); }
  }
  &:active { transform: scale(0.92); }
`;

/*
 * Compartir, debajo del corazón y con su misma forma: son las dos cosas que
 * se hacen con un producto que todavía no se va a comprar.
 */
const BotonCompartir = styled(Corazon)`
  top: 66px;
  color: var(--tinta-tenue);
  svg { fill: none; }

  @media (hover: hover) and (pointer: fine) {
    &:hover { color: var(--marca-texto); border-color: var(--marca-600); }
  }
`;

/* ── La ficha de la derecha ───────────────────────────────── */

const Panel = styled.div`
  min-width: 0;
`;

const Marca = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.1px;
  color: var(--marca-texto);
  margin-bottom: 7px;
`;

const Nombre = styled.h1`
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--tinta);
  margin: 0 0 14px;
  line-height: 1.22;

  @media (max-width: 620px) { font-size: 23px; }
`;

const Precios = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
`;

const PrecioHoy = styled.span`
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--tinta);
  line-height: 1;

  small { font-size: 14px; font-weight: 600; color: var(--tinta-tenue); }
`;

const PrecioAntes = styled.span`
  font-size: 16px;
  color: var(--tinta-tenue);
  text-decoration: line-through;
`;

/*
 * Hay o no hay. El cliente NO ve cuántas quedan: el inventario es asunto de la
 * tienda.
 */
const Existencia = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 13px;
  border-radius: var(--radio-pill);
  color: ${(p) => (p.$agotado ? 'var(--alerta)' : 'var(--exito)')};
  background: ${(p) => (p.$agotado
    ? 'color-mix(in srgb, var(--alerta) 12%, transparent)'
    : 'color-mix(in srgb, var(--exito) 12%, transparent)')};
`;

/*
 * El aviso de venta restringida. Rojo tenue y con borde: tiene que leerse como
 * una condición, no como una promoción más.
 */
const AvisoAdultos = styled.div`
  background: color-mix(in srgb, var(--alerta) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--alerta) 32%, transparent);
  color: var(--alerta-texto);
  border-radius: var(--radio-tarjeta);
  padding: 11px 14px;
  font-size: 12.5px;
  line-height: 1.55;
  margin: 4px 0 14px;
`;

const Agregar = styled.button`
  width: 100%;
  padding: 16px;
  background: var(--marca-600);
  color: #fff;
  border: none;
  border-radius: var(--radio-tarjeta);
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background-color var(--dur-press) var(--ease-out),
              transform var(--dur-press) var(--ease-out);

  @media (hover: hover) and (pointer: fine) {
    &:hover { background: var(--marca-700); }
  }
  &:active { transform: scale(0.985); }
  &:disabled {
    background: var(--banda);
    color: var(--tinta-tenue);
    cursor: not-allowed;
    transform: none;
  }
`;

const Descripcion = styled.div`
  margin-top: 24px;
  padding-top: 22px;
  border-top: 1px solid var(--linea);

  h2 {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--tinta-tenue);
    margin: 0 0 10px;
  }

  /*
   * pre-line respeta los enter que escribió quien cargó el producto. HTML
   * colapsa los saltos de línea por defecto, así que una descripción escrita
   * en renglones —"Peso: 500g" en uno, "Origen: nacional" en otro— salía toda
   * pegada en un párrafo. Es "pre-line" y no "pre" a propósito: respeta los
   * enter pero sigue acomodando el texto al ancho.
   */
  p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--tinta-suave);
    white-space: pre-line;
  }
`;

/* Categoría y unidad de venta, en dos renglones sobrios. */
const Datos = styled.dl`
  margin: 14px 0 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  font-size: 13px;

  dt { color: var(--tinta-tenue); }
  dd { margin: 0; color: var(--tinta); font-weight: 600; }
`;

/* ── Recomendaciones ──────────────────────────────────────── */

/*
 * A TODO el ancho y debajo de las dos columnas. Antes vivían dentro de la
 * columna de la foto, así que se veían en media pantalla mientras la otra
 * mitad quedaba en blanco.
 */
const Recomendados = styled.section`
  margin-top: 56px;
  padding-top: 32px;
  border-top: 1px solid var(--linea);
`;

const TituloRecs = styled.h2`
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--tinta);
  margin: 0 0 4px;
`;

const PieRecs = styled.p`
  font-size: 13.5px;
  color: var(--tinta-suave);
  margin: 0 0 20px;
`;

/* La misma cuadrícula de la tienda, para que las tarjetas se lean igual. */
const CuadriculaRecs = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
  gap: 16px;

  @media (max-width: 620px) { grid-template-columns: repeat(2, 1fr); gap: 12px; }
`;

/* ── Componente ───────────────────────────────────────────── */

const ProductDetailModal = ({
  producto,
  onClose,
  onAgregarAlCarrito,
  onVerProducto,
  todosLosProductos = [],
  /*
   * Por dónde pasó para llegar aquí: [{ etiqueta, alTocar }].
   *
   * Lo arma la PANTALLA, no la ficha. Solo ella sabe qué filtros tiene
   * puestos y cómo deshacerlos — el producto por sí solo no distingue "llegué
   * buscando fruta" de "me apareció en la portada". Si llega vacío, la ficha
   * dibuja un camino de un solo escalón hasta el producto, que es la verdad
   * cuando no hay nada más que contar. Ver useRastroTienda.
   */
  rastro = [],
  /*
   * Lo que el encabezado necesita de la pantalla que abrió esta ficha: el
   * pasillo, la búsqueda y el carrito. Es opcional a propósito — HeaderTienda
   * sabe arreglárselas sin ello (navega a la tienda, que es donde esas
   * acciones existen), igual que en Impresiones. Ver HeaderTienda.
   */
  header = {},
}) => {
  const {
    contenedor,
    imgError,
    marcarImagenRota,
    porLibra,
    soloAdultos,
    agotado,
    ahorro,
    tambienLlevan,
    recomendados,
    agregar,
    cerrar,
    esFavorito,
    alternarFavorito,
  } = useDetalleProducto({ producto, onClose, onAgregarAlCarrito, todosLosProductos });
  const { t } = useIdioma();
  const { ajustes } = useAjustesCtx();

  /*
   * La MISMA tarjeta que la tienda. Antes los recomendados tenían su propio
   * diseño —más chico, con el stock en inglés ("5 Left") y el click vacío,
   * literalmente un comentario donde debía abrirse el producto—. Reusarla
   * arregla las tres cosas de una y evita que dentro de la misma pantalla haya
   * dos formas de mostrar un producto.
   */
  const tarjetas = (lista) => lista.map((p, i) => (
    <ProductCard
      key={p.id}
      className="card-in"
      style={{ '--i': i }}
      producto={p}
      onVerDetalle={onVerProducto || (() => {})}
      onAgregarAlCarrito={onAgregarAlCarrito}
    />
  ));

  const compartir = async () => {
    const tienda = `${ajustes.nombreLinea1 || ''} ${ajustes.nombreLinea2 || ''}`.trim() || 'Tienda la 635';
    const precio = `$${Number(producto.precio).toFixed(2)}${porLibra ? '/lb' : ''}`;
    const resultado = await compartirEnlace({
      titulo: `${producto.nombre} · ${tienda}`,
      texto: t('{nombre} a {precio} en {tienda}', { nombre: producto.nombre, precio, tienda }),
      url: enlaceDeProducto(producto),
    });
    if (resultado === 'copiado') toast.success(t('Copiamos el enlace: pégalo donde quieras compartirlo'), { id: 'compartir' });
    if (resultado === 'error') toast.error(t('No se pudo copiar el enlace'), { id: 'compartir' });
  };

  /*
   * A dónde cae al cerrar: el último sitio por el que pasó. Si el rastro es
   * solo "Inicio" —o viene vacío— el botón se queda en "Volver" a secas, que
   * es lo honesto: prometer "Volver a Inicio" cuando cerrar puede devolver a
   * media portada scrolleada sería vender otra cosa.
   */
  const ultimoEscalon = rastro.length > 1 ? rastro[rastro.length - 1].etiqueta : null;

  return (
    <Capa ref={contenedor}>
      <Pagina>
        {/*
          El MISMO encabezado de la tienda. Aquí había una barra propia con un
          "Volver", unas migas y un botón de "Ayuda" que no estaba conectado a
          nada: quien abría un producto perdía de vista el buscador, los
          pasillos, su dirección y el carrito.
        */}
        <HeaderTienda {...header} />

        <Franja>
          <FranjaInterior>
            {/*
              El botón dice A DÓNDE vuelve. Cerrar la ficha no devuelve a la
              tienda entera: devuelve a la lista tal como estaba, y si venía
              filtrada, ahí cae. Un "Volver" a secas escondía eso — la persona
              apretaba sin saber si perdía el filtro que acababa de poner.
              El destino es el último escalón del camino, el mismo que se lee
              a la derecha.
            */}
            <Volver onClick={cerrar}>
              <ChevronLeft size={17} strokeWidth={2.4} />
              {ultimoEscalon ? t('Volver a {lugar}', { lugar: ultimoEscalon }) : t('Volver')}
            </Volver>

            {/*
              El camino de verdad, y no una frase fija.

              Antes decía siempre "Inicio › la categoría del producto", aunque
              la persona hubiera llegado buscando o desde "Más vendidos": le
              inventaba un paso que nunca dio. Y ninguno de los escalones se
              podía tocar, así que era un letrero y no un camino. Ahora sale
              del rastro que arma la pantalla —pasillo, categoría, búsqueda,
              promo— y cada escalón devuelve a su sitio. Ver useRastroTienda.
            */}
            <Migas aria-label={t('Ruta')}>
              {rastro.map((escalon) => (
                <Fragment key={escalon.etiqueta}>
                  <MigaEnlace onClick={() => { escalon.alTocar(); cerrar(); }}>{escalon.etiqueta}</MigaEnlace>
                  <ChevronRight size={13} strokeWidth={2.4} />
                </Fragment>
              ))}
              {/* El producto es el escalón en el que se está parado: no se
                  pinta como enlace porque no lleva a ningún lado. */}
              <MigaActual title={producto.nombre}>{producto.nombre}</MigaActual>
            </Migas>
          </FranjaInterior>
        </Franja>

        <Contenido>
          <Ficha>
            <Galeria>
              <Sellos>
                {ahorro > 0 && <Sello $oferta>-{ahorro}%</Sello>}
                {producto.esMasVendido && <Sello>{t('Los más vendidos')}</Sello>}
              </Sellos>

              <Corazon
                $activo={esFavorito}
                onClick={alternarFavorito}
                title={esFavorito ? t('Quitar de favoritos') : t('Guardar en favoritos')}
                aria-label={esFavorito ? t('Quitar de favoritos') : t('Guardar en favoritos')}
                aria-pressed={esFavorito}
              >
                <Heart size={19} strokeWidth={2.1} />
              </Corazon>

              <BotonCompartir
                type="button"
                onClick={compartir}
                title={t('Compartir este producto')}
                aria-label={t('Compartir este producto')}
              >
                <Share2 size={18} strokeWidth={2.1} />
              </BotonCompartir>

              {/*
                Una sola imagen: el producto tiene UNA foto. Antes había una
                tira de tres miniaturas que repetían la misma imagen, dando a
                entender que había varias vistas cuando no las hay.
              */}
              {producto.imagen && !imgError ? (
                <>
                  <Foto data-foto-detalle src={foto(producto.imagen, ANCHO.ficha)} alt={producto.nombre} onError={marcarImagenRota} />
                  {producto.fotoFuente && <CreditoFoto>{t('Foto: {fuente}', { fuente: producto.fotoFuente })}</CreditoFoto>}
                </>
              ) : (
                <SinFoto><Package size={84} strokeWidth={1.1} /></SinFoto>
              )}
            </Galeria>

            <Panel>
              {producto.marca && <Marca>{producto.marca}</Marca>}
              <Nombre>{producto.nombre}</Nombre>

              {/*
                Ojo con el "/lb": aquí hubo una vez un "$2.71/lb" CLAVADO, igual
                para el queso que para las Pringles, y se quitó por mentiroso.
                El de ahora sale del propio producto, solo aparece en los que de
                verdad se venden por peso, y el número es el que se cobra.
                Ver utils/unidades.js.
              */}
              <Precios>
                <PrecioHoy>
                  ${Number(producto.precio).toFixed(2)}
                  {porLibra && <small>/lb</small>}
                </PrecioHoy>
                {producto.precioAnterior && (
                  <PrecioAntes>${Number(producto.precioAnterior).toFixed(2)}</PrecioAntes>
                )}
                <Existencia $agotado={agotado}>
                  {agotado ? t('Agotado') : t('✓ En existencia')}
                </Existencia>
              </Precios>

              {/*
                El aviso de +18 va ANTES del botón, no después: enterarse de que
                le van a pedir documento cuando el repartidor ya está en la
                puerta es la peor manera de saberlo. Y se dice completo —qué se
                pide y qué pasa si no lo tiene— porque media advertencia no
                advierte.
              */}
              {soloAdultos && (
                <AvisoAdultos>
                  <strong>{t('Solo para mayores de 18 años.')}</strong> {t('Te pedirán tu documento de identidad al entregar el pedido. Sin él, este producto no se puede entregar.')}
                </AvisoAdultos>
              )}

              {/*
                "Añadir al carrito" y punto, también en los que se venden por
                peso. Decía "Añadir una libra al carrito": era exacto, pero
                nadie lee un botón, lo reconoce — y un botón que cambia de
                largo y de texto según el producto hay que volver a leerlo
                cada vez. Cuánto se lleva ya lo dice el "/lb" del precio, y se
                ajusta en el carrito.
              */}
              <Agregar onClick={agregar} disabled={agotado}>
                <ShoppingBag size={18} strokeWidth={2.2} />
                {agotado ? t('Agotado por ahora') : t('Añadir al carrito')}
              </Agregar>

              {/*
                Cómo se vende, dicho con todas sus letras. "Por libra" al lado
                del "/lb" del precio no es repetirse: uno explica al otro, y es
                la diferencia entre pedir un queso y pedir una libra de queso.
                El renglón de las piezas solo sale si el producto las declara.
              */}
              <Datos>
                <dt>{t('Categoría')}</dt>
                <dd>{producto.categoria}</dd>
                <dt>{t('Se vende')}</dt>
                <dd>{t(unidadDe(producto).nombre)}</dd>
                {piezasEnTexto(producto) && (
                  <>
                    <dt>{t('Presentación')}</dt>
                    <dd>{piezasEnTexto(producto, t)}</dd>
                  </>
                )}
              </Datos>

              {/*
                Aquí decía "100% Natural" en TODOS los productos, incluidos el
                cloro y las Pringles. Era una afirmación sobre la mercadería que
                la tienda nunca hizo y que en varios casos es falsa. Ahora solo
                se muestra lo que la tienda de verdad escribió.
              */}
              {producto.descripcion && (
                <Descripcion>
                  <h2>{t('Sobre el producto')}</h2>
                  <p>{producto.descripcion}</p>
                </Descripcion>
              )}
            </Panel>
          </Ficha>

          {/* Lo que más se lleva con este en un mismo pedido. Ver utils/tambienLlevan.js. */}
          {tambienLlevan.length > 0 && (
            <Recomendados aria-labelledby="titulo-tambien-llevan">
              <TituloRecs id="titulo-tambien-llevan">{t('Quien compra esto también lleva')}</TituloRecs>
              <PieRecs>{t('Lo que más se lleva en el mismo pedido.')}</PieRecs>
              <CuadriculaRecs>{tarjetas(tambienLlevan)}</CuadriculaRecs>
            </Recomendados>
          )}

          {recomendados.length > 0 && (
            <Recomendados aria-labelledby="titulo-mismo-pasillo">
              <TituloRecs id="titulo-mismo-pasillo">{t('Del mismo pasillo')}</TituloRecs>
              <PieRecs>{t('Más de {categoria}, por si andaba viendo.', { categoria: producto.categoria ? producto.categoria.toLowerCase() : t('la tienda') })}</PieRecs>
              <CuadriculaRecs>{tarjetas(recomendados)}</CuadriculaRecs>
            </Recomendados>
          )}
        </Contenido>

        {/* El cierre de la página: sin esto el contenido se acababa y quedaba
            el blanco, como si la ficha se hubiera cortado a medias. */}
        <PieTienda />
      </Pagina>
    </Capa>
  );
};

export default ProductDetailModal;
