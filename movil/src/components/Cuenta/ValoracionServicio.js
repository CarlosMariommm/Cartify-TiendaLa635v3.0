// ¿QUÉ TAL ESTUVO LA ENTREGA? — ValoracionServicio.js
// Puerto del bloque `ValoracionServicio` de `frontend/src/pages/cliente/MisPedidos.jsx`: las
// estrellas del SERVICIO de reparto, no del producto.

import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { useAviso } from '../../context/AvisoContext';
import { valorarServicio } from '../../api/valoracionesApi';
import Boton from '../UI/Boton';
import Estrellas from './Estrellas';
import { useIdioma } from '../../context/IdiomaContext';

const ValoracionServicio = ({ pedido }) => {
  const { t } = useIdioma();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { avisar } = useAviso();

  const yaValorado = !!pedido?.serviceRating?.rating;
  const [estrellas, setEstrellas] = useState(pedido?.serviceRating?.rating || 0);
  const [comentario, setComentario] = useState(pedido?.serviceRating?.comment || '');
  const [guardado, setGuardado] = useState(yaValorado);
  const [enviando, setEnviando] = useState(false);

  // Solo los domicilios ya entregados: lo demás no tiene reparto que valorar.
  if (pedido?.deliveryType !== 'delivery' || pedido?.status !== 'entregado') return null;

  const enviar = async () => {
    if (!estrellas) {
      avisar(t('Elige de 1 a 5 estrellas'), 'error');
      return;
    }
    setEnviando(true);
    try {
      await valorarServicio(pedido._id, { rating: estrellas, comment: comentario.trim() });
      setGuardado(true);
      avisar(t('¡Gracias por valorar el servicio!'), 'exito');
    } catch (e) {
      avisar(e?.message || t('No se pudo guardar tu valoración'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>
        {guardado ? t('Valoró el servicio de entrega') : t('¿Qué tal estuvo la entrega?')}
      </Text>

      <Estrellas
        valor={estrellas}
        alElegir={setEstrellas}
        tamano={28}
        soloLectura={guardado || enviando}
      />

      {guardado ? (
        !!comentario.trim() && <Text style={estilos.comentario}>“{comentario.trim()}”</Text>
      ) : (
        <>
          <TextInput
            value={comentario}
            onChangeText={setComentario}
            placeholder={t('¿Algo que contar del reparto? (opcional)')}
            placeholderTextColor={COLORES.marcador}
            keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
            multiline
            maxLength={500}
            style={estilos.campo}
            accessibilityLabel={t('Comentario sobre la entrega')}
          />
          <Boton
            texto={enviando ? t('Enviando…') : t('Enviar valoración')}
            alPresionar={enviar}
            cargando={enviando}
            color={colores.marca}
            colorPresionado={colores.marcaOscuro}
            estilo={estilos.boton}
          />
        </>
      )}
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  // La misma ficha con borde que el resto del detalle del pedido.
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
  comentario: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    color: COLORES.textoSuave,
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
});

export default ValoracionServicio;
