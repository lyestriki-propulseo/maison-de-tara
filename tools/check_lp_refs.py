from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "lp-finales-index.html",
    "lp-a-reservation-claire.html",
    "lp-b-maison-vivante.html",
    "lp-c-atelier-communautaire.html",
    "lp-d-art-de-vivre.html",
]


class RefParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        for key in ("src", "href"):
            value = attr_map.get(key)
            if value:
                self.refs.append(value)


def is_external(ref: str) -> bool:
    return ref.startswith(("http://", "https://", "mailto:", "tel:", "#"))


def main() -> None:
    failed = False
    for file_name in FILES:
        parser = RefParser()
        parser.feed((ROOT / file_name).read_text(encoding="utf-8"))
        missing: list[str] = []
        for ref in parser.refs:
            if is_external(ref):
                continue
            clean = unquote(ref.split("#", 1)[0].split("?", 1)[0])
            if clean and not (ROOT / clean).exists():
                missing.append(ref)
        if missing:
            failed = True
            print(f"{file_name}: MISSING {missing}")
        else:
            print(f"{file_name}: OK")
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
