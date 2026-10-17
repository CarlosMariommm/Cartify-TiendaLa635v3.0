// LA MARCA DE LA TIENDA — MarcaTienda.js
// El nombre (o el logo) de la tienda, igual en toda la app.

import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAjustesTienda } from '../../hooks/useAjustesTienda';
import { useColores } from '../../context/ModoContext';
import { FUENTE_MARCA } from '../../theme/tipografia';

const MarcaTienda = ({ tamano = 20, alto, color: colorPedido, centrado = false }) => {
  // Casi negro en claro, casi blanco en oscuro — el color del texto principal.
  const COLORES = useColores();
  const color = colorPedido || COLORES.tinta;
  const { ajustes } = useAjustesTienda();
  const [logoFallo, setLogoFallo] = useState(false);
  const altoLogo = alto || tamano * 2;

  // Si la imagen no carga —Cloudinary caído, el archivo borrado— se cae al
  // nombre escrito, igual que en la web.
  if (ajustes.logoUrl && !logoFallo) {
    return (
      <Image
        source={{ uri: ajustes.logoUrl }}
        style={{ height: altoLogo, width: altoLogo * 3.2 }}
        resizeMode="contain"
        onError={() => setLogoFallo(true)}
      />
    );
  }

  return (
    <View style={centrado && estilos.centrado}>
      <Text style={[estilos.linea, { fontSize: tamano, lineHeight: tamano * 1.12, color }, centrado && estilos.textoCentrado]}>
        {ajustes.nombreLinea1}
      </Text>
      {!!ajustes.nombreLinea2 && (
        <Text style={[estilos.linea, { fontSize: tamano, lineHeight: tamano * 1.12, color }, centrado && estilos.textoCentrado]}>
          {ajustes.nombreLinea2}
        </Text>
      )}
    </View>
  );
};

const estilos = StyleSheet.create({
  // La misma letra y el mismo apretado que la web (MarcaTienda.jsx). Ver theme/tipografia.js.
  linea: {
    fontFamily: FUENTE_MARCA,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  centrado: {
    alignItems: 'center',
  },
  textoCentrado: {
    textAlign: 'center',
  },
});

export default MarcaTienda;
