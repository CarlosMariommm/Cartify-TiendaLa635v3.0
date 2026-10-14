import productModel from "../models/product.js";
import { anotarProductoNuevo } from "../utils/avisosCliente.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { CAMPOS_PUBLICOS_PRODUCTO } from "../utils/productoPublico.js";
import { obtenerTambienLlevan } from "../utils/tambienLlevan.js";

const productController = {};

/*
 * SELECT — el catálogo de la tienda, público.
 *
 * Lo piden la tienda web, el kiosco y la app (también la que ya está
 * instalada), así que va solo lo que ve un cliente; ver utils/productoPublico.js.
 * De categoría, marca y pasillo, apenas el nombre: es lo único que se pinta.
 */
productController.getProduct = async (req, res) => {

  try {

    const products = await productModel.find({}, CAMPOS_PUBLICOS_PRODUCTO)
      .populate("typeId", "type")
      .populate("brandId", "name")
      .populate("moduleId", "name")
      .lean();

    return res.status(200).json(products);

  } catch (error) {

    console.log("error " + error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

/*
 * SELECT — el inventario completo, para el panel.
 *
 * Lo que la tienda no enseña: costo, proveedor poblado, código de barras,
 * vencimiento. Lo usan el inventario, el aviso de promo bajo costo y el PDF
 * "Inventario completo" del dashboard. Este último lo descarga también el
 * empleado, por eso la ruta pide personal y no solo admin.
 */
productController.getInventario = async (req, res) => {

  try {

    const products = await productModel.find()
      .populate("typeId")
      .populate("brandId")
      .populate("moduleId")
      .populate("supplierId");

    return res.status(200).json(products);

  } catch (error) {

    console.log("error " + error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

/*
 * Un solo producto, con lo que se puede mostrar en público.
 *
 * GET /product/:id caía en getProduct y devolvía el catálogo entero sin mirar
 * el id. Ahora devuelve solo ese producto, y solo lo que ve un cliente: lo usa
 * la vista previa al compartir un enlace (frontend/middleware.js), que no
 * tiene por qué saber el costo ni el proveedor.
 */
productController.getProductById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Ese producto no existe" });
  }
  try {
    const producto = await productModel.findById(id, CAMPOS_PUBLICOS_PRODUCTO)
      .populate("typeId", "type")
      .populate("brandId", "name")
      .lean();
    if (!producto || producto.isActive === false) {
      return res.status(404).json({ message: "Ese producto no existe" });
    }
    return res.status(200).json(producto);
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/*
 * Quien compra esto también lleva: { productos: { id: [ids] } } para TODO el
 * catálogo de una vez, así la ficha de cada producto lo tiene al instante.
 * Público como el catálogo: solo ids, ningún dato de quién compró. Ver
 * utils/tambienLlevan.js.
 */
productController.getTambienLlevan = async (req, res) => {
  try {
    const productos = await obtenerTambienLlevan();
    res.set("Cache-Control", "public, max-age=600");
    return res.status(200).json({ productos });
  } catch (error) {
    console.log("error getTambienLlevan: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// INSERT
productController.insertProduct = async (req, res) => {

  try {

    console.log("Nombre de la DB actual:", mongoose.connection.name);

    // Solicito datos
    const {
      name,
      typeId,
      brandId,
      expirationDate,
      priceCost,
      salePrice,
      description,
      barCode,
      stock,
      moduleId,
      supplierId,
      // 'unidad' o 'libra'. Cambia qué significan salePrice y stock; ver el
      // modelo y frontend/src/utils/unidades.js.
      unidadVenta,
      piezas,
      soloAdultos
    } = req.body;

    // Validación
    if (
      !name ||
      !typeId ||
      !brandId ||
      !priceCost ||
      !salePrice ||
      !description ||
      !barCode ||
      !stock ||
      !moduleId ||
      !supplierId ||
      !req.file
    ) {
      return res.status(400).json({
        message: "Faltan campos obligatorios"
      });
    }

    const existingProduct = await productModel.findOne({ barCode });
    if (existingProduct) {
      return res.status(400).json({
        message: "El código de barras ya está en uso."
      });
    }

    const newProduct = new productModel({
      name,
      image: req.file.path,
      public_id: req.file.filename,
      typeId,
      brandId,
      expirationDate,
      priceCost,
      salePrice,
      description,
      barCode,
      stock,
      maxQuantity: stock,
      // Solo se acepta lo que el modelo conoce; cualquier otra cosa cae en
      // 'unidad', que es como se comportaba la tienda antes de que esto
      // existiera.
      unidadVenta: unidadVenta === "libra" ? "libra" : "unidad",
      // Vacío queda como no declarado, no como cero: "0 piezas" diría algo
      // falso sobre lo que hay en la vitrina.
      piezas: piezas === "" || piezas === undefined ? undefined : Number(piezas),
      // Llega como texto desde el FormData: "false" es una cadena con valor
      // verdadero, así que se compara contra "true" en vez de castear.
      soloAdultos: String(soloAdultos) === "true",
      moduleId,
      supplierId
    });

    await newProduct.save();

    /*
     * El aviso a quien pidió enterarse de los productos nuevos.
     *
     * No manda nada ahora: apunta el producto en un lote y espera unos minutos
     * a ver si vienen más. Quien carga inventario sube treinta cosas de
     * corrido, y treinta correos seguidos de la misma tienda es la receta
     * exacta para acabar en spam el mismo día. Ver utils/avisosCliente.js.
     */
    anotarProductoNuevo({
      nombre: newProduct.name,
      precio: newProduct.salePrice,
      imagen: Array.isArray(newProduct.image) ? newProduct.image[0] : newProduct.image,
    });

    return res.status(201).json({
      message: "Producto creado"
    });

  } catch (error) {

    console.log("error " + error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// UPDATE
productController.updateProduct = async (req, res) => {

  try {

    const {
      name,
      typeId,
      brandId,
      expirationDate,
      priceCost,
      salePrice,
      description,
      barCode,
      stock,
      moduleId,
      supplierId,
      // 'unidad' o 'libra'. Cambia qué significan salePrice y stock; ver el
      // modelo y frontend/src/utils/unidades.js.
      unidadVenta,
      piezas,
      soloAdultos
    } = req.body;

    // Validación
    if (
      !name ||
      !typeId ||
      !brandId ||
      !priceCost ||
      !salePrice ||
      !description ||
      !barCode ||
      !stock ||
      !moduleId ||
      !supplierId
    ) {
      return res.status(400).json({
        message: "Faltan campos obligatorios"
      });
    }

    const existingProduct = await productModel.findOne({ barCode, _id: { $ne: req.params.id } });
    if (existingProduct) {
      return res.status(400).json({
        message: "El código de barras ya está en uso por otro producto."
      });
    }

    const productFound = await productModel.findById(req.params.id);

    if (!productFound) {
      return res.status(404).json({
        message: "No se encontró el producto"
      });
    }

    const updatedData = {
      name,
      typeId,
      brandId,
      expirationDate,
      priceCost,
      salePrice,
      description,
      barCode,
      stock,
      maxQuantity: Math.max(stock, productFound.maxQuantity || stock),
      moduleId,
      supplierId
    };

    // Solo se toca si viene: editar el precio no tiene por qué cambiar la
    // forma en que se vende el producto.
    if (unidadVenta !== undefined) {
      updatedData.unidadVenta = unidadVenta === "libra" ? "libra" : "unidad";
    }
    if (piezas !== undefined) {
      updatedData.piezas = piezas === "" ? null : Number(piezas);
    }
    if (soloAdultos !== undefined) {
      updatedData.soloAdultos = String(soloAdultos) === "true";
    }

    // Si viene nueva imagen
    if (req.file) {

      // Elimino imagen anterior
      await cloudinary.uploader.destroy(productFound.public_id);

      // Guardo nueva imagen
      updatedData.image = req.file.path;
      updatedData.public_id = req.file.filename;
    }

    await productModel.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    return res.status(200).json({
      message: "Producto actualizado"
    });

  } catch (error) {

    console.log("error " + error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// DELETE
productController.deleteProduct = async (req, res) => {

  try {

    const productFound = await productModel.findById(req.params.id);

    if (!productFound) {
      return res.status(404).json({
        message: "No se encontró el producto"
      });
    }

    // Eliminar imagen de Cloudinary
    await cloudinary.uploader.destroy(productFound.public_id);

    // Eliminar producto
    await productModel.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Producto eliminado"
    });

  } catch (error) {

    console.log("error " + error);

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

export default productController;