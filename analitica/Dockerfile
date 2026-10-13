# El servicio de analítica en un contenedor: lo que Render construye y corre.
# Python 3.12 con solo lo que el servicio necesita (requirements.txt), sin
# las herramientas de prueba.
#
# Para probarlo en una compu con Docker, desde esta carpeta:
#   docker build -t analitica-la635 .
#   docker run -p 8000:8000 -e ANALITICA_CLAVE=una-clave analitica-la635
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /servicio

# Las dependencias primero: si solo cambia el código, Docker reutiliza esta
# capa y no vuelve a instalar numpy y statsmodels en cada construcción.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

# Nada de correr como administrador del contenedor.
RUN useradd --create-home analitica
USER analitica

# Render dice en qué puerto escuchar con la variable PORT.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
