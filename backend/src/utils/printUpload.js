import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../../config.js";

// Upload para archivos de IMPRESIÓN. A diferencia del upload de productos (solo imágenes), este
// acepta también PDF, usando resource_type "auto".
cloudinary.config({
  cloud_name: config.cloudinary.cloudinary_name,
  api_key: config.cloudinary.cloudinary_api_key,
  api_secret: config.cloudinary.cloudinary_api_secret,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "grupo1B/impresiones",
    resource_type: "auto", // permite PDF además de imágenes
    allowed_formats: ["pdf", "jpg", "jpeg", "png"],
  },
});

const uploadPrint = multer({ storage });

export default uploadPrint;
