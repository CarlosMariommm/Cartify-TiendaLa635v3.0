// Correo de recuperación de contraseña del cliente. Ahora usa la misma cara que el resto de los
// avisos de la tienda (ver sendMail2FA.js y la verificación de registro en registerClient.js):
// español, sobrio, café.
const HTMLRecoveryEmail = (code) => {
  return `
    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #F1F6F9; padding: 24px; border: 1px solid #ECE7E1; border-radius: 12px; max-width: 600px; margin: 0 auto;">
      <p style="margin:0 0 4px; font-size: 11px; color: #003049; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">Tienda la 635</p>
      <h1 style="color: #1C1614; font-size: 22px; margin-bottom: 12px;">Recuperar contraseña</h1>
      <p style="font-size: 15px; color: #6B6560; line-height: 1.5;">
        Recibimos una solicitud para restablecer su contraseña. Escriba este código para continuar:
      </p>
      <div style="display: inline-block; padding: 12px 24px; margin: 20px 0; font-size: 24px; letter-spacing: 4px; font-weight: bold; color: #fff; background-color: #003049; border-radius: 8px;">
        ${code}
      </div>
      <p style="font-size: 13px; color: #9C9691; line-height: 1.5;">
        El código vale por los próximos <strong>15 minutos</strong>. Si usted no pidió este cambio,
        puede ignorar este correo con tranquilidad: su contraseña sigue igual.
      </p>
    </div>
  `;
};

export default HTMLRecoveryEmail;
