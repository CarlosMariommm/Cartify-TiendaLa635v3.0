// ¿SEGURO? — ModalConfirmar.js
// La pregunta de confirmar, con la cara de la app.

import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import { useIdioma } from '../../context/IdiomaContext';

const ModalConfirmar = ({
  titulo,
  mensaje,
  textoConfirmar,
  textoCancelar,
  // La acción que borra o saca algo va en rojo; la normal, del color de la
  // tienda. Es lo único que cambia entre las dos.
  destructivo = false,
  trabajando = false,
  alConfirmar,
  alCerrar,
}) => {
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  // Entra apareciendo y creciendo un pelo, como los cuadros del sistema: de
  // golpe se siente un parpadeo, no un cuadro que llegó.
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrada]);

  useBotonAtras(alCerrar);
  const { t } = useIdioma();

  const colorAccion = destructivo ? COLORES.peligro : colores.marca;
  // En oscuro el rojo de peligro se aclara (es el mismo criterio de toda la paleta), y ahí el texto
  // blanco encima se lee mal: sobre ese rojo claro la letra va oscura. En claro, y en el botón de
  // marca, sigue siendo blanca.
  const colorTextoAccion = destructivo
    ? (COLORES.oscuro ? COLORES.sobreTinta : '#FFFFFF')
    // Sobre la marca: blanco, salvo con las paletas oscuras del panel (modo del personal).
    : COLORES.sobreMarca;

  return (
    <View style={estilos.capa}>
      <Animated.View style={[estilos.fondo, { opacity: entrada }]}>
        {/* Tocar fuera es "no". El Pressable va DEBAJO del panel, no
            envolviéndolo: envuelto, cada toque dentro del cuadro burbujearía
            hasta aquí y lo cerraría. */}
        <Pressable accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={trabajando ? undefined : alCerrar}
          accessibilityLabel={t('Cerrar')}
        />

        <Animated.View
          style={[
            estilos.panel,
            {
              opacity: entrada,
              transform: [
                { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              ],
            },
          ]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <Text style={estilos.titulo}>{titulo}</Text>
          {!!mensaje && <Text style={estilos.mensaje}>{mensaje}</Text>}

          <View style={estilos.botones}>
            <Pressable
              onPress={alCerrar}
              disabled={trabajando}
              accessibilityRole="button"
              style={({ pressed }) => [estilos.boton, pressed && estilos.botonPresionado]}
            >
              <Text style={estilos.textoCancelar}>{textoCancelar ?? t('Cancelar')}</Text>
            </Pressable>

            <Pressable
              onPress={alConfirmar}
              disabled={trabajando}
              accessibilityRole="button"
              style={({ pressed }) => [
                estilos.boton,
                estilos.botonAccion,
                { backgroundColor: colorAccion },
                pressed && estilos.botonAccionPresionado,
                trabajando && estilos.botonApagado,
              ]}
            >
              <Text style={[estilos.textoConfirmar, { color: colorTextoAccion }]}>{textoConfirmar ?? t('Confirmar')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    // Por encima de TODO lo de la pantalla, incluida la píldora flotante de abajo (zIndex 900 /
    // elevation 12, ver BarraInferior): un cuadro que pregunta con media respuesta tapada no sirve de
    // nada.
    zIndex: 970,
    elevation: 24,
  },
  fondo: {
    flex: 1,
    backgroundColor: COLORES.velo,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  panel: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORES.papelAlto,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    // En oscuro la sombra no se ve contra el fondo: ahí lo despega un filo.
    borderWidth: COLORES.oscuro ? 1 : 0,
    borderColor: COLORES.linea,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.3,
  },
  mensaje: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: COLORES.textoSuave,
  },
  // Los dos juntos a la derecha, pero con aire entre ellos: pegados, el dedo
  // que va a "no" cae al borde del botón peligroso. El hueco es la distancia
  // de seguridad, y de paso corre el de cancelar hacia la izquierda.
  botones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 18,
    marginTop: 22,
  },
  boton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPresionado: {
    backgroundColor: COLORES.realce,
  },
  botonAccion: {
    paddingHorizontal: 22,
  },
  botonAccionPresionado: {
    opacity: 0.85,
  },
  botonApagado: {
    opacity: 0.6,
  },
  textoCancelar: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORES.textoSuave,
  },
  // El color lo pone el componente (ver colorTextoAccion): depende de si la
  // acción es destructiva y de si la app está en oscuro.
  textoConfirmar: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});

export default ModalConfirmar;
