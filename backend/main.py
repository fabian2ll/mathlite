"""
MathLite API — FastAPI Backend
Punto de entrada: arranque del servidor y registro de rutas.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from routes import router

app = FastAPI(title="MathLite API", version="1.0.0")

# ── CORS: permitir peticiones desde el frontend React ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Registrar rutas ───────────────────────────────────────────────────────────
app.include_router(router)


@app.get("/", include_in_schema=False)
def root():
    """Redirige la ruta raíz a la documentación interactiva."""
    return RedirectResponse(url="/docs")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
