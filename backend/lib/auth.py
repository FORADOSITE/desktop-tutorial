import os

from clerk_backend_api import AuthenticateRequestOptions, Clerk, authenticate_request
from fastapi import HTTPException, Request, status


def require_clerk_user(request: Request) -> dict[str, str]:
    secret_key = os.getenv("CLERK_SECRET_KEY")
    if not secret_key:
        raise HTTPException(status_code=503, detail="Autenticação não configurada.")

    auth_state = authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=secret_key,
            authorized_parties=[os.getenv("APP_URL", "").rstrip("/")],
            accepts_token=["session_token"],
        ),
    )
    if not auth_state.is_signed_in or not auth_state.payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )

    user_id = str(auth_state.payload.get("sub", ""))
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuário não identificado.")

    user = Clerk(bearer_auth=secret_key).users.get(user_id=user_id)
    primary_id = getattr(user, "primary_email_address_id", None)
    addresses = getattr(user, "email_addresses", []) or []
    primary = next((item for item in addresses if getattr(item, "id", None) == primary_id), addresses[0] if addresses else None)
    email = str(getattr(primary, "email_address", "")).strip().lower()
    return {"id": user_id, "email": email}