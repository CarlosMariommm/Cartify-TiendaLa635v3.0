import supplierModel from '../models/supplier.js';
import mongoose from "mongoose";
import { limpiarPedidos } from "../utils/pedidoProveedor.js";

const supplierController = {};

//Select
supplierController.getSupplier = async (req, res) => {
    try {
        const suppliers = await supplierModel.find();
        res.status(200).json(suppliers);
    } catch (error) {
        // El nombre de la función se queda en el log, que es donde sirve.
        console.log("error getSuppliers: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Insert
supplierController.insertSupplier = async (req, res) => {
    try {
        console.log("Nombre de la DB actual:", mongoose.connection.name);

        const { name, phoneNumber, email, creditDays, brandIds, isActive } = req.body;
        // Por dónde se le piden los pedidos (ver utils/pedidoProveedor.js).
        const { pedidos, error: errorPedidos } = limpiarPedidos(req.body.pedidos);
        if (errorPedidos) return res.status(400).json({ message: errorPedidos });

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'El nombre del proveedor es obligatorio' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'El correo del proveedor es obligatorio' });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'El formato del correo no es válido' });
        }

        const existing = await supplierModel.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe un proveedor con ese nombre' });
        }

        const newSupplier = new supplierModel({ name: name.trim(), phoneNumber, email: email.trim(), creditDays, brandIds: brandIds || [], isActive: isActive !== undefined ? isActive : true, ...(pedidos ? { pedidos } : {}) });
        await newSupplier.save();
        res.status(201).json({ message: 'Proveedor creado' });
    } catch (error) {
        console.log("error insertSupplier: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Update
supplierController.updateSupplier = async (req, res) => {
    try {
        //1- Pedimos los datos para actualizar
        let { name, phoneNumber, email, creditDays, brandIds, isActive } = req.body;
        const { pedidos, error: errorPedidos } = limpiarPedidos(req.body.pedidos);
        if (errorPedidos) return res.status(400).json({ message: errorPedidos });

        //Valores requeridos
        if (!name || !phoneNumber || !email) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        // El plazo de crédito ya NO se edita desde este formulario sino desde el estado de cuenta, junto
        // al límite (que es donde tiene sentido verlos). Por eso solo se toca si viene en la petición: si
        // se incluyera siempre, cada edición de datos de contacto borraría el plazo configurado.
        const cambios = { name, phoneNumber, email, brandIds, isActive };
        if (creditDays !== undefined) cambios.creditDays = creditDays;
        // Igual que el plazo: solo si vino (otras pantallas guardan sin él).
        if (pedidos !== undefined) cambios.pedidos = pedidos;

        const updateSupplier = await supplierModel.findByIdAndUpdate(
            req.params.id,
            cambios,
            { new: true }
        );
        
        if (!updateSupplier) {
            return res.status(404).json({ message: 'No se encontró el proveedor' });
        }
        return res.status(200).json({ message: 'Proveedor actualizado' });

    } catch (error) {
        console.log("error updateSupplier: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Delete
supplierController.deleteSupplier = async (req, res) => {
    try {
        const deleteSupplier = await supplierModel.findByIdAndDelete(req.params.id);
        if (!deleteSupplier) {
            // Decía "Admin not found": copiar y pegar de otro controlador.
            // Aquí lo que no aparece es el proveedor.
            return res.status(404).json({ message: 'No se encontró el proveedor' });
        }
        return res.status(200).json({ message: 'Proveedor eliminado' });
    } catch (error) {
        console.log("error deleteSupplier: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export default supplierController;