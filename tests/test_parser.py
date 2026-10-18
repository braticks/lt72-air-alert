"""Minimal tests for official LT72 page text interpretation."""

import importlib.util
from pathlib import Path
import unittest

FILE = Path(__file__).resolve().parents[1] / "custom_components" / "lt72_air_alert" / "parser.py"
SPEC = importlib.util.spec_from_file_location("lt72_parser", FILE)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
parse_air_alerts = MODULE.parse_air_alerts


def page(body: str) -> str:
    return (
        "<html><head><script>fake = '(RAUDONA): Kauno apskritis';</script></head>"
        "<body><h2>Šiuo metu fiksuojami pavojai</h2>"
        + body
        + "<h4>Ką reiškia spalvos?</h4></body></html>"
    )


class ParseAirAlertsTest(unittest.TestCase):
    def test_multiple_counties_and_colors(self):
        html = page(
            "<h3>Oro pavojus (RAUDONA): Šiaulių ir Panevėžio apskritys</h3>"
            "<p>2026-10-18 07:09 Paskelbtas RAUDONAS oro pavojus</p>"
            "<h3>Oro pavojaus nėra (BALTA): Kauno apskritis</h3>"
            "<p>2026-10-18 07:51 Paskelbtas BALTAS oro pavojus</p>"
        )
        data = parse_air_alerts(html)
        self.assertEqual(data["siauliu"]["code"], "red")
        self.assertEqual(data["panevezio"]["code"], "red")
        self.assertEqual(data["kauno"]["code"], "white")
        self.assertEqual(data["kauno"]["published_at"], "2026-10-18 07:51")
        self.assertNotIn("vilniaus", data)

    def test_all_lithuania_and_yellow_after_red(self):
        data = parse_air_alerts(
            page("<h3>Oro pavojus (GELTONA PO RAUDONOS): Visoje Lietuvoje</h3>")
        )
        self.assertEqual(len(data), 10)
        self.assertEqual(data["alytaus"]["code"], "yellow_after_red")

    def test_no_active_entries_not_white(self):
        self.assertEqual(parse_air_alerts(page("<p>Pranešimų nėra</p>")), {})

    def test_missing_section_fails_closed(self):
        with self.assertRaises(ValueError):
            parse_air_alerts("<html><body><h3>Oro pavojaus nėra (BALTA)</h3></body></html>")

    def test_unknown_region_fails_closed(self):
        with self.assertRaises(ValueError):
            parse_air_alerts(page("<h3>Oro pavojus (RAUDONA): nežinoma vieta</h3>"))


if __name__ == "__main__":
    unittest.main()
