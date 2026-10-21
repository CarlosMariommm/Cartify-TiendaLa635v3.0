import storeSettingsModel, { CLAVE_UNICA, FIGURAS_DE_TEMPORADA } from "../models/storeSettings.js";
import { limpiarDisfraces } from "../utils/disfracesTiqui.js";

// AJUSTES DE LA TIENDA — storeSettingsController.js
// Un solo documento para toda la tienda. Ver src/models/storeSettings.js.

const storeSettingsController = {};

// Los campos que el panel puede cambiar con el PUT de los ajustes, por lista blanca: nada de `_id`,
// fechas ni campos inventados. `logoUrl` no está: el logo solo lo escriben updateLogo y deleteLogo.
const CAMPOS_DE_TEXTO = ["nombreLinea1", "nombreLinea2", "lema", "direccion", "ubicacionTiendaTexto"];

// Campos numéricos que el panel puede cambiar: las dos piezas del envío por distancia (tarifa base
// y precio por km) y la tarifa de servicio. Se validan aparte de los de texto porque un número mal
// formado o negativo tiene que rebotar como error del cliente (400), no guardarse.
const CAMPOS_NUMERICOS = ["envioBase", "envioPorKm", "servicioValor"];

const MODOS_DE_TEMPORADA = ["automatico", "manual", "ninguno"];

// Las claves de las temporadas de fábrica (frontend/src/utils/temporadas.js). Una temporada creada
// por el dueño no puede llamarse igual: al elegirla a mano no se sabría cuál de las dos manda.
const CLAVES_DE_FABRICA = ["navidad", "halloween", "independencia", "san-valentin"];
const MAXIMO_DE_TEMPORADAS_PROPIAS = 12;
const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const ES_HEX = /^#[0-9a-fA-F]{6}$/;

// "Regreso a clases" -> "regreso-a-clases". Sin tildes ni símbolos.
const aSlug = (texto) =>
  String(texto)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "temporada";

const fechaValida = (f) => {
  const mes = Number(f?.mes);
  const dia = Number(f?.dia);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return null;
  if (!Number.isInteger(dia) || dia < 1 || dia > DIAS_POR_MES[mes - 1]) return null;
  return { mes, dia };
};

// Revisa y limpia la lista de temporadas propias que manda el panel. Devuelve { lista } o { error
// } con un mensaje que dice cuál está mal y por qué.
const limpiarTemporadasPropias = (entrada) => {
  if (!Array.isArray(entrada)) return { error: "Las temporadas propias no son válidas" };
  if (entrada.length > MAXIMO_DE_TEMPORADAS_PROPIAS) {
    return { error: `Se pueden crear hasta ${MAXIMO_DE_TEMPORADAS_PROPIAS} temporadas propias` };
  }

  const usadas = new Set(CLAVES_DE_FABRICA);
  const lista = [];

  for (const t of entrada) {
    if (!t || typeof t !== "object") continue;
    const nombre = String(t.nombre ?? "").trim().slice(0, 40);
    if (!nombre) return { error: "Cada temporada necesita un nombre" };

    const desde = fechaValida(t.desde);
    const hasta = fechaValida(t.hasta);
    if (!desde || !hasta) return { error: `Las fechas de "${nombre}" no son válidas` };

    if (!ES_HEX.test(t.colorPrincipal || "") || !ES_HEX.test(t.colorAcento || "")) {
      return { error: `Los colores de "${nombre}" no son válidos` };
    }

    const figura = FIGURAS_DE_TEMPORADA.includes(t.figura) ? t.figura : "confeti";

    let clave = /^propia-[a-z0-9-]{1,50}$/.test(t.clave || "") ? t.clave : `propia-${aSlug(nombre)}`;
    // Dos con el mismo nombre no pueden compartir clave.
    for (let n = 2; usadas.has(clave); n++) clave = `propia-${aSlug(nombre)}-${n}`;
    usadas.add(clave);

    lista.push({
      clave,
      nombre,
      desde,
      hasta,
      colorPrincipal: t.colorPrincipal.toUpperCase(),
      colorAcento: t.colorAcento.toUpperCase(),
      figura,
      saludo: String(t.saludo ?? "").trim().slice(0, 160),
    });
  }
  return { lista };
};

// SELECT — Los ajustes actuales. Si no existen todavía, se crean con los
// valores por defecto para que el frontend siempre reciba la misma forma.
storeSettingsController.getSettings = async (req, res) => {
  try {
    // Un solo findOneAndUpdate con upsert en vez de "buscar y si no hay, crear": ese par de pasos deja
    // una rendija entre los dos en la que otra petición puede crear su propio documento. Con el índice
    // único de `clave` (ver el modelo), aquí solo puede existir uno.
    const ajustes = await storeSettingsModel.findOneAndUpdate(
      { clave: CLAVE_UNICA },
      { $setOnInsert: { clave: CLAVE_UNICA } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json(ajustes);
  } catch (error) {
    console.log("error ajustes de tienda: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// UPDATE — Guarda lo que venga, campo por campo.
storeSettingsController.updateSettings = async (req, res) => {
  try {
    const cambios = {};

    // Texto. Se recorta y se comprueba que el nombre no quede en blanco: una tienda sin nombre en el
    // encabezado se ve como si la página se hubiera cargado a medias.
    CAMPOS_DE_TEXTO.forEach((campo) => {
      if (req.body[campo] === undefined) return;
      cambios[campo] = String(req.body[campo]).trim();
    });

    if (cambios.nombreLinea1 !== undefined && !cambios.nombreLinea1) {
      return res.status(400).json({ message: "La primera línea del nombre no puede quedar vacía" });
    }

    // Números. Se rechaza lo que no sea un número finito y no negativo: un costo de envío en blanco,
    // con letras o negativo no tiene sentido y no debe pisar el valor bueno que ya estaba guardado.
    for (const campo of CAMPOS_NUMERICOS) {
      if (req.body[campo] === undefined) continue;
      const valor = Number(req.body[campo]);
      if (!Number.isFinite(valor) || valor < 0) {
        return res.status(400).json({ message: "El costo de envío tiene que ser un número válido" });
      }
      cambios[campo] = valor;
    }

    // Secciones de la portada. Solo se guardan la clave, si se ve y en qué posición: el título y el
    // contenido de cada fila los pone el frontend, que es quien sabe armarlas.
    if (Array.isArray(req.body.secciones)) {
      cambios.secciones = req.body.secciones
        .filter((s) => s && typeof s.clave === "string" && s.clave.trim())
        .map((s, i) => ({
          clave: s.clave.trim(),
          visible: s.visible !== false,
          // Si no mandan orden, manda la posición en el arreglo: es lo que el
          // panel acaba de dejar al arrastrar.
          orden: Number.isFinite(Number(s.orden)) ? Number(s.orden) : i,
        }));
    }

    // Temporada, campo por campo y con NOTACIÓN DE PUNTOS. O sea que mandar solo `tema` devolvía
    // `modo` a 'automatico', y mandar solo `modo` borraba el tema. Silenciosamente, sin error.
    if (req.body.temporada && typeof req.body.temporada === "object") {
      const { modo, tema, decoracion, saludos, saludoNormal, personalizados, disfraces, ocultas } = req.body.temporada;

      if (modo !== undefined) {
        if (!MODOS_DE_TEMPORADA.includes(modo)) {
          return res.status(400).json({ message: "Ese modo de temporada no existe" });
        }
        cambios["temporada.modo"] = modo;
      }
      if (tema !== undefined) cambios["temporada.tema"] = String(tema).trim();
      if (decoracion !== undefined) cambios["temporada.decoracion"] = !!decoracion;

      // Los saludos personalizados, uno por tema. Se manda el objeto completo cada vez (igual que
      // zonasEnvio o secciones): más simple que mezclar clave por clave, y aquí no hay carrera que
      // perder porque solo lo edita el dueño desde un solo panel.
      if (saludos !== undefined) {
        if (typeof saludos !== "object" || saludos === null || Array.isArray(saludos)) {
          return res.status(400).json({ message: "Los saludos de temporada no son válidos" });
        }
        const limpios = {};
        for (const [clave, texto] of Object.entries(saludos)) {
          const recortado = String(texto ?? "").trim().slice(0, 160);
          if (recortado) limpios[clave] = recortado;
        }
        cambios["temporada.saludos"] = limpios;
      }

      if (saludoNormal !== undefined) {
        cambios["temporada.saludoNormal"] = String(saludoNormal ?? "").trim().slice(0, 160);
      }

      // Los disfraces de Tiqui, uno por temporada. Igual que los saludos, se manda el objeto completo
      // cada vez.
      if (disfraces !== undefined) {
        const limpios = limpiarDisfraces(disfraces);
        if (limpios.error) return res.status(400).json({ message: limpios.error });
        cambios["temporada.disfraces"] = limpios.disfraces;
      }

      if (personalizados !== undefined) {
        const { lista, error } = limpiarTemporadasPropias(personalizados);
        if (error) return res.status(400).json({ message: error });
        cambios["temporada.personalizados"] = lista;

        // Si la que estaba elegida a mano se borró, se suelta la elección: un modo manual apuntando a una
        // temporada que ya no existe deja la tienda sin colores y el panel sin nada marcado, sin explicar
        // por qué.
        if (tema === undefined) {
          const actuales = await storeSettingsModel.findOne({ clave: CLAVE_UNICA }).select("temporada.tema").lean();
          const elegida = actuales?.temporada?.tema || "";
          if (elegida.startsWith("propia-") && !lista.some((t) => t.clave === elegida)) {
            cambios["temporada.tema"] = "";
          }
        }
      }

      // Las de fábrica que el dueño borró. Solo se aceptan claves de fábrica; si la elegida a mano
      // queda borrada, se suelta la elección.
      if (ocultas !== undefined) {
        if (!Array.isArray(ocultas)) return res.status(400).json({ message: "Las temporadas borradas no son válidas" });
        const limpias = [...new Set(ocultas.map(String))].filter((c) => CLAVES_DE_FABRICA.includes(c));
        cambios["temporada.ocultas"] = limpias;
        if (tema === undefined) {
          const actuales = await storeSettingsModel.findOne({ clave: CLAVE_UNICA }).select("temporada.tema").lean();
          if (limpias.includes(actuales?.temporada?.tema || "")) cambios["temporada.tema"] = "";
        }
      }
    }

    // Ubicación de la tienda (de dónde salen los repartos). Va con notación de puntos por lo mismo que
    // la temporada: es un subobjeto, y mandarlo entero pisaría la mitad con los valores por defecto.
    // Se acepta null/null para borrarla (sin ubicación se cobra solo la tarifa base).
    if (req.body.ubicacionTienda && typeof req.body.ubicacionTienda === "object") {
      const { lat, lng } = req.body.ubicacionTienda;
      if (lat === null && lng === null) {
        cambios["ubicacionTienda.lat"] = null;
        cambios["ubicacionTienda.lng"] = null;
      } else {
        const nLat = Number(lat);
        const nLng = Number(lng);
        if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
          return res.status(400).json({ message: "La ubicación de la tienda no es válida" });
        }
        cambios["ubicacionTienda.lat"] = nLat;
        cambios["ubicacionTienda.lng"] = nLng;
      }
    }

    // Zonas de envío: cada una es un círculo (centro + radio) con precio fijo. Se reemplaza el arreglo
    // completo, igual que las secciones de la portada. Se validan una por una: sin nombre, sin
    // ubicación o con precio malo, se rebota con 400 diciendo cuál falló.
    if (Array.isArray(req.body.zonasEnvio)) {
      const zonas = [];
      for (const z of req.body.zonasEnvio) {
        if (!z || typeof z !== "object") continue;
        const nombre = String(z.nombre || "").trim();
        const lat = Number(z.lat);
        const lng = Number(z.lng);
        const radioKm = Number(z.radioKm);
        const precio = Number(z.precio);
        if (!nombre) {
          return res.status(400).json({ message: "Cada zona de envío necesita un nombre" });
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ message: `La zona "${nombre}" no tiene una ubicación válida` });
        }
        if (!Number.isFinite(precio) || precio < 0) {
          return res.status(400).json({ message: `El precio de la zona "${nombre}" no es válido` });
        }
        zonas.push({
          nombre,
          lat,
          lng,
          radioKm: Number.isFinite(radioKm) && radioKm > 0 ? radioKm : 1,
          precio,
        });
      }
      cambios.zonasEnvio = zonas;
    }

    // Datos del negocio (los que usan las páginas legales y el pie). Con notación de puntos, igual que
    // la temporada: mandar el objeto entero borraría los campos que no vinieron. Cada campo vacío es
    // válido: el dueño puede no tener NRC, y entonces no se muestra.
    if (req.body.negocio && typeof req.body.negocio === "object") {
      const n = req.body.negocio;
      const texto = (v, max) => String(v ?? "").trim().slice(0, max);
      const reglas = {
        titular: { max: 120 },
        nit: { max: 20, forma: /^[0-9-]*$/, error: "El NIT solo lleva números y guiones" },
        nrc: { max: 20, forma: /^[0-9-]*$/, error: "El NRC solo lleva números y guiones" },
        correo: { max: 120, forma: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, error: "El correo de contacto no es válido" },
        telefono: { max: 20, forma: /^[0-9+\s-]*$/, error: "El teléfono solo lleva números, espacios, + y guiones" },
        whatsapp: { max: 20, forma: /^[0-9+\s-]*$/, error: "El WhatsApp solo lleva números, espacios, + y guiones" },
        horario: { max: 160 },
      };
      for (const [campo, regla] of Object.entries(reglas)) {
        if (n[campo] === undefined) continue;
        const valor = texto(n[campo], regla.max);
        if (regla.forma && !regla.forma.test(valor)) {
          return res.status(400).json({ message: regla.error });
        }
        cambios[`negocio.${campo}`] = campo === "correo" ? valor.toLowerCase() : valor;
      }
    }

    // Tarifa de servicio: encendido/apagado y el tipo (fijo o porcentaje). El valor viaja por
    // CAMPOS_NUMERICOS de arriba.
    if (req.body.servicioActivo !== undefined) {
      cambios.servicioActivo = !!req.body.servicioActivo;
    }
    if (req.body.servicioTipo !== undefined) {
      if (!["fijo", "porcentaje"].includes(req.body.servicioTipo)) {
        return res.status(400).json({ message: "El tipo de tarifa de servicio no es válido" });
      }
      cambios.servicioTipo = req.body.servicioTipo;
    }

    const ajustes = await storeSettingsModel.findOneAndUpdate(
      { clave: CLAVE_UNICA },
      cambios,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return res.status(200).json({ message: "Ajustes guardados", ajustes });
  } catch (error) {
    // Un dato malo es culpa de quien lo mandó, no del servidor. Con el 500 de antes, escribir un
    // nombre más largo del permitido salía como "Error interno del servidor": el aviso echaba la culpa
    // al sitio y no decía qué campo corregir.
    if (error?.name === "ValidationError" || error?.name === "CastError") {
      const primero = Object.values(error.errors || {})[0]?.message;
      return res.status(400).json({ message: primero || "Alguno de los datos no es válido" });
    }
    console.log("error guardando ajustes de tienda: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// El logo, subido como archivo. Va por su propia puerta y no dentro de updateSettings porque
// cambiar el logo es una acción sola: no tiene por qué obligar a reenviar el nombre, el lema y la
// portada entera. Multer ya dejó la imagen en Cloudinary y nos pasa la URL en req.file.path.
storeSettingsController.updateLogo = async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ message: "No llegó ninguna imagen" });
    }

    const ajustes = await storeSettingsModel.findOneAndUpdate(
      { clave: CLAVE_UNICA },
      { logoUrl: req.file.path },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ message: "Logo actualizado", ajustes });
  } catch (error) {
    console.log("error subiendo el logo: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Quitar el logo y volver al nombre escrito, sin tener que subir otra imagen.
storeSettingsController.deleteLogo = async (req, res) => {
  try {
    const ajustes = await storeSettingsModel.findOneAndUpdate(
      { clave: CLAVE_UNICA },
      { logoUrl: "" },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ message: "Logo quitado", ajustes });
  } catch (error) {
    console.log("error quitando el logo: " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default storeSettingsController;
