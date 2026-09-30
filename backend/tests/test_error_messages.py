"""The messages people actually read when a file is not fully mapped.

These guard copy, not logic, because copy is what broke: every analytics page
warned at once and none of them said which column was missing or where to set it.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CSV = (
    "Order Date,Sales,Profit,Quantity,Discount,Customer ID,Product Name,Category,Region\n"
    "2024-01-03,261.96,41.91,2,0.0,CG-12520,Bush Somerset Bookcase,Furniture,South\n"
    "2024-02-11,14.62,6.87,2,0.0,SO-20335,Self-Adhesive Labels,Office Supplies,South\n"
)

# Wording the app must never show a shop owner again.
JARGON = ("not mapped", "Column Mapping", "Upload > Column Mapping", "'None'", "mappings")


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


def only_date_mapped(dataset_id):
    """Saving replaces the whole set, so this drops every role but the date."""
    client.post(
        f"/api/datasets/{dataset_id}/mappings",
        json={"mappings": {"date": "Order Date"}},
    )


def test_a_missing_sales_column_is_named_not_printed_as_none(dataset_id):
    """This used to answer "Column 'None' not found" — jargon naming nothing."""
    only_date_mapped(dataset_id)

    res = client.get(f"/api/dashboard/{dataset_id}/timeseries?period=monthly")

    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "sales figures" in detail
    assert "None" not in detail


def test_a_column_that_really_is_absent_says_so(dataset_id):
    res = client.get(f"/api/dashboard/{dataset_id}/timeseries?column=Bananas")

    assert res.status_code == 400
    assert "Bananas" in res.json()["detail"]


def test_every_mapping_error_avoids_jargon_and_stale_screen_names(dataset_id):
    client.post(f"/api/datasets/{dataset_id}/mappings", json={"mappings": {}})

    endpoints = [
        ("GET", f"/api/dashboard/{dataset_id}/kpis"),
        ("GET", f"/api/dashboard/{dataset_id}/category-breakdown"),
        ("GET", f"/api/dashboard/{dataset_id}/region-breakdown"),
        ("GET", f"/api/dashboard/{dataset_id}/monthly-trend"),
        ("GET", f"/api/products/{dataset_id}/profitability"),
        ("GET", f"/api/diagnosis/{dataset_id}"),
        ("POST", f"/api/customers/{dataset_id}/segment"),
    ]

    for method, url in endpoints:
        res = client.request(method, url)
        assert res.status_code == 400, f"{url} gave {res.status_code}"
        detail = res.json()["detail"]
        for phrase in JARGON:
            assert phrase not in detail, f"{url} still says {phrase!r}: {detail!r}"
        assert detail[0].isupper() and detail.rstrip().endswith("."), f"{url}: {detail!r}"


def test_the_backend_does_not_repeat_the_route_the_ui_already_links_to(dataset_id):
    """The page shows a link to the upload screen beside the message, so the
    message repeating the same directions gave four sentences for two facts."""
    client.post(f"/api/datasets/{dataset_id}/mappings", json={"mappings": {}})

    detail = client.get(f"/api/dashboard/{dataset_id}/kpis").json()["detail"]

    assert "Upload data page" not in detail
