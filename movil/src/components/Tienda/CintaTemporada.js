// CINTA DE TEMPORADA
// La franja con el saludo de la fecha, debajo del encabezado. Es la mitad seria de la decoración:
// las figuras que caen ponen el ambiente, pero esto DICE algo.

import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '../../context/TemaContext';
import { useIdioma } from '../../context/IdiomaContext';

const CintaTemporada = () => {
  const { t } = useIdioma();
  const { decoracion, colores, activo, saludoNormal } = useTema();

  // Con temporada: su saludo (si la decoración está encendida). Sin temporada: el saludo de días
  // normales, si el dueño escribió uno. Si no hay nada que decir no se pinta NADA — ni una vista
  // vacía: un contenedor invisible con relleno sigue empujando la tienda hacia abajo todo el año.
  const texto = activo ? decoracion?.saludo : saludoNormal;
  if (!texto) return null;

  return (
    <View
      style={[estilos.banda, { backgroundColor: colores.marca }]}
      accessibilityRole="text"
    >
      <Text style={estilos.texto}>{t(texto)}</Text>
    </View>
  );
};

const estilos = StyleSheet.create({
  banda: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  texto: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

export default CintaTemporada;
