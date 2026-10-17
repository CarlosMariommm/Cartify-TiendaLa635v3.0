// LOS FILTROS DE LA TIENDA — HojaFiltros.js
// La hoja que sube desde abajo al tocar "Filtros" en Inicio: ordenar, precio, solo ofertas, solo
// lo disponible y marca, en pastillas que se tocan.

import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import { useIdioma } from '../../context/IdiomaContext';
import { AIRE_ABAJO_MINIMO, ALTURA_BARRA_FLOTANTE } from '../UI/BarraInferior';
import { hojaCentrada } from '../../theme/pantalla';
import { cuantosFiltros, ORDENES_TIENDA, RANGOS_PRECIO } from '../../utils/filtrosTienda';

const Pastilla = ({ texto, activa, onPress }) => {
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      style={({ pressed }) => [
        estilos.pastilla,
        activa && { backgroundColor: colores.marca, borderColor: colores.marca },
        pressed && !activa && { backgroundColor: colores.marcaSuave },
      ]}
    >
      <Text style={[estilos.pastillaTexto, activa && estilos.pastillaTextoActiva]}>{texto}</Text>
    </Pressable>
  );
};

const HojaFiltros = ({ filtros, alCambiar, alLimpiar, marcas = [], cantidad, alCerrar }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  const { bottom } = useSafeAreaInsets();

  // La misma entrada y salida que MenuPasillos: el fondo se oscurece y la hoja sube.
  const fondoOpacidad = useRef(new Animated.Value(0)).current;
  const panelY = useRef(new Animated.Value(300)).current;
  const cerrandoRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fondoOpacidad, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(panelY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fondoOpacidad, panelY]);

  const cerrar = () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    Animated.parallel([
      Animated.timing(fondoOpacidad, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(panelY, { toValue: 300, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => alCerrar());
  };

  useBotonAtras(cerrar);

  const puestos = cuantosFiltros(filtros);
  const grupo = (titulo, hijos) => (
    <View style={estilos.grupo}>
      <Text style={estilos.titulo}>{titulo}</Text>
      <View style={estilos.pastillas}>{hijos}</View>
    </View>
  );

  return (
    <View style={estilos.capa}>
      <Animated.View style={[estilos.fondo, { opacity: fondoOpacidad }]}>
        <Pressable accessibilityRole="button" style={estilos.zonaCierre} onPress={cerrar} accessibilityLabel={t('Cerrar')} />

        <Animated.View style={[estilos.panel, { transform: [{ translateY: panelY }] }]}>
          <View style={estilos.asa} />
          <ScrollView contentContainerStyle={estilos.contenido} bounces={false}>
            {grupo(t('Ordenar'), ORDENES_TIENDA.map((o) => (
              <Pastilla key={o.valor} texto={t(o.texto)} activa={filtros.orden === o.valor} onPress={() => alCambiar('orden', o.valor)} />
            )))}
            {grupo(t('Precio'), RANGOS_PRECIO.map((r) => (
              <Pastilla key={r.valor} texto={t(r.texto)} activa={filtros.precio === r.valor} onPress={() => alCambiar('precio', r.valor)} />
            )))}
            {grupo(t('Mostrar'), [
              <Pastilla key="oferta" texto={t('Solo en oferta')} activa={filtros.soloOferta} onPress={() => alCambiar('soloOferta', !filtros.soloOferta)} />,
              <Pastilla key="disponibles" texto={t('Solo disponibles')} activa={filtros.soloDisponibles} onPress={() => alCambiar('soloDisponibles', !filtros.soloDisponibles)} />,
            ])}
            {marcas.length > 1 && grupo(t('Marca'), [
              <Pastilla key="todas" texto={t('Todas las marcas')} activa={!filtros.marca} onPress={() => alCambiar('marca', '')} />,
              ...marcas.map((m) => (
                <Pastilla key={m} texto={m} activa={filtros.marca === m} onPress={() => alCambiar('marca', filtros.marca === m ? '' : m)} />
              )),
            ])}
          </ScrollView>

          {/* Lo de abajo, fijo: lo que queda y cómo salir. La píldora flotante de
              las pestañas va encima de esta hoja, así que se le deja su hueco. */}
          <View style={[estilos.pie, { paddingBottom: 14 + Math.max(bottom, AIRE_ABAJO_MINIMO) + ALTURA_BARRA_FLOTANTE }]}>
            {(puestos > 0 || filtros.orden !== 'recomendados') && (
              <Pressable onPress={alLimpiar} accessibilityRole="button" style={({ pressed }) => [estilos.botonLimpiar, pressed && { opacity: 0.6 }]}>
                <Text style={[estilos.botonLimpiarTexto, { color: colores.marcaTexto }]}>{t('Quitar filtros')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={cerrar}
              accessibilityRole="button"
              style={({ pressed }) => [estilos.botonVer, { backgroundColor: pressed ? colores.marcaOscuro : colores.marca }]}
            >
              <Text style={estilos.botonVerTexto}>
                {t('Ver {n} productos', { n: cantidad })}
              </Text>
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
    zIndex: 15,
    elevation: 15,
  },
  fondo: {
    flex: 1,
    backgroundColor: COLORES.velo,
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
    maxHeight: '82%',
  },
  asa: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORES.borde,
    marginTop: 12,
    marginBottom: 6,
  },
  contenido: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  grupo: {
    marginTop: 14,
  },
  titulo: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORES.textoTenue,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  pastillas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pastilla: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  pastillaTexto: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORES.texto,
  },
  pastillaTextoActiva: {
    color: '#FFFFFF',
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
  },
  botonLimpiar: {
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  botonLimpiarTexto: {
    fontSize: 14,
    fontWeight: '700',
  },
  botonVer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 28,
  },
  botonVerTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default HojaFiltros;
