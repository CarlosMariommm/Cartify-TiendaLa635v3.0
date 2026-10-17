// PASTILLAS DE CATEGORÍA
// La misma barra de la web: "Todos" y después cada categoría. La activa es café SÓLIDO con texto
// blanco; las demás, blancas con borde.

import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useIdioma } from '../../context/IdiomaContext';

const Pastilla = ({ texto, activa, alPresionar, colores }) => {
  const estilos = useEstilos(crearEstilos);

  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      style={({ pressed }) => [
        estilos.pastilla,
        // La activa es el color de la temporada, SÓLIDO. Es la pieza donde más
        // se nota el tema: son cinco pastillas en fila arriba de todo.
        activa && { backgroundColor: colores.marca, borderColor: colores.marca },
        pressed && !activa && { borderColor: colores.marca, backgroundColor: colores.marcaSuave },
      ]}
    >
      <Text style={[estilos.texto, activa && estilos.textoActivo]} numberOfLines={1}>
        {texto}
      </Text>
    </Pressable>
  );
};

const PastillasCategoria = ({ categorias, seleccionada, alSeleccionar }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={estilos.fila}
      // Que el gesto horizontal no arrastre la página entera hacia los lados.
      directionalLockEnabled
    >
      <Pastilla
        texto={t('Todos')}
        activa={!seleccionada}
        alPresionar={() => alSeleccionar(null)}
        colores={colores}
      />
      {categorias.map((cat) => (
        <Pastilla
          key={cat}
          texto={t(cat)}
          activa={seleccionada === cat}
          alPresionar={() => alSeleccionar(cat)}
          colores={colores}
        />
      ))}
    </ScrollView>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  fila: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  pastilla: {
    // 44 de alto: el pulgar no apunta, aproxima.
    height: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORES.linea,
    backgroundColor: COLORES.fondo,
  },
  texto: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORES.textoVentaja,
  },
  textoActivo: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default PastillasCategoria;
