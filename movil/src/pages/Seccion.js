// SECCIÓN — el "Ver todos" de una fila de la portada
// La misma cuadrícula de la portada (2 columnas en el teléfono, más en la tablet), con los
// productos de una sola sección.

import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEstilos } from '../context/ModoContext';
import { ALTURA_ESTADO } from '../theme/pantalla';
import { useTema } from '../context/TemaContext';
import { ChevronIzquierda } from '../components/UI/Iconos';
import TarjetaProducto from '../components/Tienda/TarjetaProducto';
import { avisarActividad } from '../utils/actividadUsuario';
import { useIdioma } from '../context/IdiomaContext';
import { useDisposicion } from '../hooks/useDisposicion';

const Seccion = ({ seccion, alVolver, alVerDetalle, alAgregar }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  // Las mismas columnas que la portada: 2 en el teléfono, más en la tablet.
  const { columnas, anchoCelda } = useDisposicion();
  const productos = seccion?.todos || seccion?.productos || [];

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <Pressable
          onPress={alVolver}
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

        <View style={estilos.titulos}>
          <Text style={estilos.titulo} numberOfLines={1}>{t(seccion?.titulo || '')}</Text>
          <Text style={estilos.conteo}>
            {productos.length} {t(productos.length === 1 ? 'producto' : 'productos')}
          </Text>
        </View>
      </View>

      <FlatList
        key={`seccion-${columnas}`}
        data={productos}
        keyExtractor={(p) => p.id}
        numColumns={columnas}
        columnWrapperStyle={estilos.fila}
        contentContainerStyle={estilos.lista}
        onScrollBeginDrag={avisarActividad}
        renderItem={({ item, index }) => (
          <View style={[estilos.celda, { maxWidth: anchoCelda }]}>
            <TarjetaProducto producto={item} alVerDetalle={alVerDetalle} alAgregar={alAgregar} indice={index} />
          </View>
        )}
      />
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
    gap: 8,
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
  titulos: {
    flexShrink: 1,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.2,
  },
  conteo: {
    fontSize: 12.5,
    color: COLORES.subtitulo,
  },
  lista: {
    paddingTop: 16,
    paddingBottom: 28,
  },
  fila: {
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  // El tope de ancho lo pone useDisposicion (anchoCelda).
  celda: {
    flex: 1,
  },
});

export default Seccion;
