"""What the explainability endpoint is allowed to use as a feature.

The bug these guard against: the feature list included the profit column while
revenue was the target. Profit is revenue minus cost, so it is very nearly the
target restated. The model leans on it, SHAP crowns it the top driver, and the
"insight" is a tautology rather than anything a shop owner can act on.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

HEADER = "Order Date,Sales,Profit,Quantity,Discount,Customer ID,Product Name,Category,Region\n"
ROWS = [
    "2024-01-03,261.96,41.91,2,0.00,CG-12520,Bookcase,Furniture,South",
    "2024-01-09,731.94,219.58,3,0.00,DV-13045,Chairs,Furniture,West",
    "2024-01-14,14.62,6.87,2,0.00,SO-20335,Labels,Office Supplies,South",
    "2024-01-20,957.58,-383.03,5,0.45,BH-11710,Table,Furniture,West",
    "2024-02-02,22.37,2.52,2,0.20,AA-10480,Cart,Office Supplies,East",
    "2024-02-08,48.86,14.17,7,0.00,IM-15070,Desk Set,Furniture,Central",
    "2024-02-11,7.28,1.97,4,0.00,HP-14815,Newell,Office Supplies,East",
    "2024-02-18,907.15,90.72,6,0.20,PK-19075,IP Phone,Technology,West",
    "2024-03-01,18.50,5.78,3,0.20,RB-19360,Binders,Office Supplies,South",
    "2024-03-07,114.90,34.47,5,0.00,AB-10105,Storage,Office Supplies,Central",
    "2024-03-15,320.00,96.00,4,0.00,GM-14440,Printer,Technology,East",
    "2024-03-22,89.99,-12.00,2,0.30,KL-16555,Paper,Office Supplies,West",
]
CSV = HEADER + "\n".join(ROWS) + "\n"


@pytest.fixture
def dataset_id():
    res = client.post(
        "/api/datasets/upload", files={"file": ("shop.csv", CSV.encode(), "text/csv")}
    )
    assert res.status_code == 200, res.text
    new_id = res.json()["id"]
    try:
        yield new_id
    finally:
        client.delete(f"/api/datasets/{new_id}")


def test_profit_is_not_used_to_explain_revenue(dataset_id):
    res = client.get(f"/api/simulator/{dataset_id}/explain")

    assert res.status_code == 200, res.text
    features = [row["feature"] for row in res.json()["feature_importance"]]

    assert not any(f == "Profit" or f.startswith("Profit_") for f in features), (
        f"Profit leaked into the explanation of Sales: {features}"
    )


def test_the_target_itself_never_appears_as_a_feature(dataset_id):
    """Guards the case where one column is mapped to two roles."""
    client.post(
        f"/api/datasets/{dataset_id}/mappings",
        json={
            "mappings": {
                "date": "Order Date",
                "revenue": "Sales",
                "profit": "Sales",
                "quantity": "Quantity",
                "discount": "Discount",
                "category": "Category",
                "region": "Region",
            }
        },
    )

    res = client.get(f"/api/simulator/{dataset_id}/explain")

    assert res.status_code == 200, res.text
    features = [row["feature"] for row in res.json()["feature_importance"]]
    assert not any(f == "Sales" or f.startswith("Sales_") for f in features), features


def test_it_still_explains_something_useful(dataset_id):
    """Dropping profit must not leave the endpoint with nothing to say."""
    res = client.get(f"/api/simulator/{dataset_id}/explain")

    assert res.status_code == 200, res.text
    body = res.json()
    assert len(body["feature_importance"]) >= 2
    assert body["n_samples"] == len(ROWS)
