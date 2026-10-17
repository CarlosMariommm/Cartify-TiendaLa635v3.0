import moduleModel from '../models/module.js';
import mongoose from "mongoose";

const moduleController = {};

//Select
moduleController.getModule = async (req, res) => {
    try {
        const modules = await moduleModel.find();
        res.status(200).json(modules);
    } catch (error) {
        // El nombre de la función se queda en el log, que es donde sirve.
        console.log("error getModules: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Insert
moduleController.insertModule = async (req, res) => {
    try {
        console.log("Nombre de la DB actual:", mongoose.connection.name);

        const { name, description, isActive, flujo, icono, orden } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'El nombre del módulo es obligatorio' });
        }

        const existing = await moduleModel.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe un módulo con ese nombre' });
        }

        const newModule = new moduleModel({
            name: name.trim(),
            description,
            isActive: isActive !== undefined ? isActive : true,
            // Por defecto es un pasillo más de la tienda: se compra como todo lo demás.
            flujo: flujo === 'impresiones' ? 'impresiones' : 'estandar',
            icono: icono || '',
            orden: Number(orden) || 0,
        });
        await newModule.save();
        res.status(201).json({ message: 'Módulo creado' });
    } catch (error) {
        console.log("error insertModule: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Update
moduleController.updateModule = async (req, res) => {
    try {
        //1- Pedimos los datos para actualizar
        let { name, description, isActive, flujo, icono, orden } = req.body;

        //Valores requeridos
        if (!name || !description) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const datos = { name, description, isActive };

        // El flujo solo se pisa si viene en la petición: un módulo viejo que todavía no lo tiene no debe
        // volverse 'estandar' porque alguien le corrigió una tilde a la descripción.
        if (flujo !== undefined) datos.flujo = flujo === 'impresiones' ? 'impresiones' : 'estandar';
        if (icono !== undefined) datos.icono = icono;
        if (orden !== undefined) datos.orden = Number(orden) || 0;

        const updateModule = await moduleModel.findByIdAndUpdate(
            req.params.id,
            datos,
            { new: true }
        );
        
        if (!updateModule) {
            return res.status(404).json({ message: 'No se encontró el módulo' });
        }
        return res.status(200).json({ message: 'Módulo actualizado' });

    } catch (error) {
        console.log("error updateModule: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Delete
moduleController.deleteModule = async (req, res) => {
    try {
        const deleteModule = await moduleModel.findByIdAndDelete(req.params.id);
        if (!deleteModule) {
            return res.status(404).json({ message: 'No se encontró el módulo' });
        }
        return res.status(200).json({ message: 'Módulo eliminado' });
    } catch (error) {
        console.log("error deleteModule: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export default moduleController;