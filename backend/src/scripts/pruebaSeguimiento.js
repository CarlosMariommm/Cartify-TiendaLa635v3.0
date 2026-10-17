// Prueba del seguimiento en vivo, sin tener que salir a la calle. Crea un pedido a domicilio CON
// punto en el mapa (los que hay en la base traen solo la dirección escrita, y sin coordenadas no
// hay nada que seguir) y después simula al repartidor saliendo de la tienda hacia esa casa.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import orderModel from "../models/order.js";
import clientModel from "../models/client.js";

// Marca para reconocer lo que crea este script y poder borrarlo después.
const MARCA = "PRUEBA-SEGUIMIENTO";

// La tienda: Colonia Providencia, Calle Sevilla 635. De aquí sale el reparto.
const TIENDA = { lat: 13.68514, lng: -89.19836 };
// La casa del pedido, como a kilómetro y medio.
const CASA = { lat: 13.69350, lng: -89.20950 };

// Con qué nombre queda firmado el viaje, igual que lo firmaría un repartidor.
const QUIEN = "Repartidor de prueba";

const PASOS = 18;          // cuántas posiciones manda en el trayecto
const ESPERA_MS = 10000;   // cada cuánto, igual que el teléfono de verdad


const crear = async (correo) => {
  const cliente = correo
    ? await clientModel.findOne({ email: correo })
    : await clientModel.findOne({ isActive: true });

  if (!cliente) {
    console.log(correo
      ? `No hay ningún cliente con el correo ${correo}.`
      : "No hay clientes en la base; cree uno primero.");
    return;
  }

  // Un solo pedido de prueba a la vez: si ya había uno, se reemplaza en vez
  // de ir dejando pedidos fantasma acumulados en la base. El historial de
  // entregas (marcado igual) se respeta: solo se borra lo que está en curso.
  await orderModel.deleteMany({ deliveryReference: MARCA, status: { $ne: "entregado" } });

  // Se entrega a la dirección REAL del cliente cuando la tiene. Así el pedido cae en la misma zona
  // que su historial y el tiempo estimado sale; con la casa inventada quedaba a un kilómetro y medio
  // y no coincidía.
  const suya = (cliente.clientAddress || [])
    .map((d) => (typeof d === "string" ? null : d))
    .find((d) => d?.lat != null && d?.lng != null);

  const destino = suya ? { lat: suya.lat, lng: suya.lng } : CASA;

  const pedido = await orderModel.create({
    clientId: cliente._id,
    items: [{ name: "Pedido de prueba", price: 3.5, amount: 2 }],
    subtotal: 7,
    total: 7,
    status: "preparando",
    paymentMethod: "efectivo",
    deliveryType: "delivery",
    deliveryAddress: suya?.direccion || "Colonia Escalón, Calle de prueba #100",
    deliveryReference: MARCA,
    deliveryLat: destino.lat,
    deliveryLng: destino.lng,
    preparedAt: new Date(),
    preparedBy: "Prueba",
    pointsEarned: 0,
  });

  console.log("Pedido de prueba creado.");
  console.log("  id:      ", String(pedido._id));
  console.log("  cliente: ", cliente.fullName, "-", cliente.email);
  console.log("  destino: ", destino.lat, destino.lng, suya ? `(${suya.nombre || suya.direccion})` : "(casa de prueba)");
};

// El repartidor saliendo de la tienda. Va en línea recta porque lo que se está probando es el
// seguimiento, no la ruta: al cliente le llega la misma información que le llegaría de un teléfono
// real.
const simular = async (cerca) => {
  // El que está en curso, no una de las entregas del historial.
  const pedido = await orderModel.findOne({
    deliveryReference: MARCA,
    status: { $ne: "entregado" },
  });
  if (!pedido) {
    console.log("No hay pedido de prueba. Corra primero: node src/scripts/pruebaSeguimiento.js crear");
    return;
  }

  // Se va hacia donde de verdad va el pedido, no hacia la casa de ejemplo.
  const meta = { lat: pedido.deliveryLat, lng: pedido.deliveryLng };

  // Modo "cerca": arranca ya a la vuelta de la esquina y va rápido, para probar el aviso de las
  // últimas cuadras sin esperar el viaje completo.
  const desde = cerca
    ? {
        lat: meta.lat + (TIENDA.lat - meta.lat) * 0.28,
        lng: meta.lng + (TIENDA.lng - meta.lng) * 0.28,
      }
    : TIENDA;
  const pasos = cerca ? 8 : PASOS;
  const espera = cerca ? 3000 : ESPERA_MS;

  // SALIR A REPARTIR SON DOS COSAS, no una.
  // En la app las hace el mismo botón de la pantalla de Reparto: mueve el pedido a 'en_camino' Y
  // empieza a compartir la ubicación.
  await orderModel.findByIdAndUpdate(pedido._id, {
    $set: { status: "en_camino", enCaminoAt: new Date(), enCaminoBy: QUIEN },
  });

  console.log(cerca ? "Ya viene llegando..." : "Saliendo de la tienda hacia la casa...");

  for (let i = 0; i <= pasos; i++) {
    const avance = i / pasos;
    const lat = desde.lat + (meta.lat - desde.lat) * avance;
    const lng = desde.lng + (meta.lng - desde.lng) * avance;

    // La posición se escribe DIRECTO en la base, no por la API. PUT /order/:id/courier es
    // soloPersonal, y esto es un proceso de Node sin navegador: no tiene cookie de sesión que mandar,
    // así que recibía un 401 en cada punto y el script "corría bien" sin mover nada.
    let estado;
    try {
      await orderModel.findByIdAndUpdate(pedido._id, {
        $set: {
          courier: { active: true, lat, lng, name: QUIEN, updatedAt: new Date() },
        },
      });
      estado = "ok";
    } catch (e) {
      // Si una escritura se cae, se sigue con la siguiente: un teléfono en la
      // calle pierde señal todo el tiempo y el seguimiento tiene que aguantarlo.
      estado = "falló: " + e.message;
    }

    console.log(`  ${i}/${pasos} → ${lat.toFixed(5)}, ${lng.toFixed(5)}  (${estado})`);
    if (i < pasos) await new Promise((res) => setTimeout(res, espera));
  }

  console.log("Llegó. El puntito queda encendido hasta que se marque entregado.");
  console.log("El pedido quedó en 'en_camino': ábralo en Mis pedidos y verá el mapa.");
};

// Crea entregas de prueba ya hechas para que el "tiempo real por zona" tenga de dónde salir.
// Llevan la misma marca y se borran con `borrar`.
const historial = async (correo) => {
  const cliente = correo
    ? await clientModel.findOne({ email: correo })
    : await clientModel.findOne({ isActive: true });
  if (!cliente) { console.log("No se encontró el cliente."); return; }

  // El historial se siembra alrededor de la dirección REAL del cliente, no de la casa de prueba: si
  // cae a cinco kilómetros, el cálculo dice —con razón— que no hay entregas por su zona, y no se
  // vería nada.
  const suya = (cliente.clientAddress || [])
    .map((d) => (typeof d === "string" ? null : d))
    .find((d) => d?.lat != null && d?.lng != null);

  const centro = suya ? { lat: suya.lat, lng: suya.lng } : CASA;
  console.log(`Zona: ${suya ? suya.nombre || suya.direccion : "casa de prueba"} (${centro.lat.toFixed(5)}, ${centro.lng.toFixed(5)})`);

  const tardanzas = [22, 26, 31, 28, 35, 24, 41, 29, 33, 27, 88, 30];
  const pedidos = [];

  for (let i = 0; i < tardanzas.length; i++) {
    // Repartidas alrededor de la casa de prueba, dentro de la misma zona.
    const jitter = () => (Math.random() - 0.5) * 0.006; // ~ ±330 m
    const creado = new Date(Date.now() - (i + 1) * 36 * 3600 * 1000); // día y medio entre cada una
    const entregado = new Date(creado.getTime() + tardanzas[i] * 60000);

    pedidos.push({
      clientId: cliente._id,
      items: [{ name: "Pedido de historial", price: 5, amount: 1 }],
      subtotal: 5,
      total: 5,
      status: "entregado",
      paymentMethod: "efectivo",
      deliveryType: "delivery",
      deliveryAddress: "Entrega de historial (prueba)",
      deliveryReference: MARCA,
      deliveryLat: centro.lat + jitter(),
      deliveryLng: centro.lng + jitter(),
      createdAt: creado,
      preparedAt: creado,
      deliveredAt: entregado,
      deliveredBy: "Repartidor de prueba",
      pointsEarned: 0,
    });
  }

  // timestamps:true pisaría createdAt; con insertMany y la opción de abajo
  // se respetan las fechas que le estamos dando a cada entrega.
  await orderModel.insertMany(pedidos, { timestamps: false });
  console.log(`Historial creado: ${pedidos.length} entregas por la zona de prueba.`);
  console.log(`Tardanzas (min): ${tardanzas.join(", ")}`);
};

const borrar = async () => {
  const r = await orderModel.deleteMany({ deliveryReference: MARCA });
  console.log("Pedidos de prueba borrados:", r.deletedCount);
};

const run = async () => {
  await mongoose.connect(process.env.DB_URI, { family: 4 });

  const que = process.argv[2] || "crear";
  if (que === "crear") await crear(process.argv[3]);
  else if (que === "simular") await simular(process.argv[3] === "cerca");
  else if (que === "historial") await historial(process.argv[3]);
  else if (que === "borrar") await borrar();
  else console.log("Use: crear | simular [cerca] | historial | borrar");

  await mongoose.disconnect();
};

run();
