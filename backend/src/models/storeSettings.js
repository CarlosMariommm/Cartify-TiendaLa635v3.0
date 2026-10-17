// AJUSTES DE LA TIENDA — storeSettings.js
// Cómo se ve la tienda de cara al cliente: su nombre, su logo, qué filas aparecen en la portada y
// en qué orden, y el tema de temporada.

import { Schema, model } from "mongoose";

// Una fila de la portada. La `clave` es la que conoce el frontend (utils/portada.js); si llega una
// que no está en ese catálogo, se ignora al pintar. Guardar la lista completa —y no solo las
// apagadas— es lo que permite reordenarlas.
const seccionSchema = new Schema(
  {
    clave: { type: String, required: true },
    visible: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
  },
  { _id: false }
);

// Una temporada creada desde el panel. Solo se guarda lo que el dueño elige: dos colores, las
// fechas, la figura y el saludo.
const fechaSinAnioSchema = new Schema(
  {
    mes: { type: Number, required: true, min: 1, max: 12 },
    dia: { type: Number, required: true, min: 1, max: 31 },
  },
  { _id: false }
);

export const FIGURAS_DE_TEMPORADA = ["ninguna", "confeti", "estrella", "corazon", "copo", "hoja", "murcielago"];

const temporadaPropiaSchema = new Schema(
  {
    clave: { type: String, required: true, trim: true, maxlength: 60 },
    nombre: { type: String, required: true, trim: true, maxlength: 40 },
    desde: { type: fechaSinAnioSchema, required: true },
    hasta: { type: fechaSinAnioSchema, required: true },
    colorPrincipal: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ },
    colorAcento: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ },
    figura: { type: String, enum: FIGURAS_DE_TEMPORADA, default: "confeti" },
    saludo: { type: String, default: "", trim: true, maxlength: 160 },
  },
  { _id: false }
);

// El tema de temporada (Navidad, Halloween...). Ver utils/temporadas.js.
const temporadaSchema = new Schema(
  {
    modo: {
      type: String,
      enum: ["automatico", "manual", "ninguno"],
      default: "automatico",
    },
    tema: { type: String, default: "" },
    // La cinta con el saludo y las figuras cayendo de fondo. Se puede apagar para quedarse solo con
    // los colores — hay tiendas que quieren que se note la fecha y otras que prefieren no distraer.
    decoracion: { type: Boolean, default: true },
    // El texto de la cinta, por tema — { navidad: "...", halloween: "...", ... }. Cada tema trae su
    // saludo de fábrica (ver frontend/utils/temporadas.js); esto guarda solo lo que el dueño
    // reescribió. Un tema sin entrada aquí (o con el texto en blanco) usa el saludo de fábrica.
    saludos: { type: Schema.Types.Mixed, default: {} },
    // El saludo de los días sin temporada. En blanco no sale cinta, que es como se veía la tienda
    // antes de que existiera.
    saludoNormal: { type: String, default: "", trim: true, maxlength: 160 },
    // Las temporadas que crea el dueño ("Regreso a clases", "Día de la madre"...). Conviven con las de
    // fábrica y se eligen igual: por fecha en automático, o a mano. Ver temporadaPropiaSchema.
    personalizados: { type: [temporadaPropiaSchema], default: [] },
    // El disfraz que el dueño le armó a Tiqui para cada temporada, por la clave de la temporada: {
    // navidad: { cabeza, cara, cuello, rubor } }. Una temporada sin entrada aquí usa el disfraz de
    // fábrica. Lo revisa utils/disfracesTiqui.js antes de guardarlo.
    disfraces: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

// La llave que hace que el singleton sea singleton DE VERDAD.
export const CLAVE_UNICA = "tienda";

// Una ZONA de envío: un círculo en el mapa (centro + radio) con un precio fijo. Sirve para
// sobreescribir la fórmula por km donde el dueño quiere un precio puntual: "todo el Centro a $2",
// "la colonia de arriba a $4 aunque quede cerca".
const zonaEnvioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radioKm: { type: Number, default: 1, min: 0.05 }, // radio del círculo, en km
    precio: { type: Number, required: true, min: 0 },  // precio fijo dentro de la zona
  },
  { _id: false }
);

// LOS DATOS DEL NEGOCIO.
// Los que piden las páginas legales (privacidad, términos, devoluciones) y el pie de página: quién
// es el responsable, cómo se le contacta y cuándo atiende.
const negocioSchema = new Schema(
  {
    // Nombre del titular (persona natural) o razón social (sociedad).
    titular: { type: String, default: "", trim: true, maxlength: 120 },
    nit: { type: String, default: "", trim: true, maxlength: 20 },
    nrc: { type: String, default: "", trim: true, maxlength: 20 },
    correo: { type: String, default: "", trim: true, lowercase: true, maxlength: 120 },
    telefono: { type: String, default: "", trim: true, maxlength: 20 },
    whatsapp: { type: String, default: "", trim: true, maxlength: 20 },
    // Texto libre: "Lunes a sábado de 7:00 a. m. a 8:00 p. m.".
    horario: { type: String, default: "", trim: true, maxlength: 160 },
  },
  { _id: false }
);

const storeSettingsSchema = new Schema(
  {
    clave: { type: String, default: CLAVE_UNICA, unique: true, index: true },
    // El nombre va en DOS líneas porque así se pinta: apiladas, con el mismo peso y color. "Tienda" no
    // es una etiqueta que acompaña a "la 635", es parte del nombre del negocio. Guardarlo como una
    // sola cadena obligaría a adivinar dónde parte.
    nombreLinea1: { type: String, default: "Tienda", trim: true, maxlength: 24 },
    nombreLinea2: { type: String, default: "la 635", trim: true, maxlength: 24 },

    // URL de Cloudinary. Vacío = se pinta el nombre solo, que es lo de hoy.
    logoUrl: { type: String, default: "" },

    // La frase del pie de página.
    lema: {
      type: String,
      default:
        "La tienda del barrio, ahora también en línea. Pida lo de la casa y se lo llevamos.",
      trim: true,
      maxlength: 160,
    },

    // Dirección física: de aquí salen los repartos.
    direccion: { type: String, default: "Calle Sevilla 635, Col. Providencia", trim: true },

    negocio: { type: negocioSchema, default: () => ({}) },

    // ENVÍO POR DISTANCIA (+ ajustes por zona). El precio ya no es un solo número plano. Se calcula
    // así, de más específico a más general: 1. Si la dirección cae dentro de una zonaEnvio → precio de
    // esa zona. 2.
    ubicacionTienda: {
      lat: { type: Number, default: null }, // de dónde salen los repartos
      lng: { type: Number, default: null },
    },
    // El texto de la dirección que se buscó para fijar el punto, para que el
    // panel la recuerde y no aparezca el buscador vacío la próxima vez.
    ubicacionTiendaTexto: { type: String, default: "", trim: true },
    envioBase: { type: Number, default: 1.0, min: 0 },  // tarifa base fija
    envioPorKm: { type: Number, default: 0.5, min: 0 }, // dólares por cada km
    zonasEnvio: { type: [zonaEnvioSchema], default: [] }, // sobreescriben la fórmula

    // TARIFA DE SERVICIO. Un cobro extra opcional (empaque, comisión, lo que el dueño decida). Apagada
    // por defecto: nadie cobra de más sin querer. servicioTipo 'fijo' → servicioValor es en dólares.
    // servicioTipo 'porcentaje' → servicioValor es un % del subtotal.
    servicioActivo: { type: Boolean, default: false },
    servicioTipo: { type: String, enum: ["fijo", "porcentaje"], default: "fijo" },
    servicioValor: { type: Number, default: 0, min: 0 },

    secciones: { type: [seccionSchema], default: [] },

    temporada: { type: temporadaSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default model("storeSettingsModel", storeSettingsSchema, "StoreSettings");
