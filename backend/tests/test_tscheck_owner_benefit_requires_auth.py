import httpx

BASE = "http://localhost:8001"


def test_owner_status_requires_authentication():
    response = httpx.get(f"{BASE}/api/owner/status", timeout=10)
    assert response.status_code == 401


def test_owner_entitlement_rejects_unauthenticated_request():
    payload = {"location": {"cep": "01000-000", "cidade": "tscheck-owner-city", "estado": "sp"}}
    response = httpx.post(f"{BASE}/api/owner/entitlement", json=payload, timeout=10)
    assert response.status_code == 401


def test_owner_entitlement_rejects_invalid_bearer_token():
    payload = {"location": {"cep": "01000-000", "cidade": "tscheck-owner-city", "estado": "sp"}}
    response = httpx.post(
        f"{BASE}/api/owner/entitlement",
        json=payload,
        headers={"Authorization": "Bearer not-a-real-session-token"},
        timeout=10,
    )
    assert response.status_code == 401

    # NOTE: the full owner-vs-non-owner behaviour (active_owner for
    # isbingsc@gmail.com, 403 for any other identity) requires a Clerk
    # session token whose `azp` claim matches APP_URL. Tokens minted purely
    # through the Clerk Backend API (sessions.create + create_token) never
    # carry an `azp` claim, so this app's strict authorized_parties check
    # (see backend/lib/auth.py) always rejects them with 401 before the
    # owner-email comparison is ever reached. Exercising the authenticated
    # branches needs a real browser-completed Clerk sign-in bound to the
    # app's origin, which is not available in this environment (no email
    # inbox access for OTP). This is reported as a test-environment
    # limitation, not an application bug.
