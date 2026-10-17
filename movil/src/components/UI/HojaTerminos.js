// HOJA DE LOS DOCUMENTOS LEGALES — el documento, para leerlo
// Lo que en la web es `ModalTerminos` + `TextoTerminos`.

import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { ALTURA_ESTADO } from '../../theme/pantalla';
import { Equis } from './Iconos';
import { useBotonAtras } from '../../hooks/useBotonAtras';
import { useAjustesTienda } from '../../hooks/useAjustesTienda';
import { enlaceWhatsApp } from '../../utils/tienda';
import { documentoLegal, FECHA_LEGAL, VERSION_LEGAL, URL_WEB_LEGAL } from '../../utils/legales';
import { useIdioma } from '../../context/IdiomaContext';

const MENSAJE_BORRADO =
  'Hola, quiero pedir que borren mi cuenta y mis datos personales de la tienda. Mi correo registrado es: ';

// Los documentos que viven en la app. El de cookies es de la web: se abre allá.
const EN_LA_APP = ['terminos', 'privacidad', 'devoluciones'];

const Dato = ({ etiqueta, valor }) => {
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor}>{valor}</Text>
    </View>
  );
};

const Bloque = ({ bloque, negocio, direccion, nombre, irA }) => {
  const estilos = useEstilos(crearEstilos);
  const COLORES = useColores();

  switch (bloque.tipo) {
    case 'destacado':
      return (
        <View style={estilos.destacado}>
          <Text style={estilos.destacadoTexto}>{bloque.texto}</Text>
        </View>
      );

    case 'parrafo':
      return <Text style={estilos.parrafo}>{bloque.texto}</Text>;

    case 'lista':
      return (
        <View style={estilos.lista}>
          {bloque.puntos.map((punto, i) => (
            <View key={i} style={estilos.punto}>
              <View style={estilos.vinneta} />
              <Text style={estilos.puntoTexto}>{punto}</Text>
            </View>
          ))}
        </View>
      );

    case 'nota':
      return (
        <View style={estilos.nota}>
          <Text style={estilos.notaTexto}>{bloque.texto}</Text>
        </View>
      );

    // Cada fila, una ficha: el primer dato es el título, los demás van etiquetados.
    case 'tabla':
      return (
        <View style={estilos.fichas}>
          {bloque.filas.map((fila) => (
            <View key={fila[0]} style={estilos.ficha}>
              <Text style={estilos.fichaTitulo}>{fila[0]}</Text>
              {fila.slice(1).map((valor, j) => (
                <Dato key={j} etiqueta={bloque.columnas[j + 1]} valor={valor} />
              ))}
            </View>
          ))}
        </View>
      );

    // Los datos del negocio que puso el dueño. Lo vacío no se pinta.
    case 'negocio': {
      const filas = [
        ['Negocio', nombre],
        ['Titular', negocio.titular],
        ['NIT', negocio.nit],
        ['NRC', negocio.nrc],
        ['Dirección', direccion ? `${direccion}, El Salvador` : ''],
        ['Correo', negocio.correo],
        ['Teléfono', negocio.telefono],
        ['WhatsApp', negocio.whatsapp],
        ['Horario', negocio.horario],
      ].filter(([, valor]) => valor);
      return (
        <View style={estilos.negocio}>
          {filas.map(([etiqueta, valor]) => <Dato key={etiqueta} etiqueta={etiqueta} valor={valor} />)}
        </View>
      );
    }

    // Otro documento: se abre en esta misma hoja (o en la web, el de cookies).
    case 'enlace': {
      const clave = bloque.a.replace('/', '');
      const alTocar = () => (EN_LA_APP.includes(clave) ? irA(clave) : Linking.openURL(`${URL_WEB_LEGAL}${bloque.a}`));
      return (
        <Text style={[estilos.enlace, { color: COLORES.marcaTexto }]} accessibilityRole="link" onPress={alTocar}>
          {bloque.texto} →
        </Text>
      );
    }

    // Pedir el borrado: WhatsApp con el mensaje ya escrito, o la tienda.
    case 'borrado': {
      const whatsapp = enlaceWhatsApp(MENSAJE_BORRADO, negocio.whatsapp);
      return whatsapp ? (
        <Pressable
          onPress={() => Linking.openURL(whatsapp)}
          accessibilityRole="link"
          style={({ pressed }) => [estilos.botonBorrado, { borderColor: COLORES.marca }, pressed && { opacity: 0.8 }]}
        >
          <Text style={[estilos.botonBorradoTexto, { color: COLORES.marcaTexto }]}>Pedir que borren mis datos</Text>
        </Pressable>
      ) : (
        <Text style={estilos.parrafo}>
          Para pedir el borrado, pásese por la tienda{direccion ? ` en ${direccion}` : ''}.
        </Text>
      );
    }

    default:
      return null;
  }
};

const HojaTerminos = ({ alCerrar, clave: claveInicial = 'terminos' }) => {
  const { t, idioma } = useIdioma();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { ajustes } = useAjustesTienda();
  const [clave, setClave] = useState(claveInicial);
  const documento = documentoLegal(clave);
  const nombre = `${ajustes.nombreLinea1 || ''} ${ajustes.nombreLinea2 || ''}`.trim();

  // Atrás: si se saltó a otro documento, vuelve al que se abrió; si no, cierra.
  useBotonAtras(() => (clave !== claveInicial ? setClave(claveInicial) : alCerrar()));

  return (
    <View style={estilos.capa} accessibilityViewIsModal>
      <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <Text style={estilos.tituloBarra} accessibilityRole="header">{t(documento.titulo)}</Text>
        <Pressable
          onPress={alCerrar}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('Cerrar: {titulo}', { titulo: t(documento.titulo) })}
          style={({ pressed }) => [estilos.cerrar, pressed && estilos.cerrarPresionado]}
        >
          <Equis size={16} color={COLORES.textoSuave} />
        </Pressable>
      </View>

      {/* `key`: al cambiar de documento, se empieza a leer desde arriba. */}
      <ScrollView key={clave} contentContainerStyle={estilos.cuerpo} showsVerticalScrollIndicator={false}>
        {idioma !== 'es' && <Text style={estilos.soloEspanol}>{t('Solo disponible en español')}</Text>}
        {documento.secciones.map((seccion) => (
          <View key={seccion.id} style={estilos.seccion}>
            <Text style={estilos.tituloSeccion} accessibilityRole="header">{seccion.titulo}</Text>
            {seccion.bloques.map((bloque, i) => (
              <Bloque
                key={i}
                bloque={bloque}
                negocio={ajustes.negocio || {}}
                direccion={ajustes.direccion}
                nombre={nombre}
                irA={setClave}
              />
            ))}
          </View>
        ))}

        <Text style={estilos.pie}>
          {t('Versión {version} · {fecha}', { version: VERSION_LEGAL, fecha: FECHA_LEGAL })}
        </Text>
      </ScrollView>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  soloEspanol: {
    fontSize: 13,
    fontStyle: 'italic',
    color: COLORES.textoSuave,
    marginBottom: 14,
  },
  capa: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORES.fondo,
    zIndex: 20,
    elevation: 20,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  tituloBarra: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  // 44 × 44: el mínimo cómodo para el pulgar.
  cerrar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarPresionado: {
    backgroundColor: COLORES.marcaSuave,
  },
  cuerpo: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  seccion: {
    marginBottom: 26,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  destacado: {
    backgroundColor: COLORES.marcaSuave,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORES.marca,
  },
  destacadoTexto: {
    fontSize: 14.5,
    lineHeight: 22,
    color: COLORES.tituloVentaja,
    fontWeight: '500',
  },
  parrafo: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORES.textoVentaja,
    marginBottom: 10,
  },
  lista: {
    gap: 9,
    marginBottom: 10,
  },
  punto: {
    flexDirection: 'row',
    gap: 9,
  },
  vinneta: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORES.marca,
    // Alineada con la primera línea del texto, no con el centro del párrafo.
    marginTop: 8,
  },
  puntoTexto: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: COLORES.textoVentaja,
  },
  nota: {
    backgroundColor: COLORES.papelSuave,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  notaTexto: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORES.textoSuave,
  },
  fichas: {
    gap: 10,
    marginBottom: 10,
  },
  ficha: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 12,
    padding: 13,
    gap: 8,
  },
  fichaTitulo: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  dato: {
    gap: 1,
  },
  datoEtiqueta: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORES.subtitulo,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  datoValor: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.textoVentaja,
  },
  negocio: {
    gap: 8,
    marginBottom: 12,
  },
  enlace: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
    paddingVertical: 8,
  },
  botonBorrado: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    marginVertical: 6,
  },
  botonBorradoTexto: {
    fontSize: 14,
    fontWeight: '700',
  },
  pie: {
    fontSize: 12.5,
    color: COLORES.textoTenue,
    textAlign: 'center',
    marginTop: 6,
  },
});

export default HojaTerminos;
