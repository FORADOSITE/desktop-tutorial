import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import os

from fastapi import APIRouter, HTTPException, Request, status

from lib.auth import require_clerk_user
from models.catalog import OwnerEntitlementCreate, Subscription, SubscriptionCreate

router = APIRouter()
DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "subscriptions.json"
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
if not DATA_FILE.exists():
    DATA_FILE.write_text("[]\n", encoding="utf-8")

PLANS = [
    {"id": "gratuito", "title": "Gratuito", "price": "R$ 0,00", "period": "para sempre", "features": ["Perfil básico de artista", "1 prévia e 1 projeto fixado", "Presença nas categorias", "Links de Instagram, Spotify e YouTube", "Divulgação e pesquisa padrão"]},
    {"id": "premium", "title": "Premium", "price": "R$ 19,90", "period": "/mês", "badge": "Selo neon verificado", "features": ["Mais destaque nas pesquisas", "Até 3 prévias e 3 projetos fixados", "Destaque por cidade, CEP e estado", "Números de cliques e visualizações", "Participação em seleções do site"]},
    {"id": "destaque", "title": "Destaque", "price": "R$ 9,90", "period": "/7 dias", "badge": "Temporário", "features": ["Perfil destacado na categoria e região", "Impulso para lançamentos e eventos", "Visibilidade priorizada na página principal"]},
    {"id": "premium-anual", "title": "Premium Anual", "price": "R$ 199,90", "period": "/ano", "badge": "Melhor valor", "savings": "Economize R$ 238,80 em relação a 12 mensalidades", "features": ["Todas as vantagens do Premium", "Economia direta de R$ 238,80 por ano", "Pagamento via Pix ou cartão de débito"]},
]


def _read_subscriptions() -> list[dict]:
    try:
        value = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def _write_subscriptions(items: list[dict]) -> None:
    DATA_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


@router.get("/catalog/plans")
def get_plans() -> dict:
    return {"plans": PLANS, "paymentMocked": True, "pixKey": "trysl4035@gmail.com", "recipientNotice": "Pagamentos destinados à pessoa física responsável pelo site: Isabela Ingrid Silva Costa (Trysla)."}


@router.get("/usuario/status")
def get_document_status() -> dict:
    return {"verificado": False}


@router.get("/subscriptions")
def get_subscriptions() -> dict:
    return {"subscriptions": _read_subscriptions()}


@router.get("/subscriptions/{subscription_id}")
def get_subscription(subscription_id: str) -> dict:
    subscription = next((item for item in _read_subscriptions() if item.get("id") == subscription_id), None)
    if not subscription:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada.")
    return {"subscription": subscription}


@router.post("/subscriptions", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_subscription(payload: SubscriptionCreate) -> dict:
    plan = next((item for item in PLANS if item["id"] == payload.planId), None)
    if not plan:
        raise HTTPException(status_code=400, detail="Plano inválido.")

    subscription = Subscription(
        id=f"sub_{uuid4().hex[:12]}",
        planId=plan["id"],
        planTitle=plan["title"],
        period=payload.period,
        status="confirmed_mock",
        paymentMocked=True,
        paymentMethod=payload.paymentMethod,
        location=payload.location.model_copy(update={"estado": payload.location.estado.upper()}),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
    items = _read_subscriptions()
    items.append(subscription.model_dump())
    _write_subscriptions(items)
    return {"subscription": subscription, "message": "Assinatura MOCKADA confirmada."}


@router.get("/owner/status")
def get_owner_status(request: Request) -> dict:
    user = require_clerk_user(request)
    return {"isOwner": user["email"] == os.getenv("OWNER_EMAIL", "").strip().lower()}


@router.post("/owner/entitlement", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_owner_entitlement(payload: OwnerEntitlementCreate, request: Request) -> dict:
    user = require_clerk_user(request)
    if user["email"] != os.getenv("OWNER_EMAIL", "").strip().lower():
        raise HTTPException(status_code=403, detail="Benefício exclusivo da conta proprietária.")

    subscription = Subscription(
        id=f"owner_{uuid4().hex[:12]}",
        planId="premium-anual",
        planTitle="Premium Anual · Criadora",
        period="permanente",
        status="active_owner",
        paymentMocked=False,
        paymentMethod="owner",
        location=payload.location.model_copy(update={"estado": payload.location.estado.upper()}),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
    items = _read_subscriptions()
    items.append(subscription.model_dump())
    _write_subscriptions(items)
    return {"subscription": subscription, "message": "Premium Anual permanente liberado sem cobrança."}