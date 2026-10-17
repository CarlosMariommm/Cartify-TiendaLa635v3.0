// Envío de correos con la API de Mailjet, en vez de Nodemailer por SMTP. Render bloquea los
// puertos 465 y 587 en el plan gratis, para frenar spam masivo — así que Nodemailer funciona en
// local y se cae mudo apenas se despliega, sin ningún aviso claro de por qué.
import Mailjet from "node-mailjet";
import { config } from "../../config.js";

const mailjet = Mailjet.apiConnect(config.mailjet.apiKey, config.mailjet.secretKey);

// Se reutiliza en cualquier controlador que necesite mandar un correo: recuperación de contraseña,
// verificación de registro, código de 2FA, etc.
export const sendEmail = async (to, subject, html, text, attachments, headers) => {
  const result = await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: config.mailjet.fromEmail,
          Name: config.mailjet.fromName,
        },
        To: [{ Email: to }],
        Subject: subject,
        ...(text ? { TextPart: text } : {}),
        HTMLPart: html,
        ...(attachments ? { Attachments: attachments } : {}),
        ...(headers ? { Headers: headers } : {}),
      },
    ],
  });
  return result.body;
};
