// TARJETA DE PRODUCTO
// La cara de un producto en la portada. Copia de `frontend/src/components/Store/ProductCard.jsx`,
// con una ausencia a propósito: el crecer al pasar el cursor.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
// El Image de expo-image y no el de react-native: el nativo no decodifica
// WebP/AVIF de forma fiable (sobre todo en Android), y las fotos de producto
// se sirven desde Cloudinary en .webp. Ver AGENTS.md y los docs de SDK 54.
import { Image } from 'expo-image';
import { Lock } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useFavoritos } from '../../context/FavoritosContext';
import { useEdad } from '../../context/EdadContext';
import { Corazon, Mas, Paquete } from '../UI/Iconos';
import { esPorLibra, esSoloAdultos, piezasEnTexto } from '../../utils/unidades';
import { useIdioma } from '../../context/IdiomaContext';
import { foto, ANCHO } from '../../utils/fotos';

// El rojo del corazón encendido. No sale del tema: es el rojo de "me gusta" de
// toda la vida, y en Navidad —donde el acento YA es rojo— un corazón del color
// del tema se confundiría con el sello de la promoción.
const ROJO_FAVORITO = '#FF4D6D';

// El sello de la promo, con las mismas palabras que la web.
const selloDePromo = (promo, t) => {
  if (!promo) return null;
  if (promo.type === 'nxm') return `${promo.buyQty}x${promo.payQty}`;
  if (promo.type === 'descuento') return `-${promo.discount}%`;
  if (promo.type === 'anuncio') return t(promo.etiqueta || 'Nuevo');
  return t('Oferta');
};

// Entrada escalonada al aparecer, calcada de `.card-in` en index.css: un fundido con un empujón de
// 8px hacia arriba, 260ms, con la MISMA fórmula de retraso por posición (45ms por tarjeta, tope de
// 8) para que la cuadrícula entre en cascada y no de golpe.
const DURACION_ENTRADA = 260;
const RETRASO_POR_TARJETA = 45;
const TOPE_RETRASO = 8;

const TarjetaProducto = ({ producto, alVerDetalle, alAgregar, indice = 0 }) => {
  const { t } = useIdioma();
  const [fallóImagen, setFallóImagen] = useState(false);
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { esFavorito, alternar } = useFavoritos();

  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: DURACION_ENTRADA,
      delay: Math.min(indice, TOPE_RETRASO) * RETRASO_POR_TARJETA,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    // Solo al montar: la tarjeta no tiene que volver a entrar porque cambió
    // de posición en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Candado +18: si el producto es restringido y todavía no se confirmó la edad EN NINGÚN LADO de la
  // app (esto es un solo interruptor global, no uno por producto), la foto se tapa y cada intento
  // —ver o agregar— pasa antes por pedirConfirmacion. Igual que ProductCard.jsx en la web.
  const { mayorConfirmado, pedirConfirmacion } = useEdad();
  const tapado = esSoloAdultos(producto) && !mayorConfirmado;

  const bajoStock = producto.stock < 10;
  const sello = selloDePromo(producto.promo, t);
  const contenido = !esPorLibra(producto) ? piezasEnTexto(producto, t) : null;
  const marcado = esFavorito(producto.id);

  const alTocarTarjeta = () => {
    if (tapado) { pedirConfirmacion(() => alVerDetalle?.(producto)); return; }
    alVerDetalle?.(producto);
  };

  // De aquí sale la foto que vuela al carrito (ver utils/volarAlCarrito.js).
  const marcoRef = useRef(null);

  const alTocarAgregar = () => {
    const conVuelo = () => alAgregar?.(producto, 1, { origenRef: marcoRef });
    if (tapado) { pedirConfirmacion(conVuelo); return; }
    conVuelo();
  };

  return (
    <Animated.View
      style={{
        width: '100%',
        opacity: entrada,
        transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
    <Pressable
      onPress={alTocarTarjeta}
      accessibilityRole="button"
      accessibilityLabel={
        tapado
          ? t('{nombre}, producto para mayores de edad, toca para confirmar tu edad', { nombre: producto.nombre })
          : `${producto.nombre}, $${Number(producto.precio).toFixed(2)}`
      }
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.tarjetaPresionada]}
    >
      <View ref={marcoRef} style={estilos.marcoImagen}>
        {producto.imagen && !fallóImagen ? (
          <Image
            source={{ uri: foto(producto.imagen, ANCHO.tarjeta) }}
            // `contain` y no `cover`: con cover se recorta lo que sobra para llenar la caja, y a una foto
            // vertical le come la mitad. Las fotos vienen de mil tamaños distintos (unas del proveedor, otras
            // del celular), así que ninguna caja fija les queda bien a todas.
            contentFit="contain"
            style={estilos.imagen}
            onError={() => setFallóImagen(true)}
          />
        ) : (
          <Paquete size={38} />
        )}

        {/* La web tapa con un desenfoque (backdrop-filter: blur); aquí un panel oscuro semitransparente
           hace el mismo trabajo —esconder la foto hasta confirmar— sin traer expo-blur solo para este
           candado. */}
        {tapado && (
          <View style={estilos.coberturaEdad}>
            <Lock size={18} color="#FFFFFF" />
            <Text style={estilos.coberturaTitulo}>{t('Mayores de 18')}</Text>
            <Text style={estilos.coberturaTexto}>{t('Toca para confirmar tu edad')}</Text>
          </View>
        )}
      </View>

      {/* El sello va anclado a la TARJETA y no al marco de la foto: dentro del marco, el relleno lo
         empujaría hacia adentro y quedaría flotando en medio de la imagen. */}
      {sello && (
        <View style={[estilos.sello, { backgroundColor: colores.marca }]}>
          <Text style={estilos.selloTexto} numberOfLines={1}>{sello}</Text>
        </View>
      )}

      {/* El corazón. Mide 32 y se toca con `hitSlop` hasta 44: el diseño pide que sea discreto —no puede
         robarle protagonismo a la foto— pero un pulgar necesita 44, y fallarlo aquí no es inocente,
         porque el toque cae en la tarjeta y abre el producto en vez de marcar el favorito. */}
      <Pressable
        onPress={() => alternar(producto.id, producto.nombre)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ selected: marcado }}
        accessibilityLabel={
          marcado ? t('Quitar {nombre} de favoritos', { nombre: producto.nombre }) : t('Guardar {nombre} en favoritos', { nombre: producto.nombre })
        }
        style={({ pressed }) => [estilos.corazon, pressed && estilos.corazonPresionado]}
      >
        <Corazon size={16} color={marcado ? ROJO_FAVORITO : COLORES.tintaApagada} />
      </Pressable>

      <View style={estilos.cuerpo}>
        {!!producto.marca && (
          <Text style={estilos.marca} numberOfLines={1}>{producto.marca.toUpperCase()}</Text>
        )}

        <View style={estilos.filaNombre}>
          <Text style={estilos.nombre} numberOfLines={2}>{producto.nombre}</Text>
          {/* El +18 pegado al nombre: es una condición para comprarlo, no un adorno. Mejor enterarse aquí que
             en la puerta de la casa. */}
          {esSoloAdultos(producto) && (
            <View style={estilos.marca18}>
              <Text style={estilos.marca18Texto}>+18</Text>
            </View>
          )}
        </View>

        {/* Solo se avisa cuando se está acabando o cuando ya no hay. Poner "100 disponibles" en cada
           tarjeta le enseña el inventario al cliente sin que le sirva de nada; lo que sí lo mueve es saber
           que quedan pocas. */}
        {producto.stock === 0 ? (
          <Text style={estilos.stock}>{t('Agotado')}</Text>
        ) : bajoStock ? (
          <Text style={estilos.stock}>{t('¡Quedan pocas!')}</Text>
        ) : null}

        <View style={estilos.filaPrecio}>
          <View style={estilos.bloquePrecio}>
            {!!producto.precioAnterior && (
              <Text style={estilos.precioViejo}>${Number(producto.precioAnterior).toFixed(2)}</Text>
            )}
            {/* El "/lb" pegado al precio y no en un renglón aparte: es parte del precio, no un dato adicional.
               Sin él, "$1.25" en un tomate se lee como lo que cuesta ese tomate. Ver utils/unidades.js. */}
            <Text style={estilos.precio} numberOfLines={1}>
              ${Number(producto.precio).toFixed(2)}
              {esPorLibra(producto) && <Text style={estilos.porUnidad}>/lb</Text>}
            </Text>
            {!!contenido && <Text style={estilos.contenido}>{contenido}</Text>}
          </View>

          {/* El botón es NEGRO, no café: el acento de la marca es el café, y el negro hace que la acción de
             agregar resalte sobre él en vez de competirle. `hitSlop` es el equivalente del rectángulo
             invisible que la web le pone con un pseudo-elemento: el cuadro se ve de 38 y se toca de 48. */}
          <Pressable
            onPress={alTocarAgregar}
            disabled={producto.stock === 0}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('Agregar {nombre} al carrito', { nombre: producto.nombre })}
            style={({ pressed }) => [
              estilos.botonMas,
              pressed && estilos.botonMasPresionado,
              producto.stock === 0 && estilos.botonMasApagado,
            ]}
          >
            <Mas size={15} color={COLORES.sobreTinta} />
          </Pressable>
        </View>
      </View>
    </Pressable>
    </Animated.View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  tarjeta: {
    backgroundColor: COLORES.fondo,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.linea,
    overflow: 'hidden',
    // `width: '100%'` y NO `flex: 1`, aunque flex sea lo que uno escribe. Quien manda el ancho es la
    // celda que la envuelve —flexible en la cuadrícula, fija de 160 en la fila de "Más vendidos"— y la
    // tarjeta solo lo llena.
    width: '100%',
  },
  tarjetaPresionada: {
    transform: [{ scale: 0.98 }],
    borderColor: COLORES.lineaCard,
  },
  // El marco de la foto: un panel redondeado DENTRO de la tarjeta, con aire alrededor. No es adorno
  // — le da a cada producto el mismo escenario. Con fotos de proveedores distintos la fila se veía
  // despareja; encuadradas todas igual, la vista compara productos en vez de tropezar con las fotos.
  marcoImagen: {
    backgroundColor: COLORES.papelGris,
    height: 130,
    margin: 8,
    marginBottom: 0,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  // El candado +18: tapa la foto entera (marcoImagen ya recorta con
  // overflow:hidden, así que esto sale con las mismas esquinas redondas).
  coberturaEdad: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 22, 20, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 3,
  },
  coberturaTitulo: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  coberturaTexto: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },
  sello: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    // Deja sitio al corazón de la derecha: sin el tope, un "Fresquitos" largo
    // se le metía debajo.
    maxWidth: '60%',
    zIndex: 2,
  },
  corazon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORES.papelAlto,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  corazonPresionado: {
    transform: [{ scale: 0.9 }],
  },
  selloTexto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cuerpo: {
    padding: 10,
    paddingTop: 9,
    flex: 1,
  },
  marca: {
    fontSize: 9.5,
    color: COLORES.iconoCampo,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  filaNombre: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  nombre: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORES.tinta,
    lineHeight: 17,
    flexShrink: 1,
  },
  // El +18 va en el rojo de los avisos y no en el café de la marca: no es una característica que se
  // presume, es una condición para poder comprarlo. Fijo también en oscuro: con el texto blanco
  // encima, el rojo aclarado del modo oscuro ya no se lee.
  marca18: {
    backgroundColor: '#FF4D4F',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 1,
  },
  marca18Texto: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  // En el diseño el aviso de existencias siempre va en rojo: es lo que empuja
  // a comprar.
  stock: {
    fontSize: 10.5,
    fontWeight: '500',
    color: COLORES.alerta,
    marginTop: 3,
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 10,
    gap: 6,
  },
  bloquePrecio: {
    flexShrink: 1,
  },
  precioViejo: {
    fontSize: 10.5,
    color: COLORES.marcador,
    textDecorationLine: 'line-through',
  },
  precio: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORES.tinta,
  },
  // El "/lb" más chico y más tenue que el número: acompaña al precio, no
  // compite con él. Del mismo tamaño se leería como parte de la cifra.
  porUnidad: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORES.textoTenue,
  },
  contenido: {
    fontSize: 10.5,
    fontWeight: '500',
    color: COLORES.textoTenue,
    marginTop: 1,
  },
  botonMas: {
    backgroundColor: COLORES.tituloFuerte,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // En oscuro el botón es claro, y lo que responde al dedo se ilumina.
  botonMasPresionado: {
    backgroundColor: COLORES.oscuro ? '#FFFFFF' : '#000000',
    transform: [{ scale: 0.95 }],
  },
  // El "+" de un producto agotado va GRIS, no en el café apagado de la marca. Ese café es el del
  // botón deshabilitado de las pantallas de sesión, y en una tienda pintada de verde por Navidad un
  // botón marrón no se lee como "apagado": se lee como un color suelto que nadie eligió.
  botonMasApagado: {
    backgroundColor: COLORES.tintaApagada,
  },
});

export default TarjetaProducto;
