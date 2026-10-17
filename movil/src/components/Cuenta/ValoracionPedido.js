// ¿QUÉ LE PARECIÓ SU PEDIDO? — ValoracionPedido.js
// Cuando el pedido ya se entregó, el cliente lo califica con estrellas y un comentario, y eso se
// guarda como reseña de cada producto que llevó.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useAviso } from '../../context/AvisoContext';
import { useAuth } from '../../hooks/useAuth';
import { guardarResena } from '../../api/valoracionesApi';
import { guardar, leer, llave } from '../../utils/almacen';
import Boton from '../UI/Boton';
import Estrellas from './Estrellas';
import { useIdioma } from '../../context/IdiomaContext';

// Una clave por pedido: omitir uno no debe ocultar el aviso de los demás.
const llaveOmitida = (pedidoId) => llave('valoracion', 'omitida', pedidoId);

// Los productos ÚNICOS del pedido: uno puede venir repetido en dos líneas, y
// no se le mandan dos reseñas iguales al servidor.
const productosDelPedido = (items = []) => {
  const vistos = new Set();
  return items
    .map((it) => String(it.productId?._id || it.productId || ''))
    .filter((id) => {
      if (!id || vistos.has(id)) return false;
      vistos.add(id);
      return true;
    });
};

const ValoracionPedido = ({ pedido }) => {
  const { t } = useIdioma();
  const { user } = useAuth();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { avisar } = useAviso();

  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // `null` mientras se lee el almacén: sin ese tercer estado el bloque
  // aparecería un instante antes de descubrir que ya lo habían omitido.
  const [omitido, setOmitido] = useState(null);

  const pedidoId = pedido?._id ? String(pedido._id) : '';

  useEffect(() => {
    if (!pedidoId) return undefined;
    let vivo = true;
    leer(llaveOmitida(pedidoId)).then((valor) => vivo && setOmitido(valor === '1'));
    return () => {
      vivo = false;
    };
  }, [pedidoId]);

  const productos = productosDelPedido(pedido?.items);

  if (pedido?.status !== 'entregado' || !user?.id || productos.length === 0) return null;
  if (omitido !== false) return null;

  const omitir = () => {
    guardar(llaveOmitida(pedidoId), '1');
    setOmitido(true);
  };

  const enviar = async () => {
    if (!estrellas) {
      avisar(t('Elige cuántas estrellas antes de enviar'), 'error');
      return;
    }
    setGuardando(true);
    try {
      // La misma calificación del pedido se guarda para cada producto que llevó.
      await Promise.all(
        productos.map((productId) =>
          guardarResena({ productId, clientId: user.id, rating: estrellas, comment: comentario.trim() })
        )
      );
      setEnviado(true);
      avisar(t('¡Gracias por calificar tu pedido!'), 'exito');
    } catch (e) {
      avisar(e?.message || t('No se pudo guardar tu valoración'), 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>{t('¿Qué te pareció tu pedido?')}</Text>

      {enviado ? (
        <View style={estilos.filaGracias}>
          <Check size={17} color={COLORES.exito} strokeWidth={2.4} />
          <Text style={estilos.gracias}>{t('¡Gracias por calificar tu pedido!')}</Text>
        </View>
      ) : (
        <>
          <Text style={estilos.texto}>
            {t('Tu pedido ya llegó. Cuéntanos qué tal estuvo, para que otros vecinos se animen.')}
          </Text>

          <Estrellas valor={estrellas} alElegir={setEstrellas} tamano={32} soloLectura={guardando} />

          <TextInput
            value={comentario}
            onChangeText={setComentario}
            placeholder={t('¿Algo que quiera contar? (opcional)')}
            placeholderTextColor={COLORES.marcador}
            keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
            multiline
            maxLength={500}
            style={estilos.campo}
            accessibilityLabel={t('Comentario sobre el pedido')}
          />

          <Boton
            texto={guardando ? t('Enviando…') : t('Enviar valoración')}
            alPresionar={enviar}
            cargando={guardando}
            color={colores.marca}
            colorPresionado={colores.marcaOscuro}
            estilo={estilos.boton}
          />
          <Pressable accessibilityRole="button" onPress={omitir} disabled={guardando} hitSlop={8}>
            <Text style={estilos.ahoraNo}>{t('Ahora no')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 15,
    gap: 10,
    marginBottom: 14,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  texto: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORES.textoSuave,
  },
  filaGracias: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  gracias: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORES.exito,
  },
  campo: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 64,
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORES.texto,
    backgroundColor: COLORES.fondo,
    textAlignVertical: 'top',
  },
  boton: {
    borderRadius: 28,
  },
  ahoraNo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.textoSuave,
    textAlign: 'center',
    paddingVertical: 6,
  },
});

export default ValoracionPedido;
