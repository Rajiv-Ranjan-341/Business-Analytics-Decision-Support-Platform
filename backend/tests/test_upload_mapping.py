import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CSV = (
    "Order Date,Sales,Profit,Quantity,Discount,Customer ID,Product Name,Category,Region\n"
    "2024-01-03,261.96,41.91,2,0.0,CG-12520,Bush Somerset Bookcase,Furniture,South\n"
    "2024-01-09,731.94,219.58,3,0.0,DV-13045,Hon Stacking Chairs,Furniture,West\n"
    "2024-02-11,14.62,6.87,2,0.0,SO-20335,Self-Adhesive Labels,Office Supplies,South\n"
)


@pytest.fixture
def uploaded():
    """Upload a small file and clean it up afterwards, whatever the test does."""
    res = client.post(
        "/api/datasets/upload",
        files={"file": ("corner shop.csv", CSV.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 200, res.text
    dataset_id = res.json()["id"]
    try:
        yield dataset_id
    finally:
        client.delete(f"/api/datasets/{dataset_id}")


def test_upload_saves_the_columns_it_detected(uploaded):
    """The app already works out which column means what, and got every role
    right on the real Superstore file. Making someone confirm that by hand
    before any page will show them anything turns a working dataset into eight
    pages of warnings — which is exactly what happened.
    """
    mappings = client.get(f"/api/datasets/{uploaded}/mappings").json()["mappings"]

    assert mappings.get("date") == "Order Date"
    assert mappings.get("revenue") == "Sales"
    assert mappings.get("profit") == "Profit"
    assert mappings.get("customer_id") == "Customer ID"
    assert mappings.get("product") == "Product Name"


def test_the_dashboard_works_straight_after_upload(uploaded):
    """The real symptom to guard against: every analytics page 400s on a
    freshly uploaded file because nothing is mapped yet."""
    res = client.get(f"/api/dashboard/{uploaded}/kpis")

    assert res.status_code == 200, res.text
    assert res.json()["kpis"]["total_revenue"] == pytest.approx(1008.52)


def test_a_name_with_separators_collapses_to_single_spaces(uploaded):
    detail = client.get(f"/api/datasets/{uploaded}").json()

    assert detail["name"] == "Corner Shop"


def test_mappings_can_still_be_overridden(uploaded):
    """Auto-detection is a starting point, not a decision — the mapping screen
    must still win."""
    client.post(
        f"/api/datasets/{uploaded}/mappings",
        json={"mappings": {"date": "Order Date", "revenue": "Profit"}},
    )

    mappings = client.get(f"/api/datasets/{uploaded}/mappings").json()["mappings"]

    assert mappings["revenue"] == "Profit"
    assert "product" not in mappings
