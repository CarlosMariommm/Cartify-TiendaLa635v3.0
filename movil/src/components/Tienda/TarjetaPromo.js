// TARJETA DE PROMOCIÓN
// La cara de una promoción, copiada de `PromoCard.jsx`: el sello del ahorro, cuánto le queda, el
// título y la descripción, sobre el degradado de su tema y con su icono de marca de agua al fondo.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
// El Image de expo-image y no el de react-native: el nativo no decodifica
// WebP/AVIF de forma fiable, y los banners que sube la tienda pueden venir en
// .webp desde Cloudinary.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { coloresDePromo, difuminadoDelFondo, puntoEnDiagonal } from '../../utils/temasPromo';
import { glifoDePromo, MaterialCommunityIcons } from '../../utils/iconosPromo';
import { Flecha, Reloj } from '../UI/Iconos';
import { useIdioma } from '../../context/IdiomaContext';
import { foto, ANCHO } from '../../utils/fotos';

// La misma proporción que la web (2.2:1), para que el texto respire igual.
export const PROPORCION = 2.2;

// Lo que en CSS es clamp(min, valor, max).
const entre = (min, valor, max) => Math.max(min, Math.min(valor, max));

// El color del fondo justo donde empieza la foto (54% del ancho, a media altura). El degradado de
// la tarjeta va en diagonal, así que ahí ya no es ni el primer color ni el último: con el último a
// secas quedaba un corte visible a la izquierda de la foto. Ver difuminadoDelFondo.
const T_BORDE_FOTO = puntoEnDiagonal(0.54, 0.5, PROPORCION);

// Hasta este ancho la tarjeta es "angosta": la web lo decide con una consulta @container de 380 px
// (index.css, .promo-titulo). Ahí la descripción se va, los sellos no se parten en dos filas y el
// título le deja lugar a la flecha.
const ANGOSTA = 380;

const TarjetaPromo = ({ promo, etiqueta, vencimiento, ancho, mostrarFlecha = true }) => {
  const { t } = useIdioma();
  const [fallóImagen, setFallóImagen] = useState(false);
  const colores = coloresDePromo(promo);

  const hayImagen = !!promo?.image && !fallóImagen;
  const aSangre = hayImagen && promo.imagenCompleta;
  const acompaña = hayImagen && !promo.imagenCompleta;

  // Sobre fondos oscuros el texto es blanco; el acento entonces necesita letra oscura para que se
  // lea. Es la misma cuenta que hace la web.
  const textoSobreAcento = colores.texto === '#FFFFFF' ? '#3D2B1A' : colores.texto;

  const glifo = glifoDePromo(promo?.icono);
  // La marca de agua se dibuja siempre que haya icono y NO haya foto. Con foto serían dos cosas
  // peleando por la mitad derecha de la tarjeta.
  const marcaDeAgua = !!glifo && !hayImagen;
  const alto = ancho / PROPORCION;

  // La letra se mide contra el ancho de ESTA tarjeta, con las mismas cuentas que la web (cqw = 1%
  // del ancho). En el carrusel la tarjeta es angosta y con las letras fijas de antes el texto se
  // salía por abajo.
  const angosta = ancho <= ANGOSTA;
  const medidas = {
    relleno: entre(16, ancho * 0.045, 40),
    sello: entre(10, ancho * 0.03, 16),
    vence: entre(9, ancho * 0.024, 13),
    titulo: angosta ? entre(15, ancho * 0.066, 22) : entre(14, ancho * 0.06, 32),
    descripcion: entre(11, ancho * 0.03, 16),
  };

  // Los dos colores del degradado, o el gris de respaldo cuando la promo trae
  // su banner completo y el degradado no se ve.
  const degradado = aSangre ? ['#EDE7E0', '#EDE7E0'] : colores.colores;

  return (
    // El primer color del degradado va TAMBIÉN como fondo del contenedor, y no es redundante: es lo
    // que sostiene la tarjeta si el degradado no llega a pintarse. Sin esto el modo de fallo es el
    // peor posible.
    <View
      style={[estilos.tarjeta, { width: ancho, height: alto, backgroundColor: degradado[0] }]}
    >
      {/* El degradado va de la esquina de arriba a la izquierda a la de abajo a la derecha: es lo que en
         CSS es `135deg`, que es lo que usa la web. */}
      <LinearGradient
        colors={degradado}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {marcaDeAgua && (
        <View style={estilos.marcaDeAgua} pointerEvents="none">
          <MaterialCommunityIcons
            name={glifo}
            // El 31% del ANCHO, como en la web (31cqw). Atado al ancho de la tarjeta y no a un número fijo: la
            // misma pieza se pinta a 600 px en una tableta y a 300 en un teléfono, y un icono de 90 px se ve
            // discreto en la primera y enorme en la segunda.
            size={ancho * 0.31}
            color={colores.acento}
          />
        </View>
      )}

      {/* La foto va a la derecha y ENCIMA, un degradado del color del fondo que va de opaco (a la
         izquierda de la foto) a transparente (al 46%): así se funde con la tarjeta en vez de cortarse
         con un borde duro, como el `maskImage` de la web. El degradado encima se pinta siempre. */}
      {acompaña && (
        <View style={estilos.imagenAcompana} pointerEvents="none">
          <Image
            source={{ uri: foto(promo.image, ANCHO.promo) }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            onError={() => setFallóImagen(true)}
            accessible={false}
          />
          <LinearGradient
            colors={difuminadoDelFondo(degradado, T_BORDE_FOTO)}
            locations={[0, 0.46]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {aSangre ? (
        <Image
          source={{ uri: foto(promo.image, ANCHO.promo) }}
          contentFit="cover"
          style={estilos.imagenCompleta}
          onError={() => setFallóImagen(true)}
          accessibilityLabel={promo.title || promo.promoDescription || t('Promoción')}
        />
      ) : (
        <View style={[estilos.contenido, { padding: medidas.relleno }]}>
          {(!!etiqueta || !!vencimiento) && (
            // Angosta, los sellos van en UNA fila: si se partían en dos le quitaban un renglón al título. La
            // fecha es la que se recorta.
            <View style={[estilos.filaSellos, angosta && estilos.filaSellosAngosta]}>
              {!!etiqueta && (
                <View style={[estilos.sello, { backgroundColor: colores.acento }]}>
                  {/* El mismo icono, en chiquito: acompaña al ahorro. */}
                  {!!glifo && (
                    <MaterialCommunityIcons name={glifo} size={medidas.sello} color={textoSobreAcento} />
                  )}
                  <Text style={[estilos.selloTexto, { color: textoSobreAcento, fontSize: medidas.sello }]} numberOfLines={1}>
                    {etiqueta}
                  </Text>
                </View>
              )}

              {/* La urgencia va junto al ahorro: es la mitad del argumento. */}
              {!!vencimiento && (
                <View style={[estilos.vence, { borderColor: colores.acento }, angosta && estilos.venceAngosta]}>
                  {!angosta && <Reloj size={11} color={colores.texto} grosor={1.3} />}
                  <Text
                    style={[estilos.venceTexto, { color: colores.texto, fontSize: medidas.vence }, angosta && estilos.venceTextoAngosta]}
                    numberOfLines={1}
                  >
                    {vencimiento}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text
            style={[
              estilos.titulo,
              {
                color: colores.texto,
                maxWidth: acompaña ? '62%' : '100%',
                fontSize: medidas.titulo,
                lineHeight: Math.round(medidas.titulo * 1.12),
              },
              // La flecha redonda vive abajo a la derecha: el título no se le mete.
              angosta && mostrarFlecha && !acompaña && { paddingRight: 40 },
            ]}
            // Tope de dos líneas: un título largo empujaba la descripción fuera
            // de la tarjeta en vez de cortarse.
            numberOfLines={2}
          >
            {promo?.title || t('Su promoción se verá aquí')}
          </Text>

          {/* En la tarjeta angosta no cabe: la web también la esconde. */}
          {!!promo?.promoDescription && !angosta && (
            <Text
              style={[
                estilos.descripcion,
                {
                  color: colores.texto,
                  maxWidth: acompaña ? '58%' : '78%',
                  fontSize: medidas.descripcion,
                  lineHeight: Math.round(medidas.descripcion * 1.35),
                },
              ]}
              numberOfLines={2}
            >
              {promo.promoDescription}
            </Text>
          )}
        </View>
      )}

      {/* Las de los lados del carrusel no la llevan: tocarlas las trae al centro. */}
      {mostrarFlecha && (
        <View
          style={[
            estilos.flecha,
            { backgroundColor: aSangre ? 'rgba(255,255,255,0.94)' : colores.flecha },
          ]}
        >
          <Flecha size={16} color={aSangre ? '#2A1A0E' : textoSobreAcento} />
        </View>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  tarjeta: {
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    // Sombra bajita y en dos intenciones: `elevation` es la de Android y shadow* la de iOS. Una sola
    // mancha fuerte se veía como una alfombra sucia debajo de la tarjeta, sobre todo con varias
    // seguidas.
    elevation: 3,
    shadowColor: '#5A3719',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  // Pegada a la derecha y centrada en vertical, como en la web. Va con la opacidad puesta en el
  // contenedor y no en el color del icono: así el mismo 17% vale para cualquier acento, sin tener
  // que armar un rgba a mano por cada tema.
  marcaDeAgua: {
    position: 'absolute',
    right: '5%',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    opacity: 0.17,
  },
  imagenAcompana: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '46%',
  },
  imagenCompleta: {
    width: '100%',
    height: '100%',
  },
  // El relleno y los tamaños de letra los pone `medidas`, según el ancho.
  contenido: {},
  filaSellos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  filaSellosAngosta: {
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 8,
  },
  sello: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  selloTexto: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  vence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  // Angosta, la fecha cede el lugar: se recorta con "…" antes que empujar.
  venceAngosta: {
    flexShrink: 1,
    minWidth: 0,
  },
  venceTexto: {
    fontWeight: '600',
    opacity: 0.92,
  },
  venceTextoAngosta: {
    flexShrink: 1,
  },
  titulo: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  descripcion: {
    marginTop: 6,
    opacity: 0.85,
  },
  flecha: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
});

export default TarjetaPromo;
