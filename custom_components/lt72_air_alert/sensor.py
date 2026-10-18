"""Sensor showing LT72 official status for the selected county."""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    CONF_REGION,
    DEFAULT_REGION,
    DOMAIN,
    REGIONS,
    SOURCE_URL,
    STATE_NAMES,
    STATE_RECOMMENDATIONS,
)
from .coordinator import LT72Coordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add the single configured county sensor."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([LT72AirAlertSensor(coordinator, entry)])


class LT72AirAlertSensor(CoordinatorEntity[LT72Coordinator], SensorEntity):
    """Expose a published county status, never infer safety."""

    _attr_has_entity_name = False
    _attr_unique_id = f"{DOMAIN}_selected_region"
    _attr_icon = "mdi:shield-alert-outline"

    def __init__(self, coordinator: LT72Coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._region = entry.options.get(
            CONF_REGION, entry.data.get(CONF_REGION, DEFAULT_REGION)
        )
        self._attr_name = f"Oro pavojus – {REGIONS[self._region]}"

    @property
    def native_value(self) -> str:
        record = self.coordinator.data.get(self._region)
        if record is None:
            return "Nepaskelbta"
        return STATE_NAMES[record["code"]]

    @property
    def icon(self) -> str:
        record = self.coordinator.data.get(self._region)
        code = record["code"] if record else "not_reported"
        return {
            "red": "mdi:alert-octagon",
            "yellow": "mdi:alert",
            "yellow_after_red": "mdi:shield-alert",
            "white": "mdi:information-outline",
            "not_reported": "mdi:information-outline",
        }[code]

    @property
    def extra_state_attributes(self) -> dict:
        record = self.coordinator.data.get(self._region)
        code = record["code"] if record else "not_reported"
        return {
            "apskritis": REGIONS[self._region],
            "apskritys": {
                key: {
                    "busena": STATE_NAMES[record["code"]],
                    "kodas": record["code"],
                    "paskelbta": record["published_at"],
                }
                for key, record in self.coordinator.data.items()
                if key in REGIONS
            },
            "pavojaus_kodas": code,
            "paskelbta": record["published_at"] if record else None,
            "rekomendacija": STATE_RECOMMENDATIONS[code],
            "saltinis": "LT72",
            "saltinio_adresas": SOURCE_URL,
            "pastaba": "Neoficiali integracija, nepakeičia LT-Alert perspėjimų.",
        }
