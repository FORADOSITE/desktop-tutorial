import uuid
import httpx

BASE = "http://localhost:8001"


def test_subscription_confirmation_persists_unique_location():
    marker = uuid.uuid4().hex[:8]
    payload = {
        "planId": "premium-anual",
        "period": "/ano",
        "paymentMethod": "pix",
        "location": {"cidade": f"Cidade-{marker}", "cep": "88000-123", "estado": "sc"},
    }
    created = httpx.post(f"{BASE}/api/subscriptions", json=payload, timeout=10)
    assert created.status_code == 201, created.text
    subscription = created.json()["subscription"]
    assert subscription["planId"] == "premium-anual"
    assert subscription["status"] == "confirmed_mock"
    assert subscription["location"] == {"cidade": f"Cidade-{marker}", "cep": "88000-123", "estado": "SC"}

    listed = httpx.get(f"{BASE}/api/subscriptions", timeout=10)
    assert listed.status_code == 200
    match = next(item for item in listed.json()["subscriptions"] if item["id"] == subscription["id"])
    assert match["location"]["cidade"] == f"Cidade-{marker}"
    assert match["paymentMethod"] == "pix"
