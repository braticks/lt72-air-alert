"""Lietuvos oro pavojus (LT72) Home Assistant integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .coordinator import LT72Coordinator

PLATFORMS = [Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Start polling and set up the region sensor."""
    coordinator = LT72Coordinator(hass)
    await coordinator.async_config_entry_first_refresh()
    hass.data.setdefault("lt72_air_alert", {})[entry.entry_id] = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the sensor when removing or reconfiguring the integration."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data["lt72_air_alert"].pop(entry.entry_id, None)
    return unloaded
