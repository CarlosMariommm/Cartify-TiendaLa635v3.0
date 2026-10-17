"""EL SERVICIO DE ANALÍTICA — main.py
Servidor en Python (FastAPI) con dos rutas: GET /salud y POST /pronostico. No toca la base:
recibe las ventas por día y solo le contesta a quien trae la clave compartida."""

from __future__ import annotations

import hmac
import os
from datetime import date

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, model_validator

from app.pronostico import pronosticar

app = FastAPI(title="Analítica · Tienda la 635", version="1.0.0")


# ── Lo que manda el servidor de la tienda ──

class DiaTienda(BaseModel):
    dia: date
    total: float = Field(0, ge=0)
    pedidos: int = Field(0, ge=0)


class Venta(BaseModel):
    dia: date
    producto: str
    unidades: float = Field(ge=0)


class Producto(BaseModel):
    id: str
    nombre: str = ""
    stock: float = 0
    unidad: str = "unidad"
    precio: float | None = None
    costo: float | None = None
    proveedor: str | None = None
    creado: date | None = None


class Proveedor(BaseModel):
    id: str
    nombre: str = ""


class Compra(BaseModel):
    proveedor: str
    dia: date


class Solicitud(BaseModel):
    desde: date
    hasta: date
    tienda: list[DiaTienda] = Field(default_factory=list, max_length=2000)
    ventas: list[Venta] = Field(default_factory=list, max_length=200_000)
    productos: list[Producto] = Field(default_factory=list, max_length=10_000)
    proveedores: list[Proveedor] = Field(default_factory=list, max_length=2000)
    compras: list[Compra] = Field(default_factory=list, max_length=20_000)
    horizonte: int = Field(28, ge=7, le=60)
    nivel: float = Field(0.8, ge=0.5, le=0.95)
    servicio: float = Field(0.9, ge=0.5, le=0.99)
    semilla: int = 635

    @model_validator(mode="after")
    def rango_valido(self):
        dias = (self.hasta - self.desde).days
        if dias < 0:
            raise ValueError("'desde' tiene que ser antes de 'hasta'")
        if dias > 400:
            raise ValueError("el historial no puede pasar de 400 días")
        return self


# ── La puerta ──

CLAVE = os.environ.get("ANALITICA_CLAVE", "")


def revisar_clave(recibida: str | None):
    """Sin clave configurada (en tu compu) deja pasar; con clave, tiene que ser la misma."""
    if CLAVE and not hmac.compare_digest((recibida or "").encode(), CLAVE.encode()):
        raise HTTPException(status_code=401, detail="Clave de analítica inválida")


@app.get("/salud")
def salud():
    return {"ok": True}


@app.post("/pronostico")
def pronostico(solicitud: Solicitud, x_clave_analitica: str | None = Header(default=None)):
    revisar_clave(x_clave_analitica)
    return pronosticar(solicitud.model_dump())
