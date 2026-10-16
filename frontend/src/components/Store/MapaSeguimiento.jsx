import Mapa from '../Mapa/Mapa';

/*
 * ============================================================
 * EL MAPA DEL REPARTIDOR — MapaSeguimiento.jsx
 * ============================================================
 * Dónde va quien trae el pedido y a qué casa va, en vivo.
 *
 * POR QUÉ VIVE APARTE
 * Este mapa estaba copiado tal cual en tres pantallas —la burbuja, el estado
 * del pedido y la confirmación del pago— con sus dos pines y su encuadre
 * repetidos en cada una. Es el mismo copiar y pegar que ya nos costó un bug
 * con la lista de pasos: una de las copias se quedó vieja y un pedido en
 * camino se mostraba como recibido. Antes de hacer una cuarta copia para
 * "Mis pedidos", el mapa baja aquí.
 *
 * Se calla solo si no hay nada que dibujar. Un mapa vacío de una ciudad al
 * azar no informa: confunde.
 * ============================================================
 */

/*
 * El encuadre lo hace el mapa (`encuadrar`): se ven el repartidor y la casa a
 * la vez. Centrado solo en el repartidor, la casa quedaba fuera y el mapa no
 * respondía la única pregunta que importa: ¿qué tan cerca va de mí? Conforme
 * se acerca, el encuadre se va cerrando solo, y ese apretarse cuenta el avance
 * sin necesidad de una barra de progreso. Con un solo punto (pedidos viejos
 * sin destino, o nadie ha salido todavía) se centra en ese.
 */

/*
 * @param punto   - dónde va el repartidor ahora ({lat,lng}), o null.
 * @param destino - la casa del cliente ({lat,lng}), o null.
 * @param ruta    - la línea por las calles que le falta ([{lat,lng}…]), o null.
 *                  Con ella, el encuadre abarca la ruta entera: puede dar la
 *                  vuelta por fuera del rectángulo entre los dos puntos.
 * @param origen  - la tienda ({lat,lng}), o null. Solo cuando el GPS del
 *                  repartidor no llega y la ruta es la aproximada desde ahí:
 *                  una gota gris, para que se lea de dónde sale la línea.
 * @param alto    - alto del mapa en px.
 * @param borde   - color del borde; 'transparent' cuando ya lo pone el padre.
 * @param interactivo - si se puede arrastrar y hacer zoom.
 *
 * `interactivo` en falso es para el mapa de la burbuja: ahí el mapa es una
 * miniatura de 132px que se mira de reojo, y dejarla arrastrable hacía que al
 * intentar desplazar la página con el dedo se moviera el mapa en su lugar y la
 * página se quedara quieta. En un mapa de ese tamaño no hay nada que explorar.
 */
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
