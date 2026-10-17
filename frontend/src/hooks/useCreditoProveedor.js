import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { creditoService } from '../api/creditoService';
import { numeroEnRango } from '../utils/validaciones';

// useCreditoProveedor — estado de cuenta de UN proveedor. Trae la deuda, las facturas pendientes y
// permite registrar compras y pagos.
export const useCreditoProveedor = (supplierId) => {
  const [cuenta, setCuenta] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!supplierId) { setCuenta(null); return; }
    setCargando(true);
    try {
      setCuenta(await creditoService.getCuenta(supplierId));
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [supplierId]);

  useEffect(() => { cargar(); }, [cargar]);

  const registrar = async ({ type, amount, date, dueDate, reference, note }) => {
    const monto = numeroEnRango(amount, { min: 0.01, max: 1000000 });
    if (monto === null) { toast.error('El monto debe ser mayor que 0'); return false; }

    // Avisamos si el pago supera lo que se debe, pero no lo bloqueamos: pagar por adelantado es normal
    // con un proveedor de confianza, y el servidor lo guarda como saldo a favor.
    if (type === 'pago' && cuenta && monto > cuenta.deuda + 0.005) {
      toast(`Está pagando $${monto.toFixed(2)} y la deuda es de $${cuenta.deuda.toFixed(2)}. La diferencia queda a favor.`,
        { duration: 5000 });
    }

    setGuardando(true);
    try {
      const r = await creditoService.registrarMovimiento({
        supplierId, type, amount: monto, date, dueDate, reference, note,
      });
      toast.success(r.message);
      await cargar();
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo registrar');
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const borrarMovimiento = async (id) => {
    try {
      await creditoService.borrarMovimiento(id);
      toast.success('Movimiento eliminado');
      await cargar();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const guardarLimite = async ({ creditLimit, creditDays }) => {
    const limite = numeroEnRango(creditLimit === '' ? 0 : creditLimit, { min: 0, max: 1000000 });
    if (limite === null) { toast.error('El límite debe ser 0 o mayor'); return false; }

    const dias = numeroEnRango(creditDays === '' ? 0 : creditDays, { min: 0, max: 365, entero: true });
    if (dias === null) { toast.error('El plazo debe ser un número entero de días (0 a 365)'); return false; }

    try {
      await creditoService.actualizarLimite(supplierId, { creditLimit: limite, creditDays: String(dias) });
      toast.success('Crédito actualizado');
      await cargar();
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo actualizar');
      return false;
    }
  };

  return { cuenta, cargando, guardando, registrar, borrarMovimiento, guardarLimite, recargar: cargar };
};

/* Resumen de todos: para el listado y el aviso del dashboard. */
export const useResumenCredito = () => {
  const [resumen, setResumen] = useState({ proveedores: [], totales: { deuda: 0, vencido: 0, porVencer: 0 } });
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setResumen(await creditoService.getResumen());
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { ...resumen, cargando, recargar: cargar };
};
