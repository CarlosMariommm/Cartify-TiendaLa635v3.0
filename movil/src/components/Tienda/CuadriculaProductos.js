/*
 * ============================================================
 * CUADRÍCULA DE PRODUCTOS (dentro de una página que ya se desplaza)
 * ============================================================
 * La misma tarjeta y las mismas columnas que la portada, para las páginas de
 * un producto ("Quien compra esto también lleva", "Del mismo pasillo") y de
 * una promoción. Se arma con `flexWrap` y no con FlatList porque esas
 * páginas ya son un ScrollView, y anidar dos listas que se desplazan en el
 * mismo sentido es justo lo que React Native avisa que no se haga.
 *
 * El ancho de cada celda sale de useDisposicion: dos en el teléfono, más en
 * la tablet, y la última de una fila incompleta NO se estira (una promo de
 * tres productos dejaba al tercero del doble de tamaño que sus hermanos).
 * ============================================================
 */

import { StyleSheet, View } from 'react-native';
import TarjetaProducto from './TarjetaProducto';
import { useDisposicion } from '../../hooks/useDisposicion';
import { SEPARACION_CATALOGO } from '../../utils/disposicion';

const CuadriculaProductos = ({ productos, alVerDetalle, alAgregar }) => {
  const { anchoCelda } = useDisposicion();
  return (
    <View style={estilos.cuadricula}>
      {productos.map((p, i) => (
        <View key={p.id} style={{ width: anchoCelda }}>
          <TarjetaProducto producto={p} alVerDetalle={alVerDetalle} alAgregar={alAgregar} indice={i} />
        </View>
      ))}
    </View>
  );
};

const estilos = StyleSheet.create({
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SEPARACION_CATALOGO,
  },
});

export default CuadriculaProductos;
