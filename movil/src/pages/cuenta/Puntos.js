// PUNTOS DE FIDELIDAD — la tarjeta del cliente
// Cuántos puntos tiene, cuánto valen y cuándo vence el primer lote; las reglas salen del servidor
// (`/loyalty`), no están escritas aquí.

import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CargandoMascota } from '../../components/Tiqui/Mascota';
import { LinearGradient } from 'expo-linear-gradient';
import { TriangleAlert } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useAireBarraFlotante } from '../../components/UI/BarraInferior';
import { useAuth } from '../../hooks/useAuth';
import { useAjustesTienda } from '../../hooks/useAjustesTienda';
import { useTema } from '../../context/TemaContext';
import { getResumenPuntos, getConfigFidelidad } from '../../api/fidelidadApi';
import BarraCuenta from '../../components/Cuenta/BarraCuenta';
import Boton from '../../components/UI/Boton';
import { Estrella } from '../../components/UI/Iconos';
import { useIdioma } from '../../context/IdiomaContext';
import { contenidoCentrado } from '../../theme/pantalla';

const Puntos = ({ alVolver }) => {
  const { t, locale } = useIdioma();
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const { user } = useAuth();
  // El nombre de la tienda sale de los ajustes, no escrito a mano: si el dueño
  // lo cambia en Personalización, el chip de la tarjeta cambia con él. Es lo
  // que ya hacía la web (ver PuntosFidelidad.jsx) y lo que hace MarcaTienda.
  const { ajustes } = useAjustesTienda();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  const [resumen, setResumen] = useState({ available: 0, nextExpiry: null, expiringSoon: 0 });
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [sum, cfg] = await Promise.all([getResumenPuntos(user.id), getConfigFidelidad()]);
      setResumen(sum || { available: 0, nextExpiry: null, expiringSoon: 0 });
      setConfig(cfg);
    } catch (e) {
      setError(e?.message || t('No se pudieron cargar tus puntos'));
    } finally {
      setCargando(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Los mismos respaldos que la web, para que las dos digan lo mismo.
  const porDolar = config?.pointsPerDollar ?? 1;
  const meses = config?.expiryMonths ?? 3;
  const tasaCanje = config?.pointsPerDollarRedeem ?? 100;
  const minimoCanje = config?.minRedeemPoints ?? 100;
  const valorEnDinero = resumen.available / tasaCanje;

  const plural = porDolar === 1 ? '' : 's';

  const vence = resumen.nextExpiry
    ? new Date(resumen.nextExpiry).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  return (
    <View style={estilos.pantalla}>
      <BarraCuenta titulo={t('Puntos de fidelidad')} alVolver={alVolver} />

      {cargando ? (
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Cargando tus puntos…')} />
        </View>
      ) : error ? (
        <View style={estilos.centro}>
          <Text style={estilos.errorTitulo}>{t('No se pudieron cargar tus puntos')}</Text>
          <Text style={estilos.errorTexto}>{error}</Text>
          <View style={estilos.botonError}>
            <Boton
              texto={t('Reintentar')}
              alPresionar={cargar}
              color={colores.marca}
              colorPresionado={colores.marcaOscuro}
            />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[estilos.cuerpo, { paddingBottom: aireAbajo }]}>
          {/* ── La tarjeta ── */}
          <View style={estilos.tarjeta}>
            {/* El degradado de la web va de `primary` a `accent` y termina en el hover del primario. Aquí se
               arma con los tres de la temporada, así que en Navidad la tarjeta es verde sin tocar este
               archivo. */}
            <LinearGradient
              colors={[colores.marca, colores.acento, colores.marcaOscuro]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* El cuadrito con el nombre de la tienda, como el chip de una
                tarjeta de verdad. */}
            <View style={estilos.chip}>
              <View style={estilos.chipPunto} />
              <Text style={estilos.chipTexto}>{ajustes.nombreLinea1}</Text>
              {!!ajustes.nombreLinea2 && <Text style={estilos.chipTexto}>{ajustes.nombreLinea2}</Text>}
            </View>

            <View style={estilos.tarjetaCuerpo}>
              <Text style={estilos.nombre} numberOfLines={1}>
                {user?.fullName || user?.userName || t('Cliente')}
              </Text>

              <View style={estilos.filaPuntos}>
                <Estrella size={14} color="#FFFFFF" />
                <Text style={estilos.puntosTexto}>{t('{n} puntos disponibles', { n: resumen.available })}</Text>
              </View>

              {/* Lo que de verdad le importa al cliente: cuánto valen. */}
              <Text style={estilos.valor}>
                {t('Valen ${monto} en tu próxima compra', { monto: valorEnDinero.toFixed(2) })}
              </Text>
              <Text style={estilos.detalle}>
                {t(plural ? 'Gana {n} puntos por cada $1 que gasta.' : 'Gana {n} punto por cada $1 que gasta.', { n: porDolar })}
              </Text>
              <Text style={estilos.detalleTenue}>{t('Próximo vencimiento: {fecha}', { fecha: vence })}</Text>
            </View>
          </View>

          {/* El aviso de lo que se va a vencer. Solo aparece si hay algo que
              perder: sin puntos por vencer sería una alarma sin incendio. */}
          {resumen.expiringSoon > 0 && (
            <View style={estilos.aviso}>
              <TriangleAlert size={16} color={COLORES.avisoVivo} strokeWidth={2} />
              <Text style={estilos.avisoTexto}>
                {t('Tienes {n} puntos que vencen en los próximos 30 días.', { n: resumen.expiringSoon })}
              </Text>
            </View>
          )}

          {/* ── Las tres preguntas, con los números reales ── */}
          <View style={estilos.preguntas}>
            <Pregunta
              titulo={t('¿Cómo consigo puntos?')}
              texto={t(plural ? 'Por cada $1 que gasta en la tienda gana {n} puntos. Se acumulan solos con cada compra.' : 'Por cada $1 que gasta en la tienda gana {n} punto. Se acumulan solos con cada compra.', { n: porDolar })}
            />
            <Pregunta
              titulo={t('¿Cómo los uso?')}
              texto={t('Cada {tasa} puntos equivalen a $1 de descuento. Al pagar en la tienda puedes elegir usarlos (necesitas al menos {minimo}).', { tasa: tasaCanje, minimo: minimoCanje })}
            />
            <Pregunta
              titulo={t('¿Cuándo vencen?')}
              texto={t('Los puntos de cada compra vencen a los {meses} meses de haberlos ganado. Arriba ve la fecha del lote que vence primero.', { meses })}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const Pregunta = ({ titulo, texto }) => {
  const { t } = useIdioma();
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.pregunta}>
      <Text style={estilos.preguntaTitulo}>{titulo}</Text>
      <Text style={estilos.preguntaTexto}>{texto}</Text>
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  errorTexto: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  botonError: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  cuerpo: {
    ...contenidoCentrado,
    padding: 16,
    paddingBottom: 32,
  },
  tarjeta: {
    borderRadius: 18,
    padding: 20,
    // `hidden` es lo que recorta el degradado a las esquinas redondeadas: sin
    // esto el fondo sale cuadrado y se asoma por las cuatro puntas.
    overflow: 'hidden',
    minHeight: 190,
    justifyContent: 'space-between',
  },
  chip: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 78,
    height: 78,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  chipPunto: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginBottom: 5,
  },
  chipTexto: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  tarjetaCuerpo: {
    // Le deja el rincón de arriba a la derecha al chip: sin este margen, un
    // nombre largo se le mete debajo y las letras se pisan.
    marginRight: 88,
    gap: 3,
  },
  nombre: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filaPuntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  puntosTexto: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  valor: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detalle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  detalleTenue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORES.avisoFondo,
  },
  avisoTexto: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORES.avisoVivo,
  },
  preguntas: {
    marginTop: 26,
    gap: 18,
  },
  pregunta: {
    gap: 4,
  },
  preguntaTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
  },
  preguntaTexto: {
    fontSize: 13.5,
    lineHeight: 21,
    color: COLORES.textoSuave,
  },
});

export default Puntos;
