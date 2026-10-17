// BARRA DE UNA PANTALLA DE LA CUENTA
// La flecha de volver y el título. La usan las cinco pantallas que cuelgan del perfil (mis datos,
// puntos, favoritos, direcciones, avisos).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEstilos } from '../../context/ModoContext';
import { ALTURA_ESTADO } from '../../theme/pantalla';
import { useTema } from '../../context/TemaContext';
import { ChevronIzquierda } from '../UI/Iconos';
import { useIdioma } from '../../context/IdiomaContext';

const BarraCuenta = ({ titulo, alVolver }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
      <Pressable
        onPress={alVolver}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('Volver a mi cuenta')}
        style={({ pressed }) => [
          estilos.botonVolver,
          pressed && { backgroundColor: colores.marcaSuave },
        ]}
      >
        <ChevronIzquierda size={18} />
      </Pressable>

      <Text style={estilos.titulo} numberOfLines={1}>
        {titulo}
      </Text>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
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
  titulo: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.3,
  },
});

export default BarraCuenta;
