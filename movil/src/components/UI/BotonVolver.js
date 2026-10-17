// "‹ VOLVER" — el botón de las páginas de producto y de promoción
// El mismo de la web: una píldora con borde, dentro de la página y no en una barra aparte.

import { Pressable, StyleSheet, Text } from 'react-native';
import { ChevronIzquierda } from './Iconos';
import { useIdioma } from '../../context/IdiomaContext';
import { useColores } from '../../context/ModoContext';

const BotonVolver = ({ alPresionar, color, sobreFoto = false }) => {
  const { t } = useIdioma();
  const COLORES = useColores();
  const tinta = sobreFoto ? '#1C1614' : color || COLORES.tituloFuerte;
  return (
    <Pressable
      onPress={alPresionar}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('Volver')}
      style={({ pressed }) => [
        estilos.boton,
        { borderColor: sobreFoto ? 'transparent' : color || COLORES.borde },
        sobreFoto && estilos.sobreFoto,
        pressed && estilos.presionado,
      ]}
    >
      <ChevronIzquierda size={16} color={tinta} grosor={2.2} />
      <Text style={[estilos.texto, { color: tinta }]}>{t('Volver')}</Text>
    </Pressable>
  );
};

const estilos = StyleSheet.create({
  boton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 11,
    paddingRight: 15,
  },
  sobreFoto: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  presionado: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  texto: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});

export default BotonVolver;
