"""Poll official LT72 page for published air alert statuses."""

from __future__ import annotations

from datetime import timedelta
import logging

from aiohttp import ClientError, ClientTimeout
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, SOURCE_URL
from .parser import parse_air_alerts

_LOGGER = logging.getLogger(__name__)


class LT72Coordinator(DataUpdateCoordinator[dict]):
    """Refresh region states every minute."""

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=60),
        )

    async def _async_update_data(self) -> dict:
        session = async_get_clientsession(self.hass)
        try:
            async with session.get(
                SOURCE_URL,
                timeout=ClientTimeout(total=15),
                headers={"Cache-Control": "no-cache"},
            ) as response:
                response.raise_for_status()
                page = await response.text()
            return parse_air_alerts(page)
        except (ClientError, TimeoutError, ValueError) as exc:
            raise UpdateFailed(f"Nepavyko gauti LT72 perspėjimų: {exc}") from exc
