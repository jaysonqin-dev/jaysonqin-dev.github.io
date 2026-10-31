#!/usr/bin/env python3
"""Builds the static site into the repository root.

src/layout.html wraps every page in src/pages/**. A page starts with an HTML comment of `key: value`
lines (title, description, path, nav, head_extra, scripts_extra) followed by its content.

    python3 tools/build.py                       # for https://qjl0629.github.io
    BASE_URL=https://example.dev python3 tools/build.py   # after moving to a custom domain

Also writes sitemap.xml and robots.txt for that base URL.
"""

from __future__ import annotations

import os
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
BASE_URL = os.environ.get("BASE_URL", "https://qjl0629.github.io").rstrip("/")
NAV_KEYS = ("work", "agents", "lab", "about")
HEADER = re.compile(r"\A\s*<!--\s*(.*?)\s*-->\s*", re.DOTALL)


def parse_page(path: Path):
    text = path.read_text(encoding="utf-8")
    match = HEADER.match(text)
    if not match:
        raise SystemExit(f"{path}: missing the header comment")
    meta = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()
    for key in ("title", "description", "path"):
        if key not in meta:
            raise SystemExit(f"{path}: header needs {key}")
    return meta, text[match.end():]


def extra(meta: dict, key: str, base: str) -> str:
    value = meta.get(key, "")
    return value.replace("{{base}}", base).replace("{{site}}", BASE_URL)


def render(layout: str, meta: dict, content: str) -> str:
    out_path = meta["path"]
    depth = out_path.count("/")
    # 404.html is served from any path, so it needs root-absolute URLs.
    base = "/" if meta.get("absolute") == "true" else "../" * depth
    nav = meta.get("nav", "")
    canonical = f"{BASE_URL}/" if out_path == "index.html" else f"{BASE_URL}/{out_path}"
    values = {
        "title": meta["title"],
        "description": meta["description"],
        "base": base,
        "site": BASE_URL,
        "canonical": canonical,
        "content": content.rstrip() + "\n",
        "head_extra": extra(meta, "head_extra", base),
        "scripts_extra": extra(meta, "scripts_extra", base),
    }
    for key in NAV_KEYS:
        values[f"nav_{key}"] = ' aria-current="page"' if nav == key else ""
    page = layout
    for key, value in values.items():
        page = page.replace("{{" + key + "}}", value)
    leftover = re.findall(r"\{\{(\w+)\}\}", page)
    if leftover:
        raise SystemExit(f"{out_path}: unreplaced placeholders {sorted(set(leftover))}")
    return page


def main() -> int:
    layout = (SRC / "layout.html").read_text(encoding="utf-8")
    pages = sorted((SRC / "pages").rglob("*.html"))
    urls = []
    for source in pages:
        meta, content = parse_page(source)
        # Page content may use {{base}} for links and assets.
        page_base = "/" if meta.get("absolute") == "true" else "../" * meta["path"].count("/")
        content = content.replace("{{base}}", page_base).replace("{{site}}", BASE_URL)
        target = ROOT / meta["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(render(layout, meta, content), encoding="utf-8")
        if meta["path"] != "404.html":
            urls.append(meta["path"])
        print(f"built {meta['path']}")

    today = date.today().isoformat()
    entries = "\n".join(
        f"  <url><loc>{BASE_URL}/{'' if p == 'index.html' else p}</loc><lastmod>{today}</lastmod></url>" for p in urls
    )
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{entries}\n</urlset>\n',
        encoding="utf-8",
    )
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {BASE_URL}/sitemap.xml\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
