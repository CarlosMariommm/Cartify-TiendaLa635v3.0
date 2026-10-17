// ICONOS — dibujados a mano con Views
// Los pocos iconos que no salen de lucide-react-native; los de formularios, carrito, basurero y
// lupa ya son de lucide.

import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useColores } from '../../context/ModoContext';

// El color por defecto sale de la paleta del modo (claro u oscuro), no de una constante: un gris
// fijo pensado para fondo blanco se pierde en el oscuro. Quien pasa `color` explícito manda, como
// siempre.
const useTono = (color, token) => {
  const COLORES = useColores();
  return color || COLORES[token];
};

// Una raya. Es la pieza con la que se arma casi todo: el palito de un numeral, la diagonal del ojo
// tachado, cada lado de un check.
const Trazo = ({ largo, grosor = 1.6, color, estilo }) => (
  <View
    style={[
      {
        width: largo,
        height: grosor,
        borderRadius: grosor,
        backgroundColor: color,
      },
      estilo,
    ]}
  />
);

// Media luna: un círculo completo dentro de una caja que le corta la mitad de abajo. Sirve para el
// arco del candado y para los hombros de la persona.
const Arco = ({ ancho, alto, grosor = 1.6, color, estilo }) => (
  <View style={[{ width: ancho, height: alto, overflow: 'hidden' }, estilo]}>
    <View
      style={{
        width: ancho,
        height: ancho,
        borderRadius: ancho / 2,
        borderWidth: grosor,
        borderColor: color,
      }}
    />
  </View>
);

// ── La persona (barra de la tienda) y el pin ────────────────

export const Persona = ({ size = 18, color: colorPedido }) => {
  const color = useTono(colorPedido, 'iconoCampo');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size * 0.21,
          borderWidth: 1.6,
          borderColor: color,
          marginBottom: 1.5,
        }}
      />
      <Arco ancho={size * 0.8} alto={size * 0.34} color={color} />
    </View>
  );
};

export const Pin = ({ size = 18, color: colorPedido }) => {
  const color = useTono(colorPedido, 'iconoCampo');
  const bola = size * 0.68;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: bola,
          height: bola,
          borderRadius: bola / 2,
          borderWidth: 1.6,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, backgroundColor: color }} />
      </View>
      {/* La punta que clava el pin en el mapa. */}
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -1,
          borderLeftWidth: size * 0.17,
          borderRightWidth: size * 0.17,
          borderTopWidth: size * 0.26,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
    </View>
  );
};

// El ojo de "mostrar contraseña" NO se dibuja aquí: usa `Eye`/`EyeOff` de lucide-react-native
// directamente en CampoTexto —los mismos iconos que la web—. Ver components/UI/CampoTexto.js.

// ── Los de adorno (barra de arriba y lista de ventajas) ─────

export const Tienda = ({ size = 15, color: colorPedido }) => {
  const color = useTono(colorPedido, 'iconoCampo');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* El toldo. */}
      <View
        style={{
          width: size,
          height: size * 0.26,
          borderRadius: 2,
          backgroundColor: color,
          marginBottom: 1.5,
        }}
      />
      <View
        style={{
          width: size * 0.84,
          height: size * 0.54,
          borderWidth: 1.6,
          borderColor: color,
          borderRadius: 2,
        }}
      />
    </View>
  );
};

export const Flecha = ({ size = 16, color = '#FFFFFF' }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Trazo largo={size * 0.78} grosor={1.9} color={color} />
    <Trazo
      largo={size * 0.36}
      grosor={1.9}
      color={color}
      estilo={{ position: 'absolute', right: size * 0.06, top: size * 0.32, transform: [{ rotate: '45deg' }] }}
    />
    <Trazo
      largo={size * 0.36}
      grosor={1.9}
      color={color}
      estilo={{ position: 'absolute', right: size * 0.06, bottom: size * 0.32, transform: [{ rotate: '-45deg' }] }}
    />
  </View>
);

export const Bici = ({ size = 16, color: colorPedido }) => {
  const color = useTono(colorPedido, 'marca');
  const rueda = size * 0.44;
  return (
    <View style={{ width: size, height: size, justifyContent: 'flex-end' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: rueda, height: rueda, borderRadius: rueda / 2, borderWidth: 1.5, borderColor: color }} />
        <View style={{ width: rueda, height: rueda, borderRadius: rueda / 2, borderWidth: 1.5, borderColor: color }} />
      </View>
      {/* El cuadro: dos rayas cruzadas sobre las ruedas. */}
      <Trazo
        largo={size * 0.5}
        grosor={1.5}
        color={color}
        estilo={{ position: 'absolute', top: size * 0.34, left: size * 0.14, transform: [{ rotate: '-40deg' }] }}
      />
      <Trazo
        largo={size * 0.5}
        grosor={1.5}
        color={color}
        estilo={{ position: 'absolute', top: size * 0.34, right: size * 0.14, transform: [{ rotate: '40deg' }] }}
      />
      <Trazo largo={size * 0.5} grosor={1.5} color={color} estilo={{ position: 'absolute', top: size * 0.2, left: size * 0.25 }} />
    </View>
  );
};

// La estrella son cinco puntas iguales giradas de 72 en 72 grados. Cada punta se empuja hacia
// afuera con un `translateY` DESPUÉS del giro, que es lo que la manda a lo largo de su propio eje.
export const Estrella = ({ size = 16, color: colorPedido }) => {
  const color = useTono(colorPedido, 'marca');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 72, 144, 216, 288].map((grados) => (
        <View
          key={grados}
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.16,
            borderRightWidth: size * 0.16,
            borderBottomWidth: size * 0.46,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            transform: [{ rotate: `${grados}deg` }, { translateY: -size * 0.17 }],
          }}
        />
      ))}
    </View>
  );
};

// El corazón clásico: un cuadrado girado 45 grados y dos bolitas del mismo ancho apoyadas en sus
// dos lados de arriba. Las cuentas de abajo son las que dejan las bolitas justo sobre esos lados
// —a ojo quedan descentradas y el dibujo se ve como un borrón.
export const Corazon = ({ size = 16, color: colorPedido }) => {
  const color = useTono(colorPedido, 'marca');
  const lado = size * 0.55;
  const centroY = size * 0.58;
  // Media diagonal del cuadrado: cuánto hay que correr cada bolita.
  const corrimiento = lado * 0.354;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: lado,
          height: lado,
          backgroundColor: color,
          left: size / 2 - lado / 2,
          top: centroY - lado / 2,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: lado,
          height: lado,
          borderRadius: lado / 2,
          backgroundColor: color,
          left: size / 2 - corrimiento - lado / 2,
          top: centroY - corrimiento - lado / 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: lado,
          height: lado,
          borderRadius: lado / 2,
          backgroundColor: color,
          left: size / 2 + corrimiento - lado / 2,
          top: centroY - corrimiento - lado / 2,
        }}
      />
    </View>
  );
};

export const Check = ({ size = 12, color = '#FFFFFF' }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Trazo
      largo={size * 0.44}
      grosor={2}
      color={color}
      estilo={{ position: 'absolute', left: size * 0.02, top: size * 0.56, transform: [{ rotate: '45deg' }] }}
    />
    <Trazo
      largo={size * 0.76}
      grosor={2}
      color={color}
      estilo={{ position: 'absolute', right: size * 0.02, top: size * 0.44, transform: [{ rotate: '-50deg' }] }}
    />
  </View>
);

// ── Los de la tienda y el carrito ───────────────────────────

export const Mas = ({ size = 14, color = '#FFFFFF', grosor = 2 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Trazo largo={size * 0.82} grosor={grosor} color={color} estilo={{ position: 'absolute' }} />
    <View
      style={{
        position: 'absolute',
        width: grosor,
        height: size * 0.82,
        borderRadius: grosor,
        backgroundColor: color,
      }}
    />
  </View>
);

export const Menos = ({ size = 14, color = '#FFFFFF', grosor = 2 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Trazo largo={size * 0.82} grosor={grosor} color={color} />
  </View>
);

export const Equis = ({ size = 16, color: colorPedido, grosor = 1.8 }) => {
  const color = useTono(colorPedido, 'iconoCampo');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Trazo
        largo={size * 0.82}
        grosor={grosor}
        color={color}
        estilo={{ position: 'absolute', transform: [{ rotate: '45deg' }] }}
      />
      <Trazo
        largo={size * 0.82}
        grosor={grosor}
        color={color}
        estilo={{ position: 'absolute', transform: [{ rotate: '-45deg' }] }}
      />
    </View>
  );
};

// El marcador de "este producto no tiene foto". La caja con la raya del centro es lo que la hace
// leerse como un paquete y no como un cuadrado a secas.
export const Paquete = ({ size = 30, color: colorPedido, grosor = 1.5 }) => {
  const color = useTono(colorPedido, 'tintaTenue');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.84,
          height: size * 0.72,
          borderWidth: grosor,
          borderColor: color,
          borderRadius: 3,
          alignItems: 'center',
        }}
      >
        {/* La cinta: la raya de arriba y el tirito que baja. */}
        <View
          style={{
            position: 'absolute',
            top: size * 0.2,
            width: '100%',
            height: grosor,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            width: grosor,
            height: size * 0.2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
};

/* El reloj del vencimiento de una promoción: "Quedan 3 días". */
export const Reloj = ({ size = 12, color: colorPedido, grosor = 1.4 }) => {
  const color = useTono(colorPedido, 'iconoCampo');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: grosor,
          borderColor: color,
        }}
      />
      {/* Las agujas salen del centro: por eso se anclan al 50% y crecen hacia
          un lado con transformOrigin fingido — un margen negativo del largo. */}
      <View
        style={{
          position: 'absolute',
          width: grosor,
          height: size * 0.26,
          backgroundColor: color,
          borderRadius: grosor,
          top: size * 0.24,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.24,
          height: grosor,
          backgroundColor: color,
          borderRadius: grosor,
          left: size * 0.5,
          top: size * 0.5 - grosor / 2,
        }}
      />
    </View>
  );
};

// ── Las figuras que caen en temporada ── Van tenues y de fondo (ver DecoracionTemporada), así
// que importa la silueta: que se lea qué cosa es de un vistazo.

export const Copo = ({ size = 14, color = '#FFFFFF' }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {[0, 60, 120].map((grados) => (
      <Trazo
        key={grados}
        largo={size}
        grosor={1.4}
        color={color}
        estilo={{ position: 'absolute', transform: [{ rotate: `${grados}deg` }] }}
      />
    ))}
  </View>
);

// El murciélago: el cuerpo al centro y las alas como dos triángulos que salen hacia arriba y
// afuera. Con los triángulos apuntando hacia abajo parecía un moño, que era lo que salía al primer
// intento.
export const Murcielago = ({ size = 16, color = '#FFFFFF' }) => {
  const ala = size * 0.42;
  return (
    <View style={{ width: size, height: size * 0.6, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.22,
          height: size * 0.34,
          borderRadius: size * 0.11,
          backgroundColor: color,
        }}
      />
      {[-1, 1].map((lado) => (
        <View
          key={lado}
          style={{
            position: 'absolute',
            [lado === -1 ? 'left' : 'right']: 0,
            top: size * 0.06,
            width: 0,
            height: 0,
            borderTopWidth: ala * 0.62,
            borderBottomWidth: ala * 0.28,
            [lado === -1 ? 'borderRightWidth' : 'borderLeftWidth']: ala,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            [lado === -1 ? 'borderRightColor' : 'borderLeftColor']: color,
          }}
        />
      ))}
    </View>
  );
};

/* Un papelito de confeti: un rectángulo torcido. No necesita ser más. */
export const Confeti = ({ size = 10, color = '#FFFFFF' }) => (
  <View
    style={{
      width: size * 0.5,
      height: size,
      borderRadius: 1.5,
      backgroundColor: color,
      transform: [{ rotate: '24deg' }],
    }}
  />
);

// El logo de Google del botón "Continuar con Google". Este SÍ es un SVG y no un dibujo a mano como
// el resto del archivo: son cuatro curvas de color, no hay forma de armarlas con rectángulos y
// círculos, y `react-native-svg` ya es dependencia del proyecto (lo trae lucide-react-native).
export const LogoGoogle = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      fill="#4285F4"
      d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
    />
    <Path
      fill="#34A853"
      d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
    />
    <Path
      fill="#FBBC05"
      d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
    />
    <Path
      fill="#EA4335"
      d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
    />
  </Svg>
);

/* La flecha de "atrás" de la barra del carrito. */
// Compartir: tres puntos unidos, el mismo dibujo que usa la web (Share2 de lucide). Con
// react-native-svg porque son círculos huecos y diagonales que con rectángulos quedaban chuecos.
export const Compartir = ({ size = 18, color: colorPedido, grosor = 2 }) => {
  const color = useTono(colorPedido, 'texto');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round">
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </Svg>
  );
};

export const ChevronIzquierda = ({ size = 18, color: colorPedido, grosor = 1.9 }) => {
  const color = useTono(colorPedido, 'texto');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Trazo
        largo={size * 0.46}
        grosor={grosor}
        color={color}
        estilo={{ position: 'absolute', top: size * 0.32, transform: [{ rotate: '-45deg' }] }}
      />
      <Trazo
        largo={size * 0.46}
        grosor={grosor}
        color={color}
        estilo={{ position: 'absolute', bottom: size * 0.32, transform: [{ rotate: '45deg' }] }}
      />
    </View>
  );
};
