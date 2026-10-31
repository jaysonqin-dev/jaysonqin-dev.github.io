#!/usr/bin/env python3
"""Static checks for the built site. No network access.

Checks: internal links and anchors resolve, images have alt text, one h1 per
page and no skipped heading levels, ids are unique, no unreplaced template
placeholders, every page has a title and description, and no term from the
private-terms list appears anywhere in the published files.

Usage: python3 tools/check_site.py [--root .]
Exit code is the number of problems found (0 = clean).
"""
import argparse
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urldefrag, urlparse

# Terms that must never appear in published files. The list is deliberately
# generic: employer names, internal tool names and colleagues' names.
PRIVATE_TERMS = [
    r"lululemon", r"\blulu\b", r"Labs Ops", r"APE Team", r"Testers and Testing",
    r"NDA or Waiver", r"jqin6", r"qinjialiang", r"\bPTS\b", r"Smartsheet",
    r"Siân", r"\bJill\b", r"Kristin", r"BEGIN (OPENSSH|RSA) PRIVATE",
]
SKIP_DIRS = {".git", "tools", "src", "node_modules"}
TEXT_EXT = {".html", ".css", ".js", ".json", ".jsonl", ".xml", ".txt", ".svg", ".md"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.ids, self.headings, self.imgs = [], [], [], []
        self.title, self.description, self._in_title = "", "", False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "a" and "href" in a:
            self.links.append(a["href"])
        if tag in {"link", "script", "img", "source"}:
            ref = a.get("href") or a.get("src")
            if ref:
                self.links.append(ref)
        if tag == "img":
            self.imgs.append(a)
        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append(int(tag[1]))
        if tag == "title":
            self._in_title = True
        if tag == "meta" and a.get("name") == "description":
            self.description = a.get("content", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    root = Path(ap.parse_args().root).resolve()
    problems = []

    def bad(msg):
        problems.append(msg)

    pages = {}
    for f in sorted(root.rglob("*.html")):
        rel = f.relative_to(root)
        if rel.parts[0] in SKIP_DIRS or rel.parts[0] == "lab" and len(rel.parts) > 2 and rel.parts[1] == "marksly":
            continue
        p = Page()
        p.feed(f.read_text(encoding="utf-8"))
        pages[f] = p

    for f, p in pages.items():
        rel = f.relative_to(root)
        if not p.title.strip():
            bad(f"{rel}: missing <title>")
        if not p.description.strip():
            bad(f"{rel}: missing meta description")
        if p.headings.count(1) != 1:
            bad(f"{rel}: expected exactly one h1, found {p.headings.count(1)}")
        for prev, cur in zip(p.headings, p.headings[1:]):
            if cur > prev + 1:
                bad(f"{rel}: heading level jumps h{prev} -> h{cur}")
        dupes = {i for i in p.ids if p.ids.count(i) > 1}
        if dupes:
            bad(f"{rel}: duplicate ids {sorted(dupes)}")
        for img in p.imgs:
            if "alt" not in img:
                bad(f"{rel}: <img src={img.get('src')}> has no alt attribute")
        for href in p.links:
            if href.startswith(("mailto:", "tel:", "javascript:", "data:", "http://", "https://", "//")):
                continue
            if "{{" in href or "__" in href:
                bad(f"{rel}: placeholder in link {href}")
                continue
            path, frag = urldefrag(href)
            target = f if not path else (root / unquote(urlparse(path).path.lstrip("/")) if path.startswith("/") else (f.parent / unquote(urlparse(path).path)))
            target = target.resolve()
            if target.is_dir():
                target = target / "index.html"
            if not target.exists():
                bad(f"{rel}: broken link {href}")
                continue
            if frag and target.suffix == ".html":
                tp = pages.get(target)
                if tp is None:
                    tp = Page()
                    tp.feed(target.read_text(encoding="utf-8"))
                if frag not in tp.ids:
                    bad(f"{rel}: anchor #{frag} not found in {target.relative_to(root)}")

    rx = re.compile("|".join(PRIVATE_TERMS), re.I)
    placeholder = re.compile(r"\{\{[a-z_]+\}\}")
    for f in sorted(root.rglob("*")):
        rel = f.relative_to(root)
        if not f.is_file() or rel.parts[0] in SKIP_DIRS or f.suffix not in TEXT_EXT:
            continue
        if rel.parts[:3] == ("lab", "marksly", "model"):
            continue  # open-source model vocabulary: common words, not site content
        text = f.read_text(encoding="utf-8", errors="ignore")
        for m in rx.finditer(text):
            line = text.count("\n", 0, m.start()) + 1
            # Word-boundary PTS is case-insensitive here; "transcripts" is excluded by \b.
            bad(f"{rel}:{line}: private term '{m.group(0)}'")
        if f.suffix == ".html" and placeholder.search(text):
            bad(f"{rel}: unreplaced template placeholder")

    big = [(f.relative_to(root), f.stat().st_size) for f in root.rglob("*") if f.is_file() and ".git" not in f.parts and f.stat().st_size > 1_500_000]
    for rel, size in big:
        print(f"note: large file {rel} ({size/1e6:.1f} MB)")

    print(f"{len(pages)} pages checked, {len(problems)} problem(s)")
    for m in problems:
        print(" -", m)
    return len(problems)


if __name__ == "__main__":
    sys.exit(min(main(), 125))
