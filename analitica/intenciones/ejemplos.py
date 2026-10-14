"""
Las frases con las que aprende Tiqui, por intención.

Hay dos clases de intenciones:

  DIRECTAS   Tiqui las contesta sola, al instante y sin Gemini: saludar,
             decir qué sabe hacer, el total, ir a pagar, abrir una sección
             de la cuenta, las ofertas, los datos de la tienda, el nombre.
  A GEMINI   "pedir" (todo lo que nombra productos o toca el carrito:
             agregar, quitar, buscar, precios, recomendar) y "otro" (charla).
             Esas necesitan el catálogo y conversación: las sigue resolviendo
             Gemini como siempre.

Las frases se escriben como llegan del reconocimiento de voz (a veces sin
tildes ni signos) y como habla la gente aquí: "regálame", "cuánto sale todo",
"ya estuvo". Cada intención se arma con sus frases base, más arranques
("oye Tiqui", "mira") y cierres ("por favor", "porfa") combinados.

PRUEBA son frases escritas aparte, con otras palabras, que el modelo NO ve al
entrenar: con ellas se mide qué tan bien entiende lo que nunca oyó.
"""

import random

DIRECTAS = [
    "saludo", "despedida", "ayuda", "total", "pagar", "carrito", "pedidos", "puntos",
    "favoritos", "recibos", "direcciones", "metodos_pago", "cuenta", "ofertas",
    "horario", "ubicacion", "contacto", "envio", "nombre",
]
A_GEMINI = ["pedir", "otro"]
INTENCIONES = DIRECTAS + A_GEMINI

BASE = {
    "saludo": [
        "hola", "hola tiqui", "buenos dias", "buenas tardes", "buenas noches", "buenas",
        "hola como estas", "que tal", "hey hola", "hola que onda", "saludos", "hola buen dia",
        "hola tiqui como estas", "buen dia tiqui", "hola hola", "que hubo", "hola amiga",
        "hola que tal tiqui", "buenas tiqui", "ey tiqui",
    ],
    "despedida": [
        "gracias", "muchas gracias", "adios", "hasta luego", "nos vemos", "chao", "bye",
        "gracias tiqui", "mil gracias", "te agradezco", "eso seria todo gracias", "hasta pronto",
        "gracias por tu ayuda", "muy amable", "bendiciones gracias", "que estes bien adios",
        "ok gracias", "va gracias", "gracias bonita", "me voy adios",
    ],
    "ayuda": [
        "que puedes hacer", "en que me puedes ayudar", "ayuda", "ayudame", "como funciona esto",
        "como te uso", "que sabes hacer", "para que sirves", "como compro aqui", "no se como usar esto",
        "que cosas haces", "explicame como funciona", "como se usa la tienda", "necesito ayuda",
        "como hago una compra", "que te puedo pedir", "dime que haces", "como me ayudas",
        "instrucciones", "como funcionas tiqui", "como funciona la tienda", "como se usa esta app",
        "como compro en la tienda", "como uso la aplicacion", "como funciona esta pagina",
    ],
    "total": [
        "cuanto llevo", "cuanto es", "cuanto es todo", "cual es el total", "cuanto voy a pagar",
        "cuanto sale todo", "dime el total", "cuanto debo", "cuanto llevo gastado", "sumame todo",
        "cuanto me sale", "cuanto es en total", "cual es mi total", "cuanto va", "cuanto llevo en el carrito",
        "a cuanto sale la cuenta", "cuanto es lo que llevo", "cuanto tengo que pagar", "dame el total",
        "cuanto va la cuenta",
    ],
    "pagar": [
        "quiero pagar", "vamos a pagar", "ya termine", "ya estuvo", "finalizar compra", "proceder al pago",
        "cobrame", "quiero hacer el pedido", "listo para pagar", "terminar mi compra", "pagar ahora",
        "llevame a pagar", "ya quiero pagar", "confirmar pedido", "hacer el pedido", "eso es todo quiero pagar",
        "ya no quiero nada mas vamos a pagar", "cerrar la compra", "ir a la caja", "completar la compra",
    ],
    "carrito": [
        "que llevo", "que tengo en el carrito", "muestrame mi carrito", "ver carrito", "abre el carrito",
        "ensename mi carrito", "que hay en mi carrito", "quiero ver mi carrito", "revisa mi carrito",
        "que productos llevo", "llevame al carrito", "mi carrito", "que he pedido hasta ahora",
        "repasame lo que llevo", "abre mi carrito", "que llevo hasta ahorita", "mostrar el carrito",
        "ver lo que llevo", "dime que llevo", "que cosas llevo",
    ],
    "pedidos": [
        "donde esta mi pedido", "mis pedidos", "ya viene mi pedido", "estado de mi pedido",
        "cuando llega mi pedido", "ver mis pedidos", "en que va mi pedido", "que paso con mi pedido",
        "mi pedido no ha llegado", "ya salio mi pedido", "rastrear mi pedido", "abre mis pedidos",
        "cuanto falta para que llegue mi pedido", "por donde viene el repartidor", "mi orden",
        "donde viene mi orden", "seguimiento del pedido", "ya despacharon mi pedido",
        "quiero ver el estado de mi compra", "a que hora llega mi pedido",
    ],
    "puntos": [
        "cuantos puntos tengo", "mis puntos", "ver mis puntos", "puntos de fidelidad", "cuantos puntos llevo",
        "como van mis puntos", "abre mis puntos", "quiero ver mis puntos", "tengo puntos",
        "cuantos puntos me quedan", "puedo canjear mis puntos", "cuando vencen mis puntos",
        "mis puntos de lealtad", "saldo de puntos", "cuantos puntos he ganado", "llevame a mis puntos",
        "revisa mis puntos", "puntos acumulados", "como canjeo puntos", "mis recompensas",
    ],
    "favoritos": [
        "mis favoritos", "ver mis favoritos", "abre favoritos", "lo que guarde", "mis productos guardados",
        "muestrame mis favoritos", "lista de favoritos", "que tengo en favoritos", "llevame a favoritos",
        "quiero ver lo que marque", "mis corazones", "productos que me gustan", "abre mi lista de favoritos",
        "ver guardados", "ensename mis favoritos", "donde estan mis favoritos", "mis guardados",
        "favoritos", "revisa mis favoritos", "lo que marque con corazon",
    ],
    "recibos": [
        "mis recibos", "ver mis recibos", "mis compras anteriores", "historial de compras", "lo que he comprado",
        "abre mis recibos", "compras pasadas", "quiero ver mis compras", "mis facturas", "recibos",
        "que compre la vez pasada", "muestrame mis recibos", "llevame a mis recibos", "pedidos entregados",
        "mi historial", "comprobantes de mis compras", "las compras que ya me entregaron", "ver historial",
        "que he pedido antes", "mis compras",
    ],
    "direcciones": [
        "mis direcciones", "cambiar mi direccion", "agregar una direccion", "ver mis direcciones",
        "quiero cambiar donde me entregan", "editar direccion", "abre mis direcciones", "nueva direccion",
        "direccion de entrega", "donde me llevan el pedido", "cambiar direccion de envio", "guardar mi direccion",
        "llevame a mis direcciones", "mi direccion", "actualizar mi direccion", "borrar una direccion",
        "agregar mi casa", "poner otra direccion", "mis domicilios", "cambiar el lugar de entrega",
    ],
    "metodos_pago": [
        "mis metodos de pago", "mis tarjetas", "agregar una tarjeta", "ver mis tarjetas", "formas de pago guardadas",
        "cambiar mi tarjeta", "abre mis metodos de pago", "quitar una tarjeta", "tarjeta guardada",
        "llevame a mis tarjetas", "metodos de pago", "registrar tarjeta", "editar tarjeta", "mis formas de pago",
        "borrar mi tarjeta", "guardar una tarjeta nueva", "ver mis formas de pago", "tarjetas",
        "que tarjetas tengo", "configurar pago",
    ],
    "cuenta": [
        "mi cuenta", "mis datos", "abre mi cuenta", "mi perfil", "cambiar mi contrasena", "editar mis datos",
        "ver mi perfil", "llevame a mi cuenta", "cambiar mi correo", "cambiar mi telefono", "configuracion de mi cuenta",
        "mis preferencias", "datos personales", "actualizar mi perfil", "cambiar mi nombre", "ajustes de mi cuenta",
        "abre mi perfil", "quiero editar mi cuenta", "mi informacion", "cerrar sesion",
    ],
    "ofertas": [
        "que ofertas hay", "hay promociones", "que promociones tienen", "hay descuentos", "que esta en oferta",
        "que esta barato", "ofertas de hoy", "promociones de hoy", "tienen algo en descuento", "que rebajas hay",
        "cuales son las ofertas", "hay algun 2x1", "dime las promociones", "que hay en promocion",
        "alguna oferta", "muestrame las ofertas", "que descuentos tienen hoy", "hay algo en especial",
        "cuales son las promos", "que esta en promo", "cuentame las ofertas", "cuentame que promociones hay",
    ],
    "horario": [
        "a que hora abren", "a que hora cierran", "cual es el horario", "estan abiertos", "abren el domingo",
        "horario de atencion", "hasta que hora atienden", "abren hoy", "a que hora abre la tienda",
        "cierran tarde", "que dias abren", "horario de la tienda", "estan abiertos ahorita", "abren los feriados",
        "a que hora entregan", "hasta que hora hay entregas", "atienden en la noche", "abren temprano",
        "cual es su horario", "que horas atienden",
    ],
    "ubicacion": [
        "donde quedan", "donde esta la tienda", "cual es la direccion de la tienda", "como llego a la tienda",
        "donde estan ubicados", "en que parte quedan", "ubicacion de la tienda", "donde los encuentro",
        "direccion de ustedes", "donde puedo ir a recoger", "por donde queda la tienda", "en que colonia estan",
        "donde es la tienda", "como llego", "donde recojo mi pedido", "cerca de donde quedan",
        "la tienda donde esta", "su direccion", "donde estan", "ubicacion",
    ],
    "contacto": [
        "cual es su numero", "numero de telefono", "tienen whatsapp", "como los contacto", "su whatsapp",
        "quiero hablar con alguien", "numero de la tienda", "a que numero llamo", "como me comunico con ustedes",
        "telefono de la tienda", "pasame el whatsapp", "quiero hablar con una persona", "contacto",
        "como les escribo", "necesito hablar con la tienda", "hay un numero para llamar", "atencion al cliente",
        "con quien hablo", "llamar a la tienda", "escribirles por whatsapp",
    ],
    "envio": [
        "hacen envios", "cuanto cuesta el envio", "llevan a domicilio", "tienen delivery", "cuanto cobran por el envio",
        "hacen entregas a domicilio", "el envio es gratis", "me lo pueden llevar", "cuanto es el delivery",
        "llegan hasta mi casa", "a donde hacen envios", "cuanto tarda el envio", "precio del envio",
        "cobran envio", "puedo recoger en la tienda", "mandan a domicilio", "envian a toda la ciudad",
        "cuanto sale el envio", "hacen servicio a domicilio", "costo de envio",
    ],
    "nombre": [
        "como me llamo", "sabes mi nombre", "quien soy", "cual es mi nombre", "te acuerdas de mi",
        "sabes quien soy", "me conoces", "como sabes mi nombre", "dime mi nombre", "recuerdas mi nombre",
        "a nombre de quien esta la cuenta", "con que nombre estoy", "sabes como me llamo",
        "quien esta usando la cuenta", "mi nombre", "me reconoces", "di mi nombre",
        "con quien hablas", "sabes con quien hablas", "como me llamo yo",
    ],
    "otro": [
        "como estas", "quien eres", "cuentame un chiste", "que hora es", "como esta el clima", "te quiero",
        "eres un robot", "cuantos anos tienes", "de que color eres", "me siento triste", "canta una cancion",
        "jajaja", "no se", "mmm", "este", "eres muy linda", "que eres", "quien te hizo", "estas viva",
        "cual es tu comida favorita", "que significa la 635", "tienes novio", "aburrido", "hace calor",
        "que dia es hoy", "como te llamas", "eres inteligente", "me caes bien", "estoy cansado", "que haces",
        "cuentame algo", "cuentame de ti", "cuentame una historia", "cuentame un cuento", "que lindo dia",
        "que rico", "hoy esta bonito", "me gusta esta tienda", "dime algo chistoso", "que cuentas",
    ],
}

# "pedir": lo que nombra productos o toca el carrito. Se arma con productos y verbos.
PRODUCTOS = [
    "leche", "pan", "coca cola", "queso fresco", "huevos", "arroz", "frijoles", "tortillas", "churritos",
    "jabon", "papel higienico", "cafe", "azucar", "aceite", "pollo", "manzanas", "fresas", "agua",
    "pepsi", "cerveza", "lays", "semita", "quesadilla", "yogurt", "platanos", "tomate", "cebolla",
    "detergente", "sandia", "galletas", "pilsener", "sprite", "crema", "mantequilla", "sal",
]
VERBOS = [
    "quiero", "dame", "agregame", "ponme", "regalame", "me das", "echame", "traeme", "necesito",
    "quisiera", "vendeme", "agrega", "pon", "me pones", "anota", "me regalas", "mandame",
]
CANTIDADES = ["", "una", "un", "dos", "tres", "media libra de", "una libra de", "un par de", "2", "4", "unas", "unos"]
PEDIR_FIJAS = [
    "cuanto cuesta {p}", "a como esta {p}", "tienes {p}", "hay {p}", "tienen {p}", "muestrame {p}",
    "ensename {p}", "busca {p}", "quita {p}", "ya no quiero {p}", "saca {p} del carrito", "mejor sin {p}",
    "cambia {p} a dos", "mejor que sean dos de {p}", "otra {p}", "una mas de {p}", "cuanto vale {p}",
    "precio de {p}", "que marcas de {p} tienes", "quiero ver {p}",
]
PEDIR_SUELTAS = [
    "que me recomiendas", "recomiendame algo", "que me sugieres para el desayuno", "algo para la cena",
    "algo para una fiesta", "que bebidas tienes", "ensename las bebidas", "muestrame los snacks",
    "quiero ver los lacteos", "que frutas hay", "borra el carrito", "vacia mi carrito", "empecemos de nuevo",
    "quita todo", "si agregalo", "si porfa", "dale ponle", "otra mas", "mejor dos", "solo una",
    "que tienes de limpieza", "algo dulce", "algo para la lonchera", "que hay de pan dulce",
    "busco algo para el almuerzo", "que snacks tienen", "tienen algo sin azucar",
]

ARRANQUES = ["", "", "", "oye tiqui ", "tiqui ", "mira ", "disculpa ", "oye ", "este ", "hola "]
CIERRES = ["", "", "", " por favor", " porfa", " tiqui", " gracias", " pues"]

# Frases escritas aparte, que el modelo no ve: las que miden de verdad.
PRUEBA = {
    "saludo": ["hola buenas tardes tiqui", "que onda", "buenos dias como amaneciste", "hola que tal estas"],
    "despedida": ["listo muchas gracias por todo", "chao gracias", "ya me voy bye", "te lo agradezco mucho"],
    "ayuda": ["que me puedes ayudar a hacer", "no entiendo como funciona", "que mas sabes hacer", "como uso esta tienda"],
    "total": ["y cuanto seria todo", "cuanto me va a salir", "cuanto suma lo que llevo", "dime cuanto es todo"],
    "pagar": ["ya quiero terminar mi compra", "vamos a la caja", "pasemos a pagar", "listo cobrame"],
    "carrito": ["que llevo en mi carrito", "ensename que llevo", "quiero revisar mi carrito", "que tengo ya"],
    "pedidos": ["mi pedido ya viene", "donde va mi orden", "cuando me llega lo que pedi", "ver el estado de mi pedido"],
    "puntos": ["cuantos puntos tengo acumulados", "quiero saber mis puntos", "me alcanzan los puntos", "ver puntos"],
    "favoritos": ["abre lo que tengo guardado", "mis productos favoritos", "llevame a mis guardados", "ver favoritos"],
    "recibos": ["quiero ver lo que compre antes", "mis compras de antes", "abre el historial de compras", "ver recibos"],
    "direcciones": ["quiero agregar otra direccion", "cambia mi direccion de entrega", "ver donde me entregan", "editar mis direcciones"],
    "metodos_pago": ["quiero agregar mi tarjeta", "ver las tarjetas que tengo", "cambiar la forma de pago guardada", "borrar tarjeta"],
    "cuenta": ["quiero cambiar mi contrasena", "abre mi perfil por favor", "editar mi informacion personal", "ver mis datos"],
    "ofertas": ["que promos hay hoy", "tienen algo en oferta", "hay rebajas", "que descuentos hay"],
    "horario": ["a que hora cierran hoy", "estan abiertos el domingo", "cual es su horario de atencion", "hasta que hora abren"],
    "ubicacion": ["donde queda la tienda", "cual es su direccion", "como llego hasta ustedes", "en donde estan"],
    "contacto": ["me das el numero de whatsapp", "como me comunico con la tienda", "a que numero les llamo", "quiero hablar con alguien de la tienda"],
    "envio": ["me lo pueden mandar a mi casa", "cuanto cobran de envio", "tienen servicio a domicilio", "hacen delivery"],
    "nombre": ["sabes como me llamo yo", "dime como me llamo", "te acuerdas de mi nombre", "quien soy yo"],
    "pedir": [
        "dame dos coca colas", "quiero una libra de queso", "cuanto cuesta el arroz", "tienes galletas",
        "agregame tres panes", "quita la leche", "que me recomiendas para el desayuno", "muestrame las frutas",
        "ponme una pepsi y unos churritos", "mejor que sean tres",
    ],
    "otro": [
        "como te sientes hoy", "quien te creo", "cuentame algo gracioso", "eres de verdad", "que bonito dia",
        "cuentame que haces cuando no hay clientes", "me aburro", "que lindo te ves", "sabes bailar",
    ],
}


def generar(semilla: int = 635, por_intencion: int = 90) -> tuple[list[str], list[str]]:
    """Las frases de entrenamiento: (frases, intenciones)."""
    azar = random.Random(semilla)
    frases, intenciones = [], []

    def variar(base: list[str]) -> list[str]:
        vistas = []
        intentos = 0
        while len(vistas) < por_intencion and intentos < por_intencion * 20:
            intentos += 1
            f = f"{azar.choice(ARRANQUES)}{azar.choice(base)}{azar.choice(CIERRES)}".strip()
            if f not in vistas:
                vistas.append(f)
        return vistas

    for intencion, base in BASE.items():
        for f in variar(base):
            frases.append(f)
            intenciones.append(intencion)

    pedir = set()
    while len(pedir) < por_intencion * 2:
        p = azar.choice(PRODUCTOS)
        tipo = azar.random()
        if tipo < 0.5:
            cantidad = azar.choice(CANTIDADES)
            f = f"{azar.choice(VERBOS)} {cantidad} {p}"
            if azar.random() < 0.25:
                f += f" y {azar.choice(CANTIDADES)} {azar.choice(PRODUCTOS)}"
        elif tipo < 0.85:
            f = azar.choice(PEDIR_FIJAS).format(p=p)
        else:
            f = azar.choice(PEDIR_SUELTAS)
        pedir.add(" ".join(f"{azar.choice(ARRANQUES)}{f}{azar.choice(CIERRES)}".split()))
    for f in sorted(pedir):
        frases.append(f)
        intenciones.append("pedir")

    return frases, intenciones
