// CASILLA — el "Recordarme 30 días".
// React Native no trae checkbox (el de core se sacó hace varias versiones y el de Expo es otro
// paquete). Son dieciocho píxeles con un borde y un check: no vale traer una dependencia por eso.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEstilos } from '../../context/ModoContext';
import { Check } from './Iconos';

const Casilla = ({ marcada, alCambiar, etiqueta }) => {
  const estilos = useEstilos(crearEstilos);

  return (
    <Pressable
      onPress={() => alCambiar(!marcada)}
      style={estilos.fila}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={etiqueta}
    >
      <View style={[estilos.cuadro, marcada && estilos.cuadroMarcado]}>
        {marcada && <Check size={12} />}
      </View>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
    </Pressable>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cuadro: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORES.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuadroMarcado: {
    backgroundColor: COLORES.marca,
    borderColor: COLORES.marca,
  },
  etiqueta: {
    fontSize: 13,
    color: COLORES.textoVentaja,
  },
});

export default Casilla;
