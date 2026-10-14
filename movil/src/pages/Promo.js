/*
 * ============================================================
 * UNA PROMOCIÓN, A PANTALLA COMPLETA — Promo.js
 * ============================================================
 * Lo que se abre al tocar un banner del carrusel, igual que en la web
 * (PromoDetailModal.jsx en teléfono): arriba la promo a todo el ancho con sus
 * colores —sin bordes ni sombra, es el fondo de la página— con "‹ Volver",
 * sus sellos, el título y la descripción completa; debajo cuántos productos
 * entran y en qué pasillo están, los productos y "Ver todos en la tienda".
 *
 * Antes era una hoja encima de la tienda con el banner metido como tarjeta:
 * una caja dentro de una caja, y la promo, que es lo que se quería ver en
 * grande, quedaba del mismo tamaño que en el carrusel.
 *
 * La foto que acompaña sube arriba y se funde hacia abajo con el fondo (en el
 * teléfono no hay lado que darle), y el texto se lee al pie de la portada.
 * ============================================================
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Clock, MapPin, Tag } from 'lucide-react-native';
import { useColores, useEstilos } from '../context/ModoContext';
import { useTema } from '../context/TemaContext';
import { useTienda } from '../context/TiendaContext';
import { useIdioma } from '../context/IdiomaContext';
import BotonVolver from '../components/UI/BotonVolver';
import CuadriculaProductos from '../components/Tienda/CuadriculaProductos';
import { coloresDePromo, difuminadoDelFondo, puntoEnDiagonal } from '../utils/temasPromo';
import { glifoDePromo, MaterialCommunityIcons } from '../utils/iconosPromo';
import { etiquetaPromo, promoVencida, textoVencimiento } from '../utils/promos';
import { idsDePromo } from '../utils/catalogo';
import { foto, ANCHO } from '../utils/fotos';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { MARGEN_CATALOGO } from '../utils/disposicion';
import { avisarActividad } from '../utils/actividadUsuario';

// Alto mínimo de la portada en el teléfono, como la web (420 px).
const ALTO_PORTADA = 420;
// La foto que acompaña ocupa el 62% de arriba de la portada.
const ALTO_FOTO = 0.62;

const Promo = ({ route, navigation }) => {
  const { t } = useIdioma();
  const { colores: tema } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { width: anchoPantalla } = useWindowDimensions();
  const { promociones, productos, agregarAlCarrito, verPromoEnTienda } = useTienda();
  const [fallóImagen, setFallóImagen] = useState(false);

  const id = String(route.params?.id ?? '');
  const promo = (promociones || []).find((p) => String(p._id) === id);

  /*
   * Los productos salen del catálogo ya mapeado, no de promo.items, para que
   * se vean con su precio de oferta y su existencia de ahora: los mismos que
   * verá en la tienda.
   */
  const productosDePromo = useMemo(() => {
    if (!promo) return [];
    const ids = idsDePromo(promo).map(String);
    return productos.filter((p) => ids.includes(String(p.id)));
  }, [productos, promo]);

  const volver = () => navigation.goBack();
  const verProducto = (p) => navigation.navigate('Producto', { id: String(p.id) });

  if (!promo) {
    return (
      <View style={estilos.pantalla}>
        <View style={[estilos.franjaSola, { paddingTop: ALTURA_ESTADO + 10 }]}>
          <BotonVolver alPresionar={volver} />
        </View>
        <Text style={estilos.vacio}>{t('Esta promoción ya venció.')}</Text>
      </View>
    );
  }

  const colores = coloresDePromo(promo);
  const etiqueta = etiquetaPromo(promo, t);
  const vencimiento = textoVencimiento(promo, t);
  const vencida = promoVencida(promo);
  const hayImagen = !!promo.image && !fallóImagen;
  const aSangre = hayImagen && !!promo.imagenCompleta;
  const acompaña = hayImagen && !promo.imagenCompleta;
  const glifo = glifoDePromo(promo.icono);
  const textoSobreAcento = colores.texto === '#FFFFFF' ? '#101820' : colores.texto;

  /*
   * Pasillos distintos donde vive lo de la promo, ordenados para que
   * "Lácteos · Panadería" salga siempre igual. Una tienda de verdad: saber
   * que el 2x1 está en Lácteos ahorra dar vueltas buscándolo.
   */
  const pasillos = [...new Set(productosDePromo.map((p) => p.modulo).filter(Boolean))].sort();

  // El color del fondo donde termina la foto que acompaña, para fundirla.
  const proporcionPortada = anchoPantalla / ALTO_PORTADA;
  const difuminado = difuminadoDelFondo(colores.colores, puntoEnDiagonal(0.5, ALTO_FOTO, proporcionPortada));

  const sellos = (!!etiqueta || !!vencimiento) && (
    <View style={estilos.sellos}>
      {!!etiqueta && (
        <View style={[estilos.sello, { backgroundColor: colores.acento, borderColor: colores.acento }]}>
          {glifo ? (
            <MaterialCommunityIcons name={glifo} size={15} color={textoSobreAcento} />
          ) : (
            <Tag size={14} strokeWidth={2.4} color={textoSobreAcento} />
          )}
          <Text style={[estilos.selloTexto, estilos.selloFuerte, { color: textoSobreAcento }]}>{etiqueta}</Text>
        </View>
      )}
      {/* La urgencia va junto al ahorro: es la mitad del argumento. */}
      {!!vencimiento && (
        <View style={[estilos.sello, { borderColor: colores.acento }]}>
          <Clock size={14} strokeWidth={2.4} color={colores.texto} />
          <Text style={[estilos.selloTexto, { color: colores.texto }]}>{vencimiento}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.scroll} onScrollBeginDrag={avisarActividad}>
        {aSangre ? (
          /* El banner diseñado completo ya trae su texto: se muestra entero. */
          <View style={[estilos.portadaFoto, { paddingTop: ALTURA_ESTADO }]}>
            <Image
              source={{ uri: foto(promo.image, ANCHO.promo) }}
              contentFit="cover"
              style={estilos.fotoASangre}
              onError={() => setFallóImagen(true)}
              accessibilityLabel={promo.title || promo.promoDescription || t('Promoción')}
            />
            <View style={[estilos.volverFlotante, { top: ALTURA_ESTADO + 14 }]}>
              <BotonVolver alPresionar={volver} sobreFoto />
            </View>
          </View>
        ) : (
          <View style={[estilos.portada, { backgroundColor: colores.colores[0] }]}>
            <LinearGradient colors={colores.colores} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

            {acompaña && (
              <View style={[estilos.fotoAcompana, { height: `${ALTO_FOTO * 100}%` }]} pointerEvents="none">
                <Image
                  source={{ uri: foto(promo.image, ANCHO.promo) }}
                  contentFit="cover"
                  style={StyleSheet.absoluteFill}
                  onError={() => setFallóImagen(true)}
                  accessible={false}
                />
                <LinearGradient
                  colors={[difuminado[1], difuminado[0]]}
                  locations={[0.4, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            )}

            {!!glifo && !hayImagen && (
              <View style={estilos.marcaDeAgua} pointerEvents="none">
                <MaterialCommunityIcons name={glifo} size={220} color={colores.acento} />
              </View>
            )}

            <View style={[estilos.portadaInterior, { paddingTop: ALTURA_ESTADO + 14 }]}>
              <BotonVolver alPresionar={volver} color={colores.texto} sobreFoto={acompaña} />
              <View style={estilos.texto}>
                {sellos}
                <Text style={[estilos.titulo, { color: colores.texto }]}>{promo.title || t('Promoción')}</Text>
                {/* Aquí va completa: en el carrusel se corta a dos renglones. */}
                {!!promo.promoDescription && (
                  <Text style={[estilos.bajada, { color: colores.texto }]}>{promo.promoDescription}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={[estilos.contenido, contenidoCentrado]}>
          {aSangre && (
            <>
              <Text style={estilos.tituloTexto}>{promo.title || t('Promoción')}</Text>
              {!!promo.promoDescription && <Text style={estilos.bajadaTexto}>{promo.promoDescription}</Text>}
            </>
          )}

          {/* Los datos sueltos van en texto, no en pastillas: son para leer de pasada. */}
          <View style={estilos.datos}>
            {aSangre && !!etiqueta && (
              <View style={estilos.dato}>
                <Tag size={15} strokeWidth={2.3} color={tema.marcaTexto} />
                <Text style={estilos.datoFuerte}>{etiqueta}</Text>
              </View>
            )}
            {aSangre && !!vencimiento && (
              <View style={estilos.dato}>
                <Clock size={15} strokeWidth={2.3} color={tema.marcaTexto} />
                <Text style={estilos.datoTexto}>{vencimiento}</Text>
              </View>
            )}
            <Text style={estilos.datoTexto}>
              <Text style={estilos.datoFuerte}>{productosDePromo.length}</Text>{' '}
              {productosDePromo.length === 1 ? t('producto') : t('productos')}
            </Text>
            {pasillos.length > 0 && (
              <View style={estilos.dato}>
                <MapPin size={15} strokeWidth={2.3} color={tema.marcaTexto} />
                <Text style={estilos.datoTexto}>
                  {pasillos.length === 1 ? t('Lo encuentras en') : t('Lo encuentras en los pasillos')}{' '}
                  <Text style={estilos.datoFuerte}>{pasillos.join(' · ')}</Text>
                </Text>
              </View>
            )}
          </View>

          <Text style={estilos.tituloSeccion}>{t('Productos en esta promoción')}</Text>

          {productosDePromo.length === 0 ? (
            <Text style={estilos.vacioTexto}>
              {vencida
                ? t('Esta promoción ya venció.')
                : t('Los productos de esta promoción no están disponibles en este momento.')}
            </Text>
          ) : (
            <CuadriculaProductos productos={productosDePromo} alVerDetalle={verProducto} alAgregar={agregarAlCarrito} />
          )}

          {/*
            "Ver todos en la tienda" deja la portada filtrada a esta promo y
            vuelve a ella: la misma lista, con el resto de la tienda alrededor.
          */}
          {productosDePromo.length > 0 && (
            <Pressable
              onPress={() => {
                verPromoEnTienda(promo);
                volver();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                estilos.verTienda,
                { backgroundColor: pressed ? tema.marcaOscuro : tema.marca },
              ]}
            >
              <Text style={estilos.verTiendaTexto}>{t('Ver todos en la tienda')}</Text>
              <ArrowRight size={17} strokeWidth={2.4} color={COLORES.sobreMarca || '#FFFFFF'} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  scroll: {
    paddingBottom: 40,
  },
  franjaSola: {
    paddingHorizontal: MARGEN_CATALOGO,
    paddingBottom: 10,
  },
  vacio: {
    padding: 24,
    fontSize: 15,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  portada: {
    minHeight: ALTO_PORTADA,
    overflow: 'hidden',
  },
  portadaInterior: {
    flex: 1,
    minHeight: ALTO_PORTADA,
    paddingHorizontal: MARGEN_CATALOGO,
    paddingBottom: 30,
  },
  // En el teléfono la foto sube arriba y el texto baja al pie de la portada.
  texto: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 28,
  },
  fotoAcompana: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  marcaDeAgua: {
    position: 'absolute',
    top: '18%',
    right: '-6%',
    opacity: 0.17,
  },
  sellos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sello: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  selloTexto: {
    fontSize: 14,
    fontWeight: '600',
  },
  selloFuerte: {
    fontWeight: '800',
  },
  titulo: {
    fontSize: 31,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  bajada: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.88,
  },
  portadaFoto: {
    backgroundColor: '#ECE7E1',
  },
  fotoASangre: {
    width: '100%',
    aspectRatio: 2.5,
  },
  volverFlotante: {
    position: 'absolute',
    left: MARGEN_CATALOGO,
  },
  contenido: {
    paddingHorizontal: MARGEN_CATALOGO,
    paddingTop: 22,
  },
  tituloTexto: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: COLORES.tituloFuerte,
    marginBottom: 8,
  },
  bajadaTexto: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORES.textoSuave,
    marginBottom: 14,
  },
  datos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 18,
    rowGap: 6,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  datoTexto: {
    fontSize: 14,
    color: COLORES.textoSuave,
    flexShrink: 1,
  },
  datoFuerte: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  tituloSeccion: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: COLORES.tituloFuerte,
    marginTop: 28,
    marginBottom: 16,
  },
  vacioTexto: {
    fontSize: 15,
    color: COLORES.textoTenue,
  },
  verTienda: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  verTiendaTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default Promo;
