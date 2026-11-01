# Jayson Qin: personal site

Source for my portfolio: applied AI engineering work on agents, evaluation and deployment.
Plain HTML, CSS and a little JavaScript. No framework, no build step for visitors, no trackers.

Live: https://jaysonqin-dev.github.io

## What is here

| Path | What it is |
| --- | --- |
| `src/` | Page sources and the shared layout. Edit these. |
| `index.html`, `work/`, `lab/` | Generated output that GitHub Pages serves. Do not edit by hand. |
| `assets/` | CSS, JavaScript, images, and the recorded data behind the eval lab. |
| `lab/marksly/` | A copy of the Marksly extension that runs as a live demo in the browser. |
| `tools/` | Build script, checker, asset renderer. |

## Work on it

```bash
python3 tools/build.py          # regenerate pages, sitemap.xml, robots.txt
python3 tools/check_site.py     # links, anchors, alt text, headings, private-term scan
python3 -m http.server 8000     # preview at http://localhost:8000
bash tools/sync_marksly.sh      # refresh the live demo from ../bookmark-organizer
bash tools/render_assets.sh     # re-render og.png and the touch icon (needs Chrome and Pillow)
```

Moving to a custom domain: `BASE_URL=https://example.com python3 tools/build.py`, then add a `CNAME` file.

## Data on this site

Demos, transcripts and logs are synthetic or hand-written and are labelled that way where they appear.
The case studies describe methods from my own work and contain no company data.

## Fonts

Geist and Geist Mono by Vercel, self-hosted under the SIL Open Font License (`assets/fonts/LICENSE-Geist.txt`).
