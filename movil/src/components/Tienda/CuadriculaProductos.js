// CUADRÍCULA DE PRODUCTOS (dentro de una página que ya se desplaza) La misma tarjeta y las mismas
// columnas que la portada, para las páginas de un producto ("Quien compra esto también lleva",
// "Del mismo pasillo") y de una promoción.

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
