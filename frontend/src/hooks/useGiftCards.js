import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { giftCardService } from '../api/giftCardService';
import { numeroEnRango } from '../utils/validaciones';

// useGiftCards — el manejo de tarjetas de saldo desde el admin. Crear, listar, anular y el resumen
// de cuánto dinero hay en circulación.
export const useGiftCards = () => {
  const [tarjetas, setTarjetas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [creando, setCreando] = useState(false);
  // Búsqueda y separación por estado: con cien tarjetas iguales en una lista
  // sola, encontrar una era leerlas todas.
  const [filtro, setFiltro] = useState('disponibles');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('nuevas');

  const cargar = async () => {
    setCargando(true);
    try {
      const d = await giftCardService.getGiftCards();
      setTarjetas(Array.isArray(d) ? d : []);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Resumen para que el gerente sepa de un vistazo cuánta plata comprometió. "Sin canjear" es deuda:
  // son dólares que la tienda ya prometió entregar.
  const resumen = useMemo(() => {
    const sinCanjear = tarjetas.filter((t) => !t.isRedeemed);
    const canjeadas = tarjetas.filter((t) => t.isRedeemed);
    const sumar = (lista) => lista.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return {
      total: tarjetas.length,
      sinCanjear: sinCanjear.length,
      canjeadas: canjeadas.length,
      montoPendiente: sumar(sinCanjear),
      montoCanjeado: sumar(canjeadas),
    };
  }, [tarjetas]);

  // Lo que se ve en la lista: primero el estado (canjeada o no), después la búsqueda por código,
  // cliente o nota, y al final el orden.
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const limpio = (v) => String(v || '').toLowerCase().replace(/[\s-]/g, '');

    let lista = tarjetas;
    if (filtro === 'disponibles') lista = lista.filter((t) => !t.isRedeemed);
    if (filtro === 'canjeadas') lista = lista.filter((t) => t.isRedeemed);

    if (texto) {
      const textoLimpio = limpio(texto);
      lista = lista.filter((t) =>
        limpio(t.code).includes(textoLimpio) ||
        (t.redeemedBy?.fullName || '').toLowerCase().includes(texto) ||
        (t.note || '').toLowerCase().includes(texto) ||
        String(t.amount || '').includes(texto)
      );
    }

    const porFecha = (t) => new Date(t.createdAt || 0).getTime();
    return [...lista].sort((a, b) => {
      if (orden === 'monto-mayor') return (b.amount || 0) - (a.amount || 0);
      if (orden === 'monto-menor') return (a.amount || 0) - (b.amount || 0);
      return porFecha(b) - porFecha(a);
    });
  }, [tarjetas, filtro, busqueda, orden]);

  const conteos = useMemo(() => ({
    todas: tarjetas.length,
    disponibles: tarjetas.filter((t) => !t.isRedeemed).length,
    canjeadas: tarjetas.filter((t) => t.isRedeemed).length,
  }), [tarjetas]);

  const crear = async ({ amount, cantidad, note, expiresAt }) => {
    const monto = numeroEnRango(amount, { min: 0.01, max: 1000 });
    if (monto === null) { toast.error('El monto debe estar entre $0.01 y $1000'); return null; }

    const cuantas = numeroEnRango(cantidad, { min: 1, max: 100, entero: true });
    if (cuantas === null) { toast.error('La cantidad debe ser un número entero de 1 a 100'); return null; }

    setCreando(true);
    try {
      const r = await giftCardService.createGiftCards({
        amount: monto, cantidad: cuantas, note, expiresAt: expiresAt || undefined,
      });
      toast.success(r.message);
      await cargar();
      return r.giftCards || [];
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudieron crear las tarjetas');
      return null;
    } finally {
      setCreando(false);
    }
  };

  const anular = async (id) => {
    try {
      await giftCardService.deleteGiftCard(id);
      toast.success('Tarjeta eliminada');
      await cargar();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  // Copiar el código al portapapeles: es lo que más se hace en esta pantalla.
  const copiar = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success(`Código ${codigo} copiado`);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return {
    tarjetas, resumen, cargando, creando, crear, anular, copiar, recargar: cargar,
    visibles, conteos, filtro, setFiltro, busqueda, setBusqueda, orden, setOrden,
  };
};
