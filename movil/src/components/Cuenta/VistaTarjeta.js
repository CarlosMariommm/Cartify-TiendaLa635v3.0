// LA TARJETA DE VISTA PREVIA — VistaTarjeta.js
// Puerto de `frontend/src/components/Cuenta/VistaTarjeta.jsx`: la tarjeta de plástico dibujada
// mientras se llenan los datos.

import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Nfc } from 'lucide-react-native';
import MarcaTarjeta from './MarcaTarjeta';
import { detectarMarca, largoDe, soloDigitos } from '../../utils/tarjetas';
import { useIdioma } from '../../context/IdiomaContext';

// Los mismos degradados de la web, con sus tres paradas.
const FONDOS = {
  visa: ['#1A1F71', '#2A3AA8', '#0B1447'],
  mastercard: ['#1C1C1C', '#3B2A1C', '#111111'],
  amex: ['#1F6FB2', '#2E9FD8', '#155A93'],
  discover: ['#2B2B2B', '#4A4A4A', '#1F1F1F'],
  otra: ['#00283D', '#003049', '#009AEB'],
};

// La tipografía de máquina para el número: los dígitos quedan todos del mismo
// ancho y no bailan mientras se escribe.
const MONOESPACIADA = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

// Los dígitos escritos, y puntos donde todavía faltan.
const numeroParaMostrar = (numero) => {
  const marca = detectarMarca(numero);
  const d = soloDigitos(numero);
  const relleno = d + '•'.repeat(Math.max(0, largoDe(marca) - d.length));
  const grupos = marca === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
  let i = 0;
  return grupos
    .map((g) => {
      const parte = relleno.slice(i, i + g);
      i += g;
      return parte;
    })
    .join(' ');
};

const VistaTarjeta = ({ numero = '', titular = '', vencimiento = '', tipo = '' }) => {
  const { t } = useIdioma();
  const marca = detectarMarca(numero);

  return (
    <View style={estilos.tarjeta} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient
        colors={FONDOS[marca]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* El brillo diagonal de una tarjeta de verdad. */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']}
        locations={[0.3, 0.45, 0.6]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* El aro grande del fondo, asomando por la esquina de abajo. */}
      <View style={estilos.aro} />

      <View style={estilos.contenido}>
        <View style={estilos.fila}>
          <View style={estilos.filaIzquierda}>
            {/* El chip dorado. */}
            <LinearGradient
              colors={['#F4DD9B', '#C9A44C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={estilos.chip}
            />
            <Nfc size={20} color="#FFFFFF" style={estilos.nfc} />
          </View>
          <Text style={estilos.tipo}>
            {tipo === 'debito' ? t('DÉBITO') : tipo === 'credito' ? t('CRÉDITO') : ''}
          </Text>
        </View>

        <Text style={estilos.numero} numberOfLines={1} adjustsFontSizeToFit>
          {numeroParaMostrar(numero)}
        </Text>

        <View style={estilos.pie}>
          <View style={estilos.titularCaja}>
            <Text style={estilos.etiqueta}>TITULAR</Text>
            <Text style={estilos.titular} numberOfLines={1}>
              {titular.trim() || t('Nombre en la tarjeta')}
            </Text>
          </View>
          <View>
            <Text style={estilos.etiqueta}>VENCE</Text>
            <Text style={estilos.vence}>{vencimiento || 'MM/AA'}</Text>
          </View>
          <MarcaTarjeta marca={marca} sobreColor alto={34} />
        </View>
      </View>
    </View>
  );
};

const estilos = StyleSheet.create({
  tarjeta: {
    width: '100%',
    // La proporción de una tarjeta de verdad (85.6 × 53.98 mm).
    aspectRatio: 1.586,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#001A29',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  aro: {
    position: 'absolute',
    width: 260,
    height: 260,
    right: -90,
    bottom: -140,
    borderRadius: 130,
    borderWidth: 36,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  contenido: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filaIzquierda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chip: {
    width: 40,
    height: 30,
    borderRadius: 6,
  },
  nfc: {
    opacity: 0.85,
  },
  tipo: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.9,
    opacity: 0.85,
  },
  numero: {
    color: '#FFFFFF',
    fontFamily: MONOESPACIADA,
    fontSize: 19,
    letterSpacing: 1.6,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  titularCaja: {
    flex: 1,
    minWidth: 0,
  },
  etiqueta: {
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 1,
    opacity: 0.7,
  },
  titular: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  vence: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: MONOESPACIADA,
  },
});

export default VistaTarjeta;
