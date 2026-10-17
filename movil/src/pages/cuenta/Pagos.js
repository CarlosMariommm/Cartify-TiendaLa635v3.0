// PAGOS — el saldo digital y los métodos guardados
// El equivalente de `frontend/src/pages/cliente/MetodoPago.jsx`: la tarjeta de saldo (con su
// canje) arriba, la lista de métodos de pago guardados abajo.

import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CargandoMascota } from '../../components/Tiqui/Mascota';
import { Banknote, CircleAlert, CreditCard, Gift, Lock, Trash2 } from 'lucide-react-native';
import { useColores, useEstilos } from '../../context/ModoContext';
import { useAireBarraFlotante } from '../../components/UI/BarraInferior';
import { useAuth } from '../../hooks/useAuth';
import { useTema } from '../../context/TemaContext';
import { useAviso } from '../../context/AvisoContext';
import { getCliente, actualizarMetodosPago } from '../../api/clienteApi';
import { getSaldo, canjearTarjeta } from '../../api/giftCardApi';
import BarraCuenta from '../../components/Cuenta/BarraCuenta';
import MarcaTarjeta from '../../components/Cuenta/MarcaTarjeta';
import VistaTarjeta from '../../components/Cuenta/VistaTarjeta';
import Boton from '../../components/UI/Boton';
import ModalConfirmar from '../../components/UI/ModalConfirmar';
import { useIdioma } from '../../context/IdiomaContext';
import {
  LARGO_NUMERO,
  LARGO_VENCIMIENTO,
  NOMBRE_MARCA,
  detectarMarca,
  estaVencida,
  formatearNumero,
  formatearVencimiento,
  largoDe,
  leerVencimiento,
  nombreMarcaTipo,
  pasaLuhn,
  soloDigitos,
  vencimientoEnTexto,
} from '../../utils/tarjetas';
import { contenidoCentrado } from '../../theme/pantalla';
import { formatoCodigoTarjeta, LARGO_CODIGO_TARJETA } from '../../utils/tarjetaRegalo';

const FORM_VACIO = { tipo: 'credito', numero: '', titular: '', vencimiento: '', alias: '' };

const TIPOS = [
  { valor: 'credito', texto: 'Crédito', Icono: CreditCard },
  { valor: 'debito', texto: 'Débito', Icono: CreditCard },
];

const Etiqueta = ({ children }) => {
  const { t } = useIdioma();
  const estilos = useEstilos(crearEstilos);
  return <Text style={estilos.etiquetaCampo}>{t(children)}</Text>;
};

// El error debajo de su campo, no un aviso flotante: hay que ir a arreglarlo ahí.
const MensajeError = ({ texto }) => {
  const { t } = useIdioma();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  if (!texto) return null;

  return (
    <View style={estilos.filaError}>
      <CircleAlert size={13} color={COLORES.peligro} />
      <Text style={estilos.textoError}>{t(texto)}</Text>
    </View>
  );
};

const Pagos = ({ alVolver }) => {
  const { t } = useIdioma();
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const { user } = useAuth();
  const { colores } = useTema();
  const COLORES = useColores();
  const estilos = useEstilos(crearEstilos);
  const { avisar } = useAviso();

  const [saldo, setSaldo] = useState(0);
  const [metodos, setMetodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [codigoTarjeta, setCodigoTarjeta] = useState('');
  const [canjeando, setCanjeando] = useState(false);

  const [escribiendo, setEscribiendo] = useState(false);
  const [nuevo, setNuevo] = useState(FORM_VACIO);
  // Un campo solo reclama DESPUÉS de tocarlo: nadie quiere ver "faltan
  // dígitos" apenas escribió el primero.
  const [tocado, setTocado] = useState({});
  // Cuál se está por quitar (su índice), o null. Lo pregunta ModalConfirmar,
  // que tiene la cara de la app; antes era el cuadro gris del sistema.
  const [porQuitar, setPorQuitar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [cliente, saldoRes] = await Promise.all([
        getCliente(user.id),
        // El saldo es prescindible: sin él se ve $0.00 y se puede seguir
        // usando la pantalla, en vez de una que no carga por completo.
        getSaldo(user.id).catch(() => null),
      ]);
      const lista = Array.isArray(cliente?.paymentMethods) ? cliente.paymentMethods : [];
      setMetodos(lista);
      setSaldo(Number(saldoRes?.balance) || 0);
    } catch (e) {
      setError(e?.message || t('No se pudo cargar tu información de pagos'));
    } finally {
      setCargando(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const canjear = async () => {
    const limpio = codigoTarjeta.trim().toUpperCase();
    if (!limpio) return;

    setCanjeando(true);
    try {
      const r = await canjearTarjeta(limpio, user.id);
      setSaldo(Number(r?.balance) || 0);
      setCodigoTarjeta('');
      avisar(r?.message || t('Tarjeta canjeada'), 'exito');
    } catch (e) {
      avisar(e?.message || t('No se pudo canjear la tarjeta'), 'error');
    } finally {
      setCanjeando(false);
    }
  };

  /* ── Lo que dice el formulario de la tarjeta ── */
  const digitos = soloDigitos(nuevo.numero);
  const marca = detectarMarca(digitos);
  const numeroCompleto = digitos.length === largoDe(marca);
  const numeroValido = numeroCompleto && pasaLuhn(digitos);
  const venc = leerVencimiento(nuevo.vencimiento);
  const vencida = venc ? estaVencida(venc.mes, venc.anio) : false;
  // Al menos tres letras: un titular de "A" o "123" no es un nombre.
  const titularValido = nuevo.titular.trim().replace(/[^a-zA-ZÀ-ÿ]/g, '').length >= 3;
  const duplicada =
    numeroValido &&
    venc &&
    metodos.some(
      (m) =>
        m.type !== 'efectivo' &&
        m.last4 === digitos.slice(-4) &&
        m.brand === marca &&
        Number(m.expMonth) === venc.mes &&
        Number(m.expYear) === venc.anio
    );

  const errores = {
    numero:
      !tocado.numero || !digitos
        ? ''
        : !numeroCompleto
          ? t('Faltan dígitos: {marca} lleva {n}.', { marca: NOMBRE_MARCA[marca] === 'Tarjeta' ? t('la tarjeta') : NOMBRE_MARCA[marca], n: largoDe(marca) })
          : !numeroValido
            ? t('Revisa el número: no corresponde a una tarjeta válida.')
            : duplicada
              ? t('Esa tarjeta ya está guardada.')
              : '',
    vencimiento:
      !tocado.vencimiento || !nuevo.vencimiento
        ? ''
        : !venc
          ? t('Usa el formato MM/AA, con un mes entre 01 y 12.')
          : vencida
            ? t('Esta tarjeta ya venció.')
            : '',
    titular: tocado.titular && !titularValido ? t('Escribe el nombre como aparece en la tarjeta.') : '',
  };

  const listo = numeroValido && !!venc && !vencida && titularValido && !duplicada;

  const cambiar = (campo, valor) => setNuevo((f) => ({ ...f, [campo]: valor }));
  const tocar = (campo) => setTocado((previo) => ({ ...previo, [campo]: true }));

  const cerrarFormulario = () => {
    setEscribiendo(false);
    setNuevo(FORM_VACIO);
    setTocado({});
  };

  const agregar = async () => {
    setTocado({ numero: true, vencimiento: true, titular: true });
    if (!listo) return;

    // Lo que se guarda: nunca el número completo. `type` (y no `tipo`) es el nombre que espera el
    // backend y el que lee la web — con el otro, una tarjeta guardada desde el teléfono aparecía como
    // "Efectivo" allá.
    const metodo = {
      type: 'tarjeta',
      alias: nuevo.alias.trim() || nombreMarcaTipo({ brand: marca, cardType: nuevo.tipo }, t),
      last4: digitos.slice(-4),
      brand: marca,
      cardType: nuevo.tipo,
      holder: nuevo.titular.trim().toUpperCase(),
      expMonth: venc.mes,
      expYear: venc.anio,
    };

    const lista = [...metodos, metodo];
    setGuardando(true);
    try {
      await actualizarMetodosPago(user.id, lista);
      setMetodos(lista);
      cerrarFormulario();
      avisar(t('Tarjeta guardada'), 'exito');
    } catch (e) {
      avisar(e?.message || t('No se pudo guardar el método de pago'), 'error');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    const quedan = metodos.filter((_, i) => i !== porQuitar);
    setGuardando(true);
    try {
      await actualizarMetodosPago(user.id, quedan);
      setMetodos(quedan);
      setPorQuitar(null);
      avisar(t('Método de pago quitado'), 'quitar');
    } catch (e) {
      avisar(e?.message || t('No se pudo quitar el método de pago'), 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={estilos.pantalla}>
      <BarraCuenta titulo={t('Pagos')} alVolver={alVolver} />

      {cargando ? (
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Cargando tus métodos de pago…')} />
        </View>
      ) : error ? (
        <View style={estilos.centro}>
          <Text style={estilos.errorTitulo}>{t('No se pudo cargar tu información de pagos')}</Text>
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
        <ScrollView contentContainerStyle={[estilos.cuerpo, { paddingBottom: aireAbajo }]} keyboardShouldPersistTaps="handled">
          {/* ── Saldo digital ── */}
          <View style={[estilos.tarjetaSaldo, { backgroundColor: colores.marcaSuave }]}>
            <View style={estilos.filaSaldo}>
              <View style={[estilos.iconoSaldo, { backgroundColor: colores.marcaTenue }]}>
                <Gift size={19} color={colores.marca} strokeWidth={2} />
              </View>
              <View>
                <Text style={estilos.etiquetaSaldo}>{t('Tu saldo')}</Text>
                <Text style={[estilos.valorSaldo, { color: colores.marcaTexto }]}>
                  ${saldo.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={estilos.filaCanje}>
              <TextInput
                value={codigoTarjeta}
                // Los guiones se ponen solos (ver utils/tarjetaRegalo.js).
                onChangeText={(v) => setCodigoTarjeta(formatoCodigoTarjeta(v))}
                maxLength={LARGO_CODIGO_TARJETA}
                placeholder={t('¿Tienes una tarjeta? 635-XXXX-XXXX')}
                placeholderTextColor={COLORES.marcador}
                keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
                style={estilos.campoCanje}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel={t('Código de tarjeta de regalo')}
              />
              <Pressable accessibilityRole="button"
                onPress={canjear}
                disabled={canjeando || !codigoTarjeta.trim()}
                style={({ pressed }) => [
                  estilos.botonCanje,
                  { backgroundColor: colores.marca },
                  pressed && { backgroundColor: colores.marcaOscuro },
                  (canjeando || !codigoTarjeta.trim()) && estilos.botonCanjeApagado,
                ]}
              >
                <Text style={estilos.botonCanjeTexto}>{canjeando ? t('Canjeando…') : t('Canjear')}</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Métodos guardados ── */}
          <Text style={estilos.tituloSeccion}>{t('Métodos guardados')}</Text>

          {metodos.length === 0 && !escribiendo && (
            <Text style={estilos.vacioTexto}>
              {t('Sin métodos de pago guardados todavía. Guarda tu tarjeta una vez y la tendrás a mano en tu próxima compra.')}
            </Text>
          )}

          <View style={estilos.lista}>
            {metodos.map((metodo, indice) => {
              const efectivo = metodo.type === 'efectivo';
              const yaVencida = !efectivo && estaVencida(Number(metodo.expMonth), Number(metodo.expYear));
              const vence = vencimientoEnTexto(metodo.expMonth, metodo.expYear);
              // El renglón de abajo: "Visa crédito · •••• 4242 · Vence 08/29". El nombre de la marca solo si el
              // alias no lo dice ya, que "Mastercard débito" dos veces se lee como un error.
              const detalle = efectivo
                ? t('Efectivo')
                : [
                    ![nombreMarcaTipo(metodo), nombreMarcaTipo(metodo, t)].includes(metodo.alias) && nombreMarcaTipo(metodo, t),
                    `•••• ${metodo.last4 || '••••'}`,
                    vence && t('Vence {fecha}', { fecha: vence }),
                  ]
                    .filter(Boolean)
                    .join(' · ');

              return (
                <View key={`${metodo.last4 || metodo.alias}-${indice}`} style={estilos.tarjetaMetodo}>
                  {efectivo ? (
                    <View style={estilos.iconoEfectivo}>
                      <Banknote size={19} color={colores.marca} strokeWidth={2} />
                    </View>
                  ) : (
                    <MarcaTarjeta marca={metodo.brand || 'otra'} alto={30} />
                  )}

                  <View style={estilos.datosMetodo}>
                    <Text style={estilos.aliasMetodo} numberOfLines={1}>
                      {metodo.alias || t(efectivo ? 'Efectivo' : 'Tarjeta')}
                    </Text>
                    <Text style={estilos.detalleMetodo} numberOfLines={1}>
                      {detalle}
                    </Text>
                  </View>

                  {/* Una tarjeta vencida sigue en la lista, pero avisa: al pagar
                      no va a servir, y enterarse en la caja es peor. */}
                  {yaVencida && (
                    <View style={estilos.chapaVencida}>
                      <Text style={estilos.chapaVencidaTexto}>{t('Vencida')}</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={() => setPorQuitar(indice)}
                    disabled={guardando}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('Quitar {nombre}', { nombre: metodo.alias })}
                    style={({ pressed }) => [
                      estilos.botonBorrar,
                      pressed && estilos.botonBorrarPresionado,
                      guardando && estilos.botonBorrarApagado,
                    ]}
                  >
                    <Trash2 size={16} color={COLORES.error} strokeWidth={1.9} />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {escribiendo ? (
            <View style={[estilos.formulario, { borderColor: colores.marcaSuave }]}>
              {/* Crédito o débito. Sin <select> nativo: dos píldoras hacen lo
                  mismo con menos fricción en un teléfono. */}
              <View
                style={estilos.filaTipo}
                accessibilityRole="radiogroup"
                accessibilityLabel={t('Tipo de método de pago')}
              >
                {TIPOS.map(({ valor, texto, Icono }) => {
                  const activo = nuevo.tipo === valor;
                  return (
                    <Pressable
                      key={valor}
                      onPress={() => cambiar('tipo', valor)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: activo }}
                      style={[
                        estilos.pildoraTipo,
                        activo && { borderColor: colores.marca, backgroundColor: colores.marcaTenue },
                      ]}
                    >
                      <Icono size={15} color={activo ? colores.marca : COLORES.textoSuave} strokeWidth={2} />
                      <Text style={[estilos.pildoraTipoTexto, activo && { color: colores.marcaTexto }]}>
                        {t(texto)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* La tarjeta dibujada, que se va llenando con lo que escribe:
                  es la forma más rápida de comparar con la que tiene en la mano. */}
              <VistaTarjeta
                numero={digitos}
                titular={nuevo.titular}
                vencimiento={nuevo.vencimiento}
                tipo={nuevo.tipo}
              />

              <View>
                <Etiqueta>Número de tarjeta</Etiqueta>
                <View>
                  <TextInput
                    value={formatearNumero(nuevo.numero)}
                    onChangeText={(v) => {
                      // Recortado al largo de la marca: pegar un número de
                      // más no deja dígitos escondidos.
                      const d = soloDigitos(v);
                      cambiar('numero', d.slice(0, largoDe(detectarMarca(d))));
                    }}
                    onBlur={() => tocar('numero')}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={COLORES.marcador}
                    keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
                    keyboardType="number-pad"
                    maxLength={LARGO_NUMERO}
                    style={[estilos.campo, estilos.campoNumero, !!errores.numero && estilos.campoMal]}
                    accessibilityLabel={t('Número de tarjeta')}
                  />
                  {/* El logo de la red, dentro del campo y a la derecha. */}
                  <View style={estilos.logoEnCampo} pointerEvents="none">
                    {digitos ? (
                      <MarcaTarjeta marca={marca} alto={22} />
                    ) : (
                      <CreditCard size={18} color={COLORES.marcador} />
                    )}
                  </View>
                </View>
                <MensajeError texto={errores.numero} />
              </View>

              <View>
                <Etiqueta>Nombre del titular</Etiqueta>
                <TextInput
                  value={nuevo.titular}
                  onChangeText={(v) => cambiar('titular', v)}
                  onBlur={() => tocar('titular')}
                  placeholder={t('Como aparece en la tarjeta')}
                  placeholderTextColor={COLORES.marcador}
                  keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={40}
                  style={[estilos.campo, !!errores.titular && estilos.campoMal]}
                  accessibilityLabel={t('Nombre del titular')}
                />
                <MensajeError texto={errores.titular} />
              </View>

              <View>
                <Etiqueta>Vencimiento</Etiqueta>
                <TextInput
                  value={nuevo.vencimiento}
                  onChangeText={(v) => cambiar('vencimiento', formatearVencimiento(v))}
                  onBlur={() => tocar('vencimiento')}
                  placeholder={t('MM/AA')}
                  placeholderTextColor={COLORES.marcador}
                  keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
                  keyboardType="number-pad"
                  maxLength={LARGO_VENCIMIENTO}
                  style={[estilos.campo, !!errores.vencimiento && estilos.campoMal]}
                  accessibilityLabel={t('Vencimiento de la tarjeta')}
                />
                <MensajeError texto={errores.vencimiento} />
              </View>

              <View>
                <Etiqueta>Nombre para reconocerla (opcional)</Etiqueta>
                <TextInput
                  value={nuevo.alias}
                  onChangeText={(v) => cambiar('alias', v)}
                  placeholder={
                    digitos
                      ? nombreMarcaTipo({ brand: marca, cardType: nuevo.tipo }, t)
                      : t('Ej. Tarjeta del trabajo')
                  }
                  placeholderTextColor={COLORES.marcador}
                  keyboardAppearance={COLORES.oscuro ? 'dark' : 'light'}
                  maxLength={40}
                  style={estilos.campo}
                  accessibilityLabel={t('Nombre del método de pago')}
                />
              </View>

              <View style={estilos.filaCandado}>
                <Lock size={13} color={COLORES.textoTenue} style={estilos.candado} />
                <Text style={estilos.notaCandado}>
                  {t('Solo guardamos la marca, los últimos 4 dígitos, el titular y el vencimiento. El número completo no sale de este formulario, y el código de seguridad se pide solo al pagar.')}
                </Text>
              </View>

              <Boton
                texto={guardando ? t('Guardando…') : t('Guardar tarjeta')}
                alPresionar={agregar}
                cargando={guardando}
                deshabilitado={!listo}
                color={colores.marca}
                colorPresionado={colores.marcaOscuro}
              />
              <Pressable accessibilityRole="button" onPress={cerrarFormulario} hitSlop={8}>
                <Text style={estilos.enlaceTenue}>{t('Cancelar')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setEscribiendo(true)} hitSlop={8}>
              <Text style={[estilos.enlace, { color: colores.marcaTexto }]}>
                {metodos.length === 0 ? t('+ Agregar mi primer método de pago') : t('+ Agregar otro método')}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {porQuitar !== null && (
        <ModalConfirmar
          titulo={t('¿Quitar este método?')}
          mensaje={`${metodos[porQuitar]?.alias || t('Este método')}\n\n${t('Esto no lo cobra ni lo devuelve — solo lo saca de esta lista.')}`}
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
  cuerpo: {
    ...contenidoCentrado,
    padding: 16,
    paddingBottom: 30,
    gap: 14,
  },
  tarjetaSaldo: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  filaSaldo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconoSaldo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquetaSaldo: {
    fontSize: 12.5,
    color: COLORES.textoSuave,
  },
  valorSaldo: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  filaCanje: {
    flexDirection: 'row',
    gap: 8,
  },
  campoCanje: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 10,
    paddingHorizontal: 13,
    height: 44,
    fontSize: 13,
    color: COLORES.texto,
    backgroundColor: COLORES.fondo,
    paddingVertical: 0,
  },
  botonCanje: {
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCanjeApagado: {
    opacity: 0.5,
  },
  botonCanjeTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tituloSeccion: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORES.textoTenue,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  vacioTexto: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORES.textoSuave,
  },
  lista: {
    gap: 10,
  },
  tarjetaMetodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: COLORES.lineaCard,
    borderRadius: 14,
    padding: 14,
  },
  // El cuadrito del efectivo mide lo mismo que un logo de marca, para que los
  // renglones de la lista no bailen entre una tarjeta y un efectivo.
  iconoEfectivo: {
    width: 45,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datosMetodo: {
    flex: 1,
    gap: 1,
  },
  aliasMetodo: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
  },
  detalleMetodo: {
    fontSize: 12.5,
    color: COLORES.textoSuave,
  },
  chapaVencida: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORES.peligroFondo,
  },
  chapaVencidaTexto: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORES.peligro,
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
  formulario: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 9,
  },
  filaTipo: {
    flexDirection: 'row',
    gap: 8,
  },
  pildoraTipo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 10,
  },
  pildoraTipoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.textoSuave,
  },
  etiquetaCampo: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORES.tituloVentaja,
    marginBottom: 5,
  },
  campo: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 10,
    paddingHorizontal: 13,
    height: 44,
    fontSize: 13.5,
    color: COLORES.texto,
    backgroundColor: COLORES.fondo,
    paddingVertical: 0,
  },
  // Sitio para el logo de la red, que va encima del campo a la derecha.
  campoNumero: {
    paddingRight: 52,
    letterSpacing: 1,
  },
  campoMal: {
    borderColor: COLORES.peligro,
  },
  logoEnCampo: {
    position: 'absolute',
    right: 11,
    top: 11,
  },
  filaError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  textoError: {
    flexShrink: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORES.peligro,
  },
  filaCandado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 2,
  },
  candado: {
    marginTop: 2,
  },
  notaCandado: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16.5,
    color: COLORES.textoTenue,
  },
  enlace: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },
  enlaceTenue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.textoSuave,
    textAlign: 'center',
    paddingVertical: 4,
  },
});

export default Pagos;
