// BOTÓN — el café de la tienda.
// Copia el de la web: ancho completo, 13 de alto interno, esquinas de 8 y el café que se oscurece
// al presionar.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEstilos } from '../../context/ModoContext';
import { EsperaMascota } from '../Tiqui/Mascota';
import { useIdioma } from '../../context/IdiomaContext';

const Boton = ({
  texto,
  alPresionar,
  cargando = false,
  deshabilitado = false,
  icono = null,
  estilo,
  color,
  colorPresionado,
}) => {
  const estilos = useEstilos(crearEstilos);
  const inactivo = cargando || deshabilitado;
  const { t } = useIdioma();

  return (
    <Pressable
      onPress={alPresionar}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        estilos.boton,
        !!color && { backgroundColor: color },
        pressed && !inactivo && estilos.presionado,
        pressed && !inactivo && !!colorPresionado && { backgroundColor: colorPresionado },
        inactivo && estilos.inactivo,
        estilo,
      ]}
    >
      {cargando ? (
        <View style={estilos.contenido}>
          <EsperaMascota alto={22} sobre="color" />
          <Text style={estilos.texto}>{t('Un momento…')}</Text>
        </View>
      ) : (
        <View style={estilos.contenido}>
          <Text style={estilos.texto}>{texto}</Text>
          {icono}
        </View>
      )}
    </Pressable>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  boton: {
    width: '100%',
    paddingVertical: 13,
    backgroundColor: COLORES.marca,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  presionado: {
    backgroundColor: COLORES.marcaOscuro,
  },
  inactivo: {
    backgroundColor: COLORES.marcaApagado,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  texto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Boton;
