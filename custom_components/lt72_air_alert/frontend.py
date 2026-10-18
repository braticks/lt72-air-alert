"""Serve bundled LT72 map card and register it with Lovelace."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import lovelace
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_call_later

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
STATIC_URL = f"/{DOMAIN}"
CARD_URL = f"{STATIC_URL}/lt72-air-alert-map.js"
CARD_VERSION = "0.2.0"
FRONTEND_DIR = Path(__file__).parent / "www"


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Expose resources from the same HACS integration install."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if not domain_data.get("_static_registered"):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False)]
        )
        domain_data["_static_registered"] = True

    if not await _async_register_resource(hass):
        if not domain_data.get("_resource_retry_scheduled"):
            domain_data["_resource_retry_scheduled"] = True
            async def _retry(_now) -> None:
                domain_data["_resource_retry_scheduled"] = False
                if not await _async_register_resource(hass):
                    _LOGGER.warning("LT72 map resource unavailable; add %s manually", CARD_URL)

            async_call_later(hass, 10, _retry)


async def _async_register_resource(hass: HomeAssistant) -> bool:
    """Create or update the card JS resource in storage-mode Lovelace."""
    lovelace_data = hass.data.get(lovelace.LOVELACE_DATA)
    if lovelace_data is None:
        return False

    resources = lovelace_data.resources
    if not isinstance(resources, lovelace.resources.ResourceStorageCollection):
        _LOGGER.warning(
            "YAML resource mode: add %s as a JavaScript module manually",
            CARD_URL,
        )
        return True

    try:
        await resources.async_get_info()
        url = f"{CARD_URL}?v={CARD_VERSION}"
        for item in resources.async_items():
            old_url = str(item.get("url", ""))
            if old_url.lower().split("?", 1)[0] == CARD_URL.lower():
                if old_url != url:
                    await resources.async_update_item(
                        item["id"], {"res_type": "module", "url": url}
                    )
                return True
        await resources.async_create_item({"res_type": "module", "url": url})
        return True
    except (ValueError, KeyError) as exc:
        _LOGGER.warning("Could not register the LT72 map resource: %s", exc)
        return False
