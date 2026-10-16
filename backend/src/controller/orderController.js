import { isValidObjectId } from "mongoose";
import orderModel from "../models/order.js";
import clientModel from "../models/client.js";
import loyaltyConfigModel from "../models/loyaltyConfig.js";
import loyaltyLedgerModel from "../models/loyaltyLedger.js";
import printServiceModel from "../models/printService.js";
import productModel from "../models/product.js";
import adminModel from "../models/admin.js";
import employeeModel from "../models/employee.js";
import promotionModel from "../models/promotion.js";
import { sendPrintToPrinter } from "../utils/sendPrintToPrinter.js";
import { getLoyaltyConfig, puntosDisponibles, consumirPuntos } from "../utils/loyaltyPoints.js";
import { calcularPrecioImpresion } from "../utils/precioImpresion.js";
import { calcularEnvio } from "../utils/envio.js";
import { construirMapaPromo, precioDeRenglon } from "../utils/precioPedido.js";
import { generarCodigoEntrega } from "../utils/codigoEntrega.js";
import { cambiarEstadoDePedido } from "../utils/estadoPedido.js";
import storeSettingsModel, { CLAVE_UNICA } from "../models/storeSettings.js";
import { rutaDelRepartidor, olvidarRuta, estimadoDesdeLaTienda } from "../utils/rutaReparto.js";
import { avisarPedidoNuevoEnSegundoPlano } from "../utils/avisosPersonal.js";
import { config } from "../../config.js";

const orderController = {};

/*
 * EL CÓDIGO DE ENTREGA NO SE LO ENSEÑAMOS AL PERSONAL.
 *
 * Parece de más —es la tienda, no un extraño— pero es justamente lo que hace
 * que el código sirva. Si el repartidor lo ve en su pantalla, puede marcar
 * "entregado" desde la moto sin haberle preguntado nada a nadie, y entonces no
 * prueba que el pedido llegó a su dueño: prueba que el repartidor sabe leer.
 *
 * El código lo tiene UNA sola persona —la que lo pidió, en su pantalla— y el
 * personal lo recibe dictado en la puerta. Así es como funciona en cualquier
 * app de reparto, y por la misma razón.
 *
 * El campo va con `select: false` en el modelo, así que de la base no sale
 * solo; esto es para cuando se pide a mano con +deliveryCode y quien pregunta
 * resulta no ser el dueño.
 */
const sinCodigoDeEntrega = (pedido) => {
  const plano = typeof pedido?.toObject === "function" ? pedido.toObject() : { ...pedido };

  /*
   * SÍ se le dice al personal si el pedido LLEVA código, aunque no cuál.
   *
   * Sin este dato, la pantalla de entrega no puede distinguir un pedido normal
   * de uno anterior a esta función —los que ya estaban en la calle el día que
   * se estrenó el código y nunca tuvieron uno—. Les pedía cuatro dígitos que
   * ese cliente no tiene ni va a tener nunca, y el repartidor se quedaba
   * trabado en la puerta inventando un número.
   *
   * Un booleano no compromete nada: no dice cuál es el código, solo si hay que
   * preguntarlo. Ver ModalCodigoEntrega.
   */
  plano.tieneCodigoEntrega = !!plano.deliveryCode;

  delete plano.deliveryCode;
  return plano;
};

// INSERT — Crear un pedido (checkout). Aquí es donde se otorgan los puntos.
orderController.createOrder = async (req, res) => {
  try {
    const {
      items, paymentMethod, channel, pointsToRedeem,
      deliveryType, deliveryAddress, deliveryReference, deliveryLat, deliveryLng,
    } = req.body;

    /*
     * A nombre de quién va el pedido lo decide el SERVIDOR, no el navegador.
     *
     * Antes se leía `clientId` del cuerpo de la petición, así que cualquiera
     * podía cargarle una compra —con su stock y sus puntos— a la cuenta de
     * otra persona. Ahora sale de la cookie del cliente, del código del kiosco
     * o de la sesión del empleado que cobra. Ver middlewares/identificarComprador.js.
     */
    const clientId = req.compradorId;

    // Validación básica: sin cliente o sin productos no hay pedido. Que sea
    // una lista de verdad: con un texto cualquiera, el items.map de más abajo
    // reventaba y salía como un 500.
    if (!clientId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "clientId e items son requeridos"
      });
    }

    /*
     * ── Y que ese cliente EXISTA ──
     *
     * Con solo comprobar que el campo venga, cualquier id con forma válida
     * pasaba: el del propio administrador mirando su tienda, por ejemplo. El
     * pedido se guardaba, se descontaba el stock y se le escribía un lote de
     * puntos a un cliente que no está en la tabla — un pedido que después nadie
     * puede consultar ni entregar, y existencias que bajaron por él.
     *
     * Mismo criterio que el del stock: el carrito ya lo revisa, pero la
     * comprobación que vale es esta.
     */
    // isValidObjectId primero: findById con una cadena cualquiera lanza
    // CastError y saldría como un 500, culpando al servidor de un dato malo.
    const cliente = isValidObjectId(clientId)
      ? await clientModel.findById(clientId).select("_id")
      : null;
    if (!cliente) {
      return res.status(400).json({
        message: "El pedido tiene que ir a nombre de un cliente registrado"
      });
    }

    /*
     * ── CADA RENGLÓN ES UN PRODUCTO DEL CATÁLOGO ──
     *
     * Antes los renglones sin productId se saltaban todas las revisiones —eran
     * de cuando las impresiones pasaban por aquí; hoy tienen su propia ruta,
     * createPrintOrder— y entraban a la cuenta con el precio que trajeran. Un
     * renglón inventado, "Descuento" a −9.99, dejaba cualquier compra en un
     * centavo. La tienda, el kiosco y la app mandan siempre el productId, así
     * que lo que llegue sin él no salió de ninguno de los tres.
     *
     * isValidObjectId por lo mismo que con el cliente: un id con mala forma
     * hacía reventar el find de abajo y salía como un 500.
     */
    for (const it of items) {
      if (!it?.productId || !isValidObjectId(it.productId)) {
        return res.status(400).json({
          message: `"${it?.name || "Un producto"}" no está en el catálogo de la tienda`,
        });
      }
    }

    const idsProductos = items.map((it) => it.productId);
    const productos = await productModel.find({ _id: { $in: idsProductos } });
    const porId = new Map(productos.map((p) => [String(p._id), p]));

    /*
     * Las promociones que tocan a estos productos, para cobrar lo mismo que
     * el cliente vio en pantalla. Se traen también las vencidas que sigan
     * encendidas en la base: construirMapaPromo las descarta por fecha, que
     * es la regla que usa la tienda. Ver utils/precioPedido.js.
     */
    const promociones = await promotionModel
      .find({ isActive: { $ne: false }, "items.productId": { $in: idsProductos } })
      .select("type items buyQty payQty isActive endsAt createdAt")
      .lean();
    const mapaPromo = construirMapaPromo(promociones);

    /*
     * ── PRECIO Y STOCK, renglón por renglón ──
     *
     * Del renglón que manda el navegador se usan DOS datos: qué producto y
     * cuántos. Todo lo demás sale de la base.
     *
     * El precio, sobre todo. Antes se sumaba el `price` del cuerpo de la
     * petición: el comentario decía que nunca confiábamos en el total del
     * front, y era cierto, pero se confiaba en el precio por unidad, que da
     * lo mismo. Bastaba mandar `price: 0.01`. El stock ya se revisaba contra
     * la base; el precio, que es lo que se cobra, no.
     *
     * El nombre también sale del producto: es lo que lee quien arma el
     * pedido, y un renglón de chicles no puede llegarle a la bodega diciendo
     * "Whisky".
     *
     * Y el stock, ANTES de cobrar: sin esto se podían pedir 100 unidades de
     * algo que tiene 5. El carrito ya lo revisa, pero el navegador no es de
     * fiar — la comprobación que vale es esta.
     */
    const renglones = [];
    for (const it of items) {
      const producto = porId.get(String(it.productId));
      if (!producto) {
        return res.status(400).json({ message: `El producto "${it.name}" ya no existe` });
      }

      /*
       * La cantidad tiene que ser un número mayor que cero. Una negativa
       * restaba del subtotal —y de paso SUBÍA el stock al descontarla— y un
       * cero dejaba un renglón fantasma en el pedido.
       *
       * Por libra se aceptan decimales (media libra de queso es lo normal);
       * por unidad, no: media Coca-Cola no se vende, y aceptarla sería
       * cobrar la mitad por la botella entera. Ver frontend/src/utils/unidades.js.
       */
      const cantidad = Number(it.amount);
      const porLibra = producto.unidadVenta === "libra";
      if (!Number.isFinite(cantidad) || cantidad <= 0 || (!porLibra && !Number.isInteger(cantidad))) {
        return res.status(400).json({ message: `La cantidad de "${producto.name}" no es válida` });
      }

      // Ojo: hay productos con el stock guardado como texto (vienen de
      // FormData), por eso el Number() en vez de compararlo directo.
      const disponible = Number(producto.stock) || 0;
      if (cantidad > disponible) {
        return res.status(400).json({
          message: disponible === 0
            ? `"${producto.name}" se acaba de agotar`
            : `Solo quedan ${disponible} de "${producto.name}"`,
        });
      }

      renglones.push({
        productId: producto._id,
        name: producto.name,
        price: precioDeRenglon(producto, mapaPromo.get(String(producto._id)), cantidad),
        amount: cantidad,
      });
    }

    // El subtotal sale de los renglones que acabamos de armar, no del cuerpo
    // de la petición. El total que mande el front (el kiosco lo manda) se
    // ignora.
    const subtotal = Number(
      renglones.reduce((acc, r) => acc + (r.price * r.amount), 0).toFixed(2)
    );

    const config = await getLoyaltyConfig();

    // ── CANJE DE PUNTOS ──
    // Nos protegemos de tres cosas: que no canjee más de lo que tiene, que no
    // canjee más de lo que cuesta la compra, y que respete el mínimo.
    /*
     * Aquí solo se CALCULA cuántos se canjean. Se consumen al final, cuando ya
     * no queda nada que pueda rechazar el pedido: antes se consumían aquí, y si
     * después faltaba la dirección o no alcanzaba el saldo, el pedido no se
     * hacía y los puntos se perdían igual.
     */
    let aCanjear = 0;
    let discount = 0;
    const pedidos = Number(pointsToRedeem) || 0;
    const tasa = config.pointsPerDollarRedeem || 100;

    if (pedidos > 0 && config.isActive) {
      const disponibles = await puntosDisponibles(clientId);
      const topePorCompra = Math.floor(subtotal * tasa); // no regalar más que el total
      const posibles = Math.min(pedidos, disponibles, topePorCompra);

      if (posibles >= (config.minRedeemPoints || 0)) {
        aCanjear = posibles;
        discount = Number((aCanjear / tasa).toFixed(2));
      }
    }

    const metodo = paymentMethod || "efectivo";
    const entrega = deliveryType === "delivery" ? "delivery" : "retiro";

    if (entrega === "delivery" && !deliveryAddress) {
      return res.status(400).json({ message: "Indica la dirección de entrega" });
    }

    /*
     * ── ENVÍO ──
     * El costo lo fija el panel, NO el navegador: el front solo lo muestra. Se
     * cobra únicamente a domicilio; en retiro es 0. El cálculo (zona → por km →
     * plano) vive en utils/envio.js para que la cuenta sea la misma aquí y en el
     * carrito. Las coordenadas del cliente vienen con el pedido (deliveryLat/Lng).
     */
    const ajustesTienda = await storeSettingsModel
      .findOne({ clave: CLAVE_UNICA })
      .select("ubicacionTienda envioBase envioPorKm zonasEnvio radioMaximoKm servicioActivo servicioTipo servicioValor");
    const envio = entrega === "delivery"
      ? calcularEnvio(ajustesTienda || {}, { lat: deliveryLat, lng: deliveryLng })
      : null;
    // Muy lejos de la tienda no se entrega. Ver RADIO_MAXIMO_KM en utils/envio.js.
    if (envio?.fueraDeCobertura) {
      return res.status(400).json({
        message: `Esa dirección queda a ${envio.distanciaKm} km de la tienda, fuera de la zona de entrega. Puedes elegir recogerlo en la tienda.`,
      });
    }
    const shippingCost = envio ? envio.costo : 0;

    /*
     * Tarifa de servicio: solo si la tienda la tiene activa. Fija (dólares) o un
     * porcentaje del subtotal. Se cobra igual a domicilio y a retiro.
     */
    const serviceFee = ajustesTienda?.servicioActivo
      ? (ajustesTienda.servicioTipo === "porcentaje"
          ? Number(((subtotal * (Number(ajustesTienda.servicioValor) || 0)) / 100).toFixed(2))
          : Number((Number(ajustesTienda.servicioValor) || 0).toFixed(2)))
      : 0;

    const total = Number((subtotal - discount + shippingCost + serviceFee).toFixed(2));

    // Los puntos se ganan sobre los productos pagados (no sobre el envío, que
    // no es "compra"): subtotal menos el descuento por puntos.
    const baseParaPuntos = Number((subtotal - discount).toFixed(2));
    const pointsEarned = config.isActive
      ? Math.floor(baseParaPuntos * config.pointsPerDollar)
      : 0;

    /*
     * ── PAGO CON SALDO ──
     * Va antes de guardar: si no le alcanza, no queremos ni el pedido creado
     * ni los puntos consumidos. El descuento del saldo es condicional
     * ({ balance: { $gte: total } }) para que dos compras simultáneas no
     * puedan gastar el mismo dinero dos veces.
     */
    if (metodo === "saldo") {
      const cobrado = await clientModel.findOneAndUpdate(
        { _id: clientId, balance: { $gte: total } },
        { $inc: { balance: -total } },
        { new: true }
      );
      if (!cobrado) {
        const cliente = await clientModel.findById(clientId).select("balance");
        return res.status(400).json({
          message: `Saldo insuficiente. Tienes $${(cliente?.balance || 0).toFixed(2)} y el pedido es de $${total.toFixed(2)}`,
        });
      }
    }

    /*
     * Ahora sí se consumen los puntos: ya pasó todo lo que podía rechazar el
     * pedido. Si justo en este instante otra compra gastó parte de ellos, se
     * canjean los que quedan; el descuento ya está en el total, y es un caso
     * tan raro que no vale la pena rehacer el cobro por él.
     */
    const pointsRedeemed = aCanjear > 0 ? await consumirPuntos(clientId, aCanjear) : 0;

    const newOrder = new orderModel({
      clientId,
      // Los renglones con el precio del servidor, no los que llegaron.
      items: renglones,
      subtotal,
      discount,
      pointsRedeemed,
      shippingCost,
      serviceFee,
      total,
      paymentMethod: metodo,
      deliveryType: entrega,
      deliveryAddress: entrega === "delivery" ? deliveryAddress : undefined,
      // La referencia y el punto van con el pedido: sin ellos, quien reparte
      // sale con un texto y sin saber a qué portón tocar.
      deliveryReference: entrega === "delivery" ? deliveryReference : undefined,
      deliveryLat: entrega === "delivery" ? deliveryLat : undefined,
      deliveryLng: entrega === "delivery" ? deliveryLng : undefined,
      channel: channel || "web",
      pointsEarned,
      /*
       * El código con el que se recibirá este pedido. Lo pone el servidor —el
       * navegador nunca lo propone— y se emite para retiro igual que para
       * domicilio. Ver utils/codigoEntrega.js.
       */
      deliveryCode: generarCodigoEntrega(),
    });

    await newOrder.save();

    /*
     * ── STOCK: descontar ──
     * Va DESPUÉS de guardar el pedido: si algo falla acá, al menos la venta
     * quedó registrada. Al revés (descontar y que falle el pedido) perderíamos
     * inventario sin tener a qué achacárselo.
     *
     * Se usa $set con el número ya calculado y no $inc porque varios productos
     * tienen el stock guardado como texto y $inc revienta con esos. De paso,
     * cada venta va dejando el campo convertido a número.
     */
    for (const r of renglones) {
      const producto = porId.get(String(r.productId));
      if (!producto) continue;
      const restante = Math.max(0, (Number(producto.stock) || 0) - r.amount);
      try {
        await productModel.findByIdAndUpdate(r.productId, { $set: { stock: restante } });
      } catch (e) {
        console.log("error descontando stock de " + r.productId + ": " + e.message);
      }
    }

    // Si canjeó, le bajamos ese saldo al contador del cliente.
    if (pointsRedeemed > 0) {
      await clientModel.findByIdAndUpdate(clientId, {
        $inc: { loyaltyPoints: -pointsRedeemed }
      });
    }

    // Le sumamos los puntos ganados al cliente ($inc = incremento atómico).
    // client.loyaltyPoints queda como "total acumulado"; el saldo DISPONIBLE
    // real (con vencimiento) sale del ledger de abajo.
    if (pointsEarned > 0) {
      await clientModel.findByIdAndUpdate(clientId, {
        $inc: { loyaltyPoints: pointsEarned }
      });

      // Registramos el LOTE de puntos con su fecha de vencimiento (Parte B).
      const earnedAt = new Date();
      const expiresAt = new Date(earnedAt);
      expiresAt.setMonth(expiresAt.getMonth() + (config.expiryMonths || 3));

      await loyaltyLedgerModel.create({
        clientId,
        points: pointsEarned,
        earnedAt,
        expiresAt,
        orderId: newOrder._id,
      });
    }

    // Que le suene al personal en la app (no si lo cobró el mismo personal en caja).
    if (!req.cobraPersonal) avisarPedidoNuevoEnSegundoPlano(newOrder);

    return res.status(201).json({
      message: "Pedido creado",
      order: newOrder,
      pointsEarned,
      pointsRedeemed,
      discount,
    });

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// SELECT — Pedidos de UN cliente (su historial). Alimenta MisPedidos/Recibidos.
orderController.getOrdersByClient = async (req, res) => {
  try {
    /*
     * Tener sesión no basta: hay que ser ESE cliente.
     *
     * Sin esta comprobación, cualquiera con una cuenta leía el historial de
     * cualquier otro cambiando el id de la URL — qué compró, a qué dirección
     * se lo llevaron y las coordenadas de su casa. El personal sí puede ver
     * los de todos: es la tienda atendiendo a su gente.
     */
    if (req.usuario?.tipo === "Client" && req.usuario.id !== req.params.clientId) {
      return res.status(403).json({ message: "No tiene permiso para esta acción" });
    }

    const orders = await orderModel
      .find({ clientId: req.params.clientId })
      .sort({ createdAt: -1 })          // los más recientes primero
      .select("+deliveryCode")
      .populate("items.productId");

    /*
     * El código va SOLO si quien pregunta es el cliente dueño. El personal
     * llega hasta aquí legítimamente (atender es su trabajo) pero se lleva el
     * pedido sin el código. Ver sinCodigoDeEntrega, arriba.
     */
    const esElDueno = req.usuario?.tipo === "Client";
    return res.status(200).json(esElDueno ? orders : orders.map(sinCodigoDeEntrega));

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * SELECT — UN pedido completo, para la pantalla de estado del pedido.
 *
 * Distinto de getCourierPosition (que devuelve solo el puntito y se consulta
 * cada pocos segundos): esto trae el pedido entero —productos, dirección,
 * método de pago, envío, total— para pintar la pantalla una vez. Mismo candado:
 * tener sesión no basta, hay que ser el dueño; el personal ve el de cualquiera.
 */
orderController.getOrderById = async (req, res) => {
  try {
    // Igual que en getCourierPosition: un id con mala forma es un 404 limpio,
    // no un 500 por el CastError de Mongoose.
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const pedido = await orderModel
      .findById(req.params.id)
      .select("+deliveryCode")
      .populate("items.productId");

    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const esElDueno = req.usuario?.tipo === "Client";

    if (esElDueno && String(pedido.clientId) !== req.usuario.id) {
      return res.status(403).json({ message: "No tiene permiso para esta acción" });
    }

    // Esta es LA pantalla donde el cliente lee su código para dictarlo en la
    // puerta. Al personal se le devuelve el mismo pedido, sin el código.
    return res.status(200).json(esElDueno ? pedido : sinCodigoDeEntrega(pedido));

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * El cliente valora el SERVICIO de entrega de un pedido suyo YA entregado.
 * No es una reseña del producto: es qué tal estuvo el reparto.
 */
orderController.rateService = async (req, res) => {
  try {
    const n = Number(req.body.rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return res.status(400).json({ message: "La valoración va de 1 a 5 estrellas" });
    }

    const pedido = await orderModel
      .findById(req.params.id)
      .select("clientId status deliveryType serviceRating");

    if (!pedido) {
      return res.status(404).json({ message: "No se encontró el pedido" });
    }

    // Solo el cliente dueño del pedido lo valora (el personal no opina por él).
    if (req.usuario?.tipo !== "Client" || String(pedido.clientId) !== req.usuario.id) {
      return res.status(403).json({ message: "No tiene permiso para esta acción" });
    }

    // Y solo tiene sentido para un pedido a domicilio que ya se entregó.
    if (pedido.deliveryType !== "delivery") {
      return res.status(400).json({ message: "Solo se valora el servicio de los pedidos a domicilio" });
    }
    if (pedido.status !== "entregado") {
      return res.status(400).json({ message: "Puedes valorar el servicio cuando el pedido esté entregado" });
    }

    pedido.serviceRating = {
      rating: n,
      comment: String(req.body.comment || "").trim().slice(0, 500),
      ratedAt: new Date(),
    };
    await pedido.save();

    return res.status(200).json({
      message: "¡Gracias por valorar el servicio!",
      serviceRating: pedido.serviceRating,
    });
  } catch (error) {
    console.log("error rateService: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// SELECT — TODOS los pedidos (pantalla del empleado). Filtro opcional ?status=
orderController.getOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const orders = await orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate("clientId", "fullName email phoneNumber")
      /*
       * La marca va anidada: sin este segundo populate, items.productId.brandId
       * llegaba como un ObjectId pelado y el panel no tenía forma de mostrar
       * "Oreja" de cuál marca — con productos que se llaman igual entre sí
       * (varias "Oreja", "Semita") era imposible saber cuál pidió el cliente.
       */
      .populate({ path: "items.productId", populate: { path: "brandId" } })
      // +deliveryCode solo para poder decir si LO HAY: sinCodigoDeEntrega lo
      // convierte en el booleano `tieneCodigoEntrega` y borra el código.
      .select("+deliveryCode");

    return res.status(200).json(orders.map(sinCodigoDeEntrega));

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// UPDATE — Cambiar el estado del pedido (preparando, entregado, cancelado).
/*
 * Lo que pasa al mover un pedido (sellos de hora, código de entrega, aviso al
 * cliente) vive en utils/estadoPedido.js: lo comparte con Tiqui del panel,
 * que también mueve pedidos cuando se lo piden. Aquí solo se traduce a HTTP.
 */
/*
 * El nombre de quien mueve el pedido, sacado de su sesión. La pantalla de
 * Pedidos no lo manda, así que los sellos (preparedBy, deliveredBy…) quedaban
 * vacíos: el pedido decía a qué hora se entregó pero no quién lo entregó.
 */
const nombreDelPersonal = async (usuario) => {
  if (!usuario?.id || usuario.tipo === "Client") return "";
  try {
    const doc = usuario.tipo === "Admin"
      ? await adminModel.findById(usuario.id, "userName").lean()
      : await employeeModel.findById(usuario.id, "fullnName userName").lean();
    return String(doc?.fullnName || doc?.userName || "").trim();
  } catch {
    return "";
  }
};

orderController.updateOrderStatus = async (req, res) => {
  try {
    const { status, quien, codigoEntrega, omitirCodigo, motivoOmision, motivoCancelacion } = req.body;
    const r = await cambiarEstadoDePedido({
      id: req.params.id,
      status,
      quien: quien || await nombreDelPersonal(req.usuario),
      codigoEntrega,
      omitirCodigo,
      motivoOmision,
      motivoCancelacion,
    });
    if (!r.ok) return res.status(r.codigo).json({ message: r.message });
    return res.status(200).json({ message: "Estado actualizado", order: r.order });

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * UPDATE — El CLIENTE cancela su pedido.
 *
 * Solo mientras está "por preparar": en cuanto la tienda empieza a juntar los
 * productos, ya hay alguien trabajando en él y cancelarlo desde la app dejaría
 * la bolsa armada a medias. Ahí se le pide que escriba por WhatsApp.
 *
 * Todo lo demás es la cancelación de siempre (utils/estadoPedido.js): vuelve
 * el stock, se le devuelve el saldo y los puntos canjeados. El motivo lo elige
 * el cliente y lo lee el personal en Pedidos.
 */
const YA_EN_PREPARACION =
  "Ya empezamos a preparar tu pedido y no se puede cancelar desde aquí. Escríbenos por WhatsApp y lo vemos.";

orderController.cancelarPorCliente = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }
    const pedido = await orderModel.findById(req.params.id).select("clientId status");
    if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
    if (String(pedido.clientId) !== req.usuario.id) {
      return res.status(403).json({ message: "No tiene permiso para esta acción" });
    }
    if (pedido.status === "cancelado") {
      return res.status(400).json({ message: "Este pedido ya está cancelado." });
    }
    if (pedido.status !== "pagado") {
      return res.status(400).json({ message: YA_EN_PREPARACION });
    }

    const motivo = String(req.body.motivo || "").trim();
    if (motivo.length < 4) {
      return res.status(400).json({ message: "Cuéntenos por qué lo cancela: elija una opción." });
    }

    const r = await cambiarEstadoDePedido({
      id: req.params.id,
      status: "cancelado",
      quien: "el cliente",
      motivoCancelacion: motivo,
      soloDesde: "pagado",
      porCliente: true,
    });
    // 409: la tienda lo empezó a preparar entre que se abrió la pantalla y ahora.
    if (!r.ok) return res.status(r.codigo).json({ message: r.codigo === 409 ? YA_EN_PREPARACION : r.message });

    return res.status(200).json({ message: "Pedido cancelado", order: r.order });
  } catch (error) {
    console.log("error cancelarPorCliente: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Topes de un trabajo de impresión (la web y la app usan los mismos).
export const MAX_COPIAS = 200;
export const MAX_PAGINAS = 500;

// INSERT — Crear un pedido de IMPRESIÓN (sube archivo + opciones).
orderController.createPrintOrder = async (req, res) => {
  try {
    const { serviceId, color, copies, pages, doubleSided, paper } = req.body;

    // Igual que en createOrder: de quién es el pedido lo dice el servidor.
    // Ver middlewares/identificarComprador.js.
    const clientId = req.compradorId;

    if (!clientId || !serviceId) {
      return res.status(400).json({ message: "clientId y serviceId son requeridos" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Sube el archivo a imprimir" });
    }

    const service = await printServiceModel.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Servicio de impresión no encontrado" });
    }

    const esColor = color === "true" || color === true;
    /*
     * Copias y páginas, enteras y con tope. Antes pasaba cualquier número: el
     * campo de copias de la web acepta "1e258" (un <input type="number"> deja
     * escribir exponentes) y llegaron pedidos de 10^258 copias, con un total y
     * unos puntos de 5×10^256 que dejaron el dashboard ilegible.
     */
    const nCopias = copies === undefined || copies === "" ? 1 : Number(copies);
    const nPaginas = pages === undefined || pages === "" ? 1 : Number(pages);
    if (!Number.isInteger(nCopias) || nCopias < 1 || nCopias > MAX_COPIAS) {
      return res.status(400).json({ message: `Las copias van de 1 a ${MAX_COPIAS}.` });
    }
    if (!Number.isInteger(nPaginas) || nPaginas < 1 || nPaginas > MAX_PAGINAS) {
      return res.status(400).json({ message: `El documento puede tener de 1 a ${MAX_PAGINAS} páginas.` });
    }
    const doble = doubleSided === "true" || doubleSided === true;

    /*
     * Antes el precio ignoraba `doble`: se calculaba, se guardaba en el pedido
     * y no tocaba el total, así que elegir doble cara no cambiaba nada. Ahora
     * el cálculo vive en un solo lugar y cobra por hoja, no por página.
     */
    const { total, hojas, precioPorHoja } = calcularPrecioImpresion({
      servicio: service,
      paginas: nPaginas,
      copias: nCopias,
      color: esColor,
      dobleCara: doble,
    });

    // Opción 1: enviar a la impresora por correo (si hay PRINTER_EMAIL).
    // El archivo igual queda guardado en Cloudinary (opción 2 / respaldo).
    let emailed = false;
    try {
      const r = await sendPrintToPrinter({
        fileUrl: req.file.path,
        fileName: req.file.originalname,
        options: { servicio: service.name, color: esColor, copias: nCopias, paginas: nPaginas, doble, paper },
      });
      emailed = !!r.emailed;
    } catch (e) {
      console.log("error enviando a impresora " + e);
    }

    // Puntos de fidelidad, igual que un pedido normal.
    const config = await getLoyaltyConfig();
    const pointsEarned = config.isActive ? Math.floor(total * config.pointsPerDollar) : 0;

    // Resumen con las hojas reales, para que el empleado sepa qué va a salir
    // de la impresora sin tener que abrir el pedido.
    const resumen =
      `Impresión ${service.name} ${esColor ? "a color" : "B/N"}` +
      `${doble ? " doble cara" : ""} x${nCopias}` +
      ` (${nPaginas} pág${nPaginas > 1 ? "s" : ""}, ${hojas} hoja${hojas > 1 ? "s" : ""} a $${precioPorHoja.toFixed(2)})`;

    const newOrder = new orderModel({
      clientId,
      items: [{ name: resumen, price: total, amount: 1 }],
      total,
      status: "pagado",
      paymentMethod: "efectivo",
      channel: "impresion",
      pointsEarned,
      // Una impresión también se recoge en el mostrador, y ahí hace la misma
      // falta: son los papeles de alguien.
      deliveryCode: generarCodigoEntrega(),
      printJob: {
        serviceName: service.name,
        fileUrl: req.file.path,
        public_id: req.file.filename,
        color: esColor,
        copies: nCopias,
        pages: nPaginas,
        doubleSided: doble,
        paper: paper || "",
        emailedToPrinter: emailed,
      },
    });

    await newOrder.save();

    if (pointsEarned > 0) {
      await clientModel.findByIdAndUpdate(clientId, { $inc: { loyaltyPoints: pointsEarned } });
      const earnedAt = new Date();
      const expiresAt = new Date(earnedAt);
      expiresAt.setMonth(expiresAt.getMonth() + (config.expiryMonths || 3));
      await loyaltyLedgerModel.create({ clientId, points: pointsEarned, earnedAt, expiresAt, orderId: newOrder._id });
    }

    if (!req.cobraPersonal) avisarPedidoNuevoEnSegundoPlano(newOrder);

    return res.status(201).json({
      message: "Pedido de impresión creado",
      order: newOrder,
      emailedToPrinter: emailed,
    });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * UPDATE — El repartidor manda dónde va.
 *
 * Lo llama el teléfono de quien reparte cada pocos segundos mientras dura el
 * viaje. Es la mitad barata del seguimiento en vivo: escribe cuatro números y
 * ya. Con `activo: false` se apaga el compartir sin tener que entregar
 * (se cansó, se le acabó la batería, o se bajó del pedido).
 */
orderController.updateCourierPosition = async (req, res) => {
  try {
    const { lat, lng, quien, activo } = req.body;

    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const pedido = await orderModel.findById(req.params.id).select("deliveryType status");
    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }
    if (pedido.deliveryType !== "delivery") {
      return res.status(400).json({ message: "Este pedido no es a domicilio" });
    }
    // Un pedido cerrado no se sigue: si ya llegó o se canceló, no hay viaje.
    if (["entregado", "cancelado"].includes(pedido.status)) {
      return res.status(400).json({ message: "Este pedido ya se cerró" });
    }

    // Apagar el compartir: se borra el punto, no se deja el último quieto.
    if (activo === false) {
      await orderModel.findByIdAndUpdate(req.params.id, { courier: { active: false } });
      olvidarRuta(req.params.id);
      return res.status(200).json({ message: "Seguimiento detenido" });
    }

    // El navegador manda números; si llega otra cosa, no la guardamos.
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
      return res.status(400).json({ message: "Coordenadas inválidas" });
    }

    const courier = {
      active: true,
      lat: nLat,
      lng: nLng,
      name: quien || "",
      updatedAt: new Date(),
    };

    await orderModel.findByIdAndUpdate(req.params.id, { courier });

    return res.status(200).json({ message: "Posición actualizada", courier });

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * SELECT — Dónde va el repartidor, para el cliente que espera.
 *
 * Devuelve solo el punto y el destino, no el pedido entero: esta ruta se
 * consulta cada pocos segundos y sería un desperdicio arrastrar los productos
 * y los datos del cliente en cada vuelta.
 */
// Un punto con más de esto ya no es "ahorita" (la misma cuenta que
// frontend/src/hooks/useSeguimientoEnVivo.js).
const SENAL_FRIA_MS = 90 * 1000;

orderController.getCourierPosition = async (req, res) => {
  try {
    /*
     * Un id con mala forma revienta en el casteo de Mongoose y sale como 500.
     * En una ruta que se consulta cada diez segundos eso son cientos de
     * errores en el log tapando los que sí importan: mejor un 404 y ya.
     */
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const pedido = await orderModel
      .findById(req.params.id)
      .select("courier status deliveryType deliveryLat deliveryLng clientId enCaminoAt");

    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    /*
     * Solo el dueño del pedido —o el personal— puede ver por dónde viene.
     *
     * Esta ruta devuelve el punto del repartidor Y las coordenadas del
     * destino, o sea la casa de alguien. `clientId` entra en el select de
     * arriba solo para poder comprobarlo; no se devuelve al navegador.
     */
    if (req.usuario?.tipo === "Client" && String(pedido.clientId) !== req.usuario.id) {
      return res.status(403).json({ message: "No tiene permiso para esta acción" });
    }

    const destino = (pedido.deliveryLat != null && pedido.deliveryLng != null)
      ? { lat: pedido.deliveryLat, lng: pedido.deliveryLng }
      : null;
    const courier = pedido.courier?.active ? pedido.courier : null;

    /*
     * La línea por las calles que le falta al repartidor, mientras va en
     * camino: { puntos: [[lng, lat]…], metros, segundos }. Null sin llave del
     * servicio de rutas, sin destino o si no encontró camino. Al terminar el
     * viaje se olvida. Ver utils/rutaReparto.js.
     */
    let ruta = null;
    /*
     * Sin punto fresco del repartidor (nunca llegó, o lleva más de minuto y
     * medio callado), lo que sí se sabe: la ruta desde la tienda y cuánto
     * falta desde que salió. Ver estimadoDesdeLaTienda en utils/rutaReparto.js.
     */
    let estimado = null;
    const puntoFresco = courier?.lat != null && courier.updatedAt
      && Date.now() - new Date(courier.updatedAt).getTime() <= SENAL_FRIA_MS;

    if (pedido.status === "en_camino" && destino && puntoFresco) {
      ruta = await rutaDelRepartidor({
        pedidoId: pedido._id,
        desde: { lat: courier.lat, lng: courier.lng },
        hacia: destino,
        llave: config.rutas.llave,
      });
    } else if (pedido.status === "en_camino" && destino) {
      const ajustes = await storeSettingsModel.findOne({ clave: CLAVE_UNICA }).select("ubicacionTienda").lean();
      estimado = await estimadoDesdeLaTienda({
        pedidoId: pedido._id,
        tienda: ajustes?.ubicacionTienda,
        hacia: destino,
        salio: pedido.enCaminoAt,
        llave: config.rutas.llave,
      });
    } else {
      olvidarRuta(pedido._id);
    }

    return res.status(200).json({
      status: pedido.status,
      deliveryType: pedido.deliveryType,
      destino,
      courier,
      ruta,
      estimado,
    });

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * ============================================================
 * SELECT — Cuánto tardamos DE VERDAD en llegar a esta zona.
 * ============================================================
 * Todas las tiendas prometen "30 a 45 minutos" y ese número no sale de
 * ningún lado. Aquí ya tenemos con qué responder de verdad: cada pedido
 * entregado guarda a qué punto fue y a qué hora llegó.
 *
 * Cómo se calcula:
 *   1. Se buscan las entregas pasadas CERCA del punto que preguntan (no por
 *      colonia: los nombres de colonia son un desastre y la gente los
 *      escribe de diez maneras distintas).
 *   2. Se toma la MEDIANA, no el promedio. Un pedido que se quedó olvidado
 *      tres horas un domingo no tiene por qué empeorarle el estimado a todo
 *      el barrio; la mediana lo ignora sin tener que andar borrando datos.
 *   3. Si hay menos de 3 entregas cerca, NO se inventa un número. Se dice
 *      que todavía no hay con qué, que es la verdad.
 *
 * Se miran solo los últimos 90 días: cómo se repartía hace un año no dice
 * nada de cómo se reparte hoy.
 */
const RADIO_ZONA_M = 1500;      // qué tan cerca cuenta como "su zona"
const MINIMO_ENTREGAS = 3;      // menos que esto no es un dato, es una anécdota
const DIAS_DE_HISTORIA = 90;

// Distancia en metros entre dos puntos (Haversine).
const distanciaMetros = (a, b) => {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Percentil de una lista YA ordenada.
const percentil = (ordenados, p) => {
  if (!ordenados.length) return null;
  const i = Math.min(ordenados.length - 1, Math.floor((p / 100) * ordenados.length));
  return ordenados[i];
};

orderController.getTiempoPorZona = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Se necesitan lat y lng" });
    }

    const desde = new Date();
    desde.setDate(desde.getDate() - DIAS_DE_HISTORIA);

    const entregados = await orderModel
      .find({
        status: "entregado",
        deliveryType: "delivery",
        deliveredAt: { $ne: null, $gte: desde },
        deliveryLat: { $ne: null },
        deliveryLng: { $ne: null },
      })
      .select("deliveryLat deliveryLng createdAt deliveredAt");

    const punto = { lat, lng };
    const minutos = [];

    for (const o of entregados) {
      const cerca = distanciaMetros(punto, { lat: o.deliveryLat, lng: o.deliveryLng });
      if (cerca > RADIO_ZONA_M) continue;

      // Lo que le importa al cliente es desde que paga hasta que recibe, no
      // solo el rato que el repartidor anduvo en la calle.
      const tardanza = (new Date(o.deliveredAt) - new Date(o.createdAt)) / 60000;

      /*
       * Se descartan los imposibles: entregas "negativas" (alguien movió el
       * estado a mano) y las de más de 4 horas, que casi siempre son un
       * pedido que se marcó entregado al día siguiente, no un reparto lento.
       */
      if (tardanza > 0 && tardanza < 240) minutos.push(tardanza);
    }

    if (minutos.length < MINIMO_ENTREGAS) {
      return res.status(200).json({
        hayDatos: false,
        entregas: minutos.length,
        message: "Todavía no hay suficientes entregas por esa zona",
      });
    }

    minutos.sort((a, b) => a - b);

    // Se redondea a 5 minutos: dar "27 minutos" finge una precisión que no
    // existe, y la gente lo cobra como promesa.
    const aCinco = (n) => Math.max(5, Math.round(n / 5) * 5);

    return res.status(200).json({
      hayDatos: true,
      entregas: minutos.length,
      tipico: aCinco(percentil(minutos, 50)),  // la mitad llega antes de esto
      holgado: aCinco(percentil(minutos, 80)), // 8 de cada 10 llegan antes
      radioMetros: RADIO_ZONA_M,
    });

  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default orderController;
