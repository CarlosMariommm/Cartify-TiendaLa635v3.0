// BARRA DE MARCA — "Tienda la 635" arriba de todo.
// La misma barra de la web: en Iniciar sesión va a la izquierda con "Seguir viendo la tienda" y
// en Registrarse va sola y centrada.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Store } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { ALTURA_ESTADO } from '../../theme/pantalla';
import MarcaTienda from './MarcaTienda';

const BarraMarca = ({ centrado = false, alTocarMarca, textoAccion, alPresionarAccion }) => {
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 12 }, centrado && estilos.barraCentrada]}>
      <Pressable accessibilityRole={alTocarMarca ? "button" : undefined} onPress={alTocarMarca} disabled={!alTocarMarca} style={centrado && estilos.marcaCentrada}>
        <MarcaTienda tamano={20} centrado={centrado} />
      </Pressable>

      {textoAccion && (
        <Pressable
          onPress={alPresionarAccion}
          style={({ pressed }) => [estilos.accion, pressed && estilos.accionPresionada]}
          accessibilityRole="button"
        >
          {/* Mismo icono que la web: lucide `Store`, 15 px y trazo 2.2. */}
          <Store size={15} color={COLORES.tintaSuave} strokeWidth={2.2} />
          <Text style={estilos.textoAccion}>{textoAccion}</Text>
        </Pressable>
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  barra: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORES.fondo,
  },
  barraCentrada: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  marcaCentrada: {
    alignItems: 'center',
  },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORES.linea,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  accionPresionada: {
    borderColor: COLORES.marca,
  },
  textoAccion: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORES.tintaSuave,
  },
});

export default BarraMarca;
