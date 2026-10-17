// PREFERENCIAS — cómo se ve la app para esta persona
// La de `frontend/src/pages/cliente/Preferencias.jsx`. Por ahora: claro, oscuro o igual que el
// teléfono.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Polygon, Rect } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { useEstilos, useModo } from '../../context/ModoContext';
import { useAireBarraFlotante } from '../../components/UI/BarraInferior';
import { useTema } from '../../context/TemaContext';
import BarraCuenta from '../../components/Cuenta/BarraCuenta';
import { useIdioma } from '../../context/IdiomaContext';
import { IDIOMAS } from '../../utils/idioma';
import { contenidoCentrado } from '../../theme/pantalla';

// Los colores de los dibujitos van FIJOS a propósito: la miniatura de "Claro" tiene que verse
// clara aunque la app ya esté en oscuro, y al revés.
const CLARO = { fondo: '#FFFFFF', barra: '#F5F5F5', tarjeta: '#EFEFEF', texto: '#1C1614', marca: '#003049' };
const OSCURO = { fondo: '#121417', barra: '#1F2328', tarjeta: '#23272C', texto: '#ECEEF0', marca: '#0F80BA' };

const Tienda = ({ p }) => (
  <G>
    <Rect width="120" height="76" fill={p.fondo} />
    <Rect width="120" height="14" fill={p.barra} />
    <Rect x="8" y="5" width="22" height="4" rx="2" fill={p.texto} />
    <Rect x="92" y="4" width="20" height="6" rx="3" fill={p.marca} />
    {[8, 45, 82].map((x) => (
      <G key={x}>
        <Rect x={x} y="22" width="30" height="30" rx="5" fill={p.tarjeta} />
        <Rect x={x} y="56" width="22" height="3.5" rx="1.75" fill={p.texto} opacity="0.85" />
        <Rect x={x} y="63" width="14" height="3.5" rx="1.75" fill={p.marca} />
      </G>
    ))}
  </G>
);

const MiniTienda = ({ p, partida = false }) => (
  <Svg viewBox="0 0 120 76" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
    <Tienda p={p} />
    {partida && (
      <>
        {/* Mitad y mitad, partida en diagonal para que se lea como "cambia solo". */}
        <Defs>
          <ClipPath id="mitadOscura">
            <Polygon points="74.4,0 120,0 120,76 45.6,76" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#mitadOscura)">
          <Tienda p={OSCURO} />
        </G>
      </>
    )}
  </Svg>
);

const OPCIONES = [
  { clave: 'claro', titulo: 'Claro', detalle: 'Fondo blanco, como siempre.', dibujo: <MiniTienda p={CLARO} /> },
  { clave: 'oscuro', titulo: 'Oscuro', detalle: 'Descansa la vista de noche.', dibujo: <MiniTienda p={OSCURO} /> },
  { clave: 'sistema', titulo: 'Automático', detalle: 'Igual que tu teléfono.', dibujo: <MiniTienda p={CLARO} partida /> },
];

const Preferencias = ({ alVolver }) => {
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const { modo, setModo } = useModo();
  const { idioma, setIdioma, t } = useIdioma();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.pantalla}>
      <BarraCuenta titulo={t('Preferencias')} alVolver={alVolver} />

      <ScrollView contentContainerStyle={[estilos.cuerpo, { paddingBottom: aireAbajo }]}>
        <Text style={estilos.seccion}>{t('Apariencia')}</Text>
        <Text style={estilos.explicacion}>{t('Cómo se ve la app en este teléfono.')}</Text>

        <View accessibilityRole="radiogroup" accessibilityLabel={t('Apariencia')} style={estilos.opciones}>
          {OPCIONES.map((op) => {
            const activa = modo === op.clave;
            return (
              <Pressable
                key={op.clave}
                onPress={() => setModo(op.clave)}
                accessibilityRole="radio"
                accessibilityState={{ checked: activa }}
                accessibilityLabel={`${t(op.titulo)}. ${t(op.detalle)}`}
                style={({ pressed }) => [estilos.opcion, pressed && estilos.opcionPresionada]}
              >
                {/* El halo de la elegida va por fuera del marco y siempre ocupa
                    su lugar: si apareciera al elegir, la fila saltaría. */}
                <View style={[estilos.halo, activa && { backgroundColor: colores.marcaSuave }]}>
                  <View style={estilos.marco}>
                    {op.dibujo}
                    <View
                      pointerEvents="none"
                      style={[
                        estilos.filo,
                        activa ? { borderWidth: 2, borderColor: colores.marca } : estilos.filoReposo,
                      ]}
                    />
                    {activa && (
                      <View style={[estilos.palomita, { backgroundColor: colores.marca }]}>
                        <Check size={13} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                </View>

                <View style={estilos.textos}>
                  <Text style={[estilos.titulo, activa && { color: colores.marcaTexto, fontWeight: '700' }]}>
                    {t(op.titulo)}
                  </Text>
                  <Text style={estilos.detalle}>{t(op.detalle)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* El idioma, como la web. Cada opción va escrita en su propio idioma ("English", no "Inglés"):
           quien no lee español tiene que poder encontrarla. */}
        <Text style={[estilos.seccion, estilos.seccionSiguiente]}>{t('Idioma')}</Text>
        <Text style={estilos.explicacion}>
          {t('En qué idioma se ve la tienda. Los nombres de los productos quedan como la tienda los escribió.')}
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('Idioma')} style={estilos.idiomas}>
          {IDIOMAS.map((op) => {
            const activo = idioma === op.clave;
            return (
              <Pressable
                key={op.clave}
                onPress={() => setIdioma(op.clave)}
                accessibilityRole="radio"
                accessibilityState={{ checked: activo }}
                accessibilityLabel={op.nombre}
                style={({ pressed }) => [estilos.idioma, pressed && estilos.opcionPresionada]}
              >
                {/* Sin recuadro: el círculo de la opción y el nombre, sobre el fondo. */}
                <View style={[estilos.circulo, { borderColor: activo ? colores.marca : estilos.detalle.color }]}>
                  {activo && <View style={[estilos.punto, { backgroundColor: colores.marca }]} />}
                </View>
                <Text style={[estilos.titulo, activo && { color: colores.marcaTexto, fontWeight: '700' }]}>{op.nombre}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  cuerpo: {
    ...contenidoCentrado,
    padding: 16,
    paddingBottom: 30,
  },
  seccion: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.2,
  },
  explicacion: {
    marginTop: 3,
    fontSize: 13,
    color: COLORES.textoSuave,
  },
  opciones: {
    marginTop: 16,
    gap: 6,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 6,
    borderRadius: 16,
  },
  opcionPresionada: {
    backgroundColor: COLORES.papelSuave,
  },
  // overflow:'hidden' por el mismo bug de Android que explica BarraInferior:
  // el fondo cambia después del primer pintado y, sin esto, el halo sale cuadrado.
  halo: {
    padding: 3,
    borderRadius: 15,
    overflow: 'hidden',
  },
  marco: {
    width: 112,
    aspectRatio: 120 / 76,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  filoReposo: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
  },
  palomita: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
  },
  detalle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORES.textoSuave,
  },
  seccionSiguiente: {
    marginTop: 28,
  },
  idiomas: {
    marginTop: 10,
    gap: 2,
  },
  idioma: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  circulo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default Preferencias;
