import { randomInt } from "crypto";

// EL CÓDIGO DE ENTREGA — codigoEntrega.js
// Cuatro dígitos que prueban que quien recibe el pedido es quien lo hizo. EL PROBLEMA QUE RESUELVE
// Hasta ahora, entregar era cuestión de fe.

// Se emite para TODOS los pedidos, no solo los de domicilio. Retirar en el local tiene exactamente
// el mismo problema: el mostrador también entrega a quien se presente. Y unificarlo evita la
// pregunta de "¿este pedido llevaba código?" en la única pantalla donde importa.
export const generarCodigoEntrega = () =>
  String(randomInt(0, 10000)).padStart(4, "0");

// La comparación, en un solo lugar. Se normaliza lo que llega —espacios de más, el cliente que lo
// dicta como "un dos tres cuatro" y alguien lo escribe con espacios— porque rechazar un código
// correcto por un espacio es peor que no tener código: enseña al personal a saltárselo.
export const codigoCoincide = (guardado, recibido) => {
  const limpio = String(recibido ?? "").replace(/\D/g, "");
  const esperado = String(guardado ?? "").replace(/\D/g, "");
  return esperado.length > 0 && limpio === esperado;
};
