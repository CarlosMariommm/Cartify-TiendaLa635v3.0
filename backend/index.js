import app from "./app.js";
import "./database.js";

// Una promesa rechazada que nadie esperaba no tumba el servidor: queda en la consola de Render y
// se sigue atendiendo. (Sin esto, Node se cae solo.)
process.on("unhandledRejection", (motivo) => {
  console.log("promesa rechazada sin atender: " + (motivo?.stack || motivo?.message || motivo));
});

// EL PUERTO LO MANDA EL ENTORNO, no lo elegimos nosotros. Aquí había un 4000 clavado. Render —y
// cualquier servicio parecido— asigna el puerto por la variable PORT y espera que la app escuche
// justo ahí.
const PUERTO = process.env.PORT || 4000;

// Creo una función que se encarga de ejecutar el servidor
async function main() {
  app.listen(PUERTO, () => console.log("server on port " + PUERTO));
}

main();
