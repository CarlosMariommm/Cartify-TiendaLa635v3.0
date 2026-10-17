// PRUEBAS (solo desarrollo) — al pie de Perfil Botones para ver cómo se viven los avisos y un
// pedido a domicilio sin hacer uno de verdad (ver utils/simulacionPedido.js). Perfil solo lo
// dibuja con __DEV__: en la app que se publica no existe.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEstilos } from '../../context/ModoContext';
import { useTema } from '../../context/TemaContext';
import { usePedidoActivoCtx } from '../../context/PedidoActivoContext';
import { useTienda } from '../../context/TiendaContext';
import { useAviso } from '../../context/AvisoContext';
import { irATabs } from '../../navigation/navigationRef';
import { permisoParaAvisos } from '../../utils/notificaciones';
import {
  detenerSimulacion, esPedidoSimulado, iniciarSimulacion, probarAvisoProductosNuevos,
  probarAvisoPromo, simulacionActiva, suscribirseASimulacion,
} from '../../utils/simulacionPedido';

const PruebasDesarrollo = () => {
  const estilos = useEstilos(crearEstilos);
  const { colores } = useTema();
  const { orders } = usePedidoActivoCtx();
  const { promociones } = useTienda();
  const { avisar } = useAviso();
  const [activa, setActiva] = useState(simulacionActiva());

  useEffect(() => suscribirseASimulacion(() => setActiva(simulacionActiva())), []);

  const simular = async (tipo) => {
    // El permiso ANTES de arrancar: pedirlo a mitad del pedido se come el aviso.
    if (!(await permisoParaAvisos())) {
      avisar('Sin permiso de notificaciones: el pedido corre igual, pero sin el aviso', 'error');
    }
    // Un pedido real suyo como molde (productos y total), si tiene alguno.
    const reales = (orders || []).filter((o) => !esPedidoSimulado(o._id));
    const plantilla = reales.find((o) => o.deliveryLat != null) || reales[0] || null;
    iniciarSimulacion({ plantilla, tipo });
    avisar(tipo === 'retiro'
      ? 'Pedido de prueba en marcha: queda listo para recoger a los 35 s'
      : 'Pedido de prueba en marcha: sale a los 35 s y llega a los 2 min');
    irATabs('inicio');
  };

  const probar = async (fn) => {
    const bien = await fn();
    if (!bien) avisar('Active las notificaciones de la app para ver el aviso', 'error');
  };

  const Boton = ({ texto, alTocar }) => (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.boton, { borderColor: colores.marca }, pressed && { backgroundColor: colores.marcaSuave }]}
    >
      <Text style={[estilos.botonTexto, { color: colores.marcaTexto }]}>{texto}</Text>
    </Pressable>
  );

  return (
    <View style={estilos.caja}>
      <Text style={estilos.titulo}>Pruebas (solo en desarrollo)</Text>
      <Text style={estilos.nota}>
        Nada de esto se guarda ni le llega a la tienda: el pedido y los avisos son de prueba.
      </Text>
      {activa ? (
        <Boton texto="Detener el pedido de prueba" alTocar={detenerSimulacion} />
      ) : (
        <>
          <Boton texto="Simular un pedido a domicilio" alTocar={() => simular('delivery')} />
          <Boton texto="Simular un pedido para recoger" alTocar={() => simular('retiro')} />
        </>
      )}
      <Boton texto="Probar aviso de promoción" alTocar={() => probar(() => probarAvisoPromo((promociones || [])[0]))} />
      <Boton texto="Probar aviso de productos nuevos" alTocar={() => probar(probarAvisoProductosNuevos)} />
    </View>
  );
};

const crearEstilos = (COLORES) => StyleSheet.create({
  caja: {
    marginTop: 28,
    gap: 10,
  },
  titulo: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: COLORES.textoSuave,
    textTransform: 'uppercase',
  },
  nota: {
    fontSize: 13,
    color: COLORES.textoSuave,
    marginBottom: 4,
  },
  boton: {
    minHeight: 46,
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  botonTexto: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});

export default PruebasDesarrollo;
