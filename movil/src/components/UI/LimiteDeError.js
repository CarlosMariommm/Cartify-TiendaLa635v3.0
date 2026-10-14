/*
 * ============================================================
 * LÍMITE DE ERROR — lo que se ve si algo de la app se rompe
 * ============================================================
 * Como LimiteDeError.jsx de la web: si una pantalla revienta al dibujarse, en
 * vez de quedarse la app en blanco (o cerrarse), sale Tiqui caída con el
 * cordón cortado, un mensaje claro y un botón para intentarlo de nuevo.
 *
 * Tiene que ser una clase: React solo deja atrapar errores de dibujo con
 * componentDidCatch / getDerivedStateFromError. La pantalla que se muestra sí
 * es una función, para poder usar los colores del modo y del tema.
 * ============================================================
 */

import { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import Mascota from '../Tiqui/Mascota';
import Boton from './Boton';
import { useIdioma } from '../../context/IdiomaContext';

const PantallaDeError = ({ alReintentar }) => {
  const { t } = useIdioma();
  const estilos = useEstilos(crearEstilos);
  const { colores } = useTema();
  return (
    <View style={estilos.pantalla} accessibilityRole="alert">
      <Mascota pose="error" alto={180} />
      <Text style={estilos.titulo}>{t('Algo se nos cayó')}</Text>
      <Text style={estilos.texto}>
        {t('Esta pantalla tuvo un problema. Tu carrito y tu cuenta están bien: vuelve a intentarlo.')}
      </Text>
      <View style={estilos.boton}>
        <Boton texto={t('Volver a intentar')} alPresionar={alReintentar} color={colores.marca} colorPresionado={colores.marcaOscuro} />
      </View>
    </View>
  );
};

class LimiteDeError extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Para quien depura con Metro abierto; al cliente no le sirve el detalle.
    console.error('La app se rompió dibujando:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return <PantallaDeError alReintentar={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: COLORES.fondo,
  },
  titulo: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    textAlign: 'center',
  },
  texto: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  boton: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
});

export default LimiteDeError;
