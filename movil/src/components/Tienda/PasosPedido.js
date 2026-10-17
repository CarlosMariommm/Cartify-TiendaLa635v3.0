import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '../../context/TemaContext';
import { useColores, useEstilos } from '../../context/ModoContext';
import { pasosDe, indiceDePaso } from '../../utils/pasosPedido';

// LA LÍNEA DE PASOS — PasosPedido.js
// El "Recibido → Preparando → En camino → Entregado", con el paso actual resaltado y los ya
// pasados marcados.
const PasosPedido = ({ deliveryType, estado }) => {
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const PASOS = pasosDe(deliveryType);
  const pasoActual = indiceDePaso(PASOS, estado);

  return (
    <View>
      {PASOS.map((p, i) => {
        const hecho = i < pasoActual;
        const actual = i === pasoActual;
        return (
          <View key={p.id} style={[estilos.fila, { opacity: hecho || actual ? 1 : 0.55 }]}>
            <View style={estilos.columnaIcono}>
              <View
                style={[
                  estilos.icono,
                  { backgroundColor: actual ? colores.marca : hecho ? colores.marcaSuave : colores.marcaTenue },
                ]}
              >
                <p.Icono
                  size={14}
                  color={actual ? '#FFFFFF' : hecho ? colores.marca : COLORES.tintaApagada}
                  strokeWidth={2.4}
                />
              </View>
              {i < PASOS.length - 1 && (
                <View style={[estilos.raya, { backgroundColor: hecho ? colores.marcaSuave : colores.marcaTenue }]} />
              )}
            </View>
            <View style={{ paddingBottom: i < PASOS.length - 1 ? 12 : 0, flex: 1 }}>
              <Text style={[estilos.label, actual && estilos.labelActual]}>{p.label}</Text>
              <Text style={estilos.detalle}>{p.detalle}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  columnaIcono: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  icono: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raya: {
    width: 2,
    flex: 1,
    minHeight: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.tintaSuave,
  },
  labelActual: {
    fontWeight: '800',
    color: COLORES.tinta,
  },
  detalle: {
    fontSize: 11.5,
    color: COLORES.tintaTenue,
  },
});

export default PasosPedido;
