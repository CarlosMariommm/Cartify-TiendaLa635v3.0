const logoutController = {};

// Cierra SOLO la sesión de cliente. Las dos áreas tienen su propia cookie ("authCookie" para el
// personal, "authCookieCliente" para la tienda) porque la misma persona suele estar conectada como
// las dos cosas en el mismo navegador: el dueño es cliente de su propia tienda.
logoutController.logout = async (req, res) => {
  res.clearCookie("authCookieCliente");

  return res.status(200).json({ message: "Sesión cerrada" });
};

export default logoutController;
