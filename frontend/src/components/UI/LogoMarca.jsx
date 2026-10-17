import logoTienda from '../../assets/logo-tienda.png';

// LogoMarca — el sello de la tienda en el panel: la placa navy con el tag y "Tienda la 635".
const LogoMarca = ({ height = 44 }) => (
  <img
    src={logoTienda}
    alt="Tienda la 635"
    className="flex-none rounded-2xl"
    style={{ height, width: 'auto' }}
  />
);

export default LogoMarca;
