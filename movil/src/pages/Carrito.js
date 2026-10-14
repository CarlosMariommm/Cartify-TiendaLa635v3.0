/*
 * ============================================================
 * CARRITO
 * ============================================================
 * Lo que lleva, cuánto lleva de cada cosa y cuánto suma. Es la "CART VIEW" de
 * `ShoppingCart.jsx` — la primera de sus tres vistas.
 *
 * Las otras dos vistas de ese archivo —el checkout y la confirmación— ya
 * existen: pages/Checkout.js y pages/Confirmacion.js. Esta pantalla se queda
 * con lo suyo, que es qué lleva y cuánto suma, y pasa el relevo con el botón
 * de abajo.
 *
 * ── Por qué el resumen no menciona el envío ──
 *
 * Porque todavía no se sabe si lo hay, ni cuánto. El renglón de "Costo de
 * envío" sale de haber elegido domicilio y una dirección (se cobra por
 * distancia), y las dos cosas se eligen en la pantalla siguiente; aquí un
 * "$0.00" fijo diría que el envío es gratis, y cualquier otro número cobraría
 * de más a quien piensa pasar a traerlo. Por eso el total de aquí se llama
 * Subtotal —es lo que valen los productos— y el de verdad se arma en el
 * checkout.
 *
 * ── Una corrección respecto de la web ──
 *
 * Allá el total de cada línea se pinta como `precio × cantidad`, pero el total
 * de abajo sí aplica el NxM. En un 2x1 eso deja las líneas sumando más que el
 * total, y quien revisa su carrito encuentra una resta que no cuadra. Aquí las
 * dos cuentas salen de `totalDeLinea` (ver utils/catalogo.js), así que suman.
 * ============================================================
 */

import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Mascota from '../components/Tiqui/Mascota';
// El Image de expo-image y no el de react-native: el nativo no decodifica
// WebP/AVIF de forma fiable, y las fotos vienen de Cloudinary en .webp.
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Store, Trash2 } from 'lucide-react-native';
import { useColores, useEstilos } from '../context/ModoContext';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { useTienda } from '../context/TiendaContext';
import { useTema } from '../context/TemaContext';
import Boton from '../components/UI/Boton';
import { ChevronIzquierda, Mas, Menos, Paquete } from '../components/UI/Iconos';
import { abrirProducto } from '../navigation/navigationRef';
import { totalDeLinea } from '../utils/catalogo';
import { ajustarCantidad, cantidadConUnidad, esPorLibra, pasoDe } from '../utils/unidades';
import { iconoDeModulo } from '../utils/modulos';
import { avisarActividad } from '../utils/actividadUsuario';
import { useIdioma } from '../context/IdiomaContext';
import { foto, ANCHO } from '../utils/fotos';
import { DIRECCION_EN_UNA_LINEA } from '../utils/tienda';

const LineaCarrito = ({ item, pasillos, alActualizar, alEliminar, alAbrir, colores }) => {
  const { t } = useIdioma();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const [fallóImagen, setFallóImagen] = useState(false);
  const paso = pasoDe(item);
  // Qué pasillo es este producto, para pintar su icono al frente de la fila
  // -el mismo dibujo que ya usa MenuPasillos para ese pasillo-, no cuál
  // es (eso ya se ve en la ficha del producto).
  const modulo = pasillos.find((m) => String(m._id) === String(item.moduloId));
  const IconoModulo = iconoDeModulo(modulo);

  return (
    <View style={estilos.linea}>
      {/* Foto, nombre y precio abren la ficha del producto; los controles de
          cantidad se quedan aparte para que no compitan por el mismo toque. */}
      <Pressable onPress={() => alAbrir(item)} accessibilityRole="button" accessibilityLabel={t('Ver {nombre}', { nombre: item.nombre })}>
        <View style={estilos.miniatura}>
          {item.imagen && !fallóImagen ? (
            <Image
              source={{ uri: foto(item.imagen, ANCHO.miniatura) }}
              contentFit="contain"
              style={estilos.miniaturaImagen}
              onError={() => setFallóImagen(true)}
            />
          ) : (
            <Paquete size={26} />
          )}
        </View>
      </Pressable>

      <View style={estilos.datos}>
        <Pressable onPress={() => alAbrir(item)} accessibilityRole="button" accessibilityLabel={t('Ver {nombre}', { nombre: item.nombre })}>
          <Text style={estilos.nombre} numberOfLines={2}>{item.nombre}</Text>

          <View style={estilos.filaPrecio}>
            {!!item.precioAnterior && (
              <Text style={estilos.precioViejo}>${Number(item.precioAnterior).toFixed(2)}</Text>
            )}
            <Text style={estilos.precioUnitario}>
              ${Number(item.precio).toFixed(2)}
              {esPorLibra(item) && <Text style={estilos.porUnidad}>/lb</Text>}
            </Text>
          </View>
        </Pressable>

        {/*
          El "+" y el "−" se mueven al paso de SU unidad: de uno en uno las
          piezas, de media en media las libras. Pedir media libra de queso es
          lo normal en el mostrador, y obligar a llevar una libra entera es
          cobrar de más. Ver utils/unidades.js.
        */}
        <View style={estilos.controles}>
          <View style={estilos.insigniaModulo} accessibilityElementsHidden importantForAccessibility="no">
            <IconoModulo size={16} color={colores.marca} strokeWidth={2} />
          </View>

          <Pressable
            onPress={() => alActualizar(item.id, ajustarCantidad(item, item.cantidad - paso))}
            disabled={item.cantidad <= paso}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('Quitar uno')}
            style={({ pressed }) => [
              estilos.botonPaso,
              pressed && { backgroundColor: colores.marcaSuave, borderColor: colores.marca },
              item.cantidad <= paso && estilos.botonPasoApagado,
            ]}
          >
            <Menos size={12} color={item.cantidad <= paso ? COLORES.marcador : COLORES.texto} />
          </Pressable>

          <Text style={estilos.cantidad}>{cantidadConUnidad(item, item.cantidad)}</Text>

          <Pressable
            onPress={() => alActualizar(item.id, ajustarCantidad(item, item.cantidad + paso))}
            disabled={item.cantidad >= item.stock}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('Agregar uno')}
            style={({ pressed }) => [
              estilos.botonPaso,
              pressed && { backgroundColor: colores.marcaSuave, borderColor: colores.marca },
              item.cantidad >= item.stock && estilos.botonPasoApagado,
            ]}
          >
            <Mas size={12} color={item.cantidad >= item.stock ? COLORES.marcador : COLORES.texto} />
          </Pressable>

          {/* Al final y no al frente: es la acción destructiva, y pegarla al
              "+" (a donde más se toca) invitaba a un error justo ahí. */}
          <Pressable
            onPress={() => alEliminar(item.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('Quitar {nombre} del carrito', { nombre: item.nombre })}
            style={({ pressed }) => [estilos.botonQuitar, pressed && estilos.botonQuitarPresionado]}
          >
            <Trash2 size={14} color={COLORES.textoSuave} />
          </Pressable>
        </View>
      </View>

      <Text style={estilos.totalLinea}>${totalDeLinea(item).toFixed(2)}</Text>
    </View>
  );
};

const Carrito = ({ irAInicio, irAPagar }) => {
  const { t } = useIdioma();
  const { carrito, totalCarrito, cantidadItems, actualizarCantidad, eliminarDelCarrito, limpiarCarrito, pasillos } =
    useTienda();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  // Igual que BarraInferior: sin esto "Ir a pagar" queda debajo de la franja
  // de gestos de Android, porque app.json trae edgeToEdgeEnabled.
  const { bottom } = useSafeAreaInsets();

  const vacio = carrito.length === 0;

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <Pressable
          onPress={irAInicio}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Volver a la tienda')}
          style={({ pressed }) => [
            estilos.botonVolver,
            pressed && { backgroundColor: colores.marcaSuave },
          ]}
        >
          <ChevronIzquierda size={18} />
        </Pressable>

        <View style={estilos.tituloBarra}>
          <ShoppingBag size={18} color={COLORES.texto} />
          <Text style={estilos.tituloTexto}>{t('Carrito')}</Text>
          {!vacio && (
            <Text style={estilos.conteo}>
              ({carrito.length} {t(carrito.length === 1 ? 'artículo' : 'artículos')})
            </Text>
          )}
        </View>
      </View>

      {vacio ? (
        <View style={estilos.centro}>
          {/* Como en la web: Tiqui mirando un carrito vacío. */}
          <Mascota pose="vacio" alto={130} />
          <Text style={estilos.vacioTitulo}>{t('Tu carrito está vacío')}</Text>
          <Text style={estilos.vacioTexto}>{t('¡Agrega productos para comenzar!')}</Text>
          <View style={estilos.botonVacio}>
            <Boton
              texto={t('Ver la tienda')}
              alPresionar={irAInicio}
              color={colores.marca}
              colorPresionado={colores.marcaOscuro}
            />
          </View>
        </View>
      ) : (
        <>
          <FlatList
            data={carrito}
            keyExtractor={(item) => item.id}
            contentContainerStyle={estilos.lista}
            onScrollBeginDrag={avisarActividad}
            ListHeaderComponent={
              <>
                <View style={estilos.tienda}>
                  <View style={[estilos.iconoTienda, { backgroundColor: colores.marcaSuave }]}>
                    {/* Mismo icono que BarraMarca/BarraInferior (lucide Store):
                        el dibujo a mano de Iconos.js se veía distinto al resto. */}
                    <Store size={17} color={colores.marca} strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={estilos.tiendaNombre}>Tienda la 635</Text>
                    {/* La misma dirección que Ayuda y el pie de la web. */}
                    <Text style={estilos.tiendaLugar}>{DIRECCION_EN_UNA_LINEA}</Text>
                  </View>
                </View>
                <Text style={estilos.etiquetaProductos}>{t('Productos')}</Text>
              </>
            }
            renderItem={({ item }) => (
              <LineaCarrito
                item={item}
                pasillos={pasillos}
                alActualizar={actualizarCantidad}
                alEliminar={eliminarDelCarrito}
                // Su ficha es su propia página: al volver, se está otra vez aquí.
                alAbrir={abrirProducto}
                colores={colores}
              />
            )}
          />

          {/*
            El resumen vive FUERA de la lista: es el número por el que se abrió
            esta pantalla, y al final de una lista de quince productos habría
            que desplazarse hasta abajo para verlo.
          */}
          <View style={[estilos.pie, { paddingBottom: Math.max(bottom + 10, 26) }]}>
            <View style={estilos.resumen}>
              <Text style={estilos.resumenTitulo}>{t('Resumen de orden')}</Text>
              <View style={estilos.resumenFila}>
                <Text style={estilos.resumenEtiqueta}>
                  {cantidadItems === 1 ? t('1 artículo') : t('{n} artículos', { n: cantidadItems })}
                </Text>
                <Text style={estilos.resumenValor}>${totalCarrito.toFixed(2)}</Text>
              </View>
              <View style={estilos.separador} />
              <View style={estilos.resumenFila}>
                <Text style={estilos.totalEtiqueta}>{t('Subtotal')}</Text>
                <Text style={estilos.totalValor}>${totalCarrito.toFixed(2)}</Text>
              </View>
            </View>

            {/*
              "Vaciar" y "Ir a pagar" en el mismo renglón, con los pesos
              cambiados respecto del tamaño: el que se lleva el ancho es el que
              sigue el camino, y el que borra todo se queda del tamaño justo
              para tocarlo a propósito y no de pasada.
            */}
            <View style={estilos.botones}>
              <Pressable
                onPress={limpiarCarrito}
                accessibilityRole="button"
                style={({ pressed }) => [estilos.botonVaciar, pressed && estilos.botonVaciarPresionado]}
              >
                <Text style={estilos.botonVaciarTexto}>{t('Vaciar')}</Text>
              </Pressable>

              <View style={estilos.botonPagar}>
                {/* Lleva el monto encima: es la última vez que se ve antes de
                    empezar a elegir cómo se paga. */}
                <Boton
                  texto={t('Ir a pagar · ${total}', { total: totalCarrito.toFixed(2) })}
                  alPresionar={irAPagar}
                  color={colores.marca}
                  colorPresionado={colores.marcaOscuro}
                />
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tituloTexto: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  conteo: {
    fontSize: 13,
    color: COLORES.subtitulo,
    fontWeight: '500',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 6,
  },
  vacioTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    marginTop: 10,
  },
  vacioTexto: {
    fontSize: 14,
    color: COLORES.textoSuave,
  },
  botonVacio: {
    marginTop: 20,
    alignSelf: 'stretch',
  },
  lista: {
    ...contenidoCentrado,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tienda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 16,
  },
  iconoTienda: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiendaNombre: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  tiendaLugar: {
    fontSize: 12,
    color: COLORES.subtitulo,
    marginTop: 1,
  },
  etiquetaProductos: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORES.subtitulo,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  linea: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
  },
  miniatura: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: COLORES.papelGris,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 7,
  },
  miniaturaImagen: {
    width: '100%',
    height: '100%',
  },
  datos: {
    flex: 1,
    gap: 3,
  },
  nombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.texto,
    lineHeight: 18,
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  precioViejo: {
    fontSize: 11,
    color: COLORES.marcador,
    textDecorationLine: 'line-through',
  },
  precioUnitario: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.textoVentaja,
  },
  porUnidad: {
    fontSize: 11,
    color: COLORES.textoTenue,
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  // El pasillo del producto, al frente de la fila. No es un botón -no hace
  // nada al tocarlo, solo dice de dónde es-, así que sin ancho de "botón"
  // ni fondo propio: el mismo alto de 30 que sus vecinos, para que la fila
  // no salte.
  insigniaModulo: {
    width: 22,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonQuitar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Separado de los pasos: es la acción destructiva y no debe quedar pegada
    // al "+", que es a lo que más se le apunta.
    marginLeft: 4,
  },
  botonQuitarPresionado: {
    backgroundColor: COLORES.peligroFondo,
  },
  botonPaso: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  botonPasoApagado: {
    borderColor: COLORES.linea,
    backgroundColor: COLORES.papelSuave,
  },
  cantidad: {
    minWidth: 52,
    textAlign: 'center',
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORES.texto,
  },
  totalLinea: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    minWidth: 62,
    textAlign: 'right',
  },
  pie: {
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
    paddingHorizontal: 16,
    paddingTop: 14,
    // paddingBottom real se pone en línea, con la franja de gestos sumada.
    backgroundColor: COLORES.fondo,
  },
  resumen: {
    backgroundColor: COLORES.papelSuave,
    borderRadius: 14,
    padding: 14,
  },
  resumenTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
    marginBottom: 10,
  },
  resumenFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumenEtiqueta: {
    fontSize: 13.5,
    color: COLORES.textoVentaja,
  },
  resumenValor: {
    fontSize: 13.5,
    color: COLORES.textoVentaja,
    fontWeight: '600',
  },
  separador: {
    height: 1,
    backgroundColor: COLORES.borde,
    marginVertical: 11,
  },
  totalEtiqueta: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  totalValor: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
  botones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  botonVaciar: {
    height: 48,
    // Ancho justo para el texto y el dedo, sin competir con el de pagar.
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // El que sigue el camino se lleva todo lo que sobra del renglón.
  botonPagar: {
    flex: 1,
  },
  botonVaciarPresionado: {
    borderColor: COLORES.error,
    backgroundColor: COLORES.peligroFondo,
  },
  botonVaciarTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORES.textoVentaja,
  },
});

export default Carrito;
