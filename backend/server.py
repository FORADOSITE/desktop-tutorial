import mimetypes
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

load_dotenv(Path(__file__).resolve().parent / ".env")

from routers.catalog import router as catalog_router

ROOT_DIR = Path(__file__).resolve().parents[1]
api_router = APIRouter()


app = FastAPI(title="Fora do Site API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()] or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def static_site(request: Request, call_next):
    if request.url.path.startswith("/api"):
        return await call_next(request)
    relative = request.url.path.lstrip("/") or "index.html"
    candidate = (ROOT_DIR / relative).resolve()
    if not str(candidate).startswith(str(ROOT_DIR)):
        return JSONResponse({"error": "Arquivo não encontrado"}, status_code=404)
    if candidate.is_dir():
        candidate = candidate / "index.html"
    if candidate.is_file():
        return FileResponse(candidate, media_type=mimetypes.guess_type(candidate.name)[0])
    return JSONResponse({"error": "Arquivo não encontrado"}, status_code=404)


@api_router.get("/api/config")
def public_config() -> dict:
    return {
        "clerkPublishableKey": os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
        or os.getenv("CLERK_PUBLISHABLE_KEY")
        or None
    }


api_router.include_router(catalog_router, prefix="/api")
app.include_router(api_router)