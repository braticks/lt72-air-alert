"""Regression tests for LT72 sensor computed values without a running HA instance."""

import ast
from pathlib import Path
from types import SimpleNamespace
import unittest

SENSOR_PATH = Path(__file__).resolve().parents[1] / "custom_components/lt72_air_alert/sensor.py"


def logic_class():
    """Compile the actual sensor properties with lightweight HA constants."""
    source = ast.parse(SENSOR_PATH.read_text(encoding="utf-8"))
    node = next(n for n in source.body if isinstance(n, ast.ClassDef) and n.name == "LT72AirAlertSensor")
    methods = [
        n for n in node.body
        if isinstance(n, ast.FunctionDef)
        and n.name in ("native_value", "icon", "extra_state_attributes")
    ]
    definition = ast.ClassDef(
        name="SensorLogic", bases=[], keywords=[], body=methods,
        decorator_list=[], type_params=[],
    )
    namespace = {
        "REGIONS": {"kauno": "Kauno apskritis"},
        "SOURCE_URL": "https://lt72.lt/",
        "STATE_NAMES": {"red": "Raudona", "white": "Balta"},
        "STATE_RECOMMENDATIONS": {
            "red": "Pavojus", "white": "Atšaukta",
            "not_reported": "Nepranešta",
        },
    }
    exec(compile(ast.fix_missing_locations(ast.Module(body=[definition], type_ignores=[])),
                 str(SENSOR_PATH), "exec"), namespace)
    return namespace["SensorLogic"]


class SensorStateTests(unittest.TestCase):
    def make_sensor(self, data):
        sensor = object.__new__(logic_class())
        sensor.coordinator = SimpleNamespace(data=data)
        sensor._region = "kauno"
        return sensor

    def test_site_unavailable_keeps_sensor_readable(self):
        sensor = self.make_sensor({
            "_source_available": False,
            "_source_error": "LT72 active alerts section was not found",
        })
        self.assertEqual(sensor.native_value, "Neprieinama")
        self.assertEqual(sensor.icon, "mdi:alert-circle-outline")
        attributes = sensor.extra_state_attributes
        self.assertIs(attributes["saltinis_pasiekiamas"], False)
        self.assertEqual(attributes["pavojaus_kodas"], "unavailable")
        self.assertIn("Nepavyko", attributes["rekomendacija"])

    def test_no_published_county_alert_is_not_white(self):
        sensor = self.make_sensor({})
        self.assertEqual(sensor.native_value, "Nepaskelbta")
        self.assertEqual(sensor.extra_state_attributes["pavojaus_kodas"], "not_reported")

    def test_published_red_alert(self):
        sensor = self.make_sensor({
            "kauno": {"code": "red", "published_at": "2026-11-02 09:00"},
        })
        self.assertEqual(sensor.native_value, "Raudona")
        self.assertEqual(sensor.extra_state_attributes["pavojaus_kodas"], "red")


if __name__ == "__main__":
    unittest.main()
