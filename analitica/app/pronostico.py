"""EL PRONÓSTICO DE LA TIENDA — pronostico.py
Con las ventas reales (las manda el servidor de la tienda, ya agrupadas por día) responde lo que
un administrador se pregunta cada semana: 1. ¿Cuánto vamos a vender las próximas semanas?"""

from __future__ import annotations

import math
import warnings
from datetime import date, timedelta

import numpy as np

SEMANA = 7
# Para ajustar Holt-Winters hacen falta al menos tres vueltas de la semana.
MINIMO_HOLT_WINTERS = 21
# Cuántas semanas pasadas, como mucho, se usan para medir la precisión.
SEMANAS_DE_PRUEBA = 6
SIMULACIONES = 2000
# Si un proveedor no tiene compras suficientes para saber cada cuánto se le
# compra, se asume una vez por semana.
CICLO_POR_DEFECTO = 7
# Lo que suele variar una tienda de un día de la semana a otro (ver perfil_semanal).
VARIACION_SEMANAL = 0.3
# Un pedido de más de este tanto de lo normal es "al por mayor" (ver tope_al_por_mayor).
VECES_AL_POR_MAYOR = 3


# ── Utilidades ──────────────────────────────────────────────

def dias_entre(desde: date, hasta: date) -> list[date]:
    """Todos los días de `desde` a `hasta`, los dos incluidos."""
    return [desde + timedelta(days=i) for i in range(max((hasta - desde).days + 1, 0))]


def serie_diaria(dias: list[date], filas: list[dict], campo: str) -> np.ndarray:
    """Una fila por día con venta → un número por CADA día (los que no vendieron, en 0)."""
    posicion = {d: i for i, d in enumerate(dias)}
    serie = np.zeros(len(dias))
    for fila in filas:
        i = posicion.get(fila["dia"])
        if i is not None:
            serie[i] += float(fila.get(campo) or 0)
    return serie


def _redondo(valor: float, decimales: int = 2) -> float:
    return round(float(valor), decimales)


def _cuantil(valores: np.ndarray, q: float) -> float:
    return float(np.quantile(valores, q))


# ── El patrón de la semana ──────────────────────────────────

def perfil_semanal(pedidos: np.ndarray, dias: list[date]) -> np.ndarray:
    """Cuánto se vende cada día de la semana comparado con un día promedio (1 = normal, 1.5 = la mitad
    más). Lunes es el 0, como en Python. Con pocos pedidos, un sábado bueno por casualidad parecería
    un patrón."""
    if len(pedidos) == 0 or pedidos.sum() <= 0:
        return np.ones(SEMANA)
    dia_semana = np.array([d.weekday() for d in dias])
    promedio = pedidos.mean()
    crudo = np.array([
        pedidos[dia_semana == k].mean() / promedio if np.any(dia_semana == k) else 1.0
        for k in range(SEMANA)
    ])
    ruido = SEMANA / pedidos.sum()
    peso = VARIACION_SEMANAL ** 2 / (VARIACION_SEMANAL ** 2 + ruido)
    perfil = 1 + peso * (crudo - 1)
    return perfil / perfil.mean()


# ── La tienda entera ────────────────────────────────────────

def _caminos_holt_winters(serie: np.ndarray, horizonte: int, semilla: int):
    """Ajusta ETS (error y tendencia amortiguada aditivos, temporada de 7) y simula futuros."""
    from statsmodels.tsa.exponential_smoothing.ets import ETSModel

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        modelo = ETSModel(
            serie, error="add", trend="add", damped_trend=True,
            seasonal="add", seasonal_periods=SEMANA,
        )
        ajuste = modelo.fit(disp=False, maxiter=2000)
        media = np.asarray(ajuste.forecast(horizonte))
        caminos = np.asarray(ajuste.simulate(
            horizonte, anchor="end", repetitions=SIMULACIONES, random_state=semilla,
        )).T  # (simulaciones, días)
    if not (np.all(np.isfinite(media)) and np.all(np.isfinite(caminos))):
        raise ValueError("el ajuste no convergió")
    return media, caminos


def _caminos_promedio(serie, dias, perfil, futuros, semilla):
    """Sin historial para Holt-Winters: cada día futuro es uno de los días reales de las últimas 4
    semanas, sacado al azar (bootstrap) y ajustado por el día de la semana."""
    rng = np.random.default_rng(semilla)
    ventana = slice(-SEMANA * 4, None)
    factor_pasado = np.array([perfil[d.weekday()] for d in dias])[ventana]
    base = serie[ventana] / factor_pasado  # cada día, como si fuera un día promedio
    factor = np.array([perfil[d.weekday()] for d in futuros])
    caminos = rng.choice(base, size=(SIMULACIONES, len(futuros))) * factor
    return base.mean() * factor, caminos


def pronostico_tienda(serie, dias, perfil, horizonte, semilla=635):
    """Lo que se espera vender (en dólares) cada uno de los próximos `horizonte` días, con los futuros
    simulados para sacar los rangos. Devuelve también el método que se pudo usar."""
    futuros = [dias[-1] + timedelta(days=i + 1) for i in range(horizonte)]
    metodo = "promedio-semanal"
    if len(serie) >= MINIMO_HOLT_WINTERS and serie.sum() > 0:
        try:
            media, caminos = _caminos_holt_winters(serie, horizonte, semilla)
            metodo = "holt-winters"
        except Exception:  # noqa: BLE001 — cualquier tropiezo del ajuste cae al plan B
            media, caminos = _caminos_promedio(serie, dias, perfil, futuros, semilla)
    else:
        media, caminos = _caminos_promedio(serie, dias, perfil, futuros, semilla)
    # No hay ventas negativas: lo que la estadística ponga bajo cero es cero.
    caminos = np.clip(caminos, 0, None)
    return futuros, caminos.mean(axis=0), caminos, metodo


# ── Cada producto ───────────────────────────────────────────

def tsb(serie: np.ndarray, alfa: float, beta: float):
    """Teunter-Syntetos-Babai. Recorre la historia día por día y devuelve: p la probabilidad de que se
    venda en un día; z cuánto se lleva la gente cuando lo compra; error el error cuadrático medio de
    pronosticar cada día con lo anterior."""
    vendio = serie > 0
    if not vendio.any():
        return 0.0, 0.0, math.inf
    # Arranque: con qué frecuencia se vendió al principio y cuánto, las primeras veces.
    p = float(vendio[:SEMANA * 2].mean()) or float(vendio.mean())
    z = float(serie[vendio][:3].mean())
    errores = []
    for valor in serie:
        errores.append(valor - p * z)
        if valor > 0:
            z += alfa * (valor - z)
            p += beta * (1 - p)
        else:
            p += beta * (0 - p)
    return p, z, float(np.mean(np.square(errores)))


def ajustar_tsb(serie: np.ndarray):
    """Elige las constantes de suavizamiento que mejor habrían pronosticado la historia."""
    mejor = None
    for alfa in (0.1, 0.2, 0.3):
        for beta in (0.05, 0.1, 0.2):
            p, z, error = tsb(serie, alfa, beta)
            if mejor is None or error < mejor[2]:
                mejor = (p, z, error)
    return mejor[0], mejor[1]


def simular_producto(p, z, tamanos, factores, rng):
    """Futuros posibles de UN producto: (simulaciones, días). Cada día se vende o no según su
    probabilidad (ajustada por el día de la semana) y, si se vende, se lleva una de las cantidades
    que ya se vieron, escaladas al tamaño típico de ahora."""
    prob = np.clip(p * factores, 0, 1)
    ocurre = rng.random((SIMULACIONES, len(factores))) < prob
    escala = z / tamanos.mean() if tamanos.mean() > 0 else 1.0
    cantidades = rng.choice(tamanos, size=(SIMULACIONES, len(factores))) * escala
    return np.where(ocurre, cantidades, 0.0)


def tope_al_por_mayor(serie: np.ndarray) -> float:
    """Hasta cuánto cuenta una venta como "de todos los días". Un pedido de 125 botellas de agua para
    una fiesta es real, pero no es lo que se vende cada semana: si entrara entero al pronóstico, se
    sugeriría llenar la bodega."""
    ventas = serie[serie > 0]
    if len(ventas) < 3:
        return math.inf
    return VECES_AL_POR_MAYOR * float(np.median(ventas))


def _confianza(dias_con_venta: int, dias_historial: int) -> str:
    """Con menos de 3 días de venta es "baja": se muestra, pero no se sugiere cuánto pedir."""
    if dias_con_venta >= 8 and dias_historial >= 28:
        return "alta"
    if dias_con_venta >= 3:
        return "media"
    return "baja"


def _redondear_pedido(cantidad: float, unidad: str) -> float:
    """Por unidad, enteros; por libra, de media en media."""
    if cantidad <= 0:
        return 0.0
    return math.ceil(cantidad * 2) / 2 if unidad == "libra" else float(math.ceil(cantidad - 1e-9))


def ciclo_de_compra(fechas: list[date]) -> int:
    """Cada cuántos días se le compra a un proveedor (la mediana entre compras), entre 3 y 30."""
    unicas = sorted(set(fechas))
    if len(unicas) < 3:
        return CICLO_POR_DEFECTO
    huecos = np.diff([d.toordinal() for d in unicas])
    return int(np.clip(round(float(np.median(huecos))), 3, 30))


# ── ¿Qué tan bien acierta? ──────────────────────────────────

def _wape(real: np.ndarray, pronostico: np.ndarray):
    """Error absoluto sobre lo vendido (WAPE): 0.2 = se equivocó en un 20% de lo vendido."""
    total = float(np.sum(np.abs(real)))
    return float(np.sum(np.abs(real - pronostico)) / total) if total > 0 else None


def medir_precision(tienda, pedidos, dias, series_productos, semilla=635):
    """Pronostica las últimas semanas como si no se supieran (hasta 6, de una en una) y compara con lo
    que de verdad pasó. Con 3 el resultado dependía demasiado de qué semanas tocaron: una semana
    rara volteaba la conclusión."""
    n = len(tienda)
    semanas = min(SEMANAS_DE_PRUEBA, (n - MINIMO_HOLT_WINTERS) // SEMANA)
    if semanas < 1:
        return {
            "probado": False,
            "motivo": f"Hacen falta al menos {MINIMO_HOLT_WINTERS + SEMANA} días de ventas para medirlo; hay {n}.",
        }

    real_t, modelo_t, ingenuo_t = [], [], []
    real_p, modelo_p, ingenuo_p = [], [], []
    for k in range(semanas, 0, -1):
        corte = n - SEMANA * k
        prueba = slice(corte, corte + SEMANA)
        perfil = perfil_semanal(pedidos[:corte], dias[:corte])
        _, media, _, _ = pronostico_tienda(tienda[:corte], dias[:corte], perfil, SEMANA, semilla)
        real_t.append(tienda[prueba].sum())
        modelo_t.append(media.sum())
        ingenuo_t.append(tienda[corte - SEMANA:corte].sum())

        factores = np.array([perfil[d.weekday()] for d in dias[prueba]])
        for serie in series_productos:
            pasado = serie[:corte]
            if not (pasado > 0).any():
                continue
            p, z = ajustar_tsb(np.minimum(pasado, tope_al_por_mayor(pasado)))
            real_p.append(serie[prueba].sum())
            modelo_p.append(float(np.sum(np.clip(p * factores, 0, 1)) * z))
            ingenuo_p.append(pasado[-SEMANA:].sum())

    def resultado(real, modelo, ingenuo):
        error, error_ingenuo = _wape(real, modelo), _wape(real, ingenuo)
        return {
            "error": None if error is None else _redondo(error, 3),
            "error_ingenuo": None if error_ingenuo is None else _redondo(error_ingenuo, 3),
        }

    return {
        "probado": True,
        "semanas": semanas,
        # El total de cada semana: de la tienda, y de cada producto.
        "tienda": resultado(np.array(real_t), np.array(modelo_t), np.array(ingenuo_t)),
        "productos": resultado(np.array(real_p), np.array(modelo_p), np.array(ingenuo_p)),
    }


# ── Todo junto ──────────────────────────────────────────────

def pronosticar(solicitud: dict) -> dict:
    """La entrada (ver app/main.py, Solicitud): el rango de días, las ventas de la tienda por día, las
    unidades por día de cada producto, los productos con su existencia, los proveedores y las fechas
    de compra."""
    desde, hasta = solicitud["desde"], solicitud["hasta"]
    horizonte = int(solicitud.get("horizonte", 28))
    nivel = float(solicitud.get("nivel", 0.8))
    servicio = float(solicitud.get("servicio", 0.9))
    semilla = int(solicitud.get("semilla", 635))
    abajo, arriba = (1 - nivel) / 2, (1 + nivel) / 2

    dias = dias_entre(desde, hasta)
    tienda = serie_diaria(dias, solicitud.get("tienda", []), "total")
    pedidos = serie_diaria(dias, solicitud.get("tienda", []), "pedidos")
    perfil = perfil_semanal(pedidos, dias)

    futuros, media, caminos, metodo = pronostico_tienda(tienda, dias, perfil, horizonte, semilla)

    # Las semanas que vienen: la suma de cada futuro simulado, no la suma de rangos.
    semanas = []
    for i in range(0, horizonte, SEMANA):
        tramo = slice(i, min(i + SEMANA, horizonte))
        sumas = caminos[:, tramo].sum(axis=1)
        semanas.append({
            "desde": futuros[tramo.start].isoformat(),
            "hasta": futuros[tramo.stop - 1].isoformat(),
            "esperado": _redondo(media[tramo].sum()),
            "bajo": _redondo(_cuantil(sumas, abajo)),
            "alto": _redondo(_cuantil(sumas, arriba)),
        })
    total = caminos.sum(axis=1)
    pasado = tienda[-horizonte:].sum() if len(tienda) >= horizonte else None

    # Lo que de verdad se vendió en las últimas semanas completas (hasta 4),
    # para ponerlo al lado del pronóstico en la gráfica del reporte.
    semanas_anteriores = []
    for k in range(min(4, len(tienda) // SEMANA), 0, -1):
        tramo = slice(len(tienda) - SEMANA * k, len(tienda) - SEMANA * (k - 1))
        semanas_anteriores.append({
            "desde": dias[tramo.start].isoformat(),
            "hasta": dias[tramo.stop - 1].isoformat(),
            "total": _redondo(tienda[tramo].sum()),
        })

    # ── Productos ──
    ventas_por_producto: dict[str, list] = {}
    for venta in solicitud.get("ventas", []):
        ventas_por_producto.setdefault(venta["producto"], []).append(venta)

    rng = np.random.default_rng(semilla)
    ciclos = {}
    for compra in solicitud.get("compras", []):
        ciclos.setdefault(compra["proveedor"], []).append(compra["dia"])
    ciclo_de = {prov: ciclo_de_compra(fechas) for prov, fechas in ciclos.items()}
    alcance = max([horizonte, *ciclo_de.values(), CICLO_POR_DEFECTO])
    futuros_alcance = [hasta + timedelta(days=i + 1) for i in range(alcance)]
    factores = np.array([perfil[d.weekday()] for d in futuros_alcance])

    productos, series_productos, sin_ventas = [], [], 0
    for prod in solicitud.get("productos", []):
        filas = ventas_por_producto.get(prod["id"], [])
        if not any(f["unidades"] > 0 for f in filas):
            sin_ventas += 1
            continue
        # Su historia empieza cuando llegó a la tienda: los días de antes no son
        # "días sin venta". Si se registró después de venderse (un catálogo
        # copiado), cuenta desde la primera venta.
        primera = min(f["dia"] for f in filas)
        inicio = max(desde, min(prod.get("creado") or desde, primera))
        serie = serie_diaria(dias_entre(inicio, hasta), filas, "unidades")
        series_productos.append(serie_diaria(dias, filas, "unidades"))
        dias_con_venta = int((serie > 0).sum())
        confianza = _confianza(dias_con_venta, len(serie))

        # Lo que se vende de todos los días, sin los pedidos al por mayor.
        tope = tope_al_por_mayor(serie)
        normal = np.minimum(serie, tope)
        p, z = ajustar_tsb(normal)
        caminos_p = simular_producto(p, z, normal[normal > 0], factores, rng)
        acumulado = np.cumsum(caminos_p, axis=1)
        esperado = np.clip(p * factores, 0, 1) * z
        stock = float(prod.get("stock") or 0)
        unidad = prod.get("unidad") or "unidad"

        # ¿Cuándo se acaba? El primer día en que lo vendido alcanza la existencia.
        if stock <= 0:
            se_acaba = {"agotado": True}
        else:
            alcanzo = acumulado >= stock
            dia = np.where(alcanzo.any(axis=1), alcanzo.argmax(axis=1), alcance)
            probable, pronto = int(np.quantile(dia, 0.5)), int(np.quantile(dia, 0.1))
            se_acaba = {
                "agotado": False,
                "probable": futuros_alcance[probable].isoformat() if probable < alcance else None,
                "pronto": futuros_alcance[pronto].isoformat() if pronto < alcance else None,
            }

        # ¿Cuánto pedir? Lo que alcanza hasta la próxima compra en el 90% de los
        # futuros. Con menos de 3 días de venta no hay con qué decirlo: None
        # ("todavía no se sabe"), que no es lo mismo que 0 ("no hace falta").
        ciclo = ciclo_de.get(prod.get("proveedor"), CICLO_POR_DEFECTO)
        if confianza == "baja":
            pedir = None
        else:
            necesidad = _cuantil(acumulado[:, ciclo - 1], servicio)
            pedir = _redondear_pedido(necesidad - max(stock, 0), unidad)

        semana_1 = acumulado[:, SEMANA - 1]
        mes = acumulado[:, horizonte - 1]
        productos.append({
            "id": prod["id"],
            "nombre": prod.get("nombre", ""),
            "unidad": unidad,
            "proveedor": prod.get("proveedor"),
            "stock": _redondo(stock),
            "vendido": _redondo(serie.sum()),
            "dias_con_venta": dias_con_venta,
            "al_por_mayor": int((serie > tope).sum()),
            "confianza": confianza,
            "por_dia": _redondo(esperado[:horizonte].mean(), 3),
            "semana": {"esperado": _redondo(esperado[:SEMANA].sum()), "bajo": _redondo(_cuantil(semana_1, abajo)), "alto": _redondo(_cuantil(semana_1, arriba))},
            "periodo": {"esperado": _redondo(esperado[:horizonte].sum()), "bajo": _redondo(_cuantil(mes, abajo)), "alto": _redondo(_cuantil(mes, arriba))},
            "ingreso_periodo": _redondo(esperado[:horizonte].sum() * float(prod.get("precio") or 0)),
            "se_acaba": se_acaba,
            "ciclo_dias": ciclo,
            "pedir": pedir,
            "costo_pedido": _redondo((pedir or 0) * float(prod.get("costo") or 0)),
        })

    # El más urgente primero: lo agotado, luego lo que se acaba antes.
    def urgencia(prod):
        acaba = prod["se_acaba"]
        if acaba.get("agotado"):
            return (0, "")
        return (1, acaba.get("probable") or "9999")
    productos.sort(key=urgencia)

    # ── La lista de compras, por proveedor ──
    nombres = {prov["id"]: prov.get("nombre", "") for prov in solicitud.get("proveedores", [])}
    por_proveedor: dict = {}
    for prod in productos:
        if not prod["pedir"]:  # 0 (no hace falta) o None (todavía no se sabe)
            continue
        clave = prod["proveedor"]
        grupo = por_proveedor.setdefault(clave, {
            "id": clave,
            "nombre": nombres.get(clave, "") if clave else "",
            "ciclo_dias": prod["ciclo_dias"],
            "productos": [],
            "costo_total": 0.0,
        })
        grupo["productos"].append({k: prod[k] for k in ("id", "nombre", "unidad", "stock", "pedir", "costo_pedido")})
        grupo["costo_total"] = _redondo(grupo["costo_total"] + prod["costo_pedido"])
    proveedores = sorted(por_proveedor.values(), key=lambda g: -g["costo_total"])

    return {
        "historial": {
            "desde": desde.isoformat(),
            "hasta": hasta.isoformat(),
            "dias": len(dias),
            "pedidos": int(pedidos.sum()),
            "ventas": _redondo(tienda.sum()),
            "semanas": semanas_anteriores,
        },
        "perfil_semana": [_redondo(f, 3) for f in perfil],  # lunes a domingo
        "tienda": {
            "metodo": metodo,
            "nivel": nivel,
            "dias": [
                {"dia": d.isoformat(), "esperado": _redondo(m), "bajo": _redondo(_cuantil(caminos[:, i], abajo)), "alto": _redondo(_cuantil(caminos[:, i], arriba))}
                for i, (d, m) in enumerate(zip(futuros, media))
            ],
            "semanas": semanas,
            "periodo": {"esperado": _redondo(media.sum()), "bajo": _redondo(_cuantil(total, abajo)), "alto": _redondo(_cuantil(total, arriba))},
            "periodo_anterior": None if pasado is None else _redondo(pasado),
        },
        "productos": productos,
        "productos_sin_ventas": sin_ventas,
        "proveedores": proveedores,
        "precision": medir_precision(tienda, pedidos, dias, series_productos, semilla),
    }
