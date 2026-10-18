"""Parse LT72 public air-alert status headings.

LT72 does not promise a stable public API for this content. Parse only the
active-alert section of the page; never infer 'white' from a missing region.
"""

from __future__ import annotations

from html.parser import HTMLParser
import re
import unicodedata

_STATUS_RE = re.compile(
    r"\(\s*(GELTONA\s+PO\s+RAUDONOS|RAUDONA|GELTONA|BALTA)\s*\)\s*:\s*(.+)",
    re.IGNORECASE,
)
_TIME_RE = re.compile(r"\b(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\b")
_REGION_STEMS = {
    "alytaus": "alytaus",
    "kauno": "kauno",
    "klaipedos": "klaipedos",
    "marijampoles": "marijampoles",
    "panevezio": "panevezio",
    "siauliu": "siauliu",
    "taurages": "taurages",
    "telsiu": "telsiu",
    "utenos": "utenos",
    "vilniaus": "vilniaus",
}

_COLOR_CODES = {
    "RAUDONA": "red",
    "GELTONA": "yellow",
    "GELTONA PO RAUDONOS": "yellow_after_red",
    "GELTONA PO RAUDONA": "yellow_after_red",
    "BALTA": "white",
}


class _PageText(HTMLParser):
    """Extract accessible HTML text with basic block boundaries."""

    _BREAK_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "br", "hr"}
    _SKIP_TAGS = {"script", "style", "noscript", "svg"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.skip_depth:
            self.skip_depth += 1
        elif tag in self._SKIP_TAGS:
            self.skip_depth = 1
        elif tag in self._BREAK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self.skip_depth:
            self.skip_depth -= 1
        elif tag in self._BREAK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)


def _ascii(value: str) -> str:
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", value.casefold())
        if not unicodedata.combining(ch)
    )


def _matching_regions(territory: str) -> list[str]:
    simple = _ascii(territory)
    if re.search(
        r"\b(visoje lietuvoje|visa lietuva|visos lietuvos|lietuvos respublikoje)\b",
        simple,
    ):
        return list(_REGION_STEMS)
    return [
        region
        for region, stem in _REGION_STEMS.items()
        if re.search(rf"\b{stem}\b", simple)
    ]


def parse_air_alerts(html: str) -> dict[str, dict[str, str | None]]:
    """Return the last published LT72 state per county from page text.

    If the expected section is absent, raise ValueError: do not present stale
    or empty content as a confirmed safe state.
    """
    page = _PageText()
    page.feed(html)
    lines = [re.sub(r"\s+", " ", line).strip()
             for line in "".join(page.parts).splitlines()]
    lines = [line for line in lines if line]

    start = next(
        (i for i, line in enumerate(lines)
         if "siuo metu fiksuojami pavojai" in _ascii(line)),
        None,
    )
    if start is None:
        raise ValueError("LT72 active alerts section was not found")

    end = next(
        (i for i in range(start + 1, len(lines))
         if "ka reiskia spalvos" in _ascii(lines[i])),
        None,
    )
    if end is None:
        raise ValueError("LT72 active alerts section end was not found")

    results: dict[str, dict[str, str | None]] = {}
    current_regions: list[str] = []
    for line in lines[start + 1:end]:
        match = _STATUS_RE.search(line)
        if match:
            level = re.sub(r"\s+", " ", match.group(1).upper()).strip()
            code = _COLOR_CODES[level]
            territories = _matching_regions(match.group(2))
            if not territories:
                raise ValueError("LT72 warning territories could not be identified")
            current_regions = territories
            for region in territories:
                # First heading is the currently published status for the county.
                if region not in results:
                    results[region] = {
                        "code": code,
                        "published_at": None,
                    }
        elif current_regions:
            timestamp = _TIME_RE.search(line)
            if timestamp:
                for region in current_regions:
                    if results[region]["published_at"] is None:
                        results[region]["published_at"] = timestamp.group(1)
                current_regions = []

    return results
