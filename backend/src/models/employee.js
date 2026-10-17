// Campos: fullnName, dui, phoneNumber, image, email, userName, password, isActive.

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68932f1a2b3c4d5e6f7a8b30
 *         fullnName:
 *           type: string
 *           description: Nombre completo (el campo del modelo se llama así, con el typo original).
 *           example: María López
 *         dui:
 *           type: string
 *           example: "04512345-6"
 *         phoneNumber:
 *           type: string
 *           example: "70112233"
 *         image:
 *           type: string
 *           example: https://res.cloudinary.com/demo/image/upload/v1/employees/maria.png
 *         email:
 *           type: string
 *           format: email
 *           example: maria.lopez@tienda635.com
 *         userName:
 *           type: string
 *           example: mlopez
 *         password:
 *           type: string
 *           format: password
 *           description: Se guarda tal cual la envía el controlador (sin hashear en este endpoint).
 *         isActive:
 *           type: boolean
 *           default: true
 *       required:
 *         - email
 *         - userName
 *         - password
 *     EmployeeInput:
 *       type: object
 *       description: Payload multipart/form-data. El controlador usa el campo "fullName" (no "fullnName") al leer el body.
 *       properties:
 *         fullName:
 *           type: string
 *         dui:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         userName:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *         image:
 *           type: string
 *           format: binary
 *       required:
 *         - fullName
 *         - dui
 *         - phoneNumber
 *         - email
 *         - userName
 *         - password
 */

import{ Schema, model } from 'mongoose';

const employeeSchema = new Schema({
    fullnName: { type:"String"},
    dui: { type:"String"},
    phoneNumber: { type:"String"},
    image: { type:"String"},
    public_id: { type:"String"},
    email: { type:"String"},
    userName: { type:"String"},
    password: { type:"String"},
    isActive: { type:"Boolean", default:true},

    // Bloqueo por intentos fallidos al iniciar sesión — igual que el admin.
    loginAttemps: { type: Number, default: 0 },
    timeOut: { type: Date, default: null },

    // Los teléfonos donde suena cada pedido nuevo, mientras tenga la sesión
    // abierta en la app. Ver utils/avisosPersonal.js.
    pushTokens: { type: [String], default: [], select: false },
},
{
    timestamps: true,
    strict: false
}
);

export default model('employeeModel', employeeSchema, "Employees");