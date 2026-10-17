import { sendEmail } from "./sendMailMailjet.js";

// Envía el archivo del cliente al correo enlazado a la impresora (email-to-print).

// Los únicos formatos que printUpload.js deja subir (ver allowed_formats).
const CONTENT_TYPES = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const sendPrintToPrinter = async ({ fileUrl, fileName, options }) => {
  const printerEmail = process.env.PRINTER_EMAIL;
  if (!printerEmail) return { emailed: false, reason: "no_printer_email" };

  const nombreArchivo = fileName || "documento";
  const extension = nombreArchivo.split(".").pop()?.toLowerCase();
  const contentType = CONTENT_TYPES[extension] || "application/octet-stream";

  // Mailjet pide el adjunto ya en base64 dentro del cuerpo del request, no una URL — a diferencia
  // del "path" que aceptaba Nodemailer. El archivo ya quedó guardado en Cloudinary (fileUrl), así
  // que se descarga de ahí y se recodifica antes de mandarlo.
  const archivo = await fetch(fileUrl);
  if (!archivo.ok) {
    throw new Error(`No se pudo descargar el archivo a imprimir (status ${archivo.status})`);
  }
  const base64Content = Buffer.from(await archivo.arrayBuffer()).toString("base64");

  try {
    await sendEmail(
      printerEmail,
      `Impresión: ${nombreArchivo}`,
      `<p>Nuevo trabajo de impresión.</p><p>Opciones: ${JSON.stringify(options || {})}</p>`,
      `Nuevo trabajo de impresión.\nOpciones: ${JSON.stringify(options || {})}`,
      [
        {
          ContentType: contentType,
          Filename: nombreArchivo,
          Base64Content: base64Content,
        },
      ]
    );
  } catch (mailError) {
    console.log("error enviando trabajo de impresión: " + mailError.message);
    return { emailed: false, reason: "mail_error" };
  }

  return { emailed: true };
};
