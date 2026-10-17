import { useState, useEffect, useCallback, useMemo } from 'react';
import { ordenarLista, ORDEN_INICIAL } from '../utils/listasPanel';
import { customerService } from '../api/customerService';
import { direccionesEnTexto, formatearDui, formatearTelefono } from '../utils/mascaras';

// CLIENTES DEL PANEL — useClientes.js
// Cargar la lista, buscarla, filtrarla y sacar el resumen de arriba. Todo esto vivía suelto dentro
// de la pantalla.

export const ESTADOS = [
  { valor: 'Todos', etiqueta: 'Todos' },
  { valor: 'Activo', etiqueta: 'Activos' },
  { valor: 'Inactivo', etiqueta: 'Inactivos' },
  { valor: 'SinVerificar', etiqueta: 'Sin verificar' },
];

// Las iniciales del nombre para el redondel de identidad. Dos como mucho:
// "Paul Melquisedect Cañas Palacios" con cuatro letras no se lee, es un borrón.
const inicialesDe = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase() || '?';

// Normaliza un cliente para la pantalla: aplica las máscaras una sola vez y resuelve las llaves
// que vienen de varias formas. Lo que sale de aquí ya está listo para pintar, sin `??` regados por
// el JSX.
const prepararCliente = (c) => {
  const direccion = direccionesEnTexto(c.clientAddress);
  return {
    ...c,
    iniciales: inicialesDe(c.fullName),
    telefono: formatearTelefono(c.phoneNumber),
    duiFormateado: formatearDui(c.dui),
    direccion,
    // Un cliente sin dirección no es un error: puede comprar y pasar a
    // recoger. Se dice así en vez de dejar el hueco en blanco.
    tieneDireccion: !!direccion,
    puntos: Number(c.loyaltyPoints ?? c.lolayitypoints ?? 0),
    activo: c.isActive !== false,
    verificado: !!c.isVerified,
  };
};

export const useClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('Todos');
  // Lo más reciente primero: quien se acaba de registrar. Ver utils/listasPanel.js.
  const [orden, setOrden] = useState(ORDEN_INICIAL);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const datos = await customerService.getCustomers();
      setClientes((Array.isArray(datos) ? datos : []).map(prepararCliente));
    } catch (error) {
      // El interceptor de axios ya avisó; aquí solo evitamos quedar con basura.
      console.error('Error cargando clientes:', error);
      setClientes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Eliminar un cliente. Si el servidor dice que no (un pedido en curso), el error sube a quien
  // llamó para que el modal se quede abierto; el aviso ya lo pinta el interceptor de api.js.
  const eliminar = useCallback(async (id) => {
    const r = await customerService.deleteCustomer(id);
    setClientes((lista) => lista.filter((c) => (c._id || c.id) !== id));
    return r;
  }, []);

  // El resumen de arriba. Se calcula sobre TODOS los clientes, no sobre los filtrados: es el estado
  // del negocio, y cambiaría de significado si se moviera cada vez que alguien escribe en el
  // buscador.
  const resumen = useMemo(() => ({
    total: clientes.length,
    activos: clientes.filter((c) => c.activo).length,
    verificados: clientes.filter((c) => c.verificado).length,
    puntos: clientes.reduce((suma, c) => suma + c.puntos, 0),
  }), [clientes]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return clientes.filter((c) => {
      // Se busca también por teléfono y DUI, no solo por nombre. Es como se busca de verdad en el
      // mostrador: la persona no siempre recuerda cómo escribió su nombre al registrarse, pero su número
      // sí lo sabe.
      const soloDigitos = texto.replace(/\D/g, '');
      const coincide =
        !texto ||
        c.fullName?.toLowerCase().includes(texto) ||
        c.email?.toLowerCase().includes(texto) ||
        c.userName?.toLowerCase().includes(texto) ||
        (soloDigitos && String(c.phoneNumber || '').replace(/\D/g, '').includes(soloDigitos)) ||
        (soloDigitos && String(c.dui || '').replace(/\D/g, '').includes(soloDigitos));

      if (!coincide) return false;
      if (estado === 'Activo') return c.activo;
      if (estado === 'Inactivo') return !c.activo;
      if (estado === 'SinVerificar') return !c.verificado;
      return true;
    });
  }, [clientes, busqueda, estado]);

  const ordenados = useMemo(() => ordenarLista(filtrados, orden, {
    nombre: (c) => c.fullName,
    extras: { puntos: (a, b) => (b.puntos || 0) - (a.puntos || 0) },
  }), [filtrados, orden]);

  return {
    clientes: ordenados,
    resumen,
    cargando,
    busqueda, setBusqueda,
    estado, setEstado,
    orden, setOrden,
    recargar: cargar,
    eliminar,
    // Para distinguir "no hay clientes" de "la búsqueda no encontró nada":
    // son dos pantallas vacías que dicen cosas muy distintas.
    hayClientes: clientes.length > 0,
  };
};
