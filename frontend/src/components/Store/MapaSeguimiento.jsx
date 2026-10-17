import Mapa from '../Mapa/Mapa';

// EL MAPA DEL REPARTIDOR — MapaSeguimiento.jsx
// Dónde va quien trae el pedido y a qué casa va, en vivo.

// El encuadre lo hace el mapa (`encuadrar`): se ven el repartidor y la casa a la vez. Centrado
// solo en el repartidor, la casa quedaba fuera y el mapa no respondía la única pregunta que
// importa: ¿qué tan cerca va de mí?

// Recibe: punto, destino, ruta, origen, alto, borde, interactivo.
const MapaSeguimiento = ({ punto, destino, ruta, origen, alto = 200, borde, interactivo = true }) => {
  // Sin ningún punto no hay mapa que valga la pena: ver el encabezado.
  if (!punto && !destino && !origen) return null;

  const centro = punto || destino || origen;

  // La casa es la gota de la marca; el repartidor, el punto azul que late; la tienda, una gota gris.
  const pines = [
    origen && { id: 'tienda', lat: origen.lat, lng: origen.lng, tipo: 'gota', tamano: 16, color: '#64748B' },
    destino && { id: 'casa', lat: destino.lat, lng: destino.lng, tipo: 'gota', tamano: 20 },
    punto && { id: 'repartidor', lat: punto.lat, lng: punto.lng, tipo: 'repartidor', tamano: 16 },
  ].filter(Boolean);

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${borde || 'var(--linea, #e5e5e5)'}`,
      }}
    >
      <div style={{ height: alto }}>
        <Mapa
          centro={centro}
          zoom={15}
          pines={pines}
          ruta={ruta}
          encuadrar={[punto, origen, destino, ...(ruta?.length > 1 ? ruta : [])]}
          interactivo={interactivo}
        />
      </div>
    </div>
  );
};

export default MapaSeguimiento;
