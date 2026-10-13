/*
Campos:
    email: String,
    userName: String,
    password: String,
    image: String,       // foto de perfil (Cloudinary)
    public_id: String,   // id de esa foto en Cloudinary, para poder reemplazarla
    isActive: Boolean,
*/

/**
 * @swagger
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68932f1a2b3c4d5e6f7a8b10
 *         email:
 *           type: string
 *           format: email
 *           example: admin@tienda635.com
 *         userName:
 *           type: string
 *           example: admin_principal
 *         password:
 *           type: string
 *           format: password
 *           description: Hash bcrypt. Nunca se expone en las respuestas.
 *         isActive:
 *           type: boolean
 *           default: true
 *         loginAttemps:
 *           type: number
 *           description: Intentos fallidos consecutivos.
 *           example: 0
 *         timeOut:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Fecha hasta la cual la cuenta queda bloqueada por intentos fallidos.
 *       required:
 *         - email
 *         - userName
 *         - password
 *     AdminLoginInput:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: admin@tienda635.com
 *         password:
 *           type: string
 *           format: password
 *           example: SuperSecreta123
 *       required:
 *         - email
 *         - password
 */

import{ Schema, model } from 'mongoose';

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    userName: { type: String, required: true },
    password: { type: String, required: true },
    // Foto de perfil, opcional: sin ella el avatar muestra las iniciales.
    image: { type: String },
    public_id: { type: String },
    isActive: { type: Boolean, default: true },

    loginAttemps: {
      type: Number,
      default: 0,
    },

    timeOut: {
      type: Date,
      default: null,
    },

    // Los teléfonos donde suena cada pedido nuevo, mientras tenga la sesión
    // abierta en la app. Ver utils/avisosPersonal.js.
    pushTokens: { type: [String], default: [], select: false },
  },
  {
    timestamps: true,
    strict: false,
  }
);

export default model("adminModel", adminSchema, "Admins");