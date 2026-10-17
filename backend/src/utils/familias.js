// FAMILIAS DE PRODUCTOS (lista cerrada) — familias.js
// Los estantes que de verdad tiene una tienda de barrio salvadoreña. El backend la necesita para
// UNA cosa: revisar lo que devuelve la IA.

export const FAMILIAS = [
  { clave: "bebidas-energizantes", titulo: "Bebidas energizantes", ejemplo: "Red Bull, Monster, Volt, Raptor" },
  { clave: "gaseosas", titulo: "Gaseosas", ejemplo: "Coca-Cola, Pepsi, Sprite, Salva Cola" },
  { clave: "jugos-y-nectares", titulo: "Jugos y néctares", ejemplo: "Del Valle, Petit, Tampico, néctares" },
  { clave: "aguas", titulo: "Aguas", ejemplo: "Agua Cristal, agua purificada, garrafas" },
  { clave: "hidratantes", titulo: "Bebidas hidratantes", ejemplo: "Gatorade, Powerade, suero oral" },
  { clave: "cervezas-y-licores", titulo: "Cervezas y licores", ejemplo: "Pilsener, Suprema, ron, vino" },
  { clave: "cafe-e-infusiones", titulo: "Café e infusiones", ejemplo: "Café Listo, Coscafé, té, manzanilla" },
  { clave: "lacteos", titulo: "Leches y lácteos", ejemplo: "Leche, yogurt, crema, cuajada" },
  { clave: "quesos", titulo: "Quesos", ejemplo: "Queso fresco, quesillo, mozzarella" },
  { clave: "snacks", titulo: "Snacks y frituras", ejemplo: "Diana, Takis, churritos, platanitos" },
  { clave: "galletas-y-dulces", titulo: "Galletas y dulces", ejemplo: "Oreo, chocolates, chicles, paletas" },
  { clave: "panaderia", titulo: "Panadería", ejemplo: "Pan francés, semita, quesadilla, Bimbo" },
  { clave: "cereales", titulo: "Cereales y avenas", ejemplo: "Corn Flakes, Zucaritas, avena, mosh" },
  { clave: "granos-basicos", titulo: "Granos básicos", ejemplo: "Arroz, frijol, maíz, azúcar, sal" },
  { clave: "aceites", titulo: "Aceites y grasas", ejemplo: "Aceite, manteca, margarina" },
  { clave: "pastas-y-sopas", titulo: "Pastas y sopas", ejemplo: "Espagueti, fideos, sopa Maggi, ramen" },
  { clave: "enlatados", titulo: "Enlatados", ejemplo: "Atún, sardinas, conservas en lata" },
  { clave: "salsas", titulo: "Salsas y aderezos", ejemplo: "Ketchup, mayonesa, mostaza, consomé" },
  { clave: "embutidos", titulo: "Embutidos", ejemplo: "Jamón, salchicha, chorizo, mortadela" },
  { clave: "carnes", titulo: "Carnes", ejemplo: "Pollo, carne molida, costilla, pescado" },
  { clave: "frutas", titulo: "Frutas", ejemplo: "Banano, sandía, jocote, aguacate" },
  { clave: "verduras", titulo: "Verduras", ejemplo: "Tomate, cebolla, güisquil, yuca" },
  { clave: "huevos", titulo: "Huevos", ejemplo: "Huevos por unidad o por cartón" },
  { clave: "limpieza", titulo: "Limpieza del hogar", ejemplo: "Cloro, detergente, Axion, escobas" },
  { clave: "cuidado-personal", titulo: "Cuidado personal", ejemplo: "Shampoo, pasta dental, papel higiénico" },
  { clave: "bebe", titulo: "Para el bebé", ejemplo: "Pañales, toallitas húmedas, fórmula" },
  { clave: "mascotas", titulo: "Mascotas", ejemplo: "Dog Chow, Whiskas, alimento para perro" },
  { clave: "papeleria", titulo: "Papelería", ejemplo: "Cuadernos, lápices, folders, tijeras" },
];

// Con esto se revisa lo que contesta el modelo, sin recorrer el arreglo entero.
export const CLAVES_VALIDAS = new Set(FAMILIAS.map((f) => f.clave));

export const esFamiliaValida = (clave) => CLAVES_VALIDAS.has(String(clave || ""));

// La lista tal como se le muestra al modelo. Va la clave (que es lo que tiene que devolver) junto
// al título y unos ejemplos, porque "bebe" a secas no le dice nada y "Para el bebé: pañales,
// fórmula" sí.
export const LISTA_PARA_IA = FAMILIAS.map(
  (f) => `${f.clave} = ${f.titulo} (${f.ejemplo})`
).join("\n");
