// AYUDA Y CONTACTO — la portada de "Mi cuenta > Ayuda"
// Los canales de la tienda (WhatsApp y la dirección) y las mismas preguntas frecuentes de la web.

import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HelpCircle, MapPin, MessageCircle } from 'lucide-react-native';
import { useEstilos } from '../../context/ModoContext';
import { useAireBarraFlotante } from '../../components/UI/BarraInferior';
import { useTema } from '../../context/TemaContext';
import { useAviso } from '../../context/AvisoContext';
import { DIRECCION_EN_UNA_LINEA, enlaceWhatsApp } from '../../utils/tienda';
import BarraCuenta from '../../components/Cuenta/BarraCuenta';
import { useIdioma } from '../../context/IdiomaContext';
import { contenidoCentrado } from '../../theme/pantalla';

const SALUDO_WHATSAPP = 'Hola, vengo de la app y necesito ayuda con mi pedido.';

// Mismas tres preguntas que useCentroAyuda.js en la web, palabra por palabra.
const FAQS = [
  {
    q: '¿Cómo hago un pedido?',
    a: 'Explora la tienda, agrega productos al carrito y presiona comprar. También puedes usar el asistente por voz para pedir hablando.',
  },
  {
    q: '¿Cómo funcionan los puntos de fidelidad?',
    a: 'Gana puntos con cada compra según lo que gastes. Los ves en la sección "Puntos de fidelidad" y vencen pasado un tiempo.',
  },
  {
    q: '¿Dónde veo mis pedidos?',
    a: 'En "Recibos" ves tus pedidos ya entregados; mientras están en curso, la burbuja de abajo dice en qué van.',
  },
];

const Ayuda = ({ alVolver }) => {
  const { t } = useIdioma();
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const { colores } = useTema();
  const estilos = useEstilos(crearEstilos);
  const { avisar } = useAviso();

  const whatsapp = enlaceWhatsApp(SALUDO_WHATSAPP);

  const abrirWhatsApp = async () => {
    try {
      await Linking.openURL(whatsapp);
    } catch {
      avisar(t('No se pudo abrir WhatsApp'), 'error');
    }
  };

  return (
    <View style={estilos.pantalla}>
      <BarraCuenta titulo={t('Ayuda y contacto')} alVolver={alVolver} />

      <ScrollView contentContainerStyle={[estilos.cuerpo, { paddingBottom: aireAbajo }]}>
        {/* Sin WhatsApp configurado solo queda la dirección; sin ninguno de
            los dos, esta sección entera no se pinta. */}
        {(whatsapp || DIRECCION_EN_UNA_LINEA) && (
          <View style={estilos.canales}>
            {whatsapp && (
              <Pressable
                onPress={abrirWhatsApp}
                accessibilityRole="button"
                accessibilityLabel={t('Escribirnos por WhatsApp')}
                style={({ pressed }) => [estilos.canal, pressed && { backgroundColor: colores.marcaTenue }]}
              >
                <View style={[estilos.cuadroIcono, { backgroundColor: colores.marcaSuave }]}>
                  <MessageCircle size={18} color={colores.marca} strokeWidth={2} />
                </View>
                <View style={estilos.canalTextos}>
                  <Text style={estilos.canalEtiqueta}>WhatsApp</Text>
                  <Text style={estilos.canalValor}>{t('Escríbenos, te contestamos ahí')}</Text>
                </View>
              </Pressable>
            )}

            {!!DIRECCION_EN_UNA_LINEA && (
              <View style={estilos.canal}>
                <View style={[estilos.cuadroIcono, { backgroundColor: colores.marcaSuave }]}>
                  <MapPin size={18} color={colores.marca} strokeWidth={2} />
                </View>
                <View style={estilos.canalTextos}>
                  <Text style={estilos.canalEtiqueta}>{t('Pasa a la tienda')}</Text>
                  <Text style={estilos.canalValor}>{DIRECCION_EN_UNA_LINEA}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={estilos.filaTituloFaq}>
          <HelpCircle size={17} color={colores.marca} strokeWidth={2} />
          <Text style={estilos.tituloFaq}>{t('Preguntas frecuentes')}</Text>
        </View>

        <View style={estilos.faqs}>
          {FAQS.map((faq, i) => (
            <View key={i}>
              <Text style={estilos.faqPregunta}>{t(faq.q)}</Text>
              <Text style={estilos.faqRespuesta}>{t(faq.a)}</Text>
            </View>
          ))}
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
  canales: {
    gap: 8,
    marginBottom: 24,
  },
  canal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cuadroIcono: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canalTextos: {
    flex: 1,
    gap: 1,
  },
  canalEtiqueta: {
    fontSize: 12,
    color: COLORES.textoTenue,
  },
  canalValor: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
  },
  filaTituloFaq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  tituloFaq: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  faqs: {
    gap: 16,
  },
  faqPregunta: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    marginBottom: 3,
  },
  faqRespuesta: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.textoSuave,
  },
});

export default Ayuda;
