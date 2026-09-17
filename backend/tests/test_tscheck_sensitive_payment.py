import uuid
import httpx

BASE = "http://localhost:8001"


def test_subscription_does_not_persist_sensitive_payment_fields():
    marker = uuid.uuid4().hex[:8]
    payload = {
        "planId": "premium-anual",
        "period": "/ano",
        "paymentMethod": "debit",
        "location": {"cidade": f"Seguro-{marker}", "cep": "01000-000", "estado": "SP"},
        "cardNumber": "4111111111111111",
        "expiry": "12/30",
        "cvv": "123",
        "cpf": "12345678901",
    }
    created = httpx.post(f"{BASE}/api/subscriptions", json=payload, timeout=10)
    assert created.status_code == 201, created.text
    saved = created.json()["subscription"]
    forbidden = {"cardNumber", "number", "expiry", "validade", "cvv", "cpf"}
    assert not (forbidden & saved.keys())
    listed = httpx.get(f"{BASE}/api/subscriptions", timeout=10).json()["subscriptions"]
    persisted = next(item for item in listed if item["id"] == saved["id"])
    assert not (forbidden & persisted.keys())
    assert persisted["paymentMethod"] == "debit"
