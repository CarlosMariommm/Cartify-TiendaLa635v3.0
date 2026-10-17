// Correo con el código de acceso al panel (segundo factor del login de admin). En español, sobrio
// y sin emojis, como el resto de los avisos de la tienda.
const HTML2FAEmail = (code) => {
  return `
    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #F1F6F9; padding: 24px; border: 1px solid #ECE7E1; border-radius: 12px; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1C1614; font-size: 22px; margin-bottom: 12px;">Código de acceso al panel</h1>
      <p style="font-size: 15px; color: #6B6560; line-height: 1.5;">
        Alguien está iniciando sesión en el panel de Tienda la 635 con su cuenta.
        Escriba este código para terminar de entrar:
      </p>
      <div style="display: inline-block; padding: 12px 24px; margin: 20px 0; font-size: 24px; letter-spacing: 4px; font-weight: bold; color: #fff; background-color: #003049; border-radius: 8px;">
        ${code}
      </div>
      <p style="font-size: 13px; color: #9C9691; line-height: 1.5;">
        El código vale por los próximos <strong>10 minutos</strong>. Si no fue usted,
        no comparta este código: alguien tiene su contraseña y conviene cambiarla.
      </p>
    </div>
  `;
};

export default HTML2FAEmail;
