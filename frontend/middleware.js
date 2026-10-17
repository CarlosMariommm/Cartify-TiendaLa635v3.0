// VISTA PREVIA DE LOS ENLACES — middleware.js (Vercel)
// La tienda es una sola página que arma React en el navegador.

export const config = { matcher: ['/producto/:path*', '/sitemap.xml'] };

const API = (process.env.VITE_API_URL || 'https://cartify-tiendala635.onrender.com/api').replace(/\/$/, '');
const TIENDA = 'Tienda la 635';
const ESPERA_MAXIMA = 3500;

// Los lectores de enlaces y los buscadores. Una persona con su navegador no entra aquí.
const LECTOR = /bot|crawler|spider|facebookexternalhit|facebookcatalog|whatsapp|telegram|slack|discord|linkedin|twitter|pinterest|skype|applebot|embedly|vkshare|redditbot|preview/i;

// Seguir de largo: Vercel sirve lo que serviría sin esto (la tienda).
const seguir = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

// Con tope de espera: un lector de enlaces no aguarda más de unos segundos.
const conPlazo = (url) => {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA);
  return fetch(url, { signal: corte.signal }).finally(() => clearTimeout(reloj));
};

const escapar = (texto) => String(texto ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// La foto en 1200 × 630 (lo que piden WhatsApp y Facebook), centrada sobre blanco y en JPG: las
// fotos de la tienda son WebP con fondo transparente, y algunos lectores no muestran ninguna de
// las dos cosas.
const fotoParaCompartir = (url) => {
  if (typeof url !== 'string' || !url.includes('/image/upload/')) return null;
  return url.replace('/image/upload/', '/image/upload/f_jpg,q_auto,c_pad,w_1200,h_630,b_rgb:FFFFFF/');
};

const precioEnTexto = (p) => {
  const precio = `$${Number(p.salePrice || 0).toFixed(2)}`;
  return p.unidadVenta === 'libra' ? `${precio} la libra` : precio;
};

// Cambia el content="" de una etiqueta <meta> ya presente en index.html.
const ponerMeta = (html, atributo, nombre, valor) =>
  html.replace(
    new RegExp(`(<meta ${atributo}="${nombre}" content=")[^"]*(")`),
    `$1${escapar(valor)}$2`
  );

const vistaDeProducto = async (request, id) => {
  const origen = new URL(request.url).origin;
  const [respProducto, respPagina] = await Promise.all([
    conPlazo(`${API}/product/${encodeURIComponent(id)}`),
    fetch(new URL('/index.html', origen)),
  ]);
  if (!respProducto.ok || !respPagina.ok) return null;

  const p = await respProducto.json();
  if (!p || Array.isArray(p) || !p.name) return null;
  let html = await respPagina.text();

  const titulo = `${p.name} · ${TIENDA}`;
  const detalle = [precioEnTexto(p), p.brandId?.name, p.typeId?.type].filter(Boolean).join(' · ');
  const descripcion = `${detalle}. Pídelo en ${TIENDA} y te lo llevamos a la puerta, o pasa a recogerlo.`;
  const url = `${origen}/producto/${id}`;
  const foto = fotoParaCompartir(Array.isArray(p.image) ? p.image[0] : p.image);

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapar(titulo)}</title>`);
  html = ponerMeta(html, 'name', 'description', descripcion);
  html = ponerMeta(html, 'property', 'og:type', 'product');
  html = ponerMeta(html, 'property', 'og:title', titulo);
  html = ponerMeta(html, 'property', 'og:description', descripcion);
  html = ponerMeta(html, 'property', 'og:url', url);
  if (foto) {
    html = ponerMeta(html, 'property', 'og:image', foto);
    html = ponerMeta(html, 'property', 'og:image:alt', p.name);
  }
  // El precio también como dato, para quien lo sepa leer (Facebook, Google).
  html = html.replace('</head>', `    <meta property="product:price:amount" content="${Number(p.salePrice || 0).toFixed(2)}" />\n    <meta property="product:price:currency" content="USD" />\n    <link rel="canonical" href="${escapar(url)}" />\n  </head>`);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600',
    },
  });
};

const mapaDelSitio = async (request) => {
  const origen = new URL(request.url).origin;
  const fijas = ['/', '/impresiones', '/terminos', '/privacidad', '/cookies', '/devoluciones'];
  let productos = [];
  try {
    const resp = await conPlazo(`${API}/product`);
    if (resp.ok) productos = (await resp.json()).filter((p) => p && p.isActive !== false && p._id);
  } catch {
    // Sin servidor, al menos las páginas fijas.
  }
  const entrada = (ruta, fecha) => `  <url><loc>${escapar(origen + ruta)}</loc>${fecha ? `<lastmod>${new Date(fecha).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...fijas.map((r) => entrada(r)),
    ...productos.map((p) => entrada(`/producto/${p._id}`, p.updatedAt)),
    '</urlset>',
  ].join('\n');
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
};

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  if (pathname === '/sitemap.xml') return mapaDelSitio(request);

  const id = pathname.match(/^\/producto\/([a-f0-9]{24})\/?$/i)?.[1];
  if (!id || !LECTOR.test(request.headers.get('user-agent') || '')) return seguir();

  try {
    return (await vistaDeProducto(request, id)) || seguir();
  } catch {
    return seguir();
  }
}
