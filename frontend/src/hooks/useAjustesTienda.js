import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { storeSettingsService } from '../api/storeSettingsService';
import { alCambiarTiqui, TIPOS_AJUSTES } from '../utils/cambiosDeTiqui';
import { resolverPortada } from '../utils/portada';
import { NOMBRE_TIENDA, DIRECCION_EN_UNA_LINEA } from '../utils/tienda';

// AJUSTES DE LA TIENDA — useAjustesTienda.js
// Cómo se llama la tienda, qué logo lleva y cómo está ordenada su portada. Lo usan las dos puntas:
// la tienda (solo para leer y pintarse) y la pantalla de Personalización del panel (para editar).

// Lo que se pinta mientras la petición va en camino, y lo que queda si nunca vuelve. Son los
// mismos valores que estaban escritos a mano antes de que esto existiera, así que en el peor caso
// la tienda se ve como siempre.
const DE_RESPALDO = {
  nombreLinea1: NOMBRE_TIENDA.arriba,
  nombreLinea2: NOMBRE_TIENDA.abajo,
  logoUrl: '',
  lema: 'La tienda del barrio, ahora también en línea. Pide lo de la casa y te lo llevamos.',
  direccion: DIRECCION_EN_UNA_LINEA,
  // Quién responde por la tienda y cómo se le contacta. Vacío = no se muestra.
  // Ver components/Admin/DatosNegocio.jsx y pages/legales.
  negocio: { titular: '', nit: '', nrc: '', correo: '', telefono: '', whatsapp: '', horario: '' },
  // Envío por distancia (ver utils/envio.js). Sin ubicación de la tienda se
  // cobra solo la tarifa base.
  ubicacionTienda: { lat: null, lng: null },
  ubicacionTiendaTexto: '',
  envioBase: 1,
  envioPorKm: 0.5,
  zonasEnvio: [],
  // Tarifa de servicio (cobro opcional de la casa). Apagada por defecto.
  servicioActivo: false,
  servicioTipo: 'fijo', // 'fijo' | 'porcentaje'
  servicioValor: 0,
  secciones: [],
  temporada: { modo: 'automatico', tema: '', saludos: {}, saludoNormal: '', personalizados: [] },
};

export const useAjustesTienda = () => {
  const [ajustes, setAjustes] = useState(DE_RESPALDO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const datos = await storeSettingsService.getAjustes();
      // Se mezcla con el respaldo en vez de reemplazarlo: si el backend algún
      // día devuelve un documento viejo al que le falta un campo nuevo, ese
      // campo cae en su valor por defecto y no en `undefined`.
      setAjustes({ ...DE_RESPALDO, ...(datos || {}) });
    } catch (error) {
      console.error('Error cargando los ajustes de la tienda:', error);
      // Se deja el respaldo puesto. El interceptor de axios ya avisó.
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  // Tiqui del panel cambió la temporada: Personalización se pone al día.
  useEffect(() => alCambiarTiqui(TIPOS_AJUSTES, cargar), [cargar]);

  // La portada resuelta: el catálogo de bloques cruzado con lo guardado, en orden y sin claves
  // muertas. Ver utils/portada.js.
  const portada = useMemo(() => resolverPortada(ajustes.secciones), [ajustes.secciones]);

  // Solo las encendidas, que es lo que la tienda necesita saber para pintarse.
  const portadaVisible = useMemo(() => portada.filter((b) => b.visible), [portada]);

  /* ── De aquí para abajo, solo lo usa el panel ───────────────── */

  const guardar = useCallback(async (cambios) => {
    // El nombre no puede quedar en blanco. La comprobación está también en el backend; aquí se repite
    // para que el aviso salga al instante y no después de un viaje al servidor.
    if (cambios.nombreLinea1 !== undefined && !String(cambios.nombreLinea1).trim()) {
      toast.error('La tienda necesita un nombre');
      return false;
    }

    // Y la portada no puede quedar vacía. Es la protección que hace que la libertad sea acotada de
    // verdad: se puede apagar casi todo, pero no dejar al cliente frente a una pantalla en blanco.
    if (Array.isArray(cambios.secciones) && !cambios.secciones.some((s) => s.visible !== false)) {
      toast.error('Deje al menos una sección encendida: la portada no puede quedar vacía');
      return false;
    }

    try {
      setGuardando(true);
      const res = await storeSettingsService.guardarAjustes(cambios);
      if (res?.ajustes) {
        setAjustes({ ...DE_RESPALDO, ...res.ajustes });
      }
      toast.success('Ajustes guardados');
      return true;
    } catch (error) {
      console.error('Error guardando los ajustes:', error);
      return false;
    } finally {
      setGuardando(false);
    }
  }, []);

  // Mover una fila una posición arriba o abajo. Con flechas y no arrastrando: arrastrar en teléfono
  // pelea con el scroll de la página, y esta pantalla se abre desde el mostrador tanto como desde
  // una computadora. Seis filas se acomodan en dos toques.
  const mover = useCallback((clave, direccion) => {
    const lista = resolverPortada(ajustes.secciones);
    const desde = lista.findIndex((b) => b.clave === clave);
    const hasta = desde + (direccion === 'arriba' ? -1 : 1);
    if (desde < 0 || hasta < 0 || hasta >= lista.length) return;

    const [movida] = lista.splice(desde, 1);
    lista.splice(hasta, 0, movida);

    // Se guarda al momento: un botón de "Guardar" aparte obliga a acordarse
    // de apretarlo después de acomodar todo, y se olvida.
    const secciones = lista.map((b, i) => ({ clave: b.clave, visible: b.visible, orden: i }));

    // Se pinta primero y se revierte si el guardado no pasa. Sin revertir, la pantalla quedaba
    // mostrando un orden que el servidor nunca aceptó, y el siguiente movimiento lo tomaba como punto
    // de partida: a partir de ahí se guardaba un orden que nadie pidió.
    const previas = ajustes.secciones;
    setAjustes((prev) => ({ ...prev, secciones }));
    guardar({ secciones }).then((bien) => {
      if (!bien) setAjustes((prev) => ({ ...prev, secciones: previas }));
    });
  }, [ajustes.secciones, guardar]);

  const alternarVisible = useCallback((clave) => {
    const lista = resolverPortada(ajustes.secciones).map((b) =>
      b.clave === clave ? { ...b, visible: !b.visible } : b
    );
    const secciones = lista.map((b, i) => ({ clave: b.clave, visible: b.visible, orden: i }));

    // Se pinta primero y se revierte si el guardado no pasa: apagar una fila
    // tiene que sentirse inmediato, no esperar al servidor.
    const previas = ajustes.secciones;
    setAjustes((prev) => ({ ...prev, secciones }));
    guardar({ secciones }).then((bien) => {
      if (!bien) setAjustes((prev) => ({ ...prev, secciones: previas }));
    });
  }, [ajustes.secciones, guardar]);

  const subirLogo = useCallback(async (archivo) => {
    if (!archivo) return false;
    try {
      setGuardando(true);
      const res = await storeSettingsService.subirLogo(archivo);
      if (res?.ajustes) setAjustes({ ...DE_RESPALDO, ...res.ajustes });
      toast.success('Logo actualizado');
      return true;
    } catch (error) {
      console.error('Error subiendo el logo:', error);
      return false;
    } finally {
      setGuardando(false);
    }
  }, []);

  const quitarLogo = useCallback(async () => {
    try {
      setGuardando(true);
      const res = await storeSettingsService.quitarLogo();
      if (res?.ajustes) setAjustes({ ...DE_RESPALDO, ...res.ajustes });
      toast.success('Se quitó el logo; vuelve a salir el nombre escrito');
      return true;
    } catch (error) {
      console.error('Error quitando el logo:', error);
      return false;
    } finally {
      setGuardando(false);
    }
  }, []);

  return {
    ajustes,
    portada,
    portadaVisible,
    cargando,
    guardando,
    guardar,
    mover,
    alternarVisible,
    subirLogo,
    quitarLogo,
    recargar: cargar,
  };
};
