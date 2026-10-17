// UN PRODUCTO, A PANTALLA COMPLETA — Producto.js
// La ficha de un producto como página propia, igual que en la web: foto, precio, botón de añadir,
// descripción, "Quien compra esto también lleva" y "Del mismo pasillo".

import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ShoppingBag } from 'lucide-react-native';
import { useColores, useEstilos } from '../context/ModoContext';
import { useTema } from '../context/TemaContext';
import { useTienda } from '../context/TiendaContext';
import { useEdad } from '../context/EdadContext';
import { useFavoritos } from '../context/FavoritosContext';
import { useIdioma } from '../context/IdiomaContext';
import BotonVolver from '../components/UI/BotonVolver';
import CuadriculaProductos from '../components/Tienda/CuadriculaProductos';
import { Compartir, Corazon, Mas, Menos, Paquete } from '../components/UI/Iconos';
import { URL_WEB_LEGAL } from '../utils/legales';
import { foto, ANCHO } from '../utils/fotos';
import { cargarTambienLlevan } from '../api/tiendaApi';
import { elegirTambienLlevan } from '../utils/tambienLlevan';
import { ajustarCantidad, cantidadConUnidad, esPorLibra, esSoloAdultos, pasoDe, piezasEnTexto, unidadDe } from '../utils/unidades';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { MARGEN_CATALOGO } from '../utils/disposicion';
import { avisarActividad } from '../utils/actividadUsuario';

// El mismo rojo del corazón de las tarjetas.
const ROJO_FAVORITO = '#FF4D6D';

const Producto = ({ route, navigation }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { productos: catalogo, cargando, agregarAlCarrito } = useTienda();
  const { esFavorito, alternar } = useFavoritos();
  const { mayorConfirmado, pedirConfirmacion } = useEdad();

  const id = String(route.params?.id ?? '');
  // Del catálogo al día, no de lo que mandó quien la abrió: así la
  // existencia y el precio de oferta son los de ahora.
  const producto = catalogo.find((p) => String(p.id) === id);

  const [fallóImagen, setFallóImagen] = useState(false);
  const [cantidad, setCantidad] = useState(() => pasoDe(producto));
  const marcoRef = useRef(null);

  // Quien compra esto también lleva: la lista de toda la tienda, pedida una vez.
  const [juntos, setJuntos] = useState({});
  useEffect(() => {
    let vigente = true;
    cargarTambienLlevan().then((mapa) => { if (vigente) setJuntos(mapa); });
    return () => { vigente = false; };
  }, []);
  const tambienLlevan = useMemo(
    () => (producto ? elegirTambienLlevan(juntos[producto.id], catalogo, producto) : []),
    [juntos, catalogo, producto]
  );

  // Del mismo pasillo: la misma categoría, sin repetir el que se está viendo ni lo que ya salió
  // arriba. Cinco, como la web: más y la ficha se vuelve un catálogo.
  const delMismoPasillo = useMemo(() => {
    if (!producto) return [];
    const yaSalen = new Set(tambienLlevan.map((p) => p.id));
    return catalogo
      .filter((p) => p.id !== producto.id && p.categoria === producto.categoria && !yaSalen.has(p.id))
      .slice(0, 5);
  }, [catalogo, producto, tambienLlevan]);

  const volver = () => navigation.goBack();
  // Otro producto se abre ENCIMA, con su propia página (la pila lo distingue por id).
  const verOtro = (otro) => navigation.navigate('Producto', { id: String(otro.id) });

  if (!producto) {
    return (
      <View style={estilos.pantalla}>
        <View style={[estilos.franja, { paddingTop: ALTURA_ESTADO + 10 }]}>
          <BotonVolver alPresionar={volver} />
        </View>
        <View style={estilos.sinProducto}>
          {cargando ? (
            <ActivityIndicator color={colores.marca} />
          ) : (
            <>
              <Paquete size={56} />
              <Text style={estilos.sinProductoTexto}>{t('Ese producto ya no está en la tienda')}</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const agotado = producto.stock === 0;
  const paso = pasoDe(producto);
  const topeAlcanzado = cantidad >= producto.stock;
  const marcado = esFavorito(producto.id);
  const presentacion = piezasEnTexto(producto, t);
  const antes = Number(producto.precioAnterior);
  const ahora = Number(producto.precio);
  const ahorro = antes && ahora && antes > ahora ? Math.round(((antes - ahora) / antes) * 100) : 0;

  const mover = (delta) => {
    const siguiente = ajustarCantidad(producto, cantidad + delta);
    // Nunca por debajo de un paso ni por encima de lo que hay.
    setCantidad(Math.max(paso, Math.min(siguiente, producto.stock)));
  };

  // Compartir manda el enlace de la WEB (/producto/:id): lo abre cualquiera, tenga o no la app, y en
  // WhatsApp llega con la foto, el nombre y el precio (frontend/middleware.js).
  const compartir = () => {
    const precio = `$${ahora.toFixed(2)}${esPorLibra(producto) ? '/lb' : ''}`;
    const url = `${URL_WEB_LEGAL}/producto/${producto.id}`;
    Share.share({
      title: producto.nombre,
      // Android solo manda "message": el enlace va dentro del texto.
      message: `${t('{nombre} a {precio} en {tienda}', { nombre: producto.nombre, precio, tienda: 'Tienda la 635' })}\n${url}`,
    }).catch(() => {});
  };

  // Añadir y volver, como la web: la foto grande sale volando al carrito (se mide ANTES de irse: con
  // la página ya cerrándose no hay de dónde volar) y se regresa a donde se estaba. El candado +18
  // pregunta aquí también, porque esta página se abre desde enlaces que no pasan por la tarjeta.
  const añadir = () => {
    const meter = () => {
      agregarAlCarrito(producto, cantidad, { origenRef: marcoRef });
      volver();
    };
    if (esSoloAdultos(producto) && !mayorConfirmado) {
      pedirConfirmacion(meter);
      return;
    }
    meter();
  };

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.franja, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <BotonVolver alPresionar={volver} />
      </View>

      <ScrollView contentContainerStyle={estilos.contenido} onScrollBeginDrag={avisarActividad}>
        <View style={contenidoCentrado}>
          {/* De aquí sale la foto que vuela al carrito, ver utils/volarAlCarrito.js. */}
          <View ref={marcoRef} style={estilos.galeria}>
            {producto.imagen && !fallóImagen ? (
              <Image
                source={{ uri: foto(producto.imagen, ANCHO.ficha) }}
                contentFit="contain"
                style={estilos.imagen}
                onError={() => setFallóImagen(true)}
                accessibilityLabel={producto.nombre}
              />
            ) : (
              <Paquete size={84} />
            )}

            {(ahorro > 0 || producto.esMasVendido) && (
              <View style={estilos.sellos}>
                {ahorro > 0 && (
                  <View style={[estilos.sello, estilos.selloOferta]}>
                    <Text style={[estilos.selloTexto, estilos.selloTextoOferta]}>-{ahorro}%</Text>
                  </View>
                )}
                {!!producto.esMasVendido && (
                  <View style={[estilos.sello, { backgroundColor: colores.marca }]}>
                    <Text style={[estilos.selloTexto, { color: colores.sobreMarca || '#FFFFFF' }]}>{t('Los más vendidos')}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={estilos.acciones}>
              <Pressable
                onPress={() => alternar(producto.id, producto.nombre)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityState={{ selected: marcado }}
                accessibilityLabel={marcado ? t('Quitar de favoritos') : t('Guardar en favoritos')}
                style={({ pressed }) => [estilos.accion, pressed && estilos.accionPresionada]}
              >
                <Corazon size={18} color={marcado ? ROJO_FAVORITO : COLORES.tintaApagada} />
              </Pressable>
              <Pressable
                onPress={compartir}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t('Compartir este producto')}
                style={({ pressed }) => [estilos.accion, pressed && estilos.accionPresionada]}
              >
                <Compartir size={17} color={COLORES.tinta} />
              </Pressable>
            </View>
          </View>
          {/* El crédito de una foto que no es de la tienda (Open Food Facts lo pide en su licencia). */}
          {!!producto.fotoFuente && producto.imagen && !fallóImagen && (
            <Text style={estilos.creditoFoto}>{t('Foto: {fuente}', { fuente: producto.fotoFuente })}</Text>
          )}

          {!!producto.marca && (
            <Text style={[estilos.marca, { color: colores.marcaTexto }]}>{producto.marca.toUpperCase()}</Text>
          )}
          <View style={estilos.filaNombre}>
            <Text style={estilos.nombre}>{producto.nombre}</Text>
            {esSoloAdultos(producto) && (
              <View style={estilos.marca18}>
                <Text style={estilos.marca18Texto}>+18</Text>
              </View>
            )}
          </View>

          <View style={estilos.precios}>
            <Text style={estilos.precio}>
              ${ahora.toFixed(2)}
              {esPorLibra(producto) && <Text style={estilos.porUnidad}>/lb</Text>}
            </Text>
            {ahorro > 0 && <Text style={estilos.precioViejo}>${antes.toFixed(2)}</Text>}
            <View style={[estilos.existencia, agotado && estilos.existenciaAgotada]}>
              <Text style={[estilos.existenciaTexto, agotado && estilos.existenciaTextoAgotada]}>
                {agotado ? t('Agotado') : t('✓ En existencia')}
              </Text>
            </View>
          </View>

          {/* El aviso de +18 va ANTES del botón: enterarse de que le van a pedir documento con el repartidor
             en la puerta es la peor manera de saberlo. */}
          {esSoloAdultos(producto) && (
            <Text style={estilos.avisoAdultos}>
              <Text style={estilos.avisoAdultosFuerte}>{t('Solo para mayores de 18 años.')}</Text>{' '}
              {t('Te pedirán tu documento de identidad al entregar el pedido. Sin él, este producto no se puede entregar.')}
            </Text>
          )}

          <View style={estilos.compra}>
            {!agotado && (
              <View style={estilos.selector}>
                <Pressable
                  onPress={() => mover(-paso)}
                  disabled={cantidad <= paso}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('Quitar uno')}
                  style={({ pressed }) => [estilos.botonPaso, pressed && { backgroundColor: colores.marcaSuave }]}
                >
                  <Menos size={13} color={cantidad <= paso ? COLORES.marcador : COLORES.texto} />
                </Pressable>
                <Text style={estilos.cantidad} accessibilityLabel={t('Cantidad')}>
                  {cantidadConUnidad(producto, cantidad)}
                </Text>
                <Pressable
                  onPress={() => mover(paso)}
                  disabled={topeAlcanzado}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('Agregar uno')}
                  style={({ pressed }) => [estilos.botonPaso, pressed && { backgroundColor: colores.marcaSuave }]}
                >
                  <Mas size={13} color={topeAlcanzado ? COLORES.marcador : COLORES.texto} />
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={añadir}
              disabled={agotado}
              accessibilityRole="button"
              accessibilityState={{ disabled: agotado }}
              style={({ pressed }) => [
                estilos.añadir,
                { backgroundColor: pressed ? colores.marcaOscuro : colores.marca },
                agotado && estilos.añadirApagado,
              ]}
            >
              <ShoppingBag size={18} strokeWidth={2.2} color={agotado ? COLORES.textoTenue : '#FFFFFF'} />
              <Text style={[estilos.añadirTexto, agotado && { color: COLORES.textoTenue }]} numberOfLines={1}>
                {agotado ? t('Agotado por ahora') : t('Añadir al carrito')}
              </Text>
            </Pressable>
          </View>
          {/* Con más de un paso elegido, cuánto suma: el botón ya no dice el precio. */}
          {!agotado && cantidad !== paso && (
            <Text style={estilos.totalCompra}>
              {cantidadConUnidad(producto, cantidad)} · ${(ahora * cantidad).toFixed(2)}
            </Text>
          )}

          {/* Cómo se vende, dicho con todas sus letras. Texto suelto, sin recuadros. */}
          <View style={estilos.datos}>
            {!!producto.categoria && (
              <View style={estilos.dato}>
                <Text style={estilos.datoNombre}>{t('Categoría')}</Text>
                <Text style={estilos.datoValor}>{producto.categoria}</Text>
              </View>
            )}
            <View style={estilos.dato}>
              <Text style={estilos.datoNombre}>{t('Se vende')}</Text>
              <Text style={estilos.datoValor}>{t(unidadDe(producto).nombre)}</Text>
            </View>
            {!!presentacion && (
              <View style={estilos.dato}>
                <Text style={estilos.datoNombre}>{t('Presentación')}</Text>
                <Text style={estilos.datoValor}>{presentacion}</Text>
              </View>
            )}
          </View>

          {!!producto.descripcion && (
            <View style={estilos.sobre}>
              <Text style={estilos.sobreTitulo}>{t('Sobre el producto').toUpperCase()}</Text>
              <Text style={estilos.sobreTexto}>{producto.descripcion}</Text>
            </View>
          )}

          {/* Lo que más se lleva con este en un mismo pedido. Ver utils/tambienLlevan.js. */}
          {tambienLlevan.length > 0 && (
            <View style={estilos.recomendados}>
              <Text style={estilos.tituloRecs}>{t('Quien compra esto también lleva')}</Text>
              <Text style={estilos.pieRecs}>{t('Lo que más se lleva en el mismo pedido.')}</Text>
              <CuadriculaProductos productos={tambienLlevan} alVerDetalle={verOtro} alAgregar={agregarAlCarrito} />
            </View>
          )}

          {delMismoPasillo.length > 0 && (
            <View style={estilos.recomendados}>
              <Text style={estilos.tituloRecs}>{t('Del mismo pasillo')}</Text>
              <Text style={estilos.pieRecs}>
                {t('Más de {categoria}, por si andabas buscando.', {
                  categoria: producto.categoria ? producto.categoria.toLowerCase() : t('la tienda'),
                })}
              </Text>
              <CuadriculaProductos productos={delMismoPasillo} alVerDetalle={verOtro} alAgregar={agregarAlCarrito} />
            </View>
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
  franja: {
    paddingHorizontal: MARGEN_CATALOGO,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  contenido: {
    paddingHorizontal: MARGEN_CATALOGO,
    paddingTop: 18,
    paddingBottom: 40,
  },
  sinProducto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  sinProductoTexto: {
    fontSize: 15,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  galeria: {
    aspectRatio: 4 / 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORES.linea,
    backgroundColor: COLORES.papelGris,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  sellos: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    gap: 6,
  },
  sello: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  // El mismo color de alerta que el sello de oferta de la ficha web.
  selloOferta: {
    backgroundColor: COLORES.alerta,
  },
  selloTexto: {
    fontSize: 12,
    fontWeight: '800',
  },
  selloTextoOferta: {
    color: '#FFFFFF',
  },
  // El corazón y compartir, uno sobre otro en la esquina de la foto, como la web.
  acciones: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 10,
  },
  accion: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORES.papelAlto,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  accionPresionada: {
    transform: [{ scale: 0.94 }],
  },
  creditoFoto: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 11,
    color: COLORES.textoTenue,
  },
  marca: {
    marginTop: 22,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  filaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  nombre: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.4,
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
  precios: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  precio: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.8,
  },
  porUnidad: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.textoTenue,
    letterSpacing: 0,
  },
  precioViejo: {
    fontSize: 15,
    color: COLORES.marcador,
    textDecorationLine: 'line-through',
  },
  existencia: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: COLORES.exitoFondo,
  },
  existenciaAgotada: {
    backgroundColor: COLORES.peligroFondo,
  },
  existenciaTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.exitoTexto,
  },
  existenciaTextoAgotada: {
    color: COLORES.peligro,
  },
  avisoAdultos: {
    marginTop: 14,
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.avisoTexto,
  },
  avisoAdultosFuerte: {
    fontWeight: '800',
  },
  compra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 999,
    padding: 4,
  },
  botonPaso: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidad: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: COLORES.texto,
  },
  añadir: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 14,
  },
  añadirApagado: {
    backgroundColor: COLORES.papelGris,
  },
  añadirTexto: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  totalCompra: {
    marginTop: 8,
    fontSize: 13,
    color: COLORES.textoSuave,
    textAlign: 'right',
  },
  datos: {
    marginTop: 18,
    paddingBottom: 18,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  dato: {
    flexDirection: 'row',
    gap: 12,
  },
  datoNombre: {
    width: 92,
    fontSize: 14,
    color: COLORES.textoSuave,
  },
  datoValor: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  sobre: {
    marginTop: 20,
  },
  sobreTitulo: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORES.textoSuave,
    marginBottom: 8,
  },
  sobreTexto: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORES.textoVentaja,
  },
  recomendados: {
    marginTop: 32,
  },
  tituloRecs: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.2,
  },
  pieRecs: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13.5,
    color: COLORES.textoSuave,
  },
});

export default Producto;
