/*
Campos:
    name: String,
    phoneNumber: String,
    email: String,
    creditDays: String,
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Supplier:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68932f1a2b3c4d5e6f7a8b40
 *         name:
 *           type: string
 *           example: Distribuidora Central S.A.
 *         phoneNumber:
 *           type: string
 *           example: "22334455"
 *         email:
 *           type: string
 *           format: email
 *           example: contacto@distribuidoracentral.com
 *         creditDays:
 *           type: string
 *           example: "30"
 *         brandIds:
 *           type: array
 *           items:
 *             type: string
 *           description: ObjectIds de las marcas asociadas a este proveedor.
 *         isActive:
 *           type: boolean
 *           default: true
 *       required:
 *         - name
 *         - email
 *     SupplierInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Distribuidora Central S.A.
 *         phoneNumber:
 *           type: string
 *           example: "22334455"
 *         email:
 *           type: string
 *           format: email
 *           example: contacto@distribuidoracentral.com
 *         creditDays:
 *           type: string
 *           example: "30"
 *         brandIds:
 *           type: array
 *           items:
 *             type: string
 *         isActive:
 *           type: boolean
 *       required:
 *         - name
 *         - phoneNumber
 *         - email
 *         - creditDays
 */

import{ Schema, model } from 'mongoose';

const supplierSchema = new Schema({
    name: { type:"String"},
    phoneNumber: { type:"String"},
    email: { type:"String"},
    // Plazo que da el proveedor para pagar (en días). Viene como texto de datos
    // viejos, por eso se convierte con Number() antes de usarlo.
    creditDays: { type:"String"},
    /*
     * Techo de crédito que el proveedor le otorgó a la tienda. El crédito
     * DISPONIBLE no se guarda: se calcula restándole la deuda actual, que a su
     * vez sale de los movimientos. Guardar un "disponible" sería tener el mismo
     * dato en dos lugares, y tarde o temprano uno de los dos queda mal.
     */
    creditLimit: { type: Number, default: 0 },
    /*
     * Por dónde se le hacen los pedidos (WhatsApp, una app como BEES, o
     * llamada), para pedirle con un toque desde la compra sugerida del
     * pronóstico. Ver utils/pedidoProveedor.js.
     */
    pedidos: {
      canal: { type: String, enum: ["whatsapp", "app", "llamada", ""], default: "" },
      whatsapp: { type: String, default: "" },
      app: { type: String, default: "" },
      enlace: { type: String, default: "" },
    },
},
{
    timestamps: true,
    strict: false
}
);

export default model('supplierModel', supplierSchema, "Suppliers");