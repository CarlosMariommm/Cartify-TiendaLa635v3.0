"""La puerta del servicio: sin la clave no calcula nada, y lo mal armado no pasa."""

from datetime import date

import pytest
from fastapi.testclient import TestClient

import app.main as servicio

cliente = TestClient(servicio.app)

CUERPO = {
    "desde": "2026-09-01",
    "hasta": "2026-10-11",
    "tienda": [{"dia": "2026-10-10", "total": 25.5, "pedidos": 3}],
    "ventas": [{"dia": "2026-10-10", "producto": "p1", "unidades": 2}],
    "productos": [{"id": "p1", "nombre": "Coca-Cola", "stock": 3}],
}


@pytest.fixture
def con_clave(monkeypatch):
    monkeypatch.setattr(servicio, "CLAVE", "secreto-de-prueba")


def test_salud():
    assert cliente.get("/salud").json() == {"ok": True}


def test_sin_la_clave_no_calcula(con_clave):
    assert cliente.post("/pronostico", json=CUERPO).status_code == 401
    assert cliente.post("/pronostico", json=CUERPO, headers={"x-clave-analitica": "otra"}).status_code == 401


def test_con_la_clave_contesta(con_clave):
    r = cliente.post("/pronostico", json=CUERPO, headers={"x-clave-analitica": "secreto-de-prueba"})
    assert r.status_code == 200
    datos = r.json()
    assert datos["historial"]["desde"] == "2026-09-01"
    assert datos["productos"][0]["nombre"] == "Coca-Cola"


def test_lo_mal_armado_no_pasa():
    al_reves = {**CUERPO, "desde": "2026-10-11", "hasta": "2026-09-01"}
    assert cliente.post("/pronostico", json=al_reves).status_code == 422
    eterno = {**CUERPO, "desde": str(date(2020, 1, 1))}
    assert cliente.post("/pronostico", json=eterno).status_code == 422
    assert cliente.post("/pronostico", json={**CUERPO, "horizonte": 365}).status_code == 422
