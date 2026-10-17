import { useState } from 'react';
import toast from 'react-hot-toast';
import { tAhora } from '../utils/idioma';

// UBICACIÓN — useUbicacion.js
// El GPS del navegador y la traducción de coordenadas a una dirección en palabras, con
// OpenStreetMap. Nominatim (el buscador de OSM) es gratis y sin llave.

// San Salvador: dónde abre el mapa si todavía no sabemos dónde está la persona.
export const CENTRO_POR_DEFECTO = { lat: 13.6929, lng: -89.2182 };

// Coordenadas → dirección escrita. Se arma con las partes que le sirven a un repartidor (calle,
// número, colonia, ciudad) y se descartan el país y el código postal, que en una entrega de barrio
// no aportan nada.
const direccionDesdeCoords = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('No se pudo leer la dirección');

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

  // Mueve el pin y trae la dirección de ese punto.
  const marcarEn = async ({ lat, lng }) => {
    setPosicion({ lat, lng });
    setBuscando(true);
    try {
      const texto = await direccionDesdeCoords(lat, lng);
      if (texto) setDireccion(texto);
    } catch {
      // Sin internet o con Nominatim caído, el pin igual queda puesto y la persona puede escribir la
      // dirección a mano. Quedarse sin poder continuar por un servicio ajeno sería peor.
      toast(tAhora('No se pudo leer la dirección; puedes escribirla tú'));
    } finally {
      setBuscando(false);
    }
  };

  // "Usar mi ubicación". El navegador pide permiso; si lo niegan, se explica qué hacer en vez de
  // dejar el botón sin respuesta.
  const localizarme = () => {
    if (!navigator.geolocation) {
      toast.error(tAhora('Tu navegador no permite ubicarte automáticamente'));
      return;
    }

    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocalizando(false);
        marcarEn({ lat: coords.latitude, lng: coords.longitude });
      },
      (error) => {
        setLocalizando(false);
        const mensajes = {
          1: tAhora('No nos diste permiso de ubicarte. Puedes mover el pin en el mapa.'),
          2: tAhora('No pudimos ubicarte. Prueba moviendo el pin en el mapa.'),
          3: tAhora('La ubicación tardó demasiado. Prueba moviendo el pin en el mapa.'),
        };
        toast(mensajes[error.code] || tAhora('No pudimos ubicarte'), { duration: 5000 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return { posicion, direccion, setDireccion, buscando, localizando, marcarEn, localizarme };
};
