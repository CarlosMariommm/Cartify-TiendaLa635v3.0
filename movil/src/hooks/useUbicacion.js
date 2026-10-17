// UBICACIÓN — useUbicacion.js
// Puerto de `frontend/src/hooks/useUbicacion.js`: coordenadas -> dirección escrita, con Nominatim
// (el buscador de OpenStreetMap).

import { useState } from 'react';
import * as Location from 'expo-location';
import { tAhora } from '../utils/idioma';

// San Salvador: dónde abre el mapa si todavía no hay un pin puesto.
export const CENTRO_POR_DEFECTO = { lat: 13.6929, lng: -89.2182 };

// Coordenadas → dirección escrita. Se arma con las partes que le sirven a un repartidor (calle,
// número, colonia, ciudad) y se descartan el país y el código postal, que en una entrega de barrio
// no aportan nada.
const direccionDesdeCoords = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`;
  const r = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'TiendaLa635-App/1.0' },
  });
  if (!r.ok) throw new Error(tAhora('No se pudo leer la dirección'));

  const d = await r.json();
  const a = d.address || {};
  const partes = [
    [a.road, a.house_number].filter(Boolean).join(' '),
    a.neighbourhood || a.suburb || a.residential,
    a.city || a.town || a.village || a.municipality,
  ].filter(Boolean);

  return partes.join(', ') || d.display_name || '';
};

export const useUbicacion = () => {
  const [posicion, setPosicion] = useState(null);
  const [direccion, setDireccion] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [avisoGeocod, setAvisoGeocod] = useState('');

  // Mueve el pin y trae la dirección de ese punto.
  const marcarEn = async ({ lat, lng }) => {
    setPosicion({ lat, lng });
    setBuscando(true);
    setAvisoGeocod('');
    try {
      const texto = await direccionDesdeCoords(lat, lng);
      if (texto) setDireccion(texto);
    } catch {
      // Sin internet o con Nominatim caído, el pin igual queda puesto y la persona puede escribir la
      // dirección a mano. Quedarse sin poder continuar por un servicio ajeno sería peor.
      setAvisoGeocod(tAhora('No se pudo leer la dirección; puedes escribirla tú'));
    } finally {
      setBuscando(false);
    }
  };

  // "Dirección actual". A diferencia del navegador (que ya pregunta el permiso solo), acá hay que
  // pedirlo a mano con expo-location antes de poder leer el GPS.
  const localizarme = async () => {
    setLocalizando(true);
    setAvisoGeocod('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAvisoGeocod(tAhora('No nos diste permiso de ubicarte. Puedes marcar el pin en el mapa.'));
        return;
      }
      const posicionGps = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await marcarEn({ lat: posicionGps.coords.latitude, lng: posicionGps.coords.longitude });
    } catch {
      setAvisoGeocod(tAhora('No pudimos ubicarte. Prueba marcando el pin en el mapa.'));
    } finally {
      setLocalizando(false);
    }
  };

  return {
    posicion,
    direccion,
    setDireccion,
    buscando,
    localizando,
    avisoGeocod,
    marcarEn,
    localizarme,
  };
};
