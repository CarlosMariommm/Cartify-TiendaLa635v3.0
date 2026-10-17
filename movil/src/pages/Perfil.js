// PERFIL — la portada de "Mi cuenta"
// Lo que en la web es el menú del `ClienteLayout`: quién está dentro y la lista de las cosas que
// puede hacer con su cuenta.

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import {
  Bell, ChevronRight, CreditCard, Heart, HelpCircle, LogOut, MapPin, Receipt, SlidersHorizontal, Star, User,
} from 'lucide-react-native';
import { useColores, useEstilos } from '../context/ModoContext';
import { useAireBarraFlotante } from '../components/UI/BarraInferior';
import { ALTURA_ESTADO, contenidoCentrado } from '../theme/pantalla';
import { useAuth } from '../hooks/useAuth';
import { useBotonAtras } from '../hooks/useBotonAtras';
import { useTema } from '../context/TemaContext';
import { getCliente } from '../api/clienteApi';
import Ayuda from './cuenta/Ayuda';
import Direcciones from './cuenta/Direcciones';
import Favoritos from './cuenta/Favoritos';
import MisDatos from './cuenta/MisDatos';
import Notificaciones from './cuenta/Notificaciones';
import Pagos from './cuenta/Pagos';
import Preferencias from './cuenta/Preferencias';
import Puntos from './cuenta/Puntos';
import Recibos from './cuenta/Recibos';
import ModalConfirmar from '../components/UI/ModalConfirmar';
import HojaTerminos from '../components/UI/HojaTerminos';
import PruebasDesarrollo from '../components/Cuenta/PruebasDesarrollo';
import { DOCUMENTOS_LEGALES } from '../utils/legales';
import { navegarA } from '../navigation/navigationRef';
import { registrarTokenPush } from '../api/clienteApi';
import { tokenActual } from '../utils/notificaciones';
import { useIdioma } from '../context/IdiomaContext';

// Los iconos son los mismos con los que la web pinta este menú (ver ClienteLayout): User, Heart,
// MapPin, CreditCard, Bell, Star, Receipt, SlidersHorizontal y HelpCircle.
const SECCIONES = [
  { clave: 'datos', titulo: 'Mis datos', sub: 'Nombre, correo y teléfono', icono: User },
  { clave: 'favoritos', titulo: 'Mis favoritos', sub: 'Lo que marcó con el corazón', icono: Heart },
  { clave: 'direcciones', titulo: 'Direcciones', sub: 'A dónde te llevamos el pedido', icono: MapPin },
  { clave: 'pagos', titulo: 'Pagos', sub: 'Tu saldo y tus métodos guardados', icono: CreditCard },
  { clave: 'avisos', titulo: 'Notificaciones', sub: 'Qué avisos quieres recibir', icono: Bell },
  { clave: 'puntos', titulo: 'Puntos de fidelidad', sub: 'Tu saldo y cuánto valen', icono: Star },
  { clave: 'recibos', titulo: 'Recibos', sub: 'Tus pedidos ya entregados', icono: Receipt },
  { clave: 'preferencias', titulo: 'Preferencias', sub: 'Apariencia e idioma', icono: SlidersHorizontal },
  { clave: 'ayuda', titulo: 'Ayuda y contacto', sub: 'Preguntas frecuentes y cómo escribirnos', icono: HelpCircle },
];

const PANTALLAS = {
  datos: MisDatos,
  favoritos: Favoritos,
  direcciones: Direcciones,
  pagos: Pagos,
  avisos: Notificaciones,
  puntos: Puntos,
  recibos: Recibos,
  preferencias: Preferencias,
  ayuda: Ayuda,
};

const Perfil = () => {
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const { user, logout } = useAuth();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);

  const [seccion, setSeccion] = useState(null);
  const { t } = useIdioma();
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [cliente, setCliente] = useState(null);
  // El documento legal abierto encima (términos, privacidad, devoluciones) o null.
  const [docLegal, setDocLegal] = useState(null);

  // Al personal no se le puede mostrar una cuenta de cliente: los endpoints de
  // esta pantalla van contra /client/:id y con un id de empleado dan 404. Entra
  // por la misma puerta, pero no viene a comprar. Mismo criterio que la web.
  const esCliente = user?.type === 'client' && !!user?.id;

  const volverALaLista = useCallback(() => setSeccion(null), []);

  // El botón de atrás de Android cierra la pantalla de adentro antes que nada.
  // Se registra DESPUÉS del de App.js, y Android atiende al último apuntado,
  // así que este gana mientras haya una sección abierta.
  useBotonAtras(volverALaLista, seccion !== null);

  // Los datos se releen cada vez que se vuelve a esta lista, no solo al entrar. Es lo que hace que
  // al guardar el nombre en "Mis datos" el saludo de aquí arriba salga con el nombre nuevo: el
  // `user` de la sesión se llenó al entrar y no se entera de una edición posterior.
  const cargar = useCallback(async () => {
    if (!esCliente) return;
    try {
      setCliente(await getCliente(user.id));
    } catch {
      // Sin esto se cae al `user` de la sesión, que trae el nombre y el correo de cuando entró. Es
      // información de hace un rato, no información falsa — y dejar la cuenta en blanco porque falló una
      // petición sería peor.
    }
  }, [esCliente, user?.id]);

  useEffect(() => {
    if (seccion === null) cargar();
  }, [seccion, cargar]);

  // La pregunta la hace ModalConfirmar, con la cara de la app: el Alert del
  // sistema era un cuadro gris de Android en medio de la tienda.
  const salir = () => setConfirmarSalida(true);

  // ── Una de las pantallas de adentro ──
  if (seccion) {
    const Pantalla = PANTALLAS[seccion];
    return <Pantalla alVolver={volverALaLista} />;
  }

  // ── La lista ──
  const nombre = cliente?.fullName || user?.fullName || user?.userName || t('Cliente');
  const correo = cliente?.email || user?.email || '';
  const inicial = nombre.substring(0, 1).toUpperCase();

  return (
    <View style={estilos.pantalla}>
      <View style={[estilos.barra, { paddingTop: ALTURA_ESTADO + 10 }]}>
        <Text style={estilos.tituloBarra}>{t('Mi cuenta')}</Text>

        <Pressable
          onPress={salir}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Cerrar sesión')}
          style={({ pressed }) => [
            estilos.botonSalir,
            pressed && { backgroundColor: colores.marcaSuave },
          ]}
        >
          <LogOut size={20} color={COLORES.textoSuave} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[estilos.cuerpo, { paddingBottom: aireAbajo }]}>
        {/* Quién está dentro */}
        <View style={estilos.cabecera}>
          {cliente?.image ? (
            <Image source={{ uri: cliente.image }} contentFit="cover" style={estilos.avatarFoto} />
          ) : (
            <View style={[estilos.avatar, { backgroundColor: colores.marca }]}>
              <Text style={estilos.avatarTexto}>{inicial}</Text>
            </View>
          )}
          <View style={estilos.identidad}>
            <Text style={estilos.nombre} numberOfLines={1}>
              {nombre}
            </Text>
            {!!correo && (
              <Text style={estilos.correo} numberOfLines={1}>
                {correo}
              </Text>
            )}
          </View>
        </View>

        {esCliente ? (
          <View style={estilos.menu}>
            {SECCIONES.map(({ clave, titulo, sub, icono: Icono }) => (
              <Pressable
                key={clave}
                onPress={() => setSeccion(clave)}
                accessibilityRole="button"
                accessibilityLabel={t(titulo)}
                style={({ pressed }) => [
                  estilos.item,
                  pressed && { backgroundColor: colores.marcaTenue },
                ]}
              >
                <View style={[estilos.cuadroIcono, { backgroundColor: colores.marcaSuave }]}>
                  <Icono size={18} color={colores.marca} strokeWidth={2} />
                </View>

                <View style={estilos.itemTextos}>
                  <Text style={estilos.itemTitulo}>{t(titulo)}</Text>
                  <Text style={estilos.itemSub}>{t(sub)}</Text>
                </View>

                <ChevronRight size={18} color={COLORES.marcador} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        ) : (
          // Personal de la tienda. No se le esconde la app —puede seguir viendo la tienda— pero tampoco se
          // le enseñan cinco renglones que al tocarlos darían error.
          <View style={estilos.aviso}>
            <Text style={estilos.avisoTexto}>
              {t('Entró con una cuenta del personal. Esta aplicación es la de los clientes: el área de reparto y el panel de la tienda están en la versión de computadora.')}
            </Text>
          </View>
        )}

        {/* Lo que se puede leer en cualquier momento, no solo al registrarse: la presentación de Tiqui y
           los documentos legales. Van sueltos, como enlaces, sin recuadro: no son secciones de la cuenta. */}
        <View style={estilos.extras}>
          <Pressable
            onPress={() => navegarA('ConoceATiqui')}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.extraFila, pressed && { opacity: 0.7 }]}
          >
            <Text style={[estilos.extraTexto, { color: colores.marcaTexto }]}>{t('Conoce a Tiqui, tu asistente')}</Text>
            <ChevronRight size={16} color={colores.marca} strokeWidth={2.2} />
          </Pressable>
          {/* La puerta del personal también desde aquí: quien trabaja en la tienda y además compra con su
             cuenta no tiene que cerrar sesión para llegar al enlace del login. Ver
             pages/personal/LoginPersonal.js. */}
          <Pressable
            onPress={() => navegarA('LoginPersonal')}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.extraFila, pressed && { opacity: 0.7 }]}
          >
            <Text style={[estilos.extraTexto, { color: colores.marcaTexto }]}>{t('¿Trabajas en la tienda? Entra aquí')}</Text>
            <ChevronRight size={16} color={colores.marca} strokeWidth={2.2} />
          </Pressable>
          <View style={estilos.legales}>
            {DOCUMENTOS_LEGALES.map((d) => (
              <Text
                key={d.clave}
                onPress={() => setDocLegal(d.clave)}
                accessibilityRole="link"
                style={estilos.legal}
              >
                {t(d.titulo)}
              </Text>
            ))}
          </View>
        </View>

        {/* Solo en desarrollo: simular un pedido y ver los avisos. */}
        {__DEV__ && <PruebasDesarrollo />}
      </ScrollView>

      {docLegal && <HojaTerminos clave={docLegal} alCerrar={() => setDocLegal(null)} />}

      {confirmarSalida && (
        <ModalConfirmar
          titulo={t('¿Cerrar sesión?')}
          mensaje={t('Tendrás que volver a escribir tu correo y tu contraseña para entrar de nuevo.')}
          textoConfirmar={t('Cerrar sesión')}
          textoCancelar={t('Quedarme')}
          destructivo
          trabajando={saliendo}
          alConfirmar={async () => {
            setSaliendo(true);
            // Antes de cerrar sesión, este teléfono deja de recibir los avisos de la cuenta, con un tope de
            // tiempo para no quedarse colgado esperando la red.
            try {
              const token = await Promise.race([
                tokenActual(),
                new Promise((listo) => setTimeout(() => listo(null), 2500)),
              ]);
              if (token && user?.id) await registrarTokenPush(user.id, token, false);
            } catch {
              // Se cierra igual: la sesión es de quien la está cerrando.
            }
            setSaliendo(false);
            setConfirmarSalida(false);
            logout();
          }}
          alCerrar={() => (saliendo ? undefined : setConfirmarSalida(false))}
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
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.linea,
  },
  tituloBarra: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.4,
  },
  botonSalir: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: {
    ...contenidoCentrado,
    padding: 16,
    paddingBottom: 30,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    marginBottom: 18,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFoto: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  // Blanco también en oscuro: va sobre el color de la marca, no sobre el fondo.
  avatarTexto: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  identidad: {
    flexShrink: 1,
    gap: 2,
  },
  nombre: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORES.tituloFuerte,
    letterSpacing: -0.3,
  },
  correo: {
    fontSize: 13,
    color: COLORES.textoSuave,
  },
  menu: {
    gap: 8,
  },
  item: {
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
  itemTextos: {
    flex: 1,
    gap: 1,
  },
  itemTitulo: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
  },
  itemSub: {
    fontSize: 12.5,
    color: COLORES.textoSuave,
  },
  aviso: {
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 16,
  },
  avisoTexto: {
    fontSize: 13.5,
    lineHeight: 21,
    color: COLORES.textoSuave,
  },
  // Separado del menú con una línea fina, no con otro recuadro.
  extras: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORES.linea,
    gap: 10,
  },
  extraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  extraTexto: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  legales: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
  },
  legal: {
    fontSize: 13,
    color: COLORES.textoSuave,
    textDecorationLine: 'underline',
    paddingVertical: 8,
  },
});

export default Perfil;
