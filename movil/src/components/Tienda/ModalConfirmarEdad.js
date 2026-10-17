// CONFIRMAR EDAD — el candado de los productos +18
// Puerto de `frontend/src/components/Store/ModalConfirmarEdad.jsx`.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldAlert } from 'lucide-react-native';
import { useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import Boton from '../UI/Boton';
import CampoTexto from '../UI/CampoTexto';
import { duiEsValido } from '../../utils/validaciones';
import { formatearDui, LARGO_DUI } from '../../utils/mascaras';
import { EDAD_MINIMA } from '../../utils/edad';
import { useIdioma } from '../../context/IdiomaContext';
import { hojaCentrada } from '../../theme/pantalla';

const ModalConfirmarEdad = ({ alCerrar, alConfirmar }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  // Sin esto, "No se comparte" (la última línea) quedaba debajo de la franja
  // de gestos de Android en un teléfono real — mismo caso que Carrito.js y
  // Confirmacion.js, y esta hoja no tiene ScrollView que lo disimule.
  const { bottom } = useSafeAreaInsets();
  const [dui, setDui] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Misma entrada que ModalProducto: fondo que se aclara, panel que sube.
  const fondoOpacidad = useRef(new Animated.Value(0)).current;
  const panelY = useRef(new Animated.Value(300)).current;
  const cerrandoRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fondoOpacidad, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(panelY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fondoOpacidad, panelY]);

  // Mismo cierre animado que ModalProducto, y por la misma razón: tocar fuera o el botón atrás no
  // pueden quitar la vista de golpe cuando la apertura sí se anima — se veía como que la mitad del
  // modal funcionaba distinto a la otra mitad.
  const cerrarConAnimacion = () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    Animated.parallel([
      Animated.timing(fondoOpacidad, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(panelY, {
        toValue: 300,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => alCerrar());
  };

  useBotonAtras(cerrarConAnimacion);

  // El asa se arrastra igual que en ModalProducto: baja con el dedo, y al soltar decide sola si
  // cierra o vuelve a subir, según si pasó la mitad del panel. Ver el comentario largo en
  // ModalProducto.js sobre por qué hace falta onPanResponderTerminationRequest.
  const panelAlturaRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evento, gesto) => Math.abs(gesto.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evento, gesto) => {
        if (gesto.dy > 0) panelY.setValue(gesto.dy);
      },
      onPanResponderRelease: (_evento, gesto) => {
        const mitad = (panelAlturaRef.current || 300) / 2;
        if (gesto.dy > mitad) {
          cerrarConAnimacion();
        } else {
          Animated.timing(panelY, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(panelY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      },
    })
  ).current;

  const escribir = (valor) => {
    setDui(formatearDui(valor));
    if (error) setError('');
  };

  const enviar = async () => {
    const d = dui.replace(/\D/g, '');
    if (!d.length) { setError(t('Ingresa tu número de DUI.')); return; }
    if (d.length < 9) { setError(t('El DUI lleva 9 dígitos (12345678-9).')); return; }
    if (!duiEsValido(dui)) { setError(t('Ese DUI no parece correcto, revisa los números.')); return; }

    setEnviando(true);
    try {
      await alConfirmar(dui);
    } finally {
      // Si `alConfirmar` cierra el modal (lo normal), esto ya no alcanza a
      // pintarse; se deja igual por si algún día se queda abierto con error.
      setEnviando(false);
    }
  };

  return (
    <View style={estilos.capa}>
      <Animated.View style={[estilos.fondo, { opacity: fondoOpacidad }]}>
        <Pressable accessibilityRole="button" style={estilos.zonaCierre} onPress={cerrarConAnimacion} accessibilityLabel={t('Cerrar')} />

        <Animated.View
          style={[estilos.panel, { transform: [{ translateY: panelY }] }]}
          onLayout={(e) => { panelAlturaRef.current = e.nativeEvent.layout.height; }}
        >
          <View style={estilos.encabezado}>
            <View style={estilos.zonaAsa} {...panResponder.panHandlers}>
              <View style={estilos.asa} />
            </View>
          </View>

          <View style={[estilos.contenido, { paddingBottom: Math.max(bottom + 14, 30) }]}>
            <View style={[estilos.icono, { backgroundColor: colores.marcaSuave }]}>
              <ShieldAlert size={26} color={colores.marcaOscuro} />
            </View>

            <Text style={estilos.titulo}>{t('Producto para mayores de {edad}', { edad: EDAD_MINIMA })}</Text>
            <Text style={estilos.texto}>
              {t('Ingresa tu número de DUI para verlo. Al recibir el pedido te pedirán el documento físico; sin él, este producto no se puede entregar.')}
            </Text>

            <CampoTexto
              etiqueta="DUI"
              valor={dui}
              alCambiar={escribir}
              marcador="00000000-0"
              error={error}
              keyboardType="number-pad"
              maxLength={LARGO_DUI}
              redondo
            />

            <Boton
              texto={enviando ? t('Confirmando…') : t('Confirmar')}
              alPresionar={enviar}
              deshabilitado={enviando}
              color={colores.marca}
              colorPresionado={colores.marcaOscuro}
              estilo={estilos.botonRedondo}
            />

            <Text style={estilos.aviso}>
              {t('Solo se usa para habilitar la compra de productos restringidos. No se comparte.')}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  zonaCierre: {
    flex: 1,
  },
  panel: {
    ...hojaCentrada,
    backgroundColor: COLORES.papelAlto,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  encabezado: {
    paddingTop: 10,
    alignItems: 'center',
  },
  // Misma zona de agarre ancha que ModalProducto: el dibujo (38x4) es
  // angosto para arrastrarlo a ciegas con el dedo.
  zonaAsa: {
    paddingVertical: 14,
    paddingHorizontal: 60,
  },
  asa: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORES.borde,
  },
  contenido: {
    paddingHorizontal: 24,
    paddingTop: 14,
    // paddingBottom real se pone en línea, con la franja de gestos sumada.
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    marginBottom: 8,
  },
  texto: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORES.textoSuave,
    marginBottom: 18,
  },
  aviso: {
    fontSize: 11.5,
    lineHeight: 16.5,
    color: COLORES.textoTenue,
    marginTop: 14,
  },
  botonRedondo: {
    borderRadius: 28,
  },
});

export default ModalConfirmarEdad;
