"""Constants for the LT72 air alert integration."""

DOMAIN = "lt72_air_alert"
CONF_REGION = "region"
DEFAULT_REGION = "kauno"
SOURCE_URL = "https://lt72.lt/"

# Keys are stable; labels are shown in the Home Assistant UI.
REGIONS = {
    "alytaus": "Alytaus apskritis",
    "kauno": "Kauno apskritis",
    "klaipedos": "Klaipėdos apskritis",
    "marijampoles": "Marijampolės apskritis",
    "panevezio": "Panevėžio apskritis",
    "siauliu": "Šiaulių apskritis",
    "taurages": "Tauragės apskritis",
    "telsiu": "Telšių apskritis",
    "utenos": "Utenos apskritis",
    "vilniaus": "Vilniaus apskritis",
}

STATE_NAMES = {
    "red": "Raudona",
    "yellow": "Geltona",
    "yellow_after_red": "Geltona po raudonos",
    "white": "Balta",
}

STATE_RECOMMENDATIONS = {
    "red": "Nedelsdami eikite į saugią vietą ar priedangą.",
    "yellow": "Numatykite saugią vietą ir priedangą.",
    "yellow_after_red": "Likite saugioje vietoje ar priedangoje.",
    "white": "LT72 paskelbė oro pavojaus atšaukimą.",
    "not_reported": (
        "LT72 suvestinėje nėra įrašo šiai apskričiai. "
        "Tai nėra saugumo patvirtinimas."
    ),
}
