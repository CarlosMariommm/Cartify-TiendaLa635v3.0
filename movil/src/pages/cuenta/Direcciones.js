// DIRECCIONES — a dónde le llevamos los pedidos
// El equivalente de `frontend/src/pages/cliente/Direcciones.jsx`: la lista de direcciones
// guardadas, con su nombre, su texto y su referencia.

import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Mascota, { CargandoMascota } from '../../components/Tiqui/Mascota';
import { MapPin, Signpost, Trash2 } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useAireBarraFlotante } from '../../components/UI/BarraInferior';
import { useAuth } from '../../hooks/useAuth';
import { useTema } from '../../context/TemaContext';
import { useAviso } from '../../context/AvisoContext';
import { getCliente, actualizarDirecciones } from '../../api/clienteApi';
import BarraCuenta from '../../components/Cuenta/BarraCuenta';
import Boton from '../../components/UI/Boton';
import ModalMapaDireccion from '../../components/UI/ModalMapaDireccion';
import ModalConfirmar from '../../components/UI/ModalConfirmar';
import { useIdioma } from '../../context/IdiomaContext';
import { contenidoCentrado } from '../../theme/pantalla';

// Las direcciones viejas son texto suelto y las nuevas son un objeto. Se normaliza al leer, igual
// que en la web (`normalizarDireccion`): así lo de antes sigue viéndose y lo de ahora trae su
// nombre y su referencia.
const normalizar = (item) => {
  if (typeof item === 'string') {
    return { nombre: '', direccion: item, referencia: '' };
  }
  return {
    nombre: item?.nombre || '',
    direccion: item?.direccion || '',
    referencia: item?.referencia || '',
    lat: item?.lat ?? null,
    lng: item?.lng ?? null,
  };
};

const Direcciones = ({ alVolver }) => {
  const { t } = useIdioma();
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const { user } = useAuth();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { avisar } = useAviso();

  const [direcciones, setDirecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [mostrarMapa, setMostrarMapa] = useState(false);
  // Cuál se está por quitar (su índice), o null. La pregunta la hace
  // ModalConfirmar, que tiene la cara de la app; antes era el cuadro gris
  // del sistema.
  const [porQuitar, setPorQuitar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const cliente = await getCliente(user.id);
      const lista = Array.isArray(cliente?.clientAddress) ? cliente.clientAddress : [];
      setDirecciones(lista.map(normalizar));
    } catch (e) {
      setError(e?.message || t('No se pudieron cargar tus direcciones'));
    } finally {
      setCargando(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async (nueva) => {
    const lista = [...direcciones, nueva];
    setGuardando(true);
    try {
      await actualizarDirecciones(user.id, lista);
      setDirecciones(lista);
      setMostrarMapa(false);
      avisar(t('Dirección guardada'), 'exito');
    } catch (e) {
      avisar(e?.message || t('No se pudo guardar la dirección'), 'error');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    const quedan = direcciones.filter((_, i) => i !== porQuitar);
    setGuardando(true);
    try {
      await actualizarDirecciones(user.id, quedan);
      setDirecciones(quedan);
      setPorQuitar(null);
      avisar(t('Dirección quitada'), 'quitar');
    } catch (e) {
      // No se toca la lista: si el servidor no la borró, sigue estando.
      avisar(e?.message || t('No se pudo quitar la dirección'), 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <BarraCuenta titulo={t('Direcciones')} alVolver={alVolver} />

      {cargando ? (
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Cargando tus direcciones…')} />
        </View>
      ) : error ? (
        <View style={estilos.centro}>
          <Text style={estilos.errorTitulo}>{t('No se pudieron cargar tus direcciones')}</Text>
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
        <FlatList
          data={direcciones}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={[estilos.lista, { paddingBottom: aireAbajo }]}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Mascota pose="sin-direcciones" alto={120} />
              <Text style={estilos.vacioTitulo}>{t('Sin direcciones guardadas')}</Text>
              <Text style={estilos.vacioTexto}>{t('Agrega la primera abajo.')}</Text>
            </View>
          }
          ListFooterComponent={
            <View style={estilos.agregar}>
              <Pressable accessibilityRole="button" onPress={() => setMostrarMapa(true)} hitSlop={8}>
                <Text style={[estilos.enlace, { color: colores.marcaTexto }]}>
                  {direcciones.length === 0 ? t('+ Agregar mi primera dirección') : t('+ Agregar otra dirección')}
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={estilos.tarjeta}>
              <MapPin size={19} color={colores.marca} strokeWidth={2} />

              <View style={estilos.datos}>
                {!!item.nombre && <Text style={estilos.nombre}>{item.nombre}</Text>}
                <Text style={item.nombre ? estilos.textoSecundario : estilos.textoPrincipal}>
                  {item.direccion}
                </Text>
                {!!item.referencia && (
                  <View style={estilos.filaReferencia}>
                    <Signpost size={13} color={COLORES.textoTenue} strokeWidth={1.8} />
                    <Text style={estilos.referencia}>{item.referencia}</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => setPorQuitar(index)}
                disabled={guardando}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={item.nombre ? t('Quitar {nombre}', { nombre: item.nombre }) : t('Quitar dirección')}
                style={({ pressed }) => [
                  estilos.botonBorrar,
                  pressed && estilos.botonBorrarPresionado,
                  guardando && estilos.botonBorrarApagado,
                ]}
              >
                <Trash2 size={16} color={COLORES.error} strokeWidth={1.9} />
              </Pressable>
            </View>
          )}
        />
      )}

      {mostrarMapa && (
        <ModalMapaDireccion
          alCerrar={() => setMostrarMapa(false)}
          alGuardar={agregar}
          guardando={guardando}
          conBarraFlotante
        />
      )}

      {porQuitar !== null && (
        <ModalConfirmar
          titulo={t('¿Quitar esta dirección?')}
          mensaje={`${direcciones[porQuitar]?.nombre || direcciones[porQuitar]?.direccion}\n\n${t('Para volver a tenerla habrá que escribirla de nuevo al hacer un pedido.')}`}
          textoConfirmar={t('Quitar')}
          destructivo
          trabajando={guardando}
          alConfirmar={quitar}
          alCerrar={() => setPorQuitar(null)}
        />
      )}
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
  vacio: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
  },
  vacioTitulo: {
    marginTop: 4,
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORES.tituloFuerte,
  },
  vacioTexto: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORES.textoSuave,
    textAlign: 'center',
  },
  lista: {
    ...contenidoCentrado,
    padding: 16,
    gap: 10,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 14,
  },
  datos: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORES.tituloVentaja,
  },
  textoPrincipal: {
    fontSize: 14,
    color: COLORES.tituloVentaja,
    lineHeight: 20,
  },
  textoSecundario: {
    fontSize: 13.5,
    color: COLORES.textoSuave,
    lineHeight: 20,
  },
  filaReferencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  referencia: {
    flexShrink: 1,
    fontSize: 12,
    color: COLORES.textoTenue,
  },
  botonBorrar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonBorrarPresionado: {
    backgroundColor: COLORES.peligroFondo,
  },
  botonBorrarApagado: {
    opacity: 0.5,
  },
  agregar: {
    marginTop: 4,
  },
  enlace: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },
});

export default Direcciones;
