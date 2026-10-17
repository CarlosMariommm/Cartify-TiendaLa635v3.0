import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../../config.js";

//#1- Configuramos cloudinary con nuestras credenciales
cloudinary.config({
    cloud_name: config.cloudinary.cloudinary_name,
    api_key: config.cloudinary.cloudinary_api_key,
    api_secret: config.cloudinary.cloudinary_api_secret
})

//#2- Configurar como guardar las imagenes
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "grupo1B",
        // webp y avif son formatos normales hoy: los navegadores los generan y
        // muchas imágenes descargadas vienen así. Rechazarlos solo provocaba
        // errores sin explicación al subir.
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "avif"]
    }
})

//#3- Configurar multer
const upload = multer({
    storage,
    // Tope de 8 MB. Sin límite, una foto pesada se subía entera a Cloudinary antes de que la
    // rechazara: el empleado esperaba y al final veía un error genérico. Ahora falla al instante y con
    // un motivo claro (lo traduce el manejador de errores de app.js).
    limits: { fileSize: 8 * 1024 * 1024 }
})

export default upload


