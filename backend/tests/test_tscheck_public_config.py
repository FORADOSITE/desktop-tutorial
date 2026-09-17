import httpx

BASE = "http://localhost:8001"


def test_public_config_exposes_only_publishable_key():
    response = httpx.get(f"{BASE}/api/config", timeout=10)
    assert response.status_code == 200

    raw_text = response.text
    body = response.json()

    assert "clerkPublishableKey" in body
    assert isinstance(body["clerkPublishableKey"], str)
    assert body["clerkPublishableKey"].startswith("pk_test_")

    # The secret key must never leak through this public endpoint.
    assert "CLERK_SECRET_KEY" not in raw_text
    assert "sk_test_" not in raw_text
    assert set(body.keys()) == {"clerkPublishableKey"}
