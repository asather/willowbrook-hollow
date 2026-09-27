#!/usr/bin/env python3
"""
Willowbrook Hollow — web image builder

The master art in images/characters/master/ and images/ui/circles/ is the canon source,
full size, stored with Git LFS. GitHub Pages cannot serve LFS files, and full-size art is
too heavy for a tablet, so the reader app shows small WebP copies from images/web/.

Run after adding or changing any master art or Circle emblem:
    python3 tools/make-web-images.py
Requires Pillow (pip install pillow) and the real LFS files (git lfs pull).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
JOBS = [
    (ROOT / "images/characters/master", "*_master.png", ROOT / "images/web/characters", 640, lambda s: s.replace("_master", "")),
    (ROOT / "images/ui/circles", "circle-*.png", ROOT / "images/web/circles", 240, lambda s: s),
]

for src_dir, pattern, out_dir, height, rename in JOBS:
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted(src_dir.glob(pattern)):
        if src.stat().st_size < 1024 and src.read_bytes().startswith(b"version https://git-lfs"):
            raise SystemExit(f"{src} is an LFS pointer; run `git lfs pull` first.")
        im = Image.open(src).convert("RGBA")
        if im.height > height:
            im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
        out = out_dir / (rename(src.stem) + ".webp")
        im.save(out, "WEBP", quality=88, method=6)
        print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")
