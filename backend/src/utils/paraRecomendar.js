import orderModel from "../models/order.js";
import productModel from "../models/product.js";
import { DIAS_CADUCA, numero } from "../controller/dashboardController.js";

// LO QUE TIQUI RECOMIENDA PRIMERO — paraRecomendar.js
// Estrategia de venta: lo que vence pronto, lo que casi no se vende y lo que sobra en bodega va
// primero cuando Tiqui recomienda. Cada vez sale otra tanda, para que no repita siempre lo mismo.

const DIA = 24 * 60 * 60 * 1000;
const VIGENCIA_MS = 5 * 60 * 1000;
// Un producto recién llegado todavía no tuvo tiempo de venderse: no cuenta como "quieto".
const DIAS_PARA_JUZGAR = 14;
const SOBRA = 0.75; // 75% o más de su tope
export const CUANTOS = 4;
const TANDA = 15; // de los más urgentes se sortean los de cada respuesta

// Por qué conviene moverlo (para Tiqui, no para el cliente: ella lo dice a su manera).
export const MOTIVOS = {
  vence: "vence pronto",
  quieto: "casi no se ha vendido este mes",
  sobra: "hay de sobra en bodega",
};

// Puntúa cada producto con existencias y devuelve los que conviene empujar, el más urgente
// primero. `vendidos`: unidades vendidas en 30 días por id.
export const elegirParaRecomendar = (productos, vendidos, { ahora = new Date() } = {}) => {
  const hasta = new Date(ahora.getTime() + DIAS_CADUCA * DIA);
  const juzgable = new Date(ahora.getTime() - DIAS_PARA_JUZGAR * DIA);
  const conVentas = (productos || []).map((p) => Number(vendidos.get(String(p.id))) || 0).filter((n) => n > 0);
  const ordenadas = [...conVentas].sort((a, b) => a - b);
  // Poco = menos de la cuarta parte de lo que vende el producto típico.
  const tipico = ordenadas.length ? ordenadas[Math.floor(ordenadas.length / 2)] : 0;

  return (productos || [])
    .filter((p) => Number(p.stock) > 0)
    .map((p) => {
      const motivos = [];
      let peso = 0;
      const vence = p.vence ? new Date(p.vence) : null;
      if (vence && vence > ahora && vence <= hasta) {
        motivos.push(MOTIVOS.vence);
        peso += 3;
      }
      const unidades = Number(vendidos.get(String(p.id))) || 0;
      const viejo = !p.creado || new Date(p.creado) <= juzgable;
      if (viejo && (unidades === 0 || unidades < tipico / 4)) {
        motivos.push(MOTIVOS.quieto);
        peso += unidades === 0 ? 2 : 1.5;
      }
      if (Number(p.stockMaximo) > 0 && Number(p.stock) / Number(p.stockMaximo) >= SOBRA) {
        motivos.push(MOTIVOS.sobra);
        peso += 1;
      }
      return { id: String(p.id), nombre: p.nombre, peso, motivos };
    })
    .filter((p) => p.peso > 0)
    .sort((a, b) => b.peso - a.peso);
};

// Sortea `cuantos` de los más urgentes, con más chance para los de más peso. Así cada respuesta
// trae otra tanda y las recomendaciones van cambiando.
export const sortearTanda = (lista, cuantos = CUANTOS, azar = Math.random) => {
  const bolsa = (lista || []).slice(0, TANDA);
  const salen = [];
  while (bolsa.length && salen.length < cuantos) {
    const total = bolsa.reduce((a, p) => a + p.peso, 0);
    let tiro = azar() * total;
    const i = bolsa.findIndex((p) => (tiro -= p.peso) < 0);
    salen.push(...bolsa.splice(i < 0 ? bolsa.length - 1 : i, 1));
  }
  return salen;
};

let enMemoria = { en: 0, lista: null };

// Los candidatos, con las ventas de los últimos 30 días. Se guardan 5 minutos: no cambian de una
// frase a otra y la cuenta recorre los pedidos.
export const candidatosParaRecomendar = async ({ ahora = new Date() } = {}) => {
  if (enMemoria.lista && ahora.getTime() - enMemoria.en < VIGENCIA_MS) return enMemoria.lista;
  const desde = new Date(ahora.getTime() - 30 * DIA);
  const [productos, filas] = await Promise.all([
    productModel.find({ isActive: { $ne: false } }, "name stock maxQuantity expirationDate createdAt").lean(),
    orderModel.aggregate([
      { $match: { status: { $ne: "cancelado" }, createdAt: { $gte: desde } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", unidades: { $sum: numero("$items.amount") } } },
    ]),
  ]);
  const vendidos = new Map(filas.map((f) => [String(f._id), f.unidades]));
  const lista = elegirParaRecomendar(
    productos.filter((p) => p.name).map((p) => ({
      id: p._id,
      nombre: p.name,
      stock: p.stock,
      stockMaximo: p.maxQuantity,
      vence: p.expirationDate,
      creado: p.createdAt,
    })),
    vendidos,
    { ahora }
  );
  enMemoria = { en: ahora.getTime(), lista };
  return lista;
};

export const olvidarParaRecomendar = () => {
  enMemoria = { en: 0, lista: null };
};
