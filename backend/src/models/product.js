// Campos: name, image, expirationDate, priceCost, salePrice, description, barCode, stock,
// isActive.

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68932f1a2b3c4d5e6f7a8b9c
 *         name:
 *           type: string
 *           example: Arroz Diana 500g
 *         image:
 *           type: string
 *           description: URL de la imagen almacenada en Cloudinary.
 *           example: https://res.cloudinary.com/demo/image/upload/v1/products/arroz.png
 *         typeId:
 *           type: string
 *           description: ObjectId del tipo de producto (ref productTypeModel).
 *           example: 68932f1a2b3c4d5e6f7a8b01
 *         brandId:
 *           type: string
 *           description: ObjectId de la marca (ref brandsModel).
 *           example: 68932f1a2b3c4d5e6f7a8b02
 *         expirationDate:
 *           type: string
 *           format: date
 *           example: 2026-12-31
 *         priceCost:
 *           type: number
 *           example: 2500
 *         salePrice:
 *           type: number
 *           example: 3200
 *         description:
 *           type: string
 *           example: Arroz blanco grano largo, bolsa de 500 gramos.
 *         barCode:
 *           type: string
 *           example: "7701234567890"
 *         stock:
 *           type: number
 *           example: 40
 *         moduleId:
 *           type: string
 *           description: ObjectId del módulo/estante (ref moduleModel).
 *           example: 68932f1a2b3c4d5e6f7a8b03
 *         supplierId:
 *           type: string
 *           description: ObjectId del proveedor (ref supplierModel).
 *           example: 68932f1a2b3c4d5e6f7a8b04
 *         isActive:
 *           type: boolean
 *           default: true
 *       required:
 *         - name
 *         - typeId
 *         - brandId
 *         - priceCost
 *         - salePrice
 *         - description
 *         - barCode
 *         - stock
 *         - moduleId
 *         - supplierId
 *     ProductInput:
 *       type: object
 *       description: Payload multipart/form-data para crear o actualizar un producto.
 *       properties:
 *         name:
 *           type: string
 *         image:
 *           type: string
 *           format: binary
 *         typeId:
 *           type: string
 *         brandId:
 *           type: string
 *         expirationDate:
 *           type: string
 *           format: date
 *         priceCost:
 *           type: number
 *         salePrice:
 *           type: number
 *         description:
 *           type: string
 *         barCode:
 *           type: string
 *         stock:
 *           type: number
 *         moduleId:
 *           type: string
 *         supplierId:
 *           type: string
 *       required:
 *         - name
 *         - typeId
 *         - brandId
 *         - priceCost
 *         - salePrice
 *         - description
 *         - barCode
 *         - stock
 *         - moduleId
 *         - supplierId
 */

import{ Schema, model } from 'mongoose';

const productSchema = new Schema({
    name: { type:"String"},
    image: { type:["String"]},
    typeId: { type: Schema.Types.ObjectId, ref: "productTypeModel"},
    brandId: { type: Schema.Types.ObjectId, ref: "brandsModel"},
    expirationDate: { type: Date},
    priceCost: { type: Number},
    salePrice: { type: Number},
    description: { type:"String"},
    barCode: { type:"String"},
    // Cómo se vende: por pieza o por peso. Cambia el significado de los DOS campos de abajo: con
    // 'libra', `salePrice` es el precio de UNA libra y `stock` son libras (y puede llevar decimales —
    // 3.5 libras de queso es una existencia normal).
    unidadVenta: { type: String, enum: ["unidad", "libra"], default: "unidad" },
    // Cuántas PIEZAS son esas libras. Opcional y solo informativo: 15 libras de queso pueden ser tres
    // bloques o veinte porciones, y esa diferencia importa para acomodar la vitrina y para saber qué
    // pedirle al proveedor. No se cobra por aquí — se cobra por libra.
    piezas: { type: Number },
    // Venta restringida a mayores de edad: licores, cigarros. Marca el producto en el inventario y en
    // la tienda, y avisa en el carrito que se pedirá documento al entregar.
    soloAdultos: { type: Boolean, default: false },
    stock: { type: Number},
    moduleId: { type: Schema.Types.ObjectId, ref: "moduleModel"},
    supplierId: { type: Schema.Types.ObjectId, ref: "supplierModel"},
    isActive: { type: Boolean, default: true}
},
{
    timestamps: true,
    strict: false
});

export default model('productModel', productSchema, "Products");