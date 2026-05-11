from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes.producto_route import router as producto_router
from src.routes.demanda_route import router as demanda_router
from src.routes.predict_route import router as predict_router
from src.utils.database import client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client.close()


app = FastAPI(title="FastQuote API", lifespan=lifespan)
app.include_router(producto_router)
app.include_router(demanda_router)
app.include_router(predict_router)

app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # Cambia esto a ["http://localhost:5173"] para mayor seguridad
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "FastQuote API funcionando"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
