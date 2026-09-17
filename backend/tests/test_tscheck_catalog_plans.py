import httpx

BASE = "http://localhost:8001"


def test_catalog_exposes_requested_plans_and_mocked_payment():
    response = httpx.get(f"{BASE}/api/catalog/plans", timeout=10)
    assert response.status_code == 200
    body = response.json()
    assert body["paymentMocked"] is True
    plans = {plan["id"]: plan for plan in body["plans"]}
    assert plans["gratuito"]["price"] == "R$ 0,00"
    assert plans["premium"]["price"] == "R$ 19,90"
    assert plans["destaque"]["price"] == "R$ 9,90"
    assert plans["premium-anual"]["price"] == "R$ 199,90"
    assert "Selo neon" in plans["premium"]["badge"]
    assert "238,80" in plans["premium-anual"]["savings"]
