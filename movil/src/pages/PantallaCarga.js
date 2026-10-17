// PANTALLA DE CARGA — la pantalla de bienvenida adicional al Splash Screen.
// Se muestra con la marca de la tienda mientras se revisa si hay una sesión guardada.

import { StyleSheet, Text, View } from 'react-native';
import { useEstilos } from '../context/ModoContext';
import Mascota from '../components/Tiqui/Mascota';
import { FUENTE_MARCA } from '../theme/tipografia';

const PantallaCarga = () => {
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.marca}>
        <Text style={estilos.marcaNombre}>Tienda</Text>
        <Text style={estilos.marcaNombre}>la 635</Text>
      </View>
      {/* Tiqui balanceándose de su cordón mientras se revisa la sesión. */}
      <View style={estilos.indicador}>
        <Mascota pose="cargando" alto={96} />
      </View>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.fondo,
  },
  marca: {
    alignItems: 'center',
  },
  marcaNombre: {
    fontSize: 36,
    lineHeight: 40,
    fontFamily: FUENTE_MARCA,
    color: COLORES.tituloFuerte,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  indicador: {
    marginTop: 30,
  },
});

export default PantallaCarga;
