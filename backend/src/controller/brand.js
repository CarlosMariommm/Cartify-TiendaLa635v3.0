import brandsModel from '../models/brand.js';
import mongoose from "mongoose";

const brandController = {};

//Select
brandController.getBrand = async (req, res) => {
    try {
        const brands = await brandsModel.find();
        res.status(200).json(brands);
    } catch (error) {
        // El nombre de la función se queda en el log, que es donde sirve:
        // a quien está comprando no le dice nada llamarse "getBrands".
        console.log("error getBrands: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Insert
brandController.insertBrand = async (req, res) => {
    try {
        console.log("Nombre de la DB actual:", mongoose.connection.name);

        const { name, isActive } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'El nombre de la marca es obligatorio' });
        }

        const existing = await brandsModel.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe una marca con ese nombre' });
        }

        const newBrand = new brandsModel({ name: name.trim(), isActive: isActive !== undefined ? isActive : true });
        await newBrand.save();
        // Se devuelve la marca creada, no solo el mensaje. Quien la crea suele necesitarla de inmediato:
        // el formulario de proveedores deja dar de alta una marca sin salirse, y para dejarla marcada al
        // toque necesita su _id.
        res.status(201).json({ message: 'Marca creada', brand: newBrand });
    } catch (error) {
        console.log("error insertBrand: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Update
brandController.updateBrand = async (req, res) => {
    try {
        //1- Pedimos los datos para actualizar
        let { name, isActive } = req.body;

        //Valores requeridos
        if (!name) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const updateBrand = await brandsModel.findByIdAndUpdate(
            req.params.id,
            { name, isActive },
            { new: true }
        );
        
        if (!updateBrand) {
            return res.status(404).json({ message: 'No se encontró la marca' });
        }
        return res.status(200).json({ message: 'Marca actualizada' });

    } catch (error) {
        console.log("error updateBrand: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

//Delete
brandController.deleteBrand = async (req, res) => {
    try {
        const deleteBrand = await brandsModel.findByIdAndDelete(req.params.id);
        if (!deleteBrand) {
            // Decía "Admin not found": copiar y pegar de otro controlador.
            // Aquí lo que no aparece es la marca.
            return res.status(404).json({ message: 'No se encontró la marca' });
        }
        return res.status(200).json({ message: 'Marca eliminada' });
    } catch (error) {
        console.log("error deleteBrand: " + error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export default brandController;