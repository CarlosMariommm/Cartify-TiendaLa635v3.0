// LAS CINCO ESTRELLAS — Estrellas.js
// La fila de estrellas que se toca para calificar, y la misma fila quieta cuando ya se calificó
// (`soloLectura`).

import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useColores } from '../../context/ModoContext';
import { useIdioma } from '../../context/IdiomaContext';

const AMARILLO = '#F5A623';
const VALORES = [1, 2, 3, 4, 5];

const Estrellas = ({ valor = 0, alElegir, tamano = 30, soloLectura = false }) => {
  const { t } = useIdioma();
  const COLORES = useColores();

  return (
    <View style={estilos.fila} accessibilityRole={soloLectura ? 'text' : 'radiogroup'}>
      {VALORES.map((n) => {
        const activa = valor >= n;
        const estrella = (
          <Star
            size={tamano}
            color={activa ? AMARILLO : COLORES.tintaApagada}
            fill={activa ? AMARILLO : 'transparent'}
            strokeWidth={1.8}
          />
        );

        if (soloLectura) return <View key={n}>{estrella}</View>;

        return (
          <Pressable
            key={n}
            onPress={() => alElegir?.(n)}
            hitSlop={7}
            accessibilityRole="radio"
            accessibilityState={{ checked: valor === n }}
            accessibilityLabel={t('{n} de 5', { n })}
            style={({ pressed }) => pressed && estilos.presionada}
          >
            {estrella}
          </Pressable>
        );
      })}
    </View>
  );
};

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presionada: {
    transform: [{ scale: 0.9 }],
  },
});

export default Estrellas;
