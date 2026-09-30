import pytest

from app.services.data_processor import read_uploaded_file


def test_reads_a_windows_encoded_csv(tmp_path):
    """Retail exports arrive as cp1252 far more often than as UTF-8.

    Excel on Windows writes it by default, and the public Superstore dataset
    carries non-breaking spaces in product names that are not valid UTF-8 at
    all. Assuming UTF-8 rejects the most common file this product is given.
    """
    csv = "Product Name,Sales\nKonftel 250 Conference\xa0phone,911.42\n"
    path = tmp_path / "windows.csv"
    path.write_bytes(csv.encode("cp1252"))

    df = read_uploaded_file(str(path))

    assert len(df) == 1
    assert df["Sales"][0] == pytest.approx(911.42)


def test_strips_non_breaking_spaces_from_text(tmp_path):
    """A non-breaking space is invisible but makes two identical names differ,
    which quietly splits a product into two rows when the data is grouped."""
    csv = "Product Name,Sales\nKonftel 250 Conference\xa0phone,911.42\n"
    path = tmp_path / "windows.csv"
    path.write_bytes(csv.encode("cp1252"))

    df = read_uploaded_file(str(path))

    assert df["Product Name"][0] == "Konftel 250 Conference phone"


def test_still_reads_plain_utf8(tmp_path):
    csv = "Product Name,Sales\nCafé Table,120.50\n"
    path = tmp_path / "utf8.csv"
    path.write_bytes(csv.encode("utf-8"))

    df = read_uploaded_file(str(path))

    assert df["Product Name"][0] == "Café Table"


def test_reads_utf8_with_a_byte_order_mark(tmp_path):
    """Excel's "CSV UTF-8" export writes a BOM, which otherwise ends up glued to
    the first column name and breaks column mapping."""
    csv = "Product Name,Sales\nDesk,10.00\n"
    path = tmp_path / "bom.csv"
    path.write_bytes(csv.encode("utf-8-sig"))

    df = read_uploaded_file(str(path))

    assert list(df.columns) == ["Product Name", "Sales"]


def test_accepts_an_uppercase_extension(tmp_path):
    path = tmp_path / "SHOUTY.CSV"
    path.write_bytes(b"Product Name,Sales\nDesk,10.00\n")

    df = read_uploaded_file(str(path))

    assert len(df) == 1


def test_rejects_an_unsupported_file_type(tmp_path):
    path = tmp_path / "notes.pdf"
    path.write_bytes(b"%PDF-1.4")

    with pytest.raises(ValueError):
        read_uploaded_file(str(path))
