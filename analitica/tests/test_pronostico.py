"""
El pronóstico con datos inventados de los que se sabe la respuesta: un fin
de semana fuerte, un producto que se vende un día sí y otro no, otro que dejó
de venderse.
"""

from datetime import date, timedelta

import numpy as np
import pytest

from app.pronostico import (
    ajustar_tsb,
    ciclo_de_compra,
    dias_entre,
    medir_precision,
    perfil_semanal,
    pronosticar,
    pronostico_tienda,
)

HASTA = date(2026, 10, 11)  # domingo


def historial(semanas, semilla=1):
    """Una tienda que vende el triple el sábado y el domingo."""
    rng = np.random.default_rng(semilla)
    dias = dias_entre(HASTA - timedelta(days=semanas * 7 - 1), HASTA)
    pedidos = np.array([rng.poisson(6 if d.weekday() >= 5 else 2) for d in dias], dtype=float)
    return dias, pedidos, pedidos * 6.5


def solicitud(semanas=8, stock=10, unidad="unidad"):
    dias, pedidos, ventas = historial(semanas)
    rng = np.random.default_rng(7)
    filas_ventas = []
    for d in dias:
        if rng.random() < 0.5:  # la Coca-Cola se vende la mitad de los días, de a 2
            filas_ventas.append({"dia": d, "producto": "coca", "unidades": 2.0})
        if d < HASTA - timedelta(days=20) and rng.random() < 0.6:  # el pan dejó de venderse hace 3 semanas
            filas_ventas.append({"dia": d, "producto": "pan", "unidades": 1.0})
    return {
        "desde": dias[0],
        "hasta": HASTA,
        "tienda": [{"dia": d, "total": float(t), "pedidos": int(p)} for d, t, p in zip(dias, ventas, pedidos)],
        "ventas": filas_ventas,
        "productos": [
            {"id": "coca", "nombre": "Coca-Cola", "stock": stock, "unidad": unidad, "precio": 1.0, "costo": 0.6, "proveedor": "p1"},
            {"id": "pan", "nombre": "Pan", "stock": 5, "precio": 0.5, "costo": 0.2, "proveedor": "p1"},
            {"id": "nada", "nombre": "Sin ventas", "stock": 3},
        ],
        "proveedores": [{"id": "p1", "nombre": "Distribuidora"}],
        "compras": [{"proveedor": "p1", "dia": HASTA - timedelta(days=k)} for k in (0, 7, 14, 21)],
    }


def test_el_perfil_ve_el_fin_de_semana_y_desconfia_con_pocas_semanas():
    dias, pedidos, _ = historial(8)
    perfil = perfil_semanal(pedidos, dias)
    assert perfil[5] > 1.2 and perfil[6] > 1.2  # sábado y domingo
    assert perfil[1] < 1
    assert perfil.mean() == pytest.approx(1)

    # Con una sola semana, el mismo patrón se encoge hacia 1: todavía no se le cree.
    dias2, pedidos2, _ = historial(1)
    dia_semana = np.array([d.weekday() for d in dias2])
    crudo_domingo = pedidos2[dia_semana == 6].mean() / pedidos2.mean()
    corto = perfil_semanal(pedidos2, dias2)
    assert abs(corto[6] - 1) < abs(crudo_domingo - 1)


def test_la_tienda_usa_holt_winters_con_tres_semanas_y_promedio_con_menos():
    dias, pedidos, ventas = historial(8)
    perfil = perfil_semanal(pedidos, dias)
    futuros, media, caminos, metodo = pronostico_tienda(ventas, dias, perfil, 14)
    assert metodo == "holt-winters"
    assert len(futuros) == 14 and futuros[0] == HASTA + timedelta(days=1)
    assert (media >= 0).all() and (caminos >= 0).all()
    # El fin de semana pronosticado vende más que la semana.
    findes = [m for d, m in zip(futuros, media) if d.weekday() >= 5]
    semana = [m for d, m in zip(futuros, media) if d.weekday() < 5]
    assert np.mean(findes) > np.mean(semana)

    dias, pedidos, ventas = historial(2)
    assert pronostico_tienda(ventas, dias, perfil_semanal(pedidos, dias), 7)[3] == "promedio-semanal"


def test_tsb_encuentra_la_tasa_y_baja_cuando_deja_de_venderse():
    rng = np.random.default_rng(3)
    serie = np.where(rng.random(120) < 0.5, 2.0, 0.0)
    p, z = ajustar_tsb(serie)
    assert p * z == pytest.approx(1.0, abs=0.35)  # la mitad de los días, de a 2: 1 por día

    abandonado = np.concatenate([np.where(rng.random(60) < 0.6, 1.0, 0.0), np.zeros(25)])
    p2, _ = ajustar_tsb(abandonado)
    assert p2 < 0.3  # ya casi no se pronostica que se venda


def test_ciclo_de_compra_es_la_mediana_entre_compras():
    hoy = date(2026, 10, 1)
    assert ciclo_de_compra([hoy - timedelta(days=k) for k in (0, 10, 20, 30)]) == 10
    assert ciclo_de_compra([hoy]) == 7  # sin datos, una vez por semana
    assert ciclo_de_compra([hoy, hoy - timedelta(days=1), hoy - timedelta(days=2)]) == 3  # nunca menos de 3


def test_cuando_se_acaba_y_cuanto_pedir():
    salida = pronosticar(solicitud(stock=4))
    coca = next(p for p in salida["productos"] if p["id"] == "coca")
    # Se venden ~7 por semana: 4 no llegan al fin de la semana.
    assert coca["se_acaba"]["probable"] is not None
    assert coca["se_acaba"]["probable"] <= (HASTA + timedelta(days=7)).isoformat()
    assert coca["se_acaba"]["pronto"] <= coca["se_acaba"]["probable"]
    # Se le compra cada 7 días: pedir lo de una semana con margen, menos lo que hay.
    assert coca["ciclo_dias"] == 7
    assert 3 <= coca["pedir"] <= 15 and coca["pedir"] == int(coca["pedir"])
    assert coca["costo_pedido"] == pytest.approx(coca["pedir"] * 0.6)

    sobra = pronosticar(solicitud(stock=500))
    coca = next(p for p in sobra["productos"] if p["id"] == "coca")
    assert coca["se_acaba"]["probable"] is None and coca["pedir"] == 0

    agotada = next(p for p in pronosticar(solicitud(stock=0))["productos"] if p["id"] == "coca")
    assert agotada["se_acaba"] == {"agotado": True}
    assert pronosticar(solicitud(stock=0))["productos"][0]["id"] == "coca"  # lo agotado va primero


def test_por_libra_se_pide_de_media_en_media():
    coca = next(p for p in pronosticar(solicitud(stock=1, unidad="libra"))["productos"] if p["id"] == "coca")
    assert (coca["pedir"] * 2) == int(coca["pedir"] * 2)


def test_la_lista_de_compras_va_por_proveedor_y_lo_que_no_se_vende_no_aparece():
    salida = pronosticar(solicitud(stock=2))
    assert salida["productos_sin_ventas"] == 1
    assert [p["id"] for p in salida["productos"]].count("nada") == 0
    distribuidora = salida["proveedores"][0]
    assert distribuidora["nombre"] == "Distribuidora"
    assert distribuidora["costo_total"] == pytest.approx(sum(p["costo_pedido"] for p in distribuidora["productos"]))


def test_las_semanas_y_el_periodo_tienen_rango():
    salida = pronosticar(solicitud())
    tienda = salida["tienda"]
    assert len(tienda["dias"]) == 28 and len(tienda["semanas"]) == 4
    for tramo in [*tienda["semanas"], tienda["periodo"]]:
        assert tramo["bajo"] <= tramo["esperado"] <= tramo["alto"]
    assert tienda["periodo_anterior"] is not None
    assert len(salida["perfil_semana"]) == 7


def test_la_precision_se_mide_solo_con_historial_suficiente():
    assert pronosticar(solicitud(semanas=3))["precision"]["probado"] is False
    precision = pronosticar(solicitud(semanas=8))["precision"]
    assert precision["probado"] is True and precision["semanas"] == 3
    assert precision["tienda"]["error"] is not None and precision["tienda"]["error_ingenuo"] is not None


def test_siempre_sale_lo_mismo_con_la_misma_semilla():
    assert pronosticar(solicitud()) == pronosticar(solicitud())


def test_medir_precision_sin_ventas_de_productos():
    dias, pedidos, ventas = historial(6)
    resultado = medir_precision(ventas, pedidos, dias, [])
    assert resultado["productos"]["error"] is None
