import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

// VOLAR AL CARRITO — volarAlCarrito.js
// Al tocar "+", la foto del producto vuela en arco hasta el carrito, se encoge al llegar y el
// carrito se sacude.

// 800ms, igual que la web. VueloAlCarrito.js es quien anima de verdad (ahí
// también viven las dos curvas bezier, junto al resto de lo que usa Animated).
export const DURACION_VUELO = 800;

let destinoRef = null;

export const registrarDestinoCarrito = (ref) => {
  destinoRef = ref;
};

const { width: ANCHO_PANTALLA, height: ALTO_PANTALLA } = Dimensions.get('window');

// Medidas de verdad y dentro de lo que se ve en pantalla: lo mismo que la web comprueba con
// `getBoundingClientRect` antes de volar (ver `destinoVisible` allá).
const esVisible = (r) =>
  !!r && r.width > 0 && r.height > 0 && r.y + r.height > 0 && r.y < ALTO_PANTALLA && r.x < ANCHO_PANTALLA;

const oyentesVuelos = new Set();
let vuelos = [];
let idVuelo = 0;

const avisarVuelos = () => oyentesVuelos.forEach((fn) => fn());

export const useVuelosAlCarrito = () => {
  const [, forzar] = useState(0);
  useEffect(() => {
    const oyente = () => forzar((n) => n + 1);
    oyentesVuelos.add(oyente);
    return () => oyentesVuelos.delete(oyente);
  }, []);
  return vuelos;
};

// Sube uno cada vez que un vuelo termina: BarraTienda lo mira para disparar
// su propio sacudón (el ícono tiembla, el contador "pop"). Así este archivo
// no necesita saber nada de Animated ni de cómo se ve el ícono del carrito.
let aterrizajes = 0;
const oyentesAterrizaje = new Set();

export const useAterrizajeCarrito = () => {
  const [valor, setValor] = useState(aterrizajes);
  useEffect(() => {
    const oyente = () => setValor(aterrizajes);
    oyentesAterrizaje.add(oyente);
    return () => oyentesAterrizaje.delete(oyente);
  }, []);
  return valor;
};

// Recibe: uri.
export const volarAlCarrito = ({ origenRef, uri }) => {
  if (!uri || !origenRef?.current || !destinoRef?.current) return;

  origenRef.current.measureInWindow((ox, oy, ow, oh) => {
    const origen = { x: ox, y: oy, width: ow, height: oh };
    if (!esVisible(origen)) return;

    destinoRef.current?.measureInWindow((dx, dy, dw, dh) => {
      const destino = { x: dx, y: dy, width: dw, height: dh };
      if (!esVisible(destino)) return;

      idVuelo += 1;
      vuelos = [...vuelos, { id: idVuelo, uri, origen, destino }];
      avisarVuelos();
    });
  });
};

// Lo llama VueloAlCarrito.js cuando la animación termina (o se cancela por desmontarse a medio
// vuelo): saca el vuelo de la lista y avisa el aterrizaje.
export const terminarVuelo = (id, { aterrizo = true } = {}) => {
  if (!vuelos.some((v) => v.id === id)) return;
  vuelos = vuelos.filter((v) => v.id !== id);
  avisarVuelos();
  if (aterrizo) {
    aterrizajes += 1;
    oyentesAterrizaje.forEach((fn) => fn());
  }
};
