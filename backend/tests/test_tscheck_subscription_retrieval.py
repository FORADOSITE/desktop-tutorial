import uuid

import httpx

BASE = "http://localhost:8001"


def test_subscription_can_be_fetched_by_id_for_profile_setup():
    unique = uuid.uuid4().hex[:8]
    payload = {
        "planId": "premium",
        "period": "/mês",
        "paymentMethod": "pix",
        "location": {"cep": "04000-000", "cidade": f"tscheck-retrieval-{unique}", "estado": "sp"},
    }
    create_response = httpx.post(f"{BASE}/api/subscriptions", json=payload, timeout=10)
    assert create_response.status_code == 201
    created = create_response.json()["subscription"]
    subscription_id = created["id"]

    get_response = httpx.get(f"{BASE}/api/subscriptions/{subscription_id}", timeout=10)
    assert get_response.status_code == 200
    fetched = get_response.json()["subscription"]

    assert fetched["id"] == subscription_id
    assert fetched["planId"] == "premium"
    assert fetched["status"] == "confirmed_mock"
    assert fetched["location"]["cidade"] == f"tscheck-retrieval-{unique}"
    assert fetched["location"]["estado"] == "SP"


def test_subscription_lookup_returns_404_for_unknown_id():
    response = httpx.get(f"{BASE}/api/subscriptions/tscheck-does-not-exist", timeout=10)
    assert response.status_code == 404
