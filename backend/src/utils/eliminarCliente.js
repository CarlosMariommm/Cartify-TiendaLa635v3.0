import { v2 as cloudinary } from "cloudinary";
import clientModel from "../models/client.js";
import orderModel from "../models/order.js";
import reviewModel from "../models/review.js";
import loyaltyLedgerModel from "../models/loyaltyLedger.js";
import kioskSessionModel from "../models/kioskSession.js";

// ELIMINAR UN CLIENTE — eliminarCliente.js
// Borra su nombre, correo, teléfono, direcciones y foto; sus pedidos quedan en la contabilidad,
// pero sin su nombre (lo que promete la política de privacidad).

const EN_CURSO = ["pagado", "preparando", "en_camino", "listo"];

// Un archivo de Cloudinary puede ser imagen o "raw" (un PDF raro, un .docx):
// se prueba con los dos tipos. Si falla, no detiene el borrado de la cuenta.
const borrarArchivo = async (publicId) => {
  if (!publicId) return false;
  for (const tipo of ["image", "raw"]) {
    try {
      const r = await cloudinary.uploader.destroy(publicId, { resource_type: tipo });
      if (r?.result === "ok") return true;
    } catch {
      // Se intenta con el otro tipo; si tampoco, queda en el registro de abajo.
    }
  }
  console.log(`eliminar cliente: no se pudo borrar el archivo ${publicId} de Cloudinary`);
  return false;
};

export const eliminarCliente = async (clientId) => {
  const cliente = await clientModel.findById(clientId).select("public_id fullName");
  if (!cliente) return { ok: false, codigo: 404, message: "No se encontró el cliente" };

  const enCurso = await orderModel.countDocuments({ clientId, status: { $in: EN_CURSO } });
  if (enCurso) {
    return {
      ok: false,
      codigo: 409,
      message: `${cliente.fullName || "Este cliente"} tiene ${enCurso === 1 ? "un pedido en curso" : `${enCurso} pedidos en curso`}. Entréguelo o cancélelo antes de eliminar la cuenta.`,
    };
  }

  // 1. Los archivos de sus impresiones, antes de que el pedido pierda la referencia.
  const impresiones = await orderModel
    .find({ clientId, "printJob.public_id": { $exists: true, $ne: "" } })
    .select("printJob.public_id")
    .lean();
  let archivos = 0;
  for (const p of impresiones) {
    if (await borrarArchivo(p.printJob.public_id)) archivos += 1;
  }

  // 2. Los pedidos se quedan, sin nada que lleve a su casa.
  const pedidos = await orderModel.updateMany(
    { clientId },
    {
      $set: { clienteEliminado: true },
      $unset: {
        deliveryAddress: "",
        deliveryReference: "",
        deliveryLat: "",
        deliveryLng: "",
        courier: "",
        "printJob.fileUrl": "",
        "printJob.public_id": "",
        "serviceRating.comment": "",
      },
    }
  );

  // 3. Lo demás que era suyo.
  const resenas = await reviewModel.deleteMany({ clientId });
  const lotes = await loyaltyLedgerModel.deleteMany({ clientId });
  await kioskSessionModel.deleteMany({ clientId });

  // 4. La foto y, por último, la cuenta.
  if (cliente.public_id) await borrarArchivo(cliente.public_id);
  await clientModel.findByIdAndDelete(clientId);

  return {
    ok: true,
    resumen: {
      pedidos: pedidos.modifiedCount,
      resenas: resenas.deletedCount,
      lotesDePuntos: lotes.deletedCount,
      archivos,
    },
  };
};
