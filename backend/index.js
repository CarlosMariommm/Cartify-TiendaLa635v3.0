import app from "./app.js";
import "./database.js";

/*
 * Una promesa rechazada que nadie esperaba no tumba el servidor: queda en la
 * consola de Render y se sigue atendiendo. (Sin esto, Node se cae solo.)
 */
process.on("unhandledRejection", (motivo) => {
  console.log("promesa rechazada sin atender: " + (motivo?.stack || motivo?.message || motivo));
});

/*
 * EL PUERTO LO MANDA EL ENTORNO, no lo elegimos nosotros.
 *
 * Aquí había un 4000 clavado. Render —y cualquier servicio parecido— asigna el
 * puerto por la variable PORT y espera que la app escuche justo ahí. Con un
 * número fijo el proceso arranca igual, pero el servicio no encuentra ningún
 * puerto abierto donde busca y da el despliegue por fallido con un "No open
 * ports detected" que no dice qué hacer.
 *
 * En local no existe PORT, así que se queda con el 4000 de siempre y no cambia
 * nada de cómo se trabaja.
 */
const PUERTO = process.env.PORT || 4000;

// Creo una función que se encarga de ejecutar el servidor
async function main() {
  app.listen(PUERTO, () => console.log("server on port " + PUERTO));
}

main();
