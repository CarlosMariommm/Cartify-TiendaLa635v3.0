// FAVORITOS — lo que el cliente marcó con el corazón
// El equivalente de `frontend/src/pages/cliente/Favoritos.jsx`, con la misma cuadrícula que el
// resto de la app (2 columnas en el teléfono, más en la tablet).

import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Mascota, { CargandoMascota } from '../../components/Tiqui/Mascota';
import { useEstilos } from '../../context/ModoContext';
import { useAireBarraFlotante } from '../../components/UI/BarraInferior';
import { useTienda } from '../../context/TiendaContext';
import { useFavoritos } from '../../context/FavoritosContext';
import BarraCuenta from '../../components/Cuenta/BarraCuenta';
import TarjetaProducto from '../../components/Tienda/TarjetaProducto';
import { abrirProducto } from '../../navigation/navigationRef';
import { avisarActividad } from '../../utils/actividadUsuario';
import { useIdioma } from '../../context/IdiomaContext';
import { useDisposicion } from '../../hooks/useDisposicion';

const Favoritos = ({ alVolver }) => {
  const { t } = useIdioma();
  // Las mismas columnas que la portada: 2 en el teléfono, más en la tablet.
  const { columnas, anchoCelda } = useDisposicion();
  // Lo que hay que dejarle libre abajo a la píldora flotante.
  const aireAbajo = useAireBarraFlotante();
  const estilos = useEstilos(crearEstilos);
  const { productos, cargando, agregarAlCarrito } = useTienda();
  const { esFavorito } = useFavoritos();

  const marcados = useMemo(
    () => productos.filter((p) => esFavorito(p.id)),
    [productos, esFavorito]
  );

  return (
    <View style={estilos.pantalla}>
      <BarraCuenta titulo={t('Mis favoritos')} alVolver={alVolver} />

      {cargando ? (
        <View style={estilos.centro}>
          <CargandoMascota texto={t('Cargando tus favoritos…')} />
        </View>
      ) : marcados.length === 0 ? (
        <View style={estilos.centro}>
          <Mascota pose="sin-favoritos" alto={120} />
          <Text style={estilos.vacioTitulo}>{t('Todavía no tienes favoritos')}</Text>
          <Text style={estilos.vacioTexto}>
            {t('Toca el corazón de un producto en la tienda y lo vas a encontrar aquí.')}
          </Text>
        </View>
      ) : (
        <FlatList
          key={`favoritos-${columnas}`}
          data={marcados}
          keyExtractor={(p) => p.id}
          numColumns={columnas}
          columnWrapperStyle={estilos.fila}
          contentContainerStyle={[estilos.lista, { paddingBottom: aireAbajo }]}
          onScrollBeginDrag={avisarActividad}
          ListHeaderComponent={
            <Text style={estilos.conteo}>
              {marcados.length} {t(marcados.length === 1 ? 'producto guardado' : 'productos guardados')}
            </Text>
          }
          renderItem={({ item, index }) => (
            // El tope de ancho es lo que arregla la última fila impar: con `flex: 1` a secas, un producto solo
            // abajo se estira a lo ancho de la pantalla. Mismo criterio que la portada.
            <View style={[estilos.celda, { maxWidth: anchoCelda }]}>
              <TarjetaProducto
                producto={item}
                alVerDetalle={abrirProducto}
                alAgregar={agregarAlCarrito}
                indice={index}
              />
            </View>
          )}
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
    paddingVertical: 14,
  },
  conteo: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORES.subtitulo,
  },
  fila: {
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  // El tope de ancho lo pone useDisposicion (anchoCelda).
  celda: {
    flex: 1,
  },
});

export default Favoritos;
