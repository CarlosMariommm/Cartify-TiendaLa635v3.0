import { palabrasClave, sinTildes } from './similitud';

// FAMILIAS DE PRODUCTOS — familias.js
// Decide a qué familia pertenece cada producto (energizantes, gaseosas…) para armar las filas
// temáticas de la portada.

// Cada familia lleva su clave (la que se guarda en la base), su título para mostrar y los términos
// que la disparan.
export const FAMILIAS = [
  {
    clave: 'bebidas-energizantes',
    titulo: 'Bebidas energizantes',
    // "220" a secas no se pone: choca con los mililitros del nombre y
    // convertiría cualquier "Agua 220 ml" en energizante.
    terminos: [
      'red bull', 'redbull', 'monster', 'monster energy', 'raptor', 'volt',
      'adrenaline', 'adrenalina', 'speed', 'rockstar', '220 energy',
      'energizante', 'energy drink', 'energy', 'bebida energetica', 'energetica',
    ],
  },
  {
    clave: 'gaseosas',
    titulo: 'Gaseosas',
    terminos: [
      'coca', 'coca cola', 'cocacola', 'cola', 'pepsi', 'sprite', 'fanta',
      'seven up', '7up', 'mirinda', 'tropical', 'jarritos', 'dr pepper',
      'canada dry', 'salva cola', 'gaseosa', 'soda', 'crush', 'squirt',
      'ginger ale', 'cola champagne',
      // La kolashampan es de aquí y no se llama "gaseosa" en ninguna etiqueta.
      'kolashampan', 'kola shampan', 'cola champan',
    ],
  },
  {
    clave: 'jugos-y-nectares',
    titulo: 'Jugos y néctares',
    terminos: [
      'jugo', 'nectar', 'del valle', 'petit', 'tampico', 'hi c', 'california',
      'kern', 'naturas', 'pulpa', 'frutal', 'refresco en polvo',
    ],
  },
  {
    clave: 'aguas',
    titulo: 'Aguas',
    terminos: [
      'agua', 'cristal', 'alpina', 'purificada', 'mineral', 'agua purificada',
      'agua mineral', 'garrafa', 'botellon',
    ],
  },
  {
    clave: 'hidratantes',
    titulo: 'Bebidas hidratantes',
    terminos: [
      'gatorade', 'powerade', 'suero', 'suero oral', 'electrolit', 'hidratante',
      'isotonica', 'bebida isotonica', 'pedialyte',
    ],
  },
  {
    clave: 'cervezas-y-licores',
    titulo: 'Cervezas y licores',
    terminos: [
      'cerveza', 'pilsener', 'golden', 'golden light', 'suprema', 'corona',
      'regia', 'vino', 'ron', 'vodka', 'whisky', 'whiskey', 'licor', 'tequila',
      'aguardiente',
    ],
  },
  {
    clave: 'cafe-e-infusiones',
    titulo: 'Café e infusiones',
    terminos: [
      'cafe', 'cafe listo', 'listo', 'coscafe', 'musun', 'nescafe', 'te',
      'te verde', 'te negro', 'aromatica', 'manzanilla', 'infusion',
      'capuchino', 'cappuccino', 'instantaneo',
    ],
  },
  {
    clave: 'lacteos',
    titulo: 'Leches y lácteos',
    terminos: [
      'leche', 'la salud', 'salud', 'foremost', 'petacones', 'yogurt',
      'yoghurt', 'yogur', 'crema', 'cuajada', 'lactea', 'lacteo', 'natilla',
      'leche en polvo', 'leche evaporada',
    ],
  },
  {
    clave: 'quesos',
    titulo: 'Quesos',
    terminos: [
      'queso', 'quesillo', 'mozzarella', 'mozarella', 'cheddar', 'parmesano',
      'requeson', 'queso crema', 'queso fresco', 'queso duro',
    ],
  },
  {
    clave: 'snacks',
    titulo: 'Snacks y frituras',
    terminos: [
      'diana', 'churritos', 'churros', 'takis', 'cheetos', 'doritos', 'lays',
      'ricitos', 'tortillitas', 'boquitas', 'platanitos', 'frituras', 'papitas',
      'nachos', 'snack', 'pringles', 'tostitos', 'chicharrones', 'chips',
      // Sin esta frase "Papas Fritas" se iba a verduras por la palabra "papa".
      'papas fritas',
    ],
  },
  {
    clave: 'galletas-y-dulces',
    titulo: 'Galletas y dulces',
    terminos: [
      'galleta', 'oreo', 'chocolate', 'dulce', 'chicle', 'caramelo', 'snickers',
      'kitkat', 'picolines', 'bombon', 'paleta', 'confite', 'malvavisco',
      'gomita', 'turron', 'wafer', 'ducales',
    ],
  },
  {
    clave: 'panaderia',
    titulo: 'Panadería',
    terminos: [
      'pan', 'pan dulce', 'pan frances', 'pan de molde', 'bimbo', 'frances',
      'semita', 'quesadilla', 'budin', 'pastel', 'tortilla', 'baguette',
      'reposteria', 'muffin', 'dona',
    ],
  },
  {
    clave: 'cereales',
    titulo: 'Cereales y avenas',
    terminos: [
      'cereal', 'corn flakes', 'cornflakes', 'zucaritas', 'avena', 'mosh',
      'granola', 'hojuelas', 'choco krispis', 'kellogg', 'froot loops',
    ],
  },
  {
    clave: 'granos-basicos',
    titulo: 'Granos básicos',
    terminos: [
      'arroz', 'frijol', 'maiz', 'maseca', 'harina', 'azucar', 'sal', 'lenteja',
      'garbanzo', 'arveja', 'granos basicos',
    ],
  },
  {
    clave: 'aceites',
    titulo: 'Aceites y grasas',
    terminos: ['aceite', 'manteca', 'margarina', 'mantequilla', 'aceite vegetal'],
  },
  {
    clave: 'pastas-y-sopas',
    titulo: 'Pastas y sopas',
    // Las marcas de sopa instantánea van por su nombre porque el producto casi nunca dice "sopa": en
    // la góndola es "Maruchan sabor camarón" y ya. Sin ellas, cada una de estas se le iba a preguntar
    // a la IA sin necesidad.
    terminos: [
      'pasta', 'espagueti', 'spaghetti', 'fideo', 'sopa', 'maggi', 'ramen',
      'macarrones', 'coditos', 'tallarin', 'caldo', 'sopa instantanea',
      'maruchan', 'nissin', 'yaki', 'knorr',
    ],
  },
  {
    clave: 'enlatados',
    titulo: 'Enlatados',
    terminos: [
      'atun', 'sardina', 'enlatado', 'enlatada', 'conserva', 'lata', 'en lata',
      'de lata', 'salchicha en lata', 'sardina en lata', 'maiz en lata',
    ],
  },
  {
    clave: 'salsas',
    titulo: 'Salsas y aderezos',
    terminos: [
      'salsa', 'ketchup', 'catsup', 'mayonesa', 'mostaza', 'consome', 'vinagre',
      'aderezo', 'salsa inglesa', 'salsa de tomate', 'chirmol',
    ],
  },
  {
    clave: 'embutidos',
    titulo: 'Embutidos',
    terminos: [
      'jamon', 'salchicha', 'chorizo', 'mortadela', 'salami', 'tocino',
      'embutido', 'pepperoni', 'longaniza', 'salchichon',
    ],
  },
  {
    clave: 'carnes',
    titulo: 'Carnes',
    terminos: [
      'pollo', 'carne', 'res', 'cerdo', 'bistec', 'costilla', 'molida',
      'chuleta', 'carne molida', 'pechuga', 'muslo', 'alitas', 'pescado',
      'filete', 'churrasco',
    ],
  },
  {
    clave: 'frutas',
    titulo: 'Frutas',
    terminos: [
      'manzana', 'banano', 'guineo', 'platano', 'sandia', 'pera', 'uva',
      'naranja', 'mango', 'papaya', 'pina', 'fresa', 'melocoton', 'limon',
      'aguacate', 'jocote', 'maranon', 'mandarina', 'durazno', 'coco',
    ],
  },
  {
    clave: 'verduras',
    titulo: 'Verduras',
    terminos: [
      'tomate', 'cebolla', 'chile', 'papa', 'zanahoria', 'lechuga', 'repollo',
      'pepino', 'ayote', 'guisquil', 'yuca', 'ajo', 'culantro', 'rabano',
      'ejote', 'elote', 'apio', 'brocoli', 'coliflor', 'remolacha', 'loroco',
    ],
  },
  {
    clave: 'huevos',
    titulo: 'Huevos',
    terminos: ['huevo', 'carton de huevo'],
  },
  {
    clave: 'limpieza',
    titulo: 'Limpieza del hogar',
    terminos: [
      'cloro', 'detergente', 'desinfectante', 'pinesol', 'pine sol', 'axion',
      'suavizante', 'lejia', 'escoba', 'mistolin', 'limpiador', 'esponja',
      'lavaplatos', 'trapeador', 'desengrasante', 'ambientador', 'fabuloso',
      'jabon', 'jabon de lavar', 'jabon en polvo', 'jabon para ropa',
      'toalla de cocina', 'papel toalla', 'bolsa para basura',
    ],
  },
  {
    clave: 'cuidado-personal',
    titulo: 'Cuidado personal',
    terminos: [
      'shampoo', 'champu', 'acondicionador', 'pasta dental', 'crema dental',
      'colgate', 'desodorante', 'papel higienico', 'toalla sanitaria',
      'toallita', 'rastrillo', 'protex', 'enjuague', 'enjuague bucal',
      'cepillo dental', 'talco', 'perfume', 'cotonete', 'curita',
      'alcohol gel', 'algodon',
      'jabon de bano', 'jabon de tocador', 'jabon de manos',
    ],
  },
  {
    clave: 'bebe',
    titulo: 'Para el bebé',
    terminos: [
      'panal', 'huggies', 'pampers', 'formula', 'bebe', 'leche de formula',
      'toallitas humedas', 'toallitas de bebe', 'panalera', 'chupon', 'biberon',
    ],
  },
  {
    clave: 'mascotas',
    titulo: 'Mascotas',
    terminos: [
      'dog chow', 'cat chow', 'whiskas', 'purina', 'pedigree', 'perro', 'gato',
      'mascota', 'alimento para perro', 'alimento para gato', 'croquetas',
    ],
  },
  {
    clave: 'papeleria',
    titulo: 'Papelería',
    terminos: [
      'cuaderno', 'lapiz', 'lapicero', 'borrador', 'regla', 'folder',
      'papel bond', 'tijera', 'engrapadora', 'marcador', 'crayola',
      'sacapuntas', 'resma', 'cinta adhesiva', 'calculadora',
    ],
  },
];

// Para que el backend (y quien sea) valide rápido si una clave existe.
export const CLAVES_VALIDAS = new Set(FAMILIAS.map((f) => f.clave));

const TITULOS = Object.fromEntries(FAMILIAS.map((f) => [f.clave, f.titulo]));

// Título para mostrar. Si la clave no es de la taxonomía devuelve vacío, y quien llame decide qué
// poner: nunca inventamos un nombre de estante.
export const tituloDeFamilia = (clave) => TITULOS[clave] || '';

export const esFamiliaValida = (clave) => CLAVES_VALIDAS.has(String(clave || ''));

// Qué familias responden a lo que se escribió en el buscador. Para qué sirve: nadie le pone
// "Bebida energizante" de nombre a una lata de Red Bull, así que buscar "energizante" no
// encontraba absolutamente nada aunque la tienda tuviera cinco.
export const familiasQueCoinciden = (busqueda) => {
  const q = normalizar(busqueda);
  if (q.length < 3) return null;

  const empiezaAlguna = (texto) =>
    normalizar(texto).split(' ').some((palabra) => palabra.startsWith(q));

  const claves = FAMILIAS
    .filter((f) => empiezaAlguna(f.titulo) || empiezaAlguna(f.clave.replace(/-/g, ' ')))
    .map((f) => f.clave);

  return claves.length ? new Set(claves) : null;
};

// Texto comparable: sin tildes, sin ñ, en minúsculas y sin signos.
const normalizar = (t) => sinTildes(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const PESO_POR_PALABRA = 10;

// Lo que viene en lata pero NO es un enlatado. Todo lo que se toma se vende en lata y eso no lo
// convierte en conserva: la cerveza va con las cervezas.
const NO_SON_ENLATADOS = new Set([
  'gaseosas',
  'cervezas-y-licores',
  'bebidas-energizantes',
  'jugos-y-nectares',
  'hidratantes',
  'aguas',
]);

// Convierte un término en la expresión que lo busca dentro del nombre. Dos detalles que parecen
// menores y no lo son: - `\b` a los lados: sin eso "sal" cazaría dentro de "salsa" y media tienda
// terminaba en granos básicos.
const regexDeTermino = (termino) => {
  const palabras = normalizar(termino).split(' ').filter(Boolean);
  return new RegExp(`\\b${palabras.map((p) => `${p}(?:e?s)?`).join('\\s+')}\\b`);
};

// El índice se arma la primera vez que alguien clasifica, no al importar el archivo.
let indice = null;

const construirIndice = () => {
  if (indice) return indice;
  indice = FAMILIAS.map((familia) => ({
    clave: familia.clave,
    terminos: familia.terminos.map((termino) => ({
      re: regexDeTermino(termino),
      // Una frase pesa más que una palabra suelta: ahí se resuelven los choques.
      peso: normalizar(termino).split(' ').filter(Boolean).length * PESO_POR_PALABRA,
    })),
  }));
  return indice;
};

// Memoria de lo ya clasificado. "Productos similares" compara cada producto contra todo el
// catálogo, así que sin esto el mismo nombre se analizaría cientos de veces por render. La llave
// es el texto normalizado, no el id: dos productos que se llaman igual comparten respuesta.
const memoria = new Map();

// PASO 1 de la clasificación: puras reglas. Devuelve la clave de la familia o null si ninguna
// encaja (y ahí entra la IA).
export const clasificarPorReglas = (producto) => {
  const nombre = producto?.nombre || producto?.name || '';
  const marca = producto?.marca || producto?.brand || '';

  // Si el troceo de similitud.js no ve ni una palabra que describa el producto
  // (pasa con nombres tipo "1.5 Lt" o "Combo 2"), aquí tampoco hay qué leer.
  if (!palabrasClave(`${nombre} ${marca}`).length) return null;

  const texto = normalizar(`${nombre} ${marca}`);
  if (!texto) return null;
  if (memoria.has(texto)) return memoria.get(texto);

  // Todas las familias que dieron alguna señal, con qué tan fuerte fue.
  const candidatos = [];

  construirIndice().forEach((familia) => {
    let peso = 0;
    let posicion = Infinity;
    let coincidencias = 0;

    familia.terminos.forEach(({ re, peso: pesoTermino }) => {
      const encontrado = re.exec(texto);
      if (!encontrado) return;
      coincidencias += 1;
      if (pesoTermino > peso || (pesoTermino === peso && encontrado.index < posicion)) {
        peso = Math.max(peso, pesoTermino);
        posicion = encontrado.index;
      }
    });

    if (coincidencias) candidatos.push({ clave: familia.clave, peso, posicion, coincidencias });
  });

  // Gana el término más específico (la frase le gana a la palabra suelta). Si dos familias empatan,
  // gana la que aparece antes en el nombre ("Pollo Listo" es pollo, "Café Listo" es café), y si
  // siguen empatadas, la que tenga más términos coincidiendo.
  candidatos.sort(
    (a, b) => b.peso - a.peso || a.posicion - b.posicion || b.coincidencias - a.coincidencias
  );

  // La excepción de la lata. "La lata manda" existe para la salchicha y el atún, no para lo que se
  // toma: una cerveza en lata sigue siendo cerveza y va con las cervezas, no con las conservas.
  let ganador = candidatos[0];
  if (ganador?.clave === 'enlatados') {
    const bebida = candidatos.find((c) => NO_SON_ENLATADOS.has(c.clave));
    if (bebida) ganador = bebida;
  }

  const resultado = ganador ? ganador.clave : null;
  memoria.set(texto, resultado);
  return resultado;
};
