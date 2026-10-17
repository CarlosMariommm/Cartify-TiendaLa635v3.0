import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, UserSquare2, Phone, Mail, Star, ChevronDown,
  BadgeCheck, ShieldAlert, MapPin, IdCard, UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import FilterSelect from '../components/UI/FilterSelect';
import OrdenSelect from '../components/UI/OrdenSelect';
import ModalEliminarCliente from '../components/Admin/ModalEliminarCliente';
import { useClientes, ESTADOS } from '../hooks/useClientes';
import { DUR, EASE_OUT, stagger } from '../utils/motion';

// CLIENTES (Admin) — Customers.jsx
// Tarjetas propias en vez de la DataTable: manda el nombre con sus iniciales, a la vista solo el
// contacto, y el DUI, la dirección y la fecha detrás de "Ver más". La lógica vive en useClientes.

/* Una cifra del resumen. Misma familia visual que las tarjetas del Dashboard. */
const Cifra = ({ icono: Icono, valor, etiqueta, ayuda }) => (
  <div
    className="flex-1 min-w-[150px] rounded-2xl border p-4"
    style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icono className="w-4 h-4" style={{ color: 'var(--theme-accent-text)' }} />
      <span className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: 'var(--theme-text-muted)' }}>
        {etiqueta}
      </span>
    </div>
    <div className="text-2xl font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>
      {valor}
    </div>
    {ayuda && (
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
        {ayuda}
      </div>
    )}
  </div>
);

/* Un dato de contacto: icono, y el valor recortado si no cabe. */
const Contacto = ({ icono: Icono, children, vacio }) => (
  <div className="flex items-center gap-2 min-w-0">
    <Icono className="w-3.5 h-3.5 flex-none" style={{ color: 'var(--theme-text-muted)' }} />
    <span
      className="text-sm truncate"
      style={{ color: vacio ? 'var(--theme-text-muted)' : 'var(--theme-text-secondary)' }}
    >
      {children}
    </span>
  </div>
);

const TarjetaCliente = ({ cliente, indice, onEliminar }) => {
  const [abierta, setAbierta] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.modal, ease: EASE_OUT, delay: stagger(indice) }}
      className="rounded-2xl border shadow-sm p-4 flex flex-col gap-3 transition-colors"
      style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}
    >
      {/* ── Identidad ── */}
      <div className="flex items-start gap-3">
        {/* Las iniciales en vez de una foto: los clientes no suben foto, y un avatar gris genérico repetido
           veinte veces no ayuda a distinguir a nadie. Dos letras sí. */}
        <div
          className="w-11 h-11 flex-none rounded-full grid place-items-center text-sm font-extrabold"
          style={{
            backgroundColor: 'var(--theme-primary-light)',
            color: 'var(--theme-primary)',
          }}
        >
          {cliente.iniciales}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-base font-bold leading-tight break-words"
               style={{ color: 'var(--theme-text-primary)' }}>
            {cliente.fullName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {cliente.userName && (
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                @{cliente.userName}
              </span>
            )}
            {/* "Verificado" como marca junto al nombre y no como campo aparte: es una propiedad de la cuenta,
               no un dato que se consulta. Y sin verificar importa más que verificado —es lo que hay que
               atender—, así que ese lleva color y el otro no. */}
            {cliente.verificado ? (
              <span className="inline-flex items-center gap-1 text-xs"
                    style={{ color: 'var(--theme-text-muted)' }}>
                <BadgeCheck className="w-3.5 h-3.5" /> Verificado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500">
                <ShieldAlert className="w-3.5 h-3.5" /> Sin verificar
              </span>
            )}
          </div>
        </div>

        {/* Estado: un punto y la palabra. El punto se ve de reojo, la palabra
            lo confirma — el color solo no sirve para quien no lo distingue. */}
        <span className="flex items-center gap-1.5 flex-none text-xs font-semibold"
              style={{ color: cliente.activo ? '#16a34a' : '#dc2626' }}>
          <span className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cliente.activo ? '#16a34a' : '#dc2626' }} />
          {cliente.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* ── Contacto ── */}
      <div className="flex flex-col gap-1.5">
        <Contacto icono={Phone} vacio={!cliente.telefono}>
          {cliente.telefono || 'Sin teléfono'}
        </Contacto>
        <Contacto icono={Mail} vacio={!cliente.email}>
          {cliente.email || 'Sin correo'}
        </Contacto>
      </div>

      {/* ── Puntos y el resto ── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--theme-primary-light)',
            color: cliente.puntos > 0 ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
          }}
        >
          <Star className="w-3.5 h-3.5" />
          {cliente.puntos} {cliente.puntos === 1 ? 'punto' : 'puntos'}
        </span>

        <button
          type="button"
          onClick={() => setAbierta((a) => !a)}
          aria-expanded={abierta}
          className="inline-flex items-center gap-1 text-xs font-semibold"
          style={{ color: 'var(--theme-primary)' }}
        >
          {abierta ? 'Ver menos' : 'Ver más'}
          <ChevronDown
            className="w-3.5 h-3.5"
            style={{
              transform: abierta ? 'rotate(180deg)' : 'none',
              transition: 'transform var(--dur-press) var(--ease-out)',
            }}
          />
        </button>
      </div>

      {/* Lo que se consulta de vez en cuando. Se monta y desmonta en vez de esconderse con CSS: son dos o
         tres renglones, no vale la pena tenerlos en el documento de los veinte clientes a la vez. */}
      {abierta && (
        <div
          className="flex flex-col gap-2 pt-3 border-t"
          style={{ borderColor: 'var(--theme-card-border)' }}
        >
          <Contacto icono={IdCard} vacio={!cliente.duiFormateado}>
            {cliente.duiFormateado || 'Sin DUI registrado'}
          </Contacto>
          {/* La dirección es la única que puede ser larga de verdad (llega a traer dos direcciones juntas),
             así que se le deja envolver en vez de recortarla: recortada no sirve para llevarle nada a nadie. */}
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 flex-none mt-0.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span
              className="text-sm break-words"
              style={{ color: cliente.tieneDireccion ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}
            >
              {cliente.tieneDireccion ? cliente.direccion : 'Sin dirección guardada'}
            </span>
          </div>

          {/* Eliminar va aquí, detrás de "Ver más", y no junto al contacto: no se deshace, y no tiene que
             quedar a un toque de distancia de lo que se usa todos los días. Pide confirmación
             (ModalEliminarCliente). */}
          <button
            type="button"
            onClick={() => onEliminar(cliente)}
            className="self-start inline-flex items-center gap-1.5 mt-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-2 py-1 -ml-2 rounded-full transition-colors"
          >
            <UserX className="w-3.5 h-3.5" /> Eliminar cliente
          </button>
        </div>
      )}
    </motion.div>
  );
};

const Customers = () => {
  const {
    clientes, resumen, cargando,
    busqueda, setBusqueda, estado, setEstado, orden, setOrden, hayClientes, eliminar,
  } = useClientes();

  // El cliente que se está por eliminar; null = el modal está cerrado.
  const [aEliminar, setAEliminar] = useState(null);
  const confirmarEliminar = async (cliente) => {
    try {
      await eliminar(cliente._id || cliente.id);
      toast.success(`${cliente.fullName || 'El cliente'} quedó eliminado`);
      setAEliminar(null);
    } catch {
      // Un pedido en curso, por ejemplo: el aviso ya lo pintó api.js y el
      // modal se queda abierto.
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      <div className="flex items-center gap-3">
        <UserSquare2 className="w-8 h-8" style={{ color: 'var(--theme-accent-text)' }} />
        <h1 className="text-4xl font-extrabold" style={{ color: 'var(--theme-accent-text)' }}>
          Clientes
        </h1>
      </div>

      {/* ── Resumen ── */}
      <div className="flex flex-wrap gap-3">
        <Cifra icono={UserSquare2} etiqueta="Clientes" valor={resumen.total} />
        <Cifra
          icono={BadgeCheck} etiqueta="Activos" valor={resumen.activos}
          ayuda={resumen.total ? `${Math.round((resumen.activos / resumen.total) * 100)}% del total` : null}
        />
        <Cifra
          icono={ShieldAlert} etiqueta="Sin verificar"
          valor={resumen.total - resumen.verificados}
          ayuda="No han confirmado su correo"
        />
        <Cifra
          icono={Star} etiqueta="Puntos repartidos"
          valor={resumen.puntos.toLocaleString('es-SV')}
          ayuda="Suma de todos los saldos"
        />
      </div>

      {/* ── Buscador y filtro ── */}
      <div
        className="p-6 rounded-2xl shadow-sm border"
        style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-card-border)' }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              Listado de Clientes
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
              {clientes.length === resumen.total
                ? `${resumen.total} en total`
                : `${clientes.length} de ${resumen.total}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--theme-text-muted)' }} />
              <input
                type="text"
                /* Se busca también por número y DUI: en el mostrador la gente
                   recuerda su teléfono mejor que cómo escribió su nombre. */
                placeholder="Buscar por nombre, correo o teléfono…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-full text-sm outline-none transition-colors w-72 shadow-sm"
                style={{
                  backgroundColor: 'var(--theme-card-bg)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </div>
            <FilterSelect
              value={estado}
              onChange={setEstado}
              options={ESTADOS.filter((e) => e.valor !== 'Todos')
                .map((e) => ({ value: e.valor, label: e.etiqueta }))}
            />
            <OrdenSelect value={orden} onChange={setOrden} extras={[{ value: 'puntos', label: 'Ordenar: Más puntos' }]} />
          </div>
        </div>

        {cargando ? (
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            Cargando clientes…
          </p>
        ) : clientes.length === 0 ? (
          // Dos vacíos distintos. "No hay clientes todavía" es un estado del negocio; "no encontré nada" es
          // un resultado de la búsqueda, y confundirlos hace pensar que se borró la base.
          <div className="text-center py-12">
            <Search className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              {hayClientes
                ? 'Ningún cliente coincide con esa búsqueda.'
                : 'Todavía no hay clientes registrados.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clientes.map((cliente, i) => (
              <TarjetaCliente key={cliente._id || cliente.id || i} cliente={cliente} indice={i} onEliminar={setAEliminar} />
            ))}
          </div>
        )}
      </div>

      <ModalEliminarCliente
        key={aEliminar?._id || aEliminar?.id || 'ninguno'}
        cliente={aEliminar}
        onClose={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
      />
    </div>
  );
};

export default Customers;
