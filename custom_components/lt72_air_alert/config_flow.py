"""UI configuration and options for LT72 county selection."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import CONF_REGION, DEFAULT_REGION, DOMAIN, REGIONS


def region_schema(region: str) -> vol.Schema:
    """Build a dropdown populated with all 10 Lithuanian counties."""
    return vol.Schema(
        {vol.Required(CONF_REGION, default=region): vol.In(REGIONS)}
    )


class LT72AirAlertConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """One region sensor; chosen and editable from the UI."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        if user_input is not None:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title="Lietuvos oro pavojus (LT72)",
                data=user_input,
            )

        return self.async_show_form(
            step_id="user",
            data_schema=region_schema(DEFAULT_REGION),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return LT72AirAlertOptionsFlow()


class LT72AirAlertOptionsFlow(config_entries.OptionsFlowWithReload):
    """Allow changing county through Configure without YAML."""

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        current = self.config_entry.options.get(
            CONF_REGION,
            self.config_entry.data.get(CONF_REGION, DEFAULT_REGION),
        )
        return self.async_show_form(
            step_id="init",
            data_schema=region_schema(current),
        )
