import printMaterialModel from "../models/printMaterial.js";

// MATERIALES DE IMPRESIÓN — printMaterialController.js
// CRUD del papel y la tinta. Mismo molde que printServiceController: los mensajes van en español
// porque viajan tal cual al navegador del cliente.
const printMaterialController = {};

printMaterialController.getMaterials = async (req, res) => {
  try {
    // Los de tipo 'papel' primero y alfabético dentro de cada tipo: así el
    // listado del panel se lee igual todos los días.
    const materiales = await printMaterialModel.find().sort({ tipo: 1, name: 1 });
    return res.status(200).json(materiales);
  } catch (error) {
    console.log("error getMaterials: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Los números llegan como texto desde el formulario. Se limpian aquí y no en el modelo porque un
// "12 hojas" mal tecleado tiene que morir en la puerta, no convertirse en NaN adentro de la base.
const aNumero = (valor, porDefecto = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : porDefecto;
};

printMaterialController.insertMaterial = async (req, res) => {
  try {
    const { name, tipo, esColor, existencia, minimo, unidad, isActive } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "El nombre del material es obligatorio" });
    }

    const material = new printMaterialModel({
      name: String(name).trim(),
      tipo: tipo === 'tinta' ? 'tinta' : 'papel',
      // El color solo tiene sentido en la tinta; en el papel se guarda false
      // para que nadie lo lea después y saque una conclusión equivocada.
      esColor: tipo === 'tinta' ? !!esColor : false,
      existencia: aNumero(existencia),
      minimo: aNumero(minimo),
      unidad: String(unidad || '').trim() || (tipo === 'tinta' ? 'cartuchos' : 'hojas'),
      isActive: isActive !== false,
    });

    await material.save();
    return res.status(201).json({ message: "Material creado" });
  } catch (error) {
    console.log("error insertMaterial: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

printMaterialController.updateMaterial = async (req, res) => {
  try {
    const { name, tipo, esColor, existencia, minimo, unidad, isActive } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "El nombre del material es obligatorio" });
    }

    const cambios = {
      name: String(name).trim(),
      tipo: tipo === 'tinta' ? 'tinta' : 'papel',
      esColor: tipo === 'tinta' ? !!esColor : false,
      existencia: aNumero(existencia),
      minimo: aNumero(minimo),
      unidad: String(unidad || '').trim() || (tipo === 'tinta' ? 'cartuchos' : 'hojas'),
      isActive: isActive !== false,
    };

    const actualizado = await printMaterialModel.findByIdAndUpdate(req.params.id, cambios, { new: true });
    if (!actualizado) return res.status(404).json({ message: "No se encontró el material" });
    return res.status(200).json({ message: "Material actualizado" });
  } catch (error) {
    console.log("error updateMaterial: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Ajuste rápido de existencia, para cuando llega el pedido de papel o se acaba un cartucho.
printMaterialController.ajustarExistencia = async (req, res) => {
  try {
    const { existencia } = req.body;
    const n = Number(existencia);
    if (!Number.isFinite(n) || n < 0) {
      return res.status(400).json({ message: "La existencia debe ser un número de 0 o más" });
    }

    const actualizado = await printMaterialModel.findByIdAndUpdate(
      req.params.id,
      { existencia: n },
      { new: true }
    );
    if (!actualizado) return res.status(404).json({ message: "No se encontró el material" });
    return res.status(200).json({ message: "Existencia actualizada", material: actualizado });
  } catch (error) {
    console.log("error ajustarExistencia: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

printMaterialController.deleteMaterial = async (req, res) => {
  try {
    const borrado = await printMaterialModel.findByIdAndDelete(req.params.id);
    if (!borrado) return res.status(404).json({ message: "No se encontró el material" });
    return res.status(200).json({ message: "Material eliminado" });
  } catch (error) {
    console.log("error deleteMaterial: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default printMaterialController;
