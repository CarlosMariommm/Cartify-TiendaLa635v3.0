/*
 * ============================================================
 * DETALLE DE PRODUCTO
 * ============================================================
 * Hoy solo la abre Tiqui (Asistente.js, "muéstrame las manzanas"): ahí la
 * persona está hablando con ella y cambiar de pantalla le cortaría la charla.
 * En el resto de la tienda un producto es su propia página, como en la web
 * (pages/Producto.js).
 *
 * La foto en grande, el precio y de ahí al carrito. Es la versión corta de
 * `ProductDetailModal.jsx`: se dejaron fuera las reseñas y "Del mismo
 * pasillo", que no entran en una hoja. Sí está "Quien compra esto también
 * lleva", en una fila que se desliza de lado (ver utils/tambienLlevan.js).
 *
 * ── Una diferencia con la web, a propósito ──
 *
 * La web agrega de uno en uno: su botón llama a `onAgregarAlCarrito(producto, 1)`
 * y punto. Aquí hay un selector de cantidad, y se mueve al PASO de la unidad
 * del producto: de uno en uno las piezas, de media en media las libras.
 *
 * No es un capricho. En la web, quien quiere media libra de queso abre el
 * carrito y la corrige ahí; en un teléfono ese viaje son dos pantallas de ida
 * y dos de vuelta. Y agregar "1" a un producto que se vende por peso, cuando
 * el propio sistema sabe que su paso es 0.5, es hacer que el cliente pida más
 * de lo que quería. Ver utils/unidades.js.
 * ============================================================
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// El Image de expo-image y no el de react-native: el nativo no decodifica
// WebP/AVIF de forma fiable, y las fotos vienen de Cloudinary en .webp.
import { Image } from 'expo-image';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useEdad } from '../../context/EdadContext';
import Boton from '../UI/Boton';
import { Compartir, Equis, Mas, Menos, Paquete } from '../UI/Iconos';
import { URL_WEB_LEGAL } from '../../utils/legales';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import { cantidadConUnidad, esPorLibra, esSoloAdultos, pasoDe, piezasEnTexto, ajustarCantidad } from '../../utils/unidades';
import { AIRE_ABAJO_MINIMO, ALTURA_BARRA_FLOTANTE } from '../UI/BarraInferior';
import { useIdioma } from '../../context/IdiomaContext';
import { foto, ANCHO } from '../../utils/fotos';
import { hojaCentrada } from '../../theme/pantalla';
import { useTienda } from '../../context/TiendaContext';
import { cargarTambienLlevan } from '../../api/tiendaApi';
import { elegirTambienLlevan } from '../../utils/tambienLlevan';

/*
 * `conBarraFlotante`: true solo cuando quien abre este detalle vive DENTRO
 * de un apartado del Tab (Inicio, Asistente, Favoritos) — ahí la píldora de
 * abajo flota por encima y tapa el botón "Agregar" si no se le deja hueco.
 * Desde Carrito o Sección no hace falta: son pantallas de Stack que
 * reemplazan el Tab entero, sin píldora detrás, y sumar el hueco ahí solo
 * dejaría un espacio muerto bajo el botón.
 */
const ModalProducto = ({ producto: productoAbierto, alCerrar, alAgregar, conBarraFlotante = false }) => {
  const { t } = useIdioma();
  const [fallóImagen, setFallóImagen] = useState(false);
  const [cantidad, setCantidad] = useState(() => pasoDe(productoAbierto));
  /*
   * El producto que se ve. Es el que se abrió, hasta que se toca uno de
   * "Quien compra esto también lleva": ese se muestra aquí mismo, sin cerrar
   * la hoja (cerrarla y abrir otra desde cada pantalla que usa esta ficha
   * serían cinco cambios para lo mismo). Se guarda su id y no el objeto, para
   * que con el catálogo al día la existencia también lo esté. Si quien la
   * abrió manda otro producto, vuelve a ser ese.
   */
  const { productos: catalogo } = useTienda();
  const [otroId, setOtroId] = useState(null);
  const [abiertoId, setAbiertoId] = useState(productoAbierto?.id);
  if (productoAbierto?.id !== abiertoId) {
    setAbiertoId(productoAbierto?.id);
    setOtroId(null);
    setCantidad(pasoDe(productoAbierto));
    setFallóImagen(false);
  }
  const producto = (otroId && catalogo.find((p) => p.id === otroId)) || productoAbierto;
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { bottom } = useSafeAreaInsets();
  const paso = pasoDe(producto);
  const marcoRef = useRef(null);
  const scrollRef = useRef(null);

  // Quien compra esto también lleva: la lista de toda la tienda, pedida una vez.
  const [juntos, setJuntos] = useState({});
  useEffect(() => {
    let vigente = true;
    cargarTambienLlevan().then((mapa) => { if (vigente) setJuntos(mapa); });
    return () => { vigente = false; };
  }, []);
  const tambienLlevan = elegirTambienLlevan(juntos[producto?.id], catalogo, producto);

  // Ver otro producto sin salir: de nuevo arriba, con su foto y su cantidad.
  const verOtro = (otro) => {
    setOtroId(otro.id);
    setCantidad(pasoDe(otro));
    setFallóImagen(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  /*
   * Defensa extra, no la puerta principal: la puerta es TarjetaProducto (ahí
   * se tapa la foto y no se llega hasta aquí). Pero esta ficha también se
   * abre desde el asistente de voz (Asistente.js → mostrarProducto), que no
   * pasa por esa tarjeta — así que "Agregar" vuelve a preguntar por su
   * cuenta, igual que useDetalleProducto.js en la web.
   */
  const { mayorConfirmado, pedirConfirmacion } = useEdad();

  // La hoja entra deslizándose desde abajo mientras el fondo se oscurece,
  // y sale al revés al cerrar — nunca desaparece de golpe.
  const fondoOpacidad = useRef(new Animated.Value(0)).current;
  const panelY = useRef(new Animated.Value(300)).current;
  const cerrandoRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fondoOpacidad, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(panelY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fondoOpacidad, panelY]);

  /*
   * Todo lo que cierra —tocar fuera, la "X", el botón atrás de Android, o
   * agregar y salir— pasa por aquí: primero la hoja baja y el fondo se
   * aclara, y solo CUANDO terminan de verdad se avisa al que llama
   * (alCerrar), que es quien de verdad la quita de pantalla.
   * `cerrandoRef` evita relanzar la animación si tocan dos veces seguidas.
   */
  const cerrarConAnimacion = () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    Animated.parallel([
      Animated.timing(fondoOpacidad, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(panelY, {
        toValue: 300,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => alCerrar());
  };

  // El botón de atrás de Android cierra la hoja, no la app. Ver el hook.
  useBotonAtras(cerrarConAnimacion);

  /*
   * Arrastrar el asa. Se guarda el alto real del panel (varía con el
   * contenido: un producto con descripción larga mide distinto que uno
   * sin ella) para poder comparar contra SU mitad, no un número fijo.
   */
  const panelAlturaRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      // Recién a partir de un arrastre de verdad: un toque corto en el asa
      // (que ya no hace nada) no debe robarle el gesto a nadie.
      onMoveShouldSetPanResponder: (_evento, gesto) => Math.abs(gesto.dy) > 4,
      /*
       * Sin esto, un arrastre largo terminaba en el ScrollView de abajo
       * pidiendo (y llevándose) el control a medio camino — el gesto se
       * "soltaba" ahí (onPanResponderTerminate) y el toque de "pasó la
       * mitad" nunca llegaba a evaluarse: la hoja SIEMPRE volvía a subir,
       * sin importar cuánto se hubiera bajado. Rechazar la cesión mantiene
       * el gesto entero, de principio a fin, en manos de este asa.
       */
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evento, gesto) => {
        // Solo baja. Arrastrar hacia arriba no "abre más" — no hay más.
        if (gesto.dy > 0) panelY.setValue(gesto.dy);
      },
      onPanResponderRelease: (_evento, gesto) => {
        const mitad = (panelAlturaRef.current || 400) / 2;
        if (gesto.dy > mitad) {
          cerrarConAnimacion();
        } else {
          // No pasó de la mitad: vuelve a su lugar, con el mismo resorte
          // que la apertura.
          Animated.timing(panelY, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      },
      // Si soltó a medio arrastre sin terminar el gesto (una llamada entra,
      // por ejemplo), que no se quede la hoja a medio bajar.
      onPanResponderTerminate: () => {
        Animated.timing(panelY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  if (!producto) return null;

  const agotado = producto.stock === 0;
  const contenido = piezasEnTexto(producto, t);
  const topeAlcanzado = cantidad >= producto.stock;

  const mover = (delta) => {
    const siguiente = ajustarCantidad(producto, cantidad + delta);
    // Nunca por debajo de un paso ni por encima de lo que hay.
    setCantidad(Math.max(paso, Math.min(siguiente, producto.stock)));
  };

  return (
    /*
     * Una vista sobre la pantalla, no un <Modal>. El Modal de React Native se
     * dibuja en una capa nativa por encima de TODO, y ahí el aviso de
     * "agregado al carrito" quedaba tapado. Ver hooks/useBotonAtras.js.
     */
    <View style={estilos.capa}>
      <Animated.View style={[estilos.fondo, { opacity: fondoOpacidad }]}>
        {/*
          Tocar fuera cierra. Es un Pressable del tamaño del fondo DEBAJO del
          panel, no un envoltorio: envolviéndolo, cada toque dentro del panel
          burbujearía hasta aquí y cerraría el detalle al intentar tocar "+".
        */}
        <Pressable accessibilityRole="button" style={estilos.zonaCierre} onPress={cerrarConAnimacion} accessibilityLabel={t('Cerrar')} />

        <Animated.View
          style={[estilos.panel, { transform: [{ translateY: panelY }] }]}
          onLayout={(e) => { panelAlturaRef.current = e.nativeEvent.layout.height; }}
        >
          <View style={estilos.encabezado}>
            {/*
              El asa ahora sí se arrastra: baja con el dedo, y al soltar
              decide sola — pasó la mitad del panel, cierra; si no, vuelve
              a subir. La zona de agarre es más grande que el dibujo (38x4)
              para no repetir el problema de un blanco angosto.
            */}
            <View style={estilos.zonaAsa} {...panResponder.panHandlers}>
              <View style={estilos.asa} />
            </View>
            {/*
              Compartir manda el enlace de la WEB (/producto/:id): lo abre
              cualquiera, tenga o no la app, y en WhatsApp llega con la foto,
              el nombre y el precio (frontend/middleware.js).
            */}
            <Pressable
              onPress={() => {
                const precio = `$${Number(producto.precio).toFixed(2)}${esPorLibra(producto) ? '/lb' : ''}`;
                const url = `${URL_WEB_LEGAL}/producto/${producto.id}`;
                Share.share({
                  title: producto.nombre,
                  // Android solo manda "message": el enlace va dentro del texto.
                  message: `${t('{nombre} a {precio} en {tienda}', { nombre: producto.nombre, precio, tienda: 'Tienda la 635' })}
${url}`,
                }).catch(() => {});
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('Compartir este producto')}
              style={estilos.compartir}
            >
              <Compartir size={17} color={COLORES.textoSuave} />
            </Pressable>
            <Pressable
              onPress={cerrarConAnimacion}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('Cerrar el detalle')}
              style={estilos.cerrar}
            >
              <Equis size={16} color={COLORES.textoSuave} />
            </Pressable>
          </View>

          <ScrollView ref={scrollRef} contentContainerStyle={estilos.contenido} bounces={false}>
            {/* De aquí sale la foto que vuela al carrito, ver utils/volarAlCarrito.js. */}
            <View ref={marcoRef} style={estilos.marcoImagen}>
              {producto.imagen && !fallóImagen ? (
                <Image
                  source={{ uri: foto(producto.imagen, ANCHO.ficha) }}
                  contentFit="contain"
                  style={estilos.imagen}
                  onError={() => setFallóImagen(true)}
                />
              ) : (
                <Paquete size={64} />
              )}
            </View>
            {/* El crédito de una foto que no es de la tienda (Open Food Facts lo pide en su licencia). */}
            {!!producto.fotoFuente && producto.imagen && !fallóImagen && (
              <Text style={estilos.creditoFoto}>{t('Foto: {fuente}', { fuente: producto.fotoFuente })}</Text>
            )}

            {!!producto.marca && <Text style={estilos.marca}>{producto.marca.toUpperCase()}</Text>}

            <View style={estilos.filaNombre}>
              <Text style={estilos.nombre}>{producto.nombre}</Text>
              {esSoloAdultos(producto) && (
                <View style={estilos.marca18}>
                  <Text style={estilos.marca18Texto}>+18</Text>
                </View>
              )}
            </View>

            <View style={estilos.filaPrecio}>
              {!!producto.precioAnterior && (
                <Text style={estilos.precioViejo}>${Number(producto.precioAnterior).toFixed(2)}</Text>
              )}
              <Text style={estilos.precio}>
                ${Number(producto.precio).toFixed(2)}
                {esPorLibra(producto) && <Text style={estilos.porUnidad}>/lb</Text>}
              </Text>
            </View>

            {!!contenido && <Text style={estilos.contenidoTexto}>{contenido}</Text>}

            <View
              style={[
                estilos.estadoStock,
                { backgroundColor: colores.marcaSuave },
                agotado && estilos.estadoAgotado,
              ]}
            >
              <Text
                style={[
                  estilos.estadoTexto,
                  { color: colores.marcaTexto },
                  agotado && estilos.estadoTextoAgotado,
                ]}
              >
                {agotado
                  ? t('Agotado')
                  : t('En existencia · {cantidad}', { cantidad: cantidadConUnidad(producto, producto.stock) })}
              </Text>
            </View>

            {!!producto.descripcion && (
              <>
                <Text style={estilos.tituloSeccion}>{t('Descripción')}</Text>
                <Text style={estilos.descripcion}>{producto.descripcion}</Text>
              </>
            )}

            {!agotado && (
              <>
                <Text style={estilos.tituloSeccion}>{t('Cantidad')}</Text>
                <View style={estilos.selector}>
                  <Pressable
                    onPress={() => mover(-paso)}
                    disabled={cantidad <= paso}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('Quitar uno')}
                    style={({ pressed }) => [
                      estilos.botonPaso,
                      pressed && { backgroundColor: colores.marcaSuave },
                      cantidad <= paso && estilos.botonPasoApagado,
                    ]}
                  >
                    <Menos size={13} color={cantidad <= paso ? COLORES.marcador : COLORES.texto} />
                  </Pressable>

                  <Text style={estilos.cantidad}>{cantidadConUnidad(producto, cantidad)}</Text>

                  <Pressable
                    onPress={() => mover(paso)}
                    disabled={topeAlcanzado}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('Agregar uno')}
                    style={({ pressed }) => [
                      estilos.botonPaso,
                      pressed && { backgroundColor: colores.marcaSuave },
                      topeAlcanzado && estilos.botonPasoApagado,
                    ]}
                  >
                    <Mas size={13} color={topeAlcanzado ? COLORES.marcador : COLORES.texto} />
                  </Pressable>
                </View>
              </>
            )}

            {/*
              Lo que más se lleva con este en un mismo pedido. Sin tarjetas:
              la foto sobre su fondo suave, el nombre y el precio. Tocar uno lo
              muestra aquí mismo. Ver utils/tambienLlevan.js.
            */}
            {tambienLlevan.length > 0 && (
              <>
                <Text style={estilos.tituloSeccion}>{t('Quien compra esto también lleva')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={estilos.filaJuntos}
                  style={estilos.carrilJuntos}
                >
                  {tambienLlevan.map((otro) => (
                    <Pressable
                      key={otro.id}
                      onPress={() => verOtro(otro)}
                      accessibilityRole="button"
                      accessibilityLabel={t('Ver {nombre}', { nombre: otro.nombre })}
                      style={({ pressed }) => [estilos.junto, pressed && { opacity: 0.6 }]}
                    >
                      <View style={estilos.juntoFoto}>
                        {otro.imagen ? (
                          <Image source={{ uri: foto(otro.imagen, ANCHO.miniatura) }} contentFit="contain" style={estilos.juntoImagen} />
                        ) : (
                          <Paquete size={28} />
                        )}
                      </View>
                      <Text style={estilos.juntoNombre} numberOfLines={2}>{otro.nombre}</Text>
                      <Text style={estilos.juntoPrecio}>
                        ${Number(otro.precio).toFixed(2)}{esPorLibra(otro) ? '/lb' : ''}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </ScrollView>

          {/*
            El botón vive FUERA del scroll: es a lo que se vino, y en un
            producto con descripción larga quedaba al final de todo, a dos
            deslizadas de distancia.
          */}
          <View
            style={[
              estilos.pie,
              conBarraFlotante && {
                paddingBottom: 26 + Math.max(bottom, AIRE_ABAJO_MINIMO) + ALTURA_BARRA_FLOTANTE,
              },
            ]}
          >
            <Boton
              texto={agotado ? t('Agotado') : t('Agregar · ${precio}', { precio: (producto.precio * cantidad).toFixed(2) })}
              deshabilitado={agotado}
              color={colores.marca}
              colorPresionado={colores.marcaOscuro}
              estilo={estilos.botonRedondo}
              alPresionar={() => {
                const meter = () => {
                  // Se mide ANTES de cerrar: con la hoja ya cerrándose no hay
                  // de dónde volar. Mismo cuidado que useDetalleProducto.js
                  // en la web.
                  alAgregar(producto, cantidad, { origenRef: marcoRef });
                  cerrarConAnimacion();
                };
                if (esSoloAdultos(producto) && !mayorConfirmado) {
                  pedirConfirmacion(meter);
                  return;
                }
                meter();
              }}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    // Por encima de la tienda, por debajo del aviso (que se dibuja después,
    // ya fuera de esta pantalla).
    zIndex: 10,
    elevation: 10,
  },
  fondo: {
    flex: 1,
    backgroundColor: COLORES.velo,
    justifyContent: 'flex-end',
  },
  zonaCierre: {
    flex: 1,
  },
  panel: {
    ...hojaCentrada,
    backgroundColor: COLORES.papelAlto,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    // Tope de alto: el detalle es una hoja que sube, no una pantalla entera.
    maxHeight: '88%',
  },
  /*
   * minHeight a propósito: "cerrar" es absoluta y mide más (top:8 + 32 de
   * alto = 40) que lo que este encabezado ocupaba antes solo con el asa
   * (~14px). Sin este mínimo, el ScrollView de abajo —que se dibuja
   * DESPUÉS, ya que es el hermano siguiente— quedaba encima de la mitad de
   * abajo de la "X" y se robaba el toque: se veía perfecto pero no cerraba.
   */
  encabezado: {
    paddingTop: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  // La zona de agarre del asa: bastante más ancha y alta que el dibujo
  // (38x4) para que arrastrarla no dependa de acertarle a algo angosto.
  zonaAsa: {
    paddingVertical: 14,
    paddingHorizontal: 60,
  },
  // El asa de la hoja: dice "esto se puede bajar" sin escribirlo.
  asa: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORES.borde,
  },
  // Más metida en la esquina que antes (era right:14, top:6).
  // A la izquierda de la equis, del mismo tamaño: las dos acciones de la esquina.
  compartir: {
    position: 'absolute',
    right: 50,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrar: {
    position: 'absolute',
    right: 10,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
  },
  marcoImagen: {
    backgroundColor: COLORES.papelGris,
    height: 210,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginBottom: 16,
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  marca: {
    fontSize: 11,
    color: COLORES.iconoCampo,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  filaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  nombre: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  // El rojo fijo también en oscuro: con el texto blanco encima, el rojo
  // aclarado del modo oscuro ya no se lee.
  marca18: {
    backgroundColor: '#FF4D4F',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  marca18Texto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    marginTop: 10,
  },
  precioViejo: {
    fontSize: 14,
    color: COLORES.marcador,
    textDecorationLine: 'line-through',
  },
  precio: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
  porUnidad: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORES.textoTenue,
  },
  contenidoTexto: {
    fontSize: 12.5,
    color: COLORES.textoTenue,
    marginTop: 3,
    fontWeight: '500',
  },
  // El fondo y el color de letra los pone la temporada en línea; aquí solo la
  // forma. Dejarlos escritos además sería tener dos verdades sobre lo mismo.
  estadoStock: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 13,
    marginTop: 14,
  },
  estadoAgotado: {
    backgroundColor: COLORES.peligroFondo,
  },
  estadoTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  estadoTextoAgotado: {
    color: COLORES.peligro,
  },
  tituloSeccion: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
    marginTop: 20,
    marginBottom: 7,
  },
  descripcion: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORES.textoVentaja,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 12,
    padding: 4,
  },
  botonPaso: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.papelGris,
  },
  botonPasoApagado: {
    backgroundColor: COLORES.papelSuave,
  },
  cantidad: {
    minWidth: 66,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: COLORES.texto,
  },
  pie: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
  },
  creditoFoto: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 11,
    color: COLORES.textoTenue,
  },
  // "Quien compra esto también lleva": una fila que se desliza de lado, sin tarjetas.
  carrilJuntos: {
    marginHorizontal: -20,
  },
  filaJuntos: {
    paddingHorizontal: 20,
    gap: 14,
  },
  junto: {
    width: 104,
  },
  juntoFoto: {
    width: 104,
    height: 104,
    borderRadius: 14,
    backgroundColor: COLORES.papelGris,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  juntoImagen: {
    width: '86%',
    height: '86%',
  },
  juntoNombre: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 16,
    color: COLORES.texto,
  },
  juntoPrecio: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: COLORES.texto,
  },
  // Misma píldora de 28 que ya lleva "Iniciar sesión" (LoginClient.js) y
  // "Confirmar" del candado de edad: se pasa por `estilo`, sin tocar las
  // esquinas de 8 del Boton compartido, que otros usos sí necesitan.
  botonRedondo: {
    borderRadius: 28,
  },
});

export default ModalProducto;
