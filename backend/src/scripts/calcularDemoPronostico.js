// CALCULAR LA DEMOSTRACIÓN DEL PRONÓSTICO — calcularDemoPronostico.js
// Le pide al servicio de análisis el pronóstico de la demostración (src/datos/pronosticoDemo.json,
// tal cual, sin correr fechas) y lo guarda en src/datos/pronosticoDemoResultado.json.

import { readFileSync, writeFileSync } from "node:fs";

const SERVICIO = process.env.ANALITICA_LOCAL || "http://localhost:8600";
const demo = JSON.parse(readFileSync(new URL("../datos/pronosticoDemo.json", import.meta.url), "utf8"));

const respuesta = await fetch(`${SERVICIO}/pronostico`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(demo),
});
if (!respuesta.ok) throw new Error(`El servicio de análisis contestó ${respuesta.status}`);
const resultado = await respuesta.json();

// `hasta` dice de qué demostración es: si se vuelve a exportar sin recalcular, el servidor no lo usa.
const destino = new URL("../datos/pronosticoDemoResultado.json", import.meta.url);
writeFileSync(destino, JSON.stringify({ hasta: demo.hasta, resultado }));
console.log(`Demostración calculada hasta ${demo.hasta}: ${resultado.productos?.length ?? 0} productos, método ${resultado.tienda?.metodo}.`);
