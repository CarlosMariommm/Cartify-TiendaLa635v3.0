/*
 * ============================================================
 * INICIO — la portada de la tienda
 * ============================================================
 * El equivalente de `frontend/src/pages/Store.jsx`, en el corte que le toca a
 * esta pantalla: encabezado con buscador y carrito, pastillas de categoría,
 * carrusel de promociones, la fila de "Más vendidos" y la cuadrícula con todo
 * el catálogo.
 *
 * ── Por qué la cuadrícula es un FlatList y no un ScrollView con vistas ──
 *
 * Es LA decisión de esta pantalla. Una tienda puede tener cientos de
 * productos, y un ScrollView monta todos sus hijos de una vez: se abriría con
 * varios segundos de pantalla en blanco y el desplazamiento iría a tirones.
 * FlatList solo dibuja lo que se ve.
 *
 * De ahí sale la forma rara del archivo: todo lo que va ARRIBA de la
 * cuadrícula —barra, pastillas, promos, más vendidos— es el
 * `ListHeaderComponent` de esa misma lista, en vez de vivir en un contenedor
 * aparte. Puesto aparte, la parte de arriba se quedaría fija y solo se
 * desplazaría la cuadrícula, que no es como se lee una tienda.
 *
 * ── Lo que decide qué se ve ──
 *
 * Con una categoría elegida, una búsqueda escrita o una promo filtrando, la
 * portada se calla: se van las promos y los más vendidos, y queda la lista de
 * lo que se pidió. Mismo criterio que la web (`showTrending`) — quien está
 * buscando "leche" no quiere que le sigan ofreciendo otra cosa.
 * ============================================================
 */

import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColores, useEstilos } from '../context/ModoContext';
import { useTienda } from '../context/TiendaContext';
import { useTema } from '../context/TemaContext';
import { useAuth } from '../hooks/useAuth';
import BarraTienda from '../components/Tienda/BarraTienda';
import CintaTemporada from '../components/Tienda/CintaTemporada';
import DecoracionTemporada from '../components/Tienda/DecoracionTemporada';
import PastillasCategoria from '../components/Tienda/PastillasCategoria';
import CarruselPromos from '../components/Tienda/CarruselPromos';
import FilaProductos from '../components/Tienda/FilaProductos';
import TarjetaProducto from '../components/Tienda/TarjetaProducto';
import ModalProducto from '../components/Tienda/ModalProducto';
import ModalPromo from '../components/Tienda/ModalPromo';
import MenuPasillos from '../components/Tienda/MenuPasillos';
import HojaFiltros from '../components/Tienda/HojaFiltros';
import { SlidersHorizontal } from 'lucide-react-native';
import { cuantosFiltros } from '../utils/filtrosTienda';
import Boton from '../components/UI/Boton';
import { Equis } from '../components/UI/Iconos';
import { avisarActividad } from '../utils/actividadUsuario';
import Mascota, { CargandoMascota } from '../components/Tiqui/Mascota';
import JalarParaRecargar from '../components/Tienda/JalarParaRecargar';
import { useAviso } from '../context/AvisoContext';
import { useIdioma } from '../context/IdiomaContext';
import { soltarProductoPedido, useProductoPedido } from '../utils/enlaces';
import { useDisposicion } from '../hooks/useDisposicion';

const Inicio = ({ irACarrito, irASeccion }) => {
  const { t } = useIdioma();
  const { colores, recargarAjustes } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { isAuthenticated, user } = useAuth();
  const nombre = user?.fullName || user?.userName;
  const {
    productos,
    cargando,
    errorCarga,
    recargar,
    refrescarCatalogo,
    pasillos,
    todosLosModulos,
    moduloSeleccionado,
    setModuloSeleccionado,
    nombrePasillo,
    categorias,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    terminoBusqueda,
    setTerminoBusqueda,
    productosFiltrados,
    productosDestacados,
    secciones,
    promosDelCarrusel,
    promoSeleccionada,
    setPromoSeleccionada,
    promoDetalle,
    productosDePromo,
    abrirPromo,
    cerrarPromo,
    verPromoEnTienda,
    cantidadItems,
    agregarAlCarrito,
    filtros,
    cambiarFiltro,
    limpiarFiltros,
    marcasDisponibles,
  } = useTienda();

  // Los filtros de la tienda (orden, precio, ofertas, marca). Ver HojaFiltros.
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const filtrosPuestos = cuantosFiltros(filtros);

  const [productoAbierto, setProductoAbierto] = useState(null);
  const { avisar } = useAviso();
  // En la tablet caben más columnas (ver hooks/useDisposicion.js).
  const { columnas, anchoCelda } = useDisposicion();

  /*
   * Jalar para recargar: los productos Y la temporada (si el dueño la cambió
   * en el panel, se ve aquí sin cerrar la app). Si no se pudo, se dice; si
   * salió bien, se ve solo.
   */
  const refrescar = useCallback(async () => {
    const [catalogo] = await Promise.all([refrescarCatalogo(), recargarAjustes?.()]);
    if (!catalogo) avisar(t('No se pudo recargar la tienda. Revisa tu conexión.'), 'error');
  }, [refrescarCatalogo, recargarAjustes, avisar, t]);
  const [menuPasillosAbierto, setMenuPasillosAbierto] = useState(false);

  const verDetalle = useCallback((producto) => setProductoAbierto(producto), []);

  /*
   * Un producto que llegó por enlace (ver components/UI/EnlacesEntrantes.js).
   * Se abre cuando el catálogo ya está; si el producto ya no existe, se dice
   * en vez de no hacer nada.
   */
  const productoPedido = useProductoPedido();
  useEffect(() => {
    if (!productoPedido || cargando) return;
    const producto = (productos || []).find((p) => String(p.id) === productoPedido);
    if (producto) setProductoAbierto(producto);
    else avisar(t('Ese producto ya no está en la tienda'), 'info');
    soltarProductoPedido();
  }, [productoPedido, cargando, productos, avisar, t]);

  // La portada completa solo cuando no se está filtrando nada.
  const mostrarPortada = !categoriaSeleccionada && !terminoBusqueda && !promoSeleccionada;

  const encabezado = (
    <View>
      {/*
        La cinta va DENTRO del encabezado de la lista y no arriba, junto a la
        barra: la barra se queda fija y la cinta tiene que irse con el scroll.
        Pegada arriba se llevaría su alto en todas las pantallas, todo el año,
        para nada.
      */}
      <CintaTemporada />

      {/* Saludo con el nombre real de quien tiene sesión. Sin sesión no hay
          a quién saludar: la portada se ve igual que para cualquier visita. */}
      {isAuthenticated && !!nombre && (
        <Text style={estilos.saludo}>{t('Hola, {nombre} 👋', { nombre })}</Text>
      )}

      <PastillasCategoria
        categorias={categorias}
        seleccionada={categoriaSeleccionada}
        alSeleccionar={setCategoriaSeleccionada}
      />

      {/* La chapita para soltar el filtro de una promo. Sin ella, la única
          salida sería adivinar que hay que tocar "Todos". */}
      {!!promoSeleccionada && (
        <View style={estilos.filaPromoActiva}>
          <Text style={[estilos.promoActivaTexto, { color: colores.marcaTexto }]} numberOfLines={1}>
            {t('Promo:')} {promoSeleccionada.title || promoSeleccionada.promoDescription}
          </Text>
          <Pressable
            onPress={() => setPromoSeleccionada(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('Ver todos los productos')}
            style={({ pressed }) => [
              estilos.quitarPromo,
              pressed && { borderColor: colores.marca, backgroundColor: colores.marcaSuave },
            ]}
          >
            <Equis size={11} color={COLORES.textoVentaja} />
            <Text style={estilos.quitarPromoTexto}>{t('Ver todos')}</Text>
          </Pressable>
        </View>
      )}

      {mostrarPortada && promosDelCarrusel.length > 0 && (
        <CarruselPromos promos={promosDelCarrusel} alElegirPromo={abrirPromo} />
      )}

      {mostrarPortada && productosDestacados.length > 0 && (
        <View style={estilos.seccionDestacados}>
          <View style={estilos.tituloDestacados}>
            {/* El punto verde de "en vivo" que la web anima. Aquí va fijo:
                animarlo obligaría a tener un Animated corriendo siempre, y lo
                que comunica —que esto se mueve solo— ya lo dice el color. */}
            <View style={estilos.puntoVivo} />
            <Text style={estilos.tituloSeccion}>{t('Más vendidos')}</Text>
          </View>

          <FlatList
            data={productosDestacados}
            keyExtractor={(p) => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.filaDestacados}
            renderItem={({ item, index }) => (
              <View style={estilos.celdaDestacado}>
                <TarjetaProducto producto={item} alVerDetalle={verDetalle} alAgregar={agregarAlCarrito} indice={index} />
              </View>
            )}
          />
        </View>
      )}

      {/*
        Las filas que se arman solas con el inventario ("Se están acabando",
        "Nuevos en la tienda"). Si en este momento no hay datos para armar
        alguna —una tienda con todo el stock lleno no tiene nada acabándose—
        sencillamente no se pinta. Ver utils/secciones.js.
      */}
      {mostrarPortada &&
        secciones.map((seccion) => (
          <FilaProductos
            key={seccion.clave}
            seccion={seccion}
            alVerTodos={() => irASeccion?.(seccion)}
            alVerDetalle={verDetalle}
            alAgregar={agregarAlCarrito}
          />
        ))}

      <View style={estilos.encabezadoCatalogo}>
        <Text style={estilos.tituloSeccion}>
          {(categoriaSeleccionada && t(categoriaSeleccionada)) ||
            (terminoBusqueda
              ? `"${terminoBusqueda}"`
              : nombrePasillo
                ? t('Todo en {pasillo}', { pasillo: t(nombrePasillo) })
                : t('Todos los productos'))}
        </Text>
        <View style={estilos.ladoConteo}>
          <Text style={estilos.conteo}>
            {productosFiltrados.length} {t(productosFiltrados.length === 1 ? 'producto' : 'productos')}
          </Text>
          <Pressable
            onPress={() => setFiltrosAbiertos(true)}
            accessibilityRole="button"
            accessibilityLabel={filtrosPuestos ? t('Filtros ({n})', { n: filtrosPuestos }) : t('Filtros')}
            hitSlop={6}
            style={({ pressed }) => [
              estilos.botonFiltros,
              (filtrosPuestos > 0 || filtros.orden !== 'recomendados') && { borderColor: colores.marca, backgroundColor: colores.marcaSuave },
              pressed && { opacity: 0.7 },
            ]}
          >
            <SlidersHorizontal size={14} strokeWidth={2.2} color={colores.marcaTexto} />
            <Text style={[estilos.botonFiltrosTexto, { color: colores.marcaTexto }]}>
              {filtrosPuestos ? t('Filtros ({n})', { n: filtrosPuestos }) : t('Filtros')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const vacio = (
    <View style={estilos.vacio}>
      {/* Como en Store.jsx de la web: buscando con su lupa si se filtró algo,
          perdida si la tienda de verdad está vacía. */}
      <Mascota pose={terminoBusqueda || categoriaSeleccionada || filtrosPuestos ? 'buscando' : 'perdida'} alto={130} />
      {/*
        Una tienda recién montada está vacía hasta que le carguen productos.
        Decir 'No hay productos para ""' hacía parecer que la tienda estaba rota.
      */}
      <Text style={estilos.vacioTexto}>
        {filtrosPuestos > 0 && !terminoBusqueda
          ? t('Ningún producto coincide con los filtros')
          : terminoBusqueda || categoriaSeleccionada
          ? t('No hay productos para "{termino}"', { termino: terminoBusqueda || t(categoriaSeleccionada) })
          : nombrePasillo
            ? t('{pasillo} todavía no tiene productos', { pasillo: t(nombrePasillo) })
            : t('Todavía no hay productos en la tienda')}
      </Text>
      {filtrosPuestos > 0 && (
        <View style={estilos.botonError}>
          <Boton texto={t('Quitar filtros')} alPresionar={limpiarFiltros} color={colores.marca} colorPresionado={colores.marcaOscuro} />
        </View>
      )}
    </View>
  );

  return (
    <View style={estilos.pantalla}>
      {/*
        Las figuras de temporada van PRIMERAS en el árbol para quedar detrás de
        todo: en React Native pinta encima lo que va después. La lista no tiene
        fondo propio, así que los copos se ven por los huecos entre tarjetas —
        que es exactamente donde tienen que verse.
      */}
      <DecoracionTemporada />

      <BarraTienda
        busqueda={terminoBusqueda}
        alBuscar={setTerminoBusqueda}
        cantidadItems={cantidadItems}
        alAbrirCarrito={irACarrito}
        alAbrirPasillos={() => setMenuPasillosAbierto(true)}
      />

      {cargando ? (
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Cargando la tienda…')} />
        </View>
      ) : errorCarga ? (
        /*
         * El error se muestra con su texto y con un botón para reintentar. En
         * un teléfono "no hay productos" y "no hay internet" se ven igual, y
         * el segundo tiene arreglo — pero solo si se dice cuál de los dos es.
         */
        <View style={estilos.centro}>
          {/* Como en la web: se le cortó el cordón y se cayó. */}
          <Mascota pose="error" alto={150} style={{ marginBottom: 12 }} />
          <Text style={estilos.errorTitulo}>{t('No se pudo cargar la tienda')}</Text>
          <Text style={estilos.errorTexto}>{errorCarga}</Text>
          <View style={estilos.botonError}>
            <Boton
              texto={t('Reintentar')}
              alPresionar={recargar}
              color={colores.marca}
              colorPresionado={colores.marcaOscuro}
            />
          </View>
        </View>
      ) : (
        /*
         * Jalar la lista hacia abajo la recarga: baja Tiqui colgada en vez
         * del círculo que gira. Ver JalarParaRecargar.
         */
        <JalarParaRecargar alRecargar={refrescar}>
        {({ alDesplazar, propsLista }) => (
        <FlatList
          {...propsLista}
          // FlatList no deja cambiar las columnas en caliente: al girar la
          // tablet se vuelve a montar con las nuevas.
          key={`catalogo-${columnas}`}
          onScroll={alDesplazar}
          data={productosFiltrados}
          keyExtractor={(p) => p.id}
          numColumns={columnas}
          ListHeaderComponent={encabezado}
          ListEmptyComponent={vacio}
          columnWrapperStyle={estilos.fila}
          contentContainerStyle={estilos.lista}
          onScrollBeginDrag={avisarActividad}
          renderItem={({ item, index }) => (
            /*
             * El tope de ancho es lo que arregla la última fila impar. Con
             * `flex: 1` a secas —que es lo que la tarjeta necesita para que
             * las dos de una fila midan igual— un producto solo en la última
             * fila se estiraba a lo ancho de la pantalla, del doble de tamaño
             * que todos los demás. El tope es el ancho que ya tiene cuando
             * está acompañado, así que en las filas completas no cambia nada.
             */
            <View style={[estilos.celda, { maxWidth: anchoCelda }]}>
              <TarjetaProducto producto={item} alVerDetalle={verDetalle} alAgregar={agregarAlCarrito} indice={index} />
            </View>
          )}
          // Cierra el teclado al empezar a desplazar: con el teclado abierto se
          // ve una sola fila de productos.
          keyboardDismissMode="on-drag"
        />
        )}
        </JalarParaRecargar>
      )}

      {productoAbierto && (
        <ModalProducto
          producto={productoAbierto}
          alCerrar={() => setProductoAbierto(null)}
          alAgregar={agregarAlCarrito}
          conBarraFlotante
        />
      )}

      {promoDetalle && (
        <ModalPromo
          promo={promoDetalle}
          productos={productosDePromo}
          alCerrar={cerrarPromo}
          alVerEnTienda={() => verPromoEnTienda(promoDetalle)}
          alVerProducto={(p) => {
            // Cerrar la promo antes de abrir el producto: dos hojas encima de
            // la otra dejan la de abajo imposible de cerrar.
            cerrarPromo();
            setProductoAbierto(p);
          }}
          alAgregar={agregarAlCarrito}
        />
      )}

      {filtrosAbiertos && (
        <HojaFiltros
          filtros={filtros}
          alCambiar={cambiarFiltro}
          alLimpiar={limpiarFiltros}
          marcas={marcasDisponibles}
          cantidad={productosFiltrados.length}
          alCerrar={() => setFiltrosAbiertos(false)}
        />
      )}

      {menuPasillosAbierto && (
        <MenuPasillos
          modulos={todosLosModulos}
          moduloSeleccionado={moduloSeleccionado}
          alElegir={setModuloSeleccionado}
          alCerrar={() => setMenuPasillosAbierto(false)}
        />
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  saludo: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  errorTexto: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  botonError: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  /*
   * ── Dónde vive el relleno lateral ──
   *
   * NO en el contenedor de la lista, aunque sea lo primero que uno escribe.
   * El encabezado va DENTRO de ese contenedor, y las pastillas de categoría y
   * el carrusel de promos tienen que ir de orilla a orilla: con el relleno
   * puesto arriba, las pastillas arrancaban a 32 px del borde y la última
   * quedaba cortada sin poder alcanzarla, porque el recorte de la lista le
   * caía encima antes de terminar de deslizarse.
   *
   * Así que el relleno se reparte: las filas de la cuadrícula lo ponen ellas
   * (`fila`), y cada pieza del encabezado que no sea deslizable lo pone la
   * suya. Las que sí se deslizan traen el suyo por dentro y llegan al borde.
   */
  lista: {
    paddingBottom: 28,
  },
  fila: {
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  // El tope de ancho lo pone useDisposicion (anchoCelda), según cuántas columnas quepan.
  celda: {
    flex: 1,
  },
  filaPromoActiva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  promoActivaTexto: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '700',
  },
  quitarPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  quitarPromoTexto: {
    fontSize: 12.5,
    color: COLORES.textoVentaja,
    fontWeight: '500',
  },
  seccionDestacados: {
    marginTop: 18,
  },
  tituloDestacados: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  puntoVivo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  tituloSeccion: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.3,
  },
  filaDestacados: {
    gap: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  celdaDestacado: {
    // Ancho fijo: en una fila horizontal las tarjetas no tienen de dónde sacar
    // su medida, y sin esto se encogen al ancho de su texto.
    width: 160,
  },
  encabezadoCatalogo: {
    flexDirection: 'row',
    // Centrado y no por la línea de base: ahora lleva el botón de Filtros.
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 26,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  conteo: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORES.subtitulo,
  },
  ladoConteo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botonFiltros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  botonFiltrosTexto: {
    fontSize: 13,
    fontWeight: '700',
  },
  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 12,
  },
  vacioTexto: {
    fontSize: 14.5,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
});

export default Inicio;
