// EL LOGO DE LA RED DE LA TARJETA — MarcaTarjeta.js
// Puerto de `frontend/src/components/Cuenta/MarcaTarjeta.jsx`: el logo se dibuja aquí mismo, sin
// imágenes que descargar ni un paquete de logos.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { CreditCard } from 'lucide-react-native';
import { useColores } from '../../context/ModoContext';
import { useIdioma } from '../../context/IdiomaContext';

const MarcaTarjeta = ({ marca = 'otra', sobreColor = false, alto = 30 }) => {
  const { t } = useIdioma();
  const COLORES = useColores();
  const ancho = Math.round(alto * 1.5);
  const caja = {
    width: ancho,
    height: alto,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (marca === 'visa') {
    return (
      <View style={[caja, { backgroundColor: sobreColor ? 'transparent' : '#1A1F71' }]} accessibilityLabel="Visa">
        <Text style={[estilos.visa, { fontSize: alto * 0.46 }]}>VISA</Text>
      </View>
    );
  }

  if (marca === 'mastercard') {
    return (
      <View
        style={[caja, { backgroundColor: sobreColor ? 'transparent' : '#1C1C1C' }]}
        accessibilityLabel="Mastercard"
      >
        <Svg width={ancho * 0.72} height={alto * 0.62} viewBox="0 0 38 24">
          <Circle cx="13" cy="12" r="11" fill="#EB001B" />
          <Circle cx="25" cy="12" r="11" fill="#F79E1B" />
          <Path d="M19 3.3a11 11 0 0 1 0 17.4 11 11 0 0 1 0-17.4Z" fill="#FF5F00" />
        </Svg>
      </View>
    );
  }

  if (marca === 'amex') {
    return (
      <View
        style={[caja, { backgroundColor: sobreColor ? 'transparent' : '#2E77BC' }]}
        accessibilityLabel="American Express"
      >
        <Text
          style={[
            estilos.amex,
            { fontSize: alto * 0.34 },
            sobreColor && estilos.amexSobreColor,
          ]}
        >
          AMEX
        </Text>
      </View>
    );
  }

  if (marca === 'discover') {
    return (
      <View
        style={[
          caja,
          sobreColor
            ? { backgroundColor: 'transparent' }
            : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E5' },
        ]}
        accessibilityLabel="Discover"
      >
        <View style={estilos.discover}>
          <Text style={[estilos.discoverTexto, { fontSize: alto * 0.24, color: sobreColor ? '#FFFFFF' : '#231F20' }]}>
            DISC
          </Text>
          {/* La "o" de Discover es el punto naranja de su logo. */}
          <View style={{ width: alto * 0.24, height: alto * 0.24, borderRadius: alto * 0.12, backgroundColor: '#F58220' }} />
          <Text style={[estilos.discoverTexto, { fontSize: alto * 0.24, color: sobreColor ? '#FFFFFF' : '#231F20' }]}>
            VER
          </Text>
        </View>
      </View>
    );
  }

  // Sin marca reconocida: el icono de tarjeta, con los colores de la app.
  return (
    <View
      style={[caja, { backgroundColor: sobreColor ? 'transparent' : COLORES.marcaSuave }]}
      accessibilityLabel={t('Tarjeta')}
    >
      <CreditCard size={alto * 0.6} color={sobreColor ? '#FFFFFF' : COLORES.marca} />
    </View>
  );
};

const estilos = StyleSheet.create({
  visa: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.4,
  },
  amex: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  amexSobreColor: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  discover: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  discoverTexto: {
    fontWeight: '800',
  },
});

export default MarcaTarjeta;
