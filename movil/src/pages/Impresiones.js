// IMPRESIONES — el pasillo de impresión de la tienda
// Puerto de `frontend/src/pages/impresiones.jsx`: elegir un formato, subir el archivo, ajustar las
// opciones, ver el precio y enviarlo a imprimir.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { FileUp, FileText, Image as ImagenIcono, AlertTriangle } from 'lucide-react-native';
import { useColores, useEstilos } from '../context/ModoContext';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { useAuth } from '../hooks/useAuth';
import { useTema } from '../context/TemaContext';
import { useAviso } from '../context/AvisoContext';
import { useMaterialesImpresion } from '../hooks/useMaterialesImpresion';
import { getFormatosImpresion, crearPedidoImpresion } from '../api/impresionesApi';
import { calcularPrecioImpresion } from '../utils/precioImpresion';
import { pxDesdeCm } from '../utils/pxImpresion';
import { evaluarCalce } from '../utils/calceImpresion';
import { ChevronIzquierda, Equis, Mas, Menos } from '../components/UI/Iconos';
import Boton from '../components/UI/Boton';
import { avisarActividad } from '../utils/actividadUsuario';
import { useIdioma } from '../context/IdiomaContext';

// El mismo tope que la web (SubidorArchivo, maxMB={10}).
const PESO_MAXIMO = 10 * 1024 * 1024;

const PAPELES = ['Normal', 'Fotográfico', 'Cartulina', 'Reciclado'];

// El mismo tope de copias que el servidor (MAX_COPIAS en orderController).
const MAX_COPIAS = 200;

const Impresiones = ({ alVolver }) => {
  const { t } = useIdioma();
  const { user } = useAuth();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { avisar } = useAviso();
  const { bottom } = useSafeAreaInsets();

  const [formatos, setFormatos] = useState([]);
  const [cargandoFormatos, setCargandoFormatos] = useState(true);
  const [formatoId, setFormatoId] = useState(null);
  const [archivo, setArchivo] = useState(null); // { uri, name, mimeType, size, width?, height? }
  const [color, setColor] = useState(false);
  const [copias, setCopias] = useState(1);
  const [dobleCara, setDobleCara] = useState(false);
  const [papel, setPapel] = useState('Normal');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    getFormatosImpresion()
      .then((d) => {
        if (vivo) setFormatos((Array.isArray(d) ? d : []).filter((s) => s.isActive !== false));
      })
      .catch(() => { if (vivo) setFormatos([]); })
      .finally(() => { if (vivo) setCargandoFormatos(false); });
    return () => { vivo = false; };
  }, []);

  // Qué se puede imprimir HOY: lo decide el papel y la tinta que quedan.
  const { hayTintaDeColor, disponibilidadDeFormato } = useMaterialesImpresion();

  const formato = formatos.find((f) => f._id === formatoId);
  const puedeColor = !!formato?.allowsColor && hayTintaDeColor;

  // Si el material se acaba con el formato ya elegido, se suelta la
  // selección en vez de dejar pagar algo que ya no se puede hacer.
  useEffect(() => {
    if (formato && !disponibilidadDeFormato(formato).disponible) setFormatoId(null);
  }, [formato, disponibilidadDeFormato]);

  useEffect(() => {
    if (!puedeColor && color) setColor(false);
  }, [puedeColor, color]);

  // Sin el editor, siempre es una página — ver el comentario grande arriba.
  const { total, hojas, precioPorHoja } = calcularPrecioImpresion({
    servicio: formato,
    paginas: 1,
    copias,
    color,
    dobleCara,
  });

  // Solo mide imágenes: un PDF no se abre como imagen, y quien sube uno ya
  // lo armó a propósito en el tamaño que quería.
  const advertenciaCalce = useMemo(() => {
    if (!archivo?.width || !archivo?.height || !formato) return '';
    return evaluarCalce({
      anchoPx: archivo.width,
      altoPx: archivo.height,
      widthCm: formato.widthCm,
      heightCm: formato.heightCm,
    });
  }, [archivo, formato]);

  const elegirFoto = async () => {
    setError('');
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { setError(t('No diste permiso para abrir la galería.')); return; }

    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (resultado.canceled) return;

    const elegida = resultado.assets[0];
    if (elegida.fileSize && elegida.fileSize > PESO_MAXIMO) {
      setError(t('Esa imagen pesa {peso} MB y el máximo son 10 MB.', { peso: (elegida.fileSize / 1024 / 1024).toFixed(1) }));
      return;
    }
    setArchivo({
      uri: elegida.uri,
      name: elegida.fileName || 'imagen.jpg',
      mimeType: elegida.mimeType || 'image/jpeg',
      size: elegida.fileSize,
      width: elegida.width,
      height: elegida.height,
    });
  };

  const elegirPdf = async () => {
    setError('');
    const resultado = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (resultado.canceled) return;

    const elegido = resultado.assets[0];
    if (elegido.size && elegido.size > PESO_MAXIMO) {
      setError(t('Ese PDF pesa {peso} MB y el máximo son 10 MB.', { peso: (elegido.size / 1024 / 1024).toFixed(1) }));
      return;
    }
    setArchivo({
      uri: elegido.uri,
      name: elegido.name || 'documento.pdf',
      mimeType: elegido.mimeType || 'application/pdf',
      size: elegido.size,
    });
  };

  const enviar = async () => {
    if (!formatoId) { setError(t('Selecciona un formato de impresión.')); return; }
    if (!user?.id) { setError(t('Inicia sesión como cliente para enviar tu impresión.')); return; }
    if (!archivo) { setError(t('Sube un archivo antes de continuar.')); return; }
    setError('');
    setEnviando(true);

    try {
      const fd = new FormData();
      // React Native no acepta un Blob real en FormData: quiere este objeto
      // con uri/name/type, y de ahí arma la parte multipart él solo — mismo
      // patrón que ya usa MisDatos.js con la foto de perfil.
      fd.append('file', { uri: archivo.uri, name: archivo.name, type: archivo.mimeType });
      fd.append('clientId', user.id);
      fd.append('serviceId', formatoId);
      fd.append('color', String(color));
      fd.append('copies', String(copias));
      fd.append('pages', '1');
      fd.append('doubleSided', String(dobleCara));
      fd.append('paper', papel);

      const r = await crearPedidoImpresion(fd);
      avisar(r?.emailedToPrinter ? t('¡Enviado a la impresora!') : t('¡Pedido de impresión creado!'), 'exito');
      setArchivo(null);
      setCopias(1);
      setColor(false);
      setDobleCara(false);
      setPapel('Normal');
    } catch (e) {
      setError(e?.message || t('No se pudo enviar la impresión'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <Pressable
          onPress={alVolver}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Volver a la tienda')}
          style={({ pressed }) => [estilos.botonAtras, pressed && { backgroundColor: COLORES.linea }]}
        >
          <ChevronIzquierda size={18} />
        </Pressable>
        <Text style={estilos.tituloBarra}>{t('Impresiones')}</Text>
        <View style={estilos.botonAtras} />
      </View>

      <ScrollView
        contentContainerStyle={[estilos.cuerpo, { paddingBottom: Math.max(bottom, 18) + 16 }]}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={avisarActividad}
      >
        <Text style={estilos.pasoTitulo}>{t('1. Elige el formato')}</Text>
        {cargandoFormatos ? (
          <Text style={estilos.textoTenue}>{t('Cargando formatos…')}</Text>
        ) : formatos.length === 0 ? (
          <Text style={estilos.textoTenue}>{t('No hay formatos disponibles todavía.')}</Text>
        ) : (
          <View style={estilos.cuadricula}>
            {formatos.map((f) => {
              const { disponible, motivo, poco } = disponibilidadDeFormato(f);
              const activo = formatoId === f._id;
              return (
                <Pressable
                  key={f._id}
                  disabled={!disponible}
                  onPress={() => { setFormatoId(f._id); if (!f.allowsColor) setColor(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo, disabled: !disponible }}
                  style={({ pressed }) => [
                    estilos.tarjetaFormato,
                    activo && { borderColor: colores.marca, backgroundColor: colores.marcaSuave },
                    pressed && disponible && !activo && { borderColor: colores.marca },
                    !disponible && estilos.tarjetaApagada,
                  ]}
                >
                  <Text style={[estilos.formatoNombre, activo && { color: colores.marcaTexto }]}>{f.name}</Text>
                  <Text style={estilos.formatoMedida}>
                    {pxDesdeCm(f.widthCm)} × {pxDesdeCm(f.heightCm)} px
                  </Text>
                  <Text style={estilos.formatoPrecio}>{t('${precio}/copia', { precio: Number(f.pricePerCopy).toFixed(2) })}</Text>
                  {!disponible && <Text style={estilos.sinMaterial}>{motivo}</Text>}
                  {disponible && poco && <Text style={estilos.quedaPoco}>{t('Quedan pocas')}</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={estilos.pasoTitulo}>{t('2. Sube tu archivo')}</Text>
        <View style={estilos.filaArchivo}>
          <Pressable accessibilityRole="button"
            onPress={elegirFoto}
            style={({ pressed }) => [estilos.botonArchivo, pressed && { borderColor: colores.marca }]}
          >
            <ImagenIcono size={18} color={colores.marca} />
            <Text style={estilos.botonArchivoTexto}>{t('Elegir foto')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button"
            onPress={elegirPdf}
            style={({ pressed }) => [estilos.botonArchivo, pressed && { borderColor: colores.marca }]}
          >
            <FileText size={18} color={colores.marca} />
            <Text style={estilos.botonArchivoTexto}>{t('Elegir PDF')}</Text>
          </Pressable>
        </View>

        {archivo && (
          <View style={estilos.previewArchivo}>
            <FileUp size={16} color={COLORES.textoSuave} />
            <Text style={estilos.previewNombre} numberOfLines={1}>{archivo.name}</Text>
            <Pressable accessibilityRole="button" onPress={() => setArchivo(null)} hitSlop={10} accessibilityLabel={t('Quitar archivo')}>
              <Equis size={15} color={COLORES.textoSuave} />
            </Pressable>
          </View>
        )}

        {!!advertenciaCalce && (
          <View style={estilos.advertencia}>
            <AlertTriangle size={15} color={COLORES.avisoTexto} style={{ marginTop: 1 }} />
            <Text style={estilos.advertenciaTexto}>{advertenciaCalce}</Text>
          </View>
        )}

        <Text style={estilos.pasoTitulo}>{t('3. Opciones')}</Text>
        <View style={estilos.tarjetaOpciones}>
          <View style={estilos.filaOpcion}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.etiquetaOpcion}>{t('Color')}</Text>
              {formato && !formato.allowsColor && (
                <Text style={estilos.notaOpcion}>{t('Este formato es solo en blanco y negro')}</Text>
              )}
              {formato?.allowsColor && !hayTintaDeColor && (
                <Text style={[estilos.notaOpcion, { color: COLORES.peligro, fontWeight: '600' }]}>
                  {t('Hoy no hay tinta de color')}
                </Text>
              )}
            </View>
            <Switch
              value={color}
              onValueChange={(v) => puedeColor && setColor(v)}
              disabled={!puedeColor}
              accessibilityLabel={t('Imprimir a color')}
              trackColor={{ true: colores.marca }}
            />
          </View>

          <View style={estilos.filaOpcion}>
            <Text style={estilos.etiquetaOpcion}>{t('Copias')}</Text>
            <View style={estilos.contador}>
              <Pressable accessibilityRole="button"
                onPress={() => setCopias((n) => Math.max(1, n - 1))}
                hitSlop={8}
                style={estilos.botonContador}
                accessibilityLabel={t('Quitar una copia')}
              >
                <Menos size={14} color={COLORES.tituloVentaja} />
              </Pressable>
              <TextInput
                accessibilityLabel={t('Número de copias')}
                value={String(copias)}
                onChangeText={(texto) => setCopias(Math.min(MAX_COPIAS, Math.max(1, Number(texto.replace(/[^0-9]/g, '')) || 1)))}
                keyboardType="number-pad"
                keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
                style={estilos.inputCopias}
              />
              <Pressable accessibilityRole="button"
                onPress={() => setCopias((n) => Math.min(MAX_COPIAS, n + 1))}
                hitSlop={8}
                style={estilos.botonContador}
                accessibilityLabel={t('Agregar una copia')}
              >
                <Mas size={14} color={COLORES.tituloVentaja} />
              </Pressable>
            </View>
          </View>

          <View style={estilos.filaOpcion}>
            <Text style={estilos.etiquetaOpcion}>{t('Doble cara')}</Text>
            <Switch value={dobleCara} onValueChange={setDobleCara} trackColor={{ true: colores.marca }} accessibilityLabel={t('Imprimir a doble cara')} />
          </View>

          <View>
            <Text style={[estilos.etiquetaOpcion, { marginBottom: 8 }]}>{t('Tipo de papel')}</Text>
            <View style={estilos.filaPapeles} accessibilityRole="radiogroup" accessibilityLabel={t('Tipo de papel')}>
              {PAPELES.map((p) => {
                const activo = papel === p;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: activo }}
                    key={p}
                    onPress={() => setPapel(p)}
                    style={[
                      estilos.pastillaPapel,
                      activo && { backgroundColor: colores.marca, borderColor: colores.marca },
                    ]}
                  >
                    <Text style={[estilos.pastillaPapelTexto, activo && { color: '#FFFFFF' }]}>{t(p)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={estilos.cajaPrecio}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.precioEtiqueta}>{t('Total')}</Text>
            {!!formato && (
              <Text style={estilos.precioDetalle}>
                {copias} × {t(hojas > 1 ? '{n} hojas' : '{n} hoja', { n: hojas })} × ${precioPorHoja.toFixed(2)}
                {color && formato.allowsColor ? t(' · color +${monto}/hoja', { monto: Number(formato.colorSurcharge || 0).toFixed(2) }) : ''}
              </Text>
            )}
          </View>
          <Text style={[estilos.precioValor, { color: colores.marcaTexto }]}>${total.toFixed(2)}</Text>
        </View>

        {!!error && <Text style={estilos.error}>{error}</Text>}

        <Boton
          texto={t('Enviar a imprimir')}
          alPresionar={enviar}
          cargando={enviando}
          color={colores.marca}
          colorPresionado={colores.marcaOscuro}
          estilo={estilos.botonRedondo}
        />
      </ScrollView>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  botonAtras: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloBarra: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
  },
  cuerpo: {
    ...contenidoCentrado,
    padding: 16,
  },
  pasoTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    marginTop: 18,
    marginBottom: 10,
  },
  textoTenue: {
    fontSize: 13.5,
    color: COLORES.textoTenue,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tarjetaFormato: {
    width: '31%',
    minHeight: 90,
    borderWidth: 1.5,
    borderColor: COLORES.lineaCard,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tarjetaApagada: {
    opacity: 0.5,
    backgroundColor: COLORES.papelGris,
  },
  formatoNombre: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
    textAlign: 'center',
  },
  formatoMedida: {
    fontSize: 10,
    color: COLORES.textoTenue,
  },
  formatoPrecio: {
    fontSize: 11.5,
    color: COLORES.textoSuave,
    fontWeight: '600',
  },
  sinMaterial: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORES.peligro,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  quedaPoco: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORES.marcaTexto,
    marginTop: 2,
  },
  filaArchivo: {
    flexDirection: 'row',
    gap: 10,
  },
  botonArchivo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORES.lineaCard,
    borderRadius: 12,
    paddingVertical: 14,
  },
  botonArchivoTexto: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
  },
  previewArchivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORES.papelGris,
  },
  previewNombre: {
    flex: 1,
    fontSize: 12.5,
    color: COLORES.textoVentaja,
  },
  advertencia: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORES.avisoFondo,
    borderWidth: 1,
    borderColor: COLORES.avisoBorde,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  advertenciaTexto: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORES.avisoTexto,
  },
  tarjetaOpciones: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 16,
    gap: 16,
  },
  filaOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  etiquetaOpcion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
  },
  notaOpcion: {
    fontSize: 11,
    color: COLORES.textoTenue,
    marginTop: 2,
  },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botonContador: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCopias: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
    paddingVertical: 0,
  },
  filaPapeles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pastillaPapel: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
  },
  pastillaPapelTexto: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
  },
  cajaPrecio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
    marginTop: 20,
    marginBottom: 16,
  },
  precioEtiqueta: {
    fontSize: 14,
    color: COLORES.textoSuave,
  },
  precioDetalle: {
    fontSize: 11,
    color: COLORES.textoTenue,
    marginTop: 2,
  },
  precioValor: {
    fontSize: 24,
    fontWeight: '800',
  },
  error: {
    fontSize: 12.5,
    color: COLORES.error,
    marginBottom: 12,
  },
  // Píldora completa, a juego con el resto de botones principales de la
  // app (Checkout, ModalProducto...) — el Boton base trae 8 de esquina, pensado
  // para otros usos.
  botonRedondo: {
    borderRadius: 28,
  },
});

export default Impresiones;
