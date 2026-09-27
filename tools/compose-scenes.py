#!/usr/bin/env python3
"""
Willowbrook Hollow — scene art composer

    python3 tools/compose-scenes.py books/acorn-002
    python3 tools/compose-scenes.py books/acorn-002 --only page-07

Builds a book's cover and page art from books/{bookId}/scenes.json. Each scene is a
painted backdrop (sky, hills, stream, trees, rocks, logs…) drawn here, plus props and the
canon character art from images/web/characters/, placed where the spec says. Output is
16:9 WebP in books/{bookId}/images/{scene}.webp, which the app can serve (never LFS).

Every scene gets the Circle emblem somewhere in the background, small and faint, as the
Circle guide requires. See docs/SCENE_ART.md for the spec format and element list.

Needs Pillow (pip install pillow). No other dependencies.
"""
import json, math, random, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
W, H = 1600, 900          # output size (16:9)
S = 2                     # draw at 2x, then downsample for smooth edges

# ---------------------------------------------------------------- palette
SKY = {
    "morning": [(186, 218, 236), (250, 238, 214)],
    "day":     [(166, 208, 236), (238, 242, 226)],
    "dusk":    [(238, 160, 150), (250, 222, 176)],
}
BARK, BARK_DARK, BARK_LIGHT = (136, 94, 62), (92, 62, 42), (196, 156, 108)
LEAVES = [(222, 128, 58), (204, 84, 52), (232, 178, 70), (190, 110, 50)]
HILL_BACK, HILL_FRONT = (186, 196, 118), (158, 186, 98)
WATER, WATER_LIGHT = (104, 166, 208), (176, 214, 236)
ROCK, ROCK_DARK = (156, 154, 146), (118, 116, 110)
INK = (74, 52, 38)

def P(v):   # spec units (1600x900 space) -> canvas pixels
    return int(round(v * S))

# ---------------------------------------------------------------- characters
_char_cache = {}
def _cutout_from_sheet(path, box, tol=42, light=200, tint=None):
    """Cut one figure out of an art sheet with a plain background.
    tol = how far a pixel may be from the corner colour and still count as background;
    light = how bright its darkest channel must be; tint (optional) = how far its
    red-green and green-blue balance may drift from the corner colour's, so a darker
    shade of the same paper (a painted ground line) is removed too. See CUTOUT_TUNING."""
    im = Image.open(path).convert("RGB").crop(box)
    w, h = im.size
    bg = im.getpixel((2, 2))
    mask = Image.new("L", (w, h), 255)
    # flood-fill the background from every border pixel
    seen = bytearray(w * h)
    px = im.load()
    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + \
            [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    mp = mask.load()
    def close(c):
        if tint is not None and abs((c[0] - c[1]) - (bg[0] - bg[1])) + abs((c[1] - c[2]) - (bg[1] - bg[2])) >= tint:
            return False
        return sum(abs(c[i] - bg[i]) for i in range(3)) < tol and min(c) > light
    while stack:
        x, y = stack.pop()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not close(px[x, y]):
            continue
        mp[x, y] = 0
        if x > 0: stack.append((x - 1, y))
        if x < w - 1: stack.append((x + 1, y))
        if y > 0: stack.append((x, y - 1))
        if y < h - 1: stack.append((x, y + 1))
    if tint is not None:   # paper showing through between legs and feet (not reachable from the edge)
        for y in range(int(h * 0.7), h):
            for x in range(w):
                if close(px[x, y]):
                    mp[x, y] = 0
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out.crop(out.getbbox())

# Figures that share one art sheet: (sheet, crop box in the web copy)
SHEET_FIGURES = {
    "pip":    ("images/web/characters/pip_pebble.webp", (90, 40, 470, 600)),
    "pebble": ("images/web/characters/pip_pebble.webp", (480, 40, 870, 600)),
}

# Art whose background isn't near-white needs its own cut-out settings (tol, light, tint).
# The parrot family's master is painted on warm tan paper with a darker ground line.
CUTOUT_TUNING = {
    "parrot-family": (170, 60, 40),
}

def character(cid):
    if cid in _char_cache:
        return _char_cache[cid]
    if cid in SHEET_FIGURES:
        sheet, box = SHEET_FIGURES[cid]
        im = _cutout_from_sheet(ROOT / sheet, box)
    else:
        path = ROOT / f"images/web/characters/{cid.replace('-', '_')}.webp"
        im = Image.open(path)
        if im.mode != "RGBA":            # art with a plain background: cut the figure out
            im = _cutout_from_sheet(path, (0, 0) + im.size, *CUTOUT_TUNING.get(cid, (42, 200, None)))
        else:
            im = im.crop(im.split()[3].getbbox())
    if cid == "pebble":
        im = _ear_notch(im)
    _char_cache[cid] = im
    return im

def _ear_notch(im):
    """Pebble's canon ear notch (Character Bible), which her master art doesn't show:
    a small V cut into the top of her big ear."""
    im = im.copy()
    tri = [(197, 8), (223, 12), (209, 40)]
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).polygon(tri, fill=255)
    a = im.split()[3]
    a.paste(0, mask=mask)
    im.putalpha(a)
    d = ImageDraw.Draw(im)
    d.line([(199, 18), tri[2], (221, 20)], fill=INK + (255,), width=3, joint="curve")
    return im

# ---------------------------------------------------------------- helpers
def acorn(d, cx, cy, r, tilt=0):
    """A small acorn centred at (cx, cy), r = half its height, in canvas px."""
    body = [(cx - r * 0.62, cy - r * 0.35), (cx + r * 0.62, cy + r)]
    d.ellipse(body, fill=(176, 112, 58), outline=INK, width=max(1, int(r * 0.08)))
    d.ellipse([cx - r * 0.3, cy - r * 0.1, cx - r * 0.05, cy + r * 0.45], fill=(206, 146, 88))
    d.chord([cx - r * 0.72, cy - r * 0.8, cx + r * 0.72, cy + r * 0.1], 180, 360,
            fill=(112, 76, 46), outline=INK, width=max(1, int(r * 0.08)))
    d.line([(cx, cy - r * 0.75), (cx + r * 0.2 + tilt, cy - r * 1.05)], fill=INK, width=max(2, int(r * 0.14)))

def wavy(x0, x1, y, amp, freq, phase=0, steps=80):
    return [(x0 + (x1 - x0) * i / steps,
             y + amp * math.sin(phase + freq * 2 * math.pi * i / steps)) for i in range(steps + 1)]

def leaf(d, cx, cy, r, ang, color):
    pts = []
    for i in range(24):
        t = 2 * math.pi * i / 24
        x, y = r * math.cos(t), r * 0.45 * math.sin(t)
        pts.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang)))
    d.polygon(pts, fill=color)
    d.line([pts[0], pts[12]], fill=tuple(max(0, c - 50) for c in color), width=2)

def font(size):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"]:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()

# ---------------------------------------------------------------- elements
def el_sky(img, d, e):
    top, bot = SKY[e.get("time", "morning")]
    for y in range(img.height):
        t = y / img.height
        d.line([(0, y), (img.width, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    if e.get("sun"):
        x, y, r = P(e["sun"][0]), P(e["sun"][1]), P(e.get("sunR", 60))
        glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse([x - r * 2, y - r * 2, x + r * 2, y + r * 2], fill=(255, 240, 200, 90))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(P(30))))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 226, 150) if e.get("time") != "dusk" else (250, 180, 120))

def el_hills(img, d, e):
    y = P(e.get("y", 600))
    back = wavy(0, img.width, y - P(70), P(40), 1.3, 0.6) + [(img.width, img.height), (0, img.height)]
    d.polygon(back, fill=tuple(e.get("back", HILL_BACK)))
    front = wavy(0, img.width, y, P(28), 0.9, 2.2) + [(img.width, img.height), (0, img.height)]
    d.polygon(front, fill=tuple(e.get("front", HILL_FRONT)))
    rnd = random.Random(e.get("seed", 3))
    for _ in range(int(e.get("tufts", 40))):
        gx, gy = rnd.uniform(0, img.width), rnd.uniform(y + P(30), img.height)
        for k in (-1, 0, 1):
            d.line([(gx, gy), (gx + k * P(6), gy - P(14))], fill=(122, 156, 76), width=P(2))

def el_tree(img, d, e):
    """A fall tree. x = trunk centre, y = ground line, h = height, w = trunk width."""
    x, y, h, w = P(e["x"]), P(e["y"]), P(e.get("h", 360)), P(e.get("w", 40))
    d.rectangle([x - w / 2, y - h * 0.55, x + w / 2, y], fill=BARK)
    rnd = random.Random(e.get("seed", int(e["x"])))
    cr = h * 0.28
    for _ in range(9):
        cx = x + rnd.uniform(-cr, cr)
        cy = y - h * 0.62 + rnd.uniform(-cr * 0.6, cr * 0.5)
        r = cr * rnd.uniform(0.55, 0.85)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rnd.choice(LEAVES))

def el_tansy_tree(img, d, e):
    """Tansy's big home tree, with a hole (her door) and a bump on the trunk."""
    x, y, h, w = P(e["x"]), P(e["y"]), P(e.get("h", 820)), P(e.get("w", 220))
    top = y - h * 0.58
    d.polygon([(x - w * 0.62, y), (x - w / 2, top), (x + w / 2, top), (x + w * 0.62, y)], fill=BARK)
    for i in range(6):   # bark lines
        lx = x - w * 0.4 + i * w * 0.16
        d.line([(lx, top + P(20)), (lx + P(6), y - P(20))], fill=BARK_DARK, width=P(3))
    bx, by = x + w * 0.42, y - h * 0.22           # the bump
    d.ellipse([bx - P(40), by - P(34), bx + P(40), by + P(34)], fill=(150, 104, 70), outline=BARK_DARK, width=P(3))
    hx, hy = x - w * 0.08, y - h * 0.40           # the hole
    d.ellipse([hx - P(40), hy - P(52), hx + P(40), hy + P(52)], fill=(58, 38, 28), outline=BARK_DARK, width=P(4))
    rnd = random.Random(7)
    for _ in range(16):
        cx = x + rnd.uniform(-h * 0.42, h * 0.42)
        cy = top - rnd.uniform(-P(10), h * 0.34)
        r = h * rnd.uniform(0.14, 0.22)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rnd.choice(LEAVES))
    e["_hole"] = (hx, hy)

def el_stump(img, d, e):
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 140))
    h = w * 0.55
    d.rectangle([x - w / 2, y - h, x + w / 2, y], fill=BARK)
    d.ellipse([x - w / 2, y - h - w * 0.16, x + w / 2, y - h + w * 0.16], fill=BARK_LIGHT, outline=BARK_DARK, width=P(2))
    for k in (0.3, 0.18):
        d.ellipse([x - w * k, y - h - w * k * 0.3, x + w * k, y - h + w * k * 0.3], outline=(160, 120, 80), width=P(2))

def el_gate(img, d, e):
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 260))
    wood = (178, 136, 92)
    for px_ in (x, x + w):
        d.rectangle([px_ - P(9), y - P(150), px_ + P(9), y], fill=wood, outline=BARK_DARK, width=P(2))
    for ry in (P(115), P(60)):
        d.rectangle([x, y - ry - P(8), x + w, y - ry + P(8)], fill=wood, outline=BARK_DARK, width=P(2))
    d.line([(x, y - P(52)), (x + w, y - P(123))], fill=wood, width=P(14))

def el_bush(img, d, e):
    x, y, r = P(e["x"]), P(e["y"]), P(e.get("r", 70))
    rnd = random.Random(int(e["x"]))
    for _ in range(6):
        cx, cy = x + rnd.uniform(-r, r), y - rnd.uniform(r * 0.3, r * 0.9)
        rr = r * rnd.uniform(0.5, 0.75)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=rnd.choice([(118, 150, 80), (136, 162, 86), (170, 150, 70)]))

def el_stream(img, d, e):
    """A stream across the picture. y = centre line, w = width."""
    y, w = P(e["y"]), P(e.get("w", 120))
    tilt = P(e.get("tilt", 0))
    topl = [(x, yy + tilt * x / img.width) for x, yy in wavy(0, img.width, y - w / 2, P(10), 2.2, 0.4)]
    botl = [(x, yy + tilt * x / img.width) for x, yy in wavy(0, img.width, y + w / 2, P(12), 1.8, 1.9)]
    d.polygon(topl + botl[::-1], fill=WATER)
    d.line(topl, fill=(130, 118, 84), width=P(4))
    rnd = random.Random(11)
    for _ in range(int(e.get("ripples", 14))):
        rx = rnd.uniform(0, img.width)
        ry = y + tilt * rx / img.width + rnd.uniform(-w * 0.3, w * 0.3)
        d.arc([rx - P(34), ry - P(8), rx + P(34), ry + P(8)], 200, 340, fill=WATER_LIGHT, width=P(3))
    for rx in e.get("rocks", []):
        ry = y + tilt * P(rx) / img.width
        d.ellipse([P(rx) - P(26), ry - P(14), P(rx) + P(26), ry + P(12)], fill=ROCK, outline=ROCK_DARK, width=P(2))

def el_rock(img, d, e):
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 120))
    d.chord([x - w / 2, y - w * 0.7, x + w / 2, y + w * 0.1], 180, 360, fill=ROCK, outline=ROCK_DARK, width=P(3))
    d.rectangle([x - w / 2 + P(2), y - w * 0.3, x + w / 2 - P(2), y], fill=ROCK)
    d.line([(x - w / 2, y), (x + w / 2, y)], fill=ROCK_DARK, width=P(3))
    d.ellipse([x - w * 0.25, y - w * 0.55, x - w * 0.05, y - w * 0.45], fill=(186, 184, 176))

def el_frog_rock(img, d, e):
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 320))
    c, dk = (146, 156, 122), (104, 112, 88)
    d.chord([x - w / 2, y - w * 0.62, x + w / 2, y + w * 0.12], 180, 360, fill=c, outline=dk, width=P(4))
    d.rectangle([x - w / 2 + P(3), y - w * 0.26, x + w / 2 - P(3), y], fill=c)
    d.line([(x - w / 2, y), (x + w / 2, y)], fill=dk, width=P(4))
    for ex in (-0.22, 0.22):   # the two bumps (eyes)
        cx, cy, r = x + w * ex, y - w * 0.52, w * 0.12
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c, outline=dk, width=P(4))
        d.ellipse([cx - r * 0.55, cy - r * 0.6, cx + r * 0.55, cy + r * 0.5], fill=(236, 232, 214))
        d.ellipse([cx - r * 0.22, cy - r * 0.3, cx + r * 0.22, cy + r * 0.2], fill=INK)
    d.arc([x - w * 0.34, y - w * 0.40, x + w * 0.34, y - w * 0.14], 15, 165, fill=dk, width=P(6))  # long flat grin

def el_log(img, d, e):
    """A big hollow log lying sideways; the open end faces the viewer on the left."""
    x, y, w, h = P(e["x"]), P(e["y"]), P(e.get("w", 700)), P(e.get("h", 240))
    d.rectangle([x, y - h, x + w, y], fill=BARK, outline=BARK_DARK, width=P(3))
    d.ellipse([x + w - h * 0.35, y - h, x + w + h * 0.35, y], fill=BARK, outline=BARK_DARK, width=P(3))
    for i in range(1, 7):
        lx = x + w * i / 7
        d.line([(lx, y - h + P(20)), (lx + P(20), y - P(20))], fill=BARK_DARK, width=P(3))
    d.ellipse([x - h * 0.4, y - h, x + h * 0.4, y], fill=BARK_LIGHT, outline=BARK_DARK, width=P(4))
    d.ellipse([x - h * 0.3, y - h * 0.88, x + h * 0.3, y - h * 0.12], fill=(34, 24, 18))
    if e.get("sunspot"):
        d.ellipse([x - P(10), y - h * 0.55, x + P(10), y - h * 0.45], fill=(255, 226, 140))

def el_log_inside(img, d, e):
    """Looking along the inside of the log toward a spot of sun at the far end."""
    cx, cy = img.width / 2, img.height * 0.48
    d.rectangle([0, 0, img.width, img.height], fill=(40, 28, 20))
    for i in range(14, 0, -1):
        k = i / 14
        col = tuple(int(40 + (120 - 40) * (1 - k) * 0.6 + 30 * k) for _ in range(3))
        col = (int(60 + 60 * k), int(40 + 40 * k), int(26 + 26 * k))
        d.ellipse([cx - img.width * 0.62 * k, cy - img.height * 0.62 * k,
                   cx + img.width * 0.62 * k, cy + img.height * 0.62 * k], fill=col if i % 2 else tuple(c - 8 for c in col))
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - P(150), cy - P(120), cx + P(150), cy + P(120)], fill=(255, 220, 140, 160))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(P(40))))
    d.ellipse([cx - P(60), cy - P(50), cx + P(60), cy + P(50)], fill=(255, 236, 170))
    d.rectangle([0, img.height * 0.82, img.width, img.height], fill=(52, 36, 26))

def el_map(img, d, e):
    """Tansy's bark map. upside=true draws it the way she first held it."""
    w = P(e.get("w", 260)); h = w * 0.72
    m = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0))
    md = ImageDraw.Draw(m)
    md.polygon([(w * 0.04, h * 0.1), (w * 0.5, 0), (w * 0.97, h * 0.07), (w, h * 0.9), (w * 0.55, h), (0, h * 0.94)],
               fill=(196, 156, 104), outline=INK)
    lw = max(2, int(w / 80))
    # the X near the bottom-left (that is Tansy's tree, where the path starts) …
    md.line([(w * 0.12, h * 0.70), (w * 0.24, h * 0.86)], fill=(190, 40, 40), width=lw * 2)
    md.line([(w * 0.24, h * 0.70), (w * 0.12, h * 0.86)], fill=(190, 40, 40), width=lw * 2)
    # … a dotted path, the wavy stream, the frog rock and the log
    for i in range(10):
        t = i / 10
        px_, py_ = w * (0.25 + 0.6 * t), h * (0.78 - 0.55 * t + 0.1 * math.sin(t * 6))
        md.ellipse([px_ - lw, py_ - lw, px_ + lw, py_ + lw], fill=INK)
    md.line(wavy(w * 0.35, w * 0.62, h * 0.55, h * 0.04, 2, 0, 20), fill=(60, 110, 170), width=lw)
    md.chord([w * 0.62, h * 0.22, w * 0.78, h * 0.40], 180, 360, fill=(120, 130, 100), outline=INK)
    md.rectangle([w * 0.78, h * 0.10, w * 0.94, h * 0.20], outline=INK, width=lw)
    if e.get("arrow"):
        md.line([(w * 0.88, h * 0.85), (w * 0.88, h * 0.35)], fill=INK, width=lw * 2)
        md.polygon([(w * 0.83, h * 0.40), (w * 0.93, h * 0.40), (w * 0.88, h * 0.28)], fill=INK)
        md.text((w * 0.80, h * 0.86), "UP", fill=INK, font=font(int(w / 12)), anchor="lt")
    if e.get("upside"):
        m = m.rotate(180)
    m = m.rotate(e.get("rot", 0), expand=True, resample=Image.BICUBIC)
    img.alpha_composite(m, (int(P(e["x"]) - m.width / 2), int(P(e["y"]) - m.height / 2)))

def el_raft(img, d, e):
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 300))
    r = Image.new("RGBA", (int(w * 1.2), int(w * 0.6)), (0, 0, 0, 0))
    rd = ImageDraw.Draw(r)
    for i in range(5):
        sy = w * 0.2 + i * w * 0.06
        rd.rounded_rectangle([w * 0.1, sy, w * 1.1, sy + w * 0.05], radius=int(w * 0.02), fill=(150, 108, 66), outline=INK)
    for sx in (0.3, 0.9):
        rd.line([(w * sx, w * 0.18), (w * sx, w * 0.5)], fill=(236, 226, 196), width=max(2, int(w / 60)))
    leaf(rd, w * 0.6, w * 0.26, w * 0.42, -0.05, (170, 176, 70))
    r = r.rotate(e.get("rot", 0), expand=True, resample=Image.BICUBIC)
    img.alpha_composite(r, (int(x - r.width / 2), int(y - r.height / 2)))

def el_fish(img, d, e):
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 90))
    d.ellipse([x - s, y - s * 0.42, x + s, y + s * 0.42], fill=(236, 140, 70), outline=INK, width=P(3))
    d.polygon([(x + s * 0.9, y), (x + s * 1.6, y - s * 0.5), (x + s * 1.6, y + s * 0.5)], fill=(226, 120, 60), outline=INK)
    d.ellipse([x - s * 0.62, y - s * 0.16, x - s * 0.42, y + s * 0.04], fill=INK)
    el_splash(img, d, {"x": e["x"], "y": e["y"] + e.get("s", 90) * 0.9, "s": e.get("s", 90)})

def el_splash(img, d, e):
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 90))
    for a in range(-70, 71, 20):
        t = math.radians(a - 90)
        px_, py_ = x + math.cos(t) * s * 1.3, y + math.sin(t) * s * 0.9
        d.ellipse([px_ - s * 0.1, py_ - s * 0.14, px_ + s * 0.1, py_ + s * 0.14], fill=WATER_LIGHT, outline=WATER, width=P(2))

def el_acorns(img, d, e):
    rnd = random.Random(e.get("seed", 5))
    x, y, sp, r = P(e["x"]), P(e["y"]), P(e.get("spread", 120)), P(e.get("r", 16))
    for _ in range(int(e.get("n", 10))):
        acorn(d, x + rnd.uniform(-sp, sp), y + rnd.uniform(-sp * e.get("ys", 0.35), sp * e.get("ys", 0.35)),
              r * rnd.uniform(0.85, 1.15), rnd.uniform(-3, 3))

def el_moss_ball(img, d, e):
    """Moss rolled up. peek=true shows his nose and one eye; acorns=n / grapes=n stick them on him; cupcake=true sits one on top."""
    x, y, r = P(e["x"]), P(e["y"]), P(e.get("r", 70))
    d.ellipse([x - r, y - r, x + r, y + r], fill=(118, 82, 52))
    for i in range(44):
        t = 2 * math.pi * i / 44
        d.line([(x + math.cos(t) * r * 0.5, y + math.sin(t) * r * 0.5),
                (x + math.cos(t + 0.15) * r * 1.12, y + math.sin(t + 0.15) * r * 1.12)], fill=(84, 58, 38), width=P(4))
        d.line([(x + math.cos(t + 0.07) * r * 0.7, y + math.sin(t + 0.07) * r * 0.7),
                (x + math.cos(t + 0.2) * r * 1.02, y + math.sin(t + 0.2) * r * 1.02)], fill=(176, 140, 96), width=P(2))
    if e.get("peek"):
        d.chord([x - r * 0.55, y - r * 0.2, x + r * 0.75, y + r * 0.75], 0, 180, fill=(232, 204, 160))
        d.ellipse([x + r * 0.55, y + r * 0.18, x + r * 0.78, y + r * 0.38], fill=INK)
        d.ellipse([x + r * 0.08, y + r * 0.05, x + r * 0.24, y + r * 0.24], fill=INK)
        d.arc([x + r * 0.1, y + r * 0.3, x + r * 0.5, y + r * 0.55], 20, 160, fill=INK, width=P(3))
    rnd = random.Random(9)
    for i in range(int(e.get("acorns", 0))):
        t = rnd.uniform(0, 2 * math.pi)
        if e.get("peek") and 0.1 < t < 1.9:
            continue
        acorn(d, x + math.cos(t) * r * 0.95, y + math.sin(t) * r * 0.95, r * 0.24, rnd.uniform(-3, 3))
    for i in range(int(e.get("grapes", 0))):
        t = 2 * math.pi * i / max(1, int(e.get("grapes", 0))) + 0.3
        if e.get("peek") and 0.1 < t % (2 * math.pi) < 1.9:
            continue
        gx, gy, gr = x + math.cos(t) * r * 0.92, y + math.sin(t) * r * 0.92, r * 0.2
        d.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=(150, 196, 80), outline=(96, 140, 50), width=P(2))
        d.ellipse([gx - gr * 0.5, gy - gr * 0.6, gx - gr * 0.1, gy - gr * 0.2], fill=(214, 236, 170))
    if e.get("cupcake"):
        el_cupcake(img, d, {"x": e["x"], "y": e["y"] - e.get("r", 70) * 1.05, "s": e.get("r", 70) * 0.5})
        d = ImageDraw.Draw(img)
    if e.get("motion"):
        for k in range(3):
            yy = y - r * 0.5 + k * r * 0.5
            d.line([(x - r * 1.3 - P(80), yy), (x - r * 1.2, yy)], fill=(255, 255, 255), width=P(4))

def el_dirt(img, d, e):
    rnd = random.Random(e.get("seed", 2))
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 120))
    d.chord([x - s * 0.8, y - s * 0.35, x + s * 0.8, y + s * 0.3], 180, 360, fill=(126, 88, 56))
    for _ in range(int(e.get("n", 14))):
        cx, cy = x + rnd.uniform(-s, s), y - rnd.uniform(s * 0.3, s * 1.5)
        rr = rnd.uniform(s * 0.04, s * 0.09)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(110, 76, 48))

def el_hole(img, d, e):
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 90))
    d.ellipse([x - w / 2, y - w * 0.18, x + w / 2, y + w * 0.18], fill=(84, 58, 40))
    d.ellipse([x - w * 0.62, y - w * 0.1, x - w * 0.38, y + w * 0.05], fill=(126, 88, 56))

def el_falling_leaves(img, d, e):
    rnd = random.Random(e.get("seed", 4))
    for _ in range(int(e.get("n", 12))):
        leaf(d, rnd.uniform(0, img.width), rnd.uniform(0, img.height * 0.7), P(rnd.uniform(10, 16)),
             rnd.uniform(0, 3.1), rnd.choice(LEAVES))

def el_stars(img, d, e):
    rnd = random.Random(1)
    for _ in range(int(e.get("n", 8))):
        x, y = rnd.uniform(0, img.width), rnd.uniform(0, img.height * 0.3)
        d.ellipse([x - P(3), y - P(3), x + P(3), y + P(3)], fill=(255, 250, 230))

def el_motion(img, d, e):
    """Little lines that show hopping, huffing or bonks."""
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 40))
    kind = e.get("kind", "hop")
    if kind == "hop":
        for k in (-1, 0, 1):
            d.arc([x - s + k * s, y - s * 0.3, x + k * s, y + s * 0.3], 180, 360, fill=(255, 255, 255), width=P(4))
    elif kind == "bonk":
        for a in range(0, 360, 45):
            t = math.radians(a)
            d.line([(x + math.cos(t) * s * 0.5, y + math.sin(t) * s * 0.5),
                    (x + math.cos(t) * s, y + math.sin(t) * s)], fill=(255, 236, 120), width=P(4))
    elif kind == "huff":
        for k in range(3):
            d.ellipse([x + k * s * 0.6, y - k * s * 0.4, x + k * s * 0.6 + s * 0.5, y - k * s * 0.4 + s * 0.4], fill=(255, 255, 255))
    elif kind == "spin":
        d.arc([x - s, y - s * 0.5, x + s, y + s * 0.5], 200, 520, fill=(255, 255, 255), width=P(5))

def el_character(img, d, e):
    im = character(e["id"])
    h = P(e.get("h", 320))
    w = int(im.width * h / im.height)
    im = im.resize((w, int(h)), Image.LANCZOS)
    if e.get("flip"):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if e.get("dusty"):   # rolled in dust: fur turns dusty gray
        gray = ImageEnhance.Color(im.convert("RGB")).enhance(1 - e["dusty"])
        gray = Image.blend(gray, Image.new("RGB", im.size, (150, 144, 136)), 0.25 * e["dusty"]).convert("RGBA")
        gray.putalpha(im.split()[3]); im = gray
    if e.get("dim"):
        rgb = ImageEnhance.Brightness(im.convert("RGB")).enhance(e["dim"]).convert("RGBA")
        rgb.putalpha(im.split()[3]); im = rgb
    if e.get("rot"):
        im = im.rotate(e["rot"], expand=True, resample=Image.BICUBIC)
    # soft ground shadow
    if not e.get("noShadow"):
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        cx, cy = P(e["x"]), P(e["y"])
        ImageDraw.Draw(sh).ellipse([cx - w * 0.36, cy - P(10), cx + w * 0.36, cy + P(10)], fill=(40, 40, 20, 60))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(P(4))))
    img.alpha_composite(im, (int(P(e["x"]) - im.width / 2), int(P(e["y"]) - im.height)))


def el_leaf_hat(img, d, e):
    """A green leaf worn like a hat (Pebble's disguise over her ear notch)."""
    leaf(d, P(e["x"]), P(e["y"]), P(e.get("r", 26)), math.radians(e.get("rot", -30)), tuple(e.get("color", (96, 150, 64))))

def el_sock(img, d, e):
    """Zoe's striped sock."""
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 90))
    g = Image.new("RGBA", (int(s * 1.6), int(s * 1.6)), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    leg = [(s * 0.35, 0), (s * 0.75, 0), (s * 0.75, s * 0.9), (s * 0.35, s * 0.9)]
    gd.polygon(leg, fill=(240, 230, 210))
    gd.rounded_rectangle([s * 0.35, s * 0.7, s * 1.3, s * 1.1], radius=int(s * 0.2), fill=(240, 230, 210))
    for i, col in enumerate([(214, 80, 70), (80, 150, 200), (240, 190, 60), (120, 170, 90)]):
        yy = s * (0.08 + i * 0.2)
        gd.rectangle([s * 0.35, yy, s * 0.75, yy + s * 0.09], fill=col)
    gd.rounded_rectangle([s * 1.05, s * 0.7, s * 1.3, s * 1.1], radius=int(s * 0.12), fill=(214, 80, 70))
    gd.rectangle([s * 0.35, 0, s * 0.75, s * 0.06], fill=(214, 80, 70))
    g = g.rotate(e.get("rot", 0), expand=True, resample=Image.BICUBIC)
    img.alpha_composite(g, (int(x - g.width / 2), int(y - g.height / 2)))

def el_gust(img, d, e):
    """A gust of wind: curly white streaks blowing across the picture."""
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 300))
    rnd = random.Random(e.get("seed", 3))
    for i in range(int(e.get("n", 4))):
        yy = y + (i - 1.5) * s * 0.22 + rnd.uniform(-P(10), P(10))
        x0 = x - s + rnd.uniform(-P(30), P(30))
        d.line(wavy(x0, x0 + s * 1.5, yy, s * 0.04, 1.2, phase=i), fill=(255, 255, 255), width=P(5), joint="curve")
        d.arc([x0 + s * 1.4, yy - s * 0.12, x0 + s * 1.64, yy + s * 0.12], 180, 90, fill=(255, 255, 255), width=P(5))

def el_barn(img, d, e):
    """A red barn. door: "shut" (with latch), "open" or "ajar"."""
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 520))
    h = w * 0.72
    red, dark, trim = (176, 72, 62), (120, 44, 40), (238, 222, 190)
    d.polygon([(x, y), (x, y - h), (x + w / 2, y - h - w * 0.36), (x + w, y - h), (x + w, y)], fill=red, outline=dark)
    d.rectangle([x + w * 0.4, y - h * 0.9, x + w * 0.6, y - h * 0.72], fill=(244, 226, 130), outline=dark, width=P(3))
    dx0, dx1, dy0 = x + w * 0.3, x + w * 0.7, y - h * 0.62
    door = e.get("door", "shut")
    if door == "shut":
        d.rectangle([dx0, dy0, dx1, y], fill=(124, 48, 42), outline=trim, width=P(6))
        d.line([(dx0, dy0), (dx1, y)], fill=trim, width=P(6)); d.line([(dx1, dy0), (dx0, y)], fill=trim, width=P(6))
        d.rectangle([x + w * 0.47, y - h * 0.34, x + w * 0.53, y - h * 0.3], fill=(70, 70, 70))  # latch
    else:
        d.rectangle([dx0, dy0, dx1, y], fill=(52, 34, 26))
        d.polygon([(dx0, dy0), (dx0 - w * 0.12, dy0 + P(20)), (dx0 - w * 0.12, y + P(10)), (dx0, y)], fill=(124, 48, 42), outline=trim)
        for k in range(4):
            hx = dx0 + P(20) + k * (dx1 - dx0 - P(40)) / 3
            d.line([(hx, y - P(4)), (hx + P(10), y - P(40))], fill=(214, 184, 90), width=P(4))
    d.rectangle([x + w * 0.26, y - P(10), x + w * 0.74, y + P(8)], fill=(150, 140, 126))  # step

def el_barn_inside(img, d, e):
    """Inside the barn: plank walls, a beam, hay piles, soft dim light."""
    dim = e.get("dim", 1.0)
    def c(rgb): return tuple(int(v * dim) for v in rgb)
    for i in range(0, img.width, P(80)):
        d.rectangle([i, 0, i + P(80), img.height], fill=c((150, 98, 66) if (i // P(80)) % 2 else (140, 90, 60)))
        d.line([(i, 0), (i, img.height)], fill=c((96, 60, 40)), width=P(3))
    d.rectangle([0, P(120), img.width, P(160)], fill=c((110, 72, 46)))
    d.rectangle([0, img.height * 0.78, img.width, img.height], fill=c((196, 164, 98)))
    rnd = random.Random(e.get("seed", 3))
    for hx in e.get("hay", [200, 1350]):
        for _ in range(60):
            px_, py_ = P(hx) + rnd.uniform(-P(170), P(170)), img.height * 0.78 + rnd.uniform(-P(120), P(40))
            d.line([(px_, py_), (px_ + rnd.uniform(-P(30), P(30)), py_ - P(24))], fill=c(rnd.choice([(226, 196, 110), (206, 172, 88)])), width=P(3))
    if e.get("window", True):
        wx = img.width * 0.5
        d.rectangle([wx - P(80), P(200), wx + P(80), P(330)], fill=(250, 214, 150) if dim > 0.8 else (200, 150, 110))
        d.line([(wx, P(200)), (wx, P(330))], fill=c((96, 60, 40)), width=P(6))
        d.line([(wx - P(80), P(265)), (wx + P(80), P(265))], fill=c((96, 60, 40)), width=P(6))

def el_viola(img, d, e):
    """A viola with its bow. x, y = centre; s = length; rot in degrees."""
    s = P(e.get("s", 260))
    v = Image.new("RGBA", (int(s * 0.6), int(s * 1.1)), (0, 0, 0, 0))
    vd = ImageDraw.Draw(v); cx = s * 0.3
    body = (178, 96, 44)
    vd.ellipse([cx - s * 0.2, s * 0.55, cx + s * 0.2, s * 0.95], fill=body, outline=INK, width=P(2))
    vd.ellipse([cx - s * 0.16, s * 0.32, cx + s * 0.16, s * 0.64], fill=body, outline=INK, width=P(2))
    vd.rectangle([cx - s * 0.12, s * 0.55, cx + s * 0.12, s * 0.66], fill=body)
    vd.rectangle([cx - s * 0.035, s * 0.05, cx + s * 0.035, s * 0.6], fill=(40, 30, 24))
    vd.ellipse([cx - s * 0.06, 0, cx + s * 0.06, s * 0.1], fill=(150, 80, 40), outline=INK)
    for k in (-1, -0.33, 0.33, 1):
        vd.line([(cx + k * s * 0.02, s * 0.08), (cx + k * s * 0.05, s * 0.85)], fill=(236, 230, 210), width=1)
    vd.rectangle([cx - s * 0.08, s * 0.76, cx + s * 0.08, s * 0.78], fill=(60, 44, 30))
    v = v.rotate(e.get("rot", 0), expand=True, resample=Image.BICUBIC)
    img.alpha_composite(v, (int(P(e["x"]) - v.width / 2), int(P(e["y"]) - v.height / 2)))
    if e.get("bow", True):
        bx, by = P(e.get("bowX", e["x"])), P(e.get("bowY", e["y"]))
        a = math.radians(e.get("bowRot", 20))
        L = s * 0.55
        d.line([(bx - L * math.cos(a), by - L * math.sin(a)), (bx + L * math.cos(a), by + L * math.sin(a))], fill=(96, 60, 36), width=P(4))

def el_case(img, d, e):
    """The viola's black box. open=true shows the viola inside."""
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 320))
    h = w * 0.34
    if e.get("open"):
        d.rounded_rectangle([x - w / 2, y - h, x + w / 2, y], radius=int(h * 0.4), fill=(34, 34, 40), outline=(10, 10, 12), width=P(3))
        d.rounded_rectangle([x - w * 0.46, y - h * 0.9, x + w * 0.46, y - h * 0.1], radius=int(h * 0.35), fill=(120, 40, 60))
        el_viola(img, d, {"x": e["x"], "y": e["y"] - e.get("w", 320) * 0.17, "s": e.get("w", 320) * 0.8, "rot": 90,
                          "bowX": e["x"], "bowY": e["y"] - e.get("w", 320) * 0.06, "bowRot": 0})
        d.rounded_rectangle([x - w / 2, y - h * 2.1, x + w / 2, y - h * 1.1], radius=int(h * 0.4), fill=(34, 34, 40), outline=(10, 10, 12), width=P(3))
    else:
        d.rounded_rectangle([x - w / 2, y - h, x + w / 2, y], radius=int(h * 0.45), fill=(30, 30, 36), outline=(10, 10, 12), width=P(3))
        d.rectangle([x - P(14), y - h - P(10), x + P(14), y - h + P(2)], fill=(80, 80, 86))
        d.line([(x - w / 2 + P(10), y - h / 2), (x + w / 2 - P(10), y - h / 2)], fill=(70, 70, 78), width=P(2))

def el_notes(img, d, e):
    rnd = random.Random(e.get("seed", 2))
    for i in range(int(e.get("n", 5))):
        x = P(e["x"]) + i * P(e.get("dx", 70)) + rnd.uniform(-P(10), P(10))
        y = P(e["y"]) - i * P(e.get("dy", 30)) + rnd.uniform(-P(14), P(14))
        col = tuple(e.get("color", (90, 60, 120)))
        d.ellipse([x - P(12), y - P(9), x + P(12), y + P(9)], fill=col)
        d.line([(x + P(10), y), (x + P(10), y - P(46))], fill=col, width=P(4))
        if i % 2: d.line([(x + P(10), y - P(46)), (x + P(26), y - P(34))], fill=col, width=P(4))

def el_moth(img, d, e):
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 26))
    for k in (-1, 1):
        d.ellipse([x + k * s * 0.9 - s * 0.7, y - s * 0.7, x + k * s * 0.9 + s * 0.7, y + s * 0.5], fill=(232, 222, 196), outline=INK)
    d.ellipse([x - s * 0.25, y - s * 0.6, x + s * 0.25, y + s * 0.7], fill=(150, 130, 100))

def el_glow(img, d, e):
    x, y, r = P(e["x"]), P(e["y"]), P(e.get("r", 60))
    g = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse([x - r, y - r, x + r, y + r], fill=tuple(e.get("color", (120, 190, 255))) + (170,))
    img.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.5)))

def el_zzz(img, d, e):
    for i, sz in enumerate((28, 36, 46)):
        d.text((P(e["x"]) + i * P(34), P(e["y"]) - i * P(40)), "z", fill=(255, 255, 255), font=font(P(sz)))

def el_prints(img, d, e):
    """A trail of paw prints. x, y = start; dx, dy = step; n = how many."""
    for i in range(int(e.get("n", 6))):
        x = P(e["x"] + i * e.get("dx", 60)); y = P(e["y"] + i * e.get("dy", 0)) + (P(10) if i % 2 else -P(10))
        s = P(e.get("s", 12))
        col = tuple(e.get("color", (96, 66, 44)))
        d.ellipse([x - s, y - s * 0.7, x + s, y + s * 0.7], fill=col)
        for k in (-1, -0.35, 0.35, 1):
            d.ellipse([x + k * s * 0.9 - s * 0.3, y - s * 1.4, x + k * s * 0.9 + s * 0.3, y - s * 0.8], fill=col)

def el_reeds(img, d, e):
    x, y, h = P(e["x"]), P(e["y"]), P(e.get("h", 260))
    rnd = random.Random(int(e["x"]))
    for i in range(int(e.get("n", 16))):
        bx = x + rnd.uniform(-P(e.get("w", 90)), P(e.get("w", 90)))
        top = y - h * rnd.uniform(0.6, 1.0)
        lean = rnd.uniform(-P(30), P(30))
        d.line([(bx, y), (bx + lean, top)], fill=rnd.choice([(96, 132, 62), (120, 150, 70), (82, 114, 54)]), width=P(6))
        if i % 3 == 0:
            d.ellipse([bx + lean - P(7), top - P(10), bx + lean + P(7), top + P(34)], fill=(130, 88, 54))

def el_stick(img, d, e):
    d.line([(P(e["x1"]), P(e["y1"])), (P(e["x2"]), P(e["y2"]))], fill=(122, 86, 54), width=P(e.get("w", 8)))

# ---- picnic (acorn-004): the parrots' gold tree, the blanket, the food, bubbles, ants, Zoe's bucket
GOLD, GOLD_DARK, GOLD_LEAVES = (206, 160, 62), (150, 108, 36), [(246, 204, 76), (236, 184, 52), (252, 220, 110), (226, 170, 40)]

def el_gold_tree(img, d, e):
    """The Parrot Family's secret gold tree. door: "shut" (tiny, nut-sized) or "open" (big enough for three parrots)."""
    x, y, h, w = P(e["x"]), P(e["y"]), P(e.get("h", 760)), P(e.get("w", 190))
    top = y - h * 0.56
    d.polygon([(x - w * 0.62, y), (x - w / 2, top), (x + w / 2, top), (x + w * 0.62, y)], fill=GOLD)
    for i in range(6):
        lx = x - w * 0.4 + i * w * 0.16
        d.line([(lx, top + P(20)), (lx + P(6), y - P(20))], fill=GOLD_DARK, width=P(3))
    rnd = random.Random(e.get("seed", 21))
    for _ in range(18):
        cx = x + rnd.uniform(-h * 0.42, h * 0.42)
        cy = top - rnd.uniform(-P(10), h * 0.34)
        r = h * rnd.uniform(0.13, 0.21)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rnd.choice(GOLD_LEAVES), outline=(214, 150, 30), width=P(2))
    for _ in range(14):   # glints
        gx, gy = x + rnd.uniform(-h * 0.4, h * 0.4), top - rnd.uniform(0, h * 0.4)
        d.line([(gx - P(7), gy), (gx + P(7), gy)], fill=(255, 250, 220), width=P(2))
        d.line([(gx, gy - P(7)), (gx, gy + P(7))], fill=(255, 250, 220), width=P(2))
    if e.get("door", "shut") == "shut":
        dw, dh, dy = P(22), P(32), h * 0.22     # tiny, about the size of a nut, halfway up the trunk
        d.rounded_rectangle([x - dw / 2, y - dy - dh, x + dw / 2, y - dy], radius=int(dw / 2), fill=(122, 76, 30), outline=(250, 226, 120), width=P(3))
        d.ellipse([x + dw * 0.12, y - dy - dh / 2 - P(3), x + dw * 0.36, y - dy - dh / 2 + P(3)], fill=(250, 230, 150))
    else:
        dw, dh = w * 0.62, h * 0.34
        d.rounded_rectangle([x - dw / 2, y - dh, x + dw / 2, y], radius=int(dw / 2), fill=(70, 44, 20), outline=(250, 226, 120), width=P(6))

def el_blanket(img, d, e):
    """A red-checked picnic blanket seen from the side. x, y = centre; w = width; messy tilts it."""
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 820))
    h = w * 0.26
    sk = w * 0.08
    tl, tr, br, bl = (x - w / 2 + sk, y - h / 2), (x + w / 2 - sk, y - h / 2), (x + w / 2, y + h / 2), (x - w / 2, y + h / 2)
    if e.get("messy"):
        tr = (tr[0] + P(20), tr[1] + P(18)); bl = (bl[0] - P(10), bl[1] - P(14))
    d.polygon([tl, tr, br, bl], fill=(236, 226, 206))
    n = 8
    def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    for i in range(n):
        for j in range(4):
            if (i + j) % 2: continue
            u0, u1, v0, v1 = i / n, (i + 1) / n, j / 4, (j + 1) / 4
            q = [lerp(lerp(tl, tr, u), lerp(bl, br, u), v) for u, v in ((u0, v0), (u1, v0), (u1, v1), (u0, v1))]
            d.polygon(q, fill=(196, 58, 52))
    d.polygon([tl, tr, br, bl], outline=(140, 40, 36), width=P(3))

def el_basket(img, d, e):
    x, y, w = P(e["x"]), P(e["y"]), P(e.get("w", 180))
    h = w * 0.55
    d.arc([x - w * 0.36, y - h - w * 0.5, x + w * 0.36, y - h + w * 0.3], 180, 360, fill=(150, 104, 56), width=P(8))
    d.polygon([(x - w / 2, y - h), (x + w / 2, y - h), (x + w * 0.42, y), (x - w * 0.42, y)], fill=(196, 146, 82), outline=(120, 80, 40))
    for k in range(1, 4):
        yy = y - h + k * h / 4
        d.line([(x - w / 2 + k * P(2), yy), (x + w / 2 - k * P(2), yy)], fill=(150, 104, 56), width=P(3))
    for k in range(1, 7):
        xx = x - w / 2 + k * w / 7
        d.line([(xx, y - h), (xx - (xx - x) * 0.16, y)], fill=(166, 118, 64), width=P(2))
    if e.get("cloth", True):
        d.polygon([(x - w * 0.3, y - h), (x - w * 0.05, y - h - P(18)), (x + w * 0.2, y - h)], fill=(196, 58, 52))

def _food(img, e, draw_fn, size):
    s = P(e.get("s", size))
    g = Image.new("RGBA", (int(s * 2.4), int(s * 2.4)), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(g), g.width / 2, g.height / 2, s)
    if e.get("rot"):
        g = g.rotate(e["rot"], expand=True, resample=Image.BICUBIC)
    img.alpha_composite(g, (int(P(e["x"]) - g.width / 2), int(P(e["y"]) - g.height / 2)))

def el_sandwich(img, d, e):
    """A jam sandwich (bread, red jam, bread). drip=true adds jam drips below it."""
    def f(g, cx, cy, s):
        for dy, col in ((s * 0.22, (232, 196, 140)), (0, (196, 40, 60)), (-s * 0.22, (240, 206, 150))):
            g.rounded_rectangle([cx - s, cy + dy - s * 0.16, cx + s, cy + dy + s * 0.16], radius=int(s * 0.14),
                                fill=col, outline=INK if col[0] > 220 else None, width=max(1, int(s * 0.04)))
        if e.get("drip"):
            for k in (-0.5, 0.1, 0.6):
                g.rounded_rectangle([cx + k * s - s * 0.07, cy, cx + k * s + s * 0.07, cy + s * (0.6 + abs(k) * 0.5)], radius=int(s * 0.07), fill=(196, 40, 60))
    _food(img, e, f, 50)

def el_cupcake(img, d, e):
    def f(g, cx, cy, s):
        g.polygon([(cx - s * 0.6, cy), (cx + s * 0.6, cy), (cx + s * 0.45, cy + s * 0.7), (cx - s * 0.45, cy + s * 0.7)], fill=(120, 170, 210), outline=INK)
        for k in (-0.3, 0, 0.3):
            g.line([(cx + k * s, cy + s * 0.05), (cx + k * s * 0.8, cy + s * 0.65)], fill=(90, 140, 186), width=max(1, int(s * 0.05)))
        for r, dy in ((0.66, 0), (0.5, -0.28), (0.3, -0.52)):
            g.ellipse([cx - s * r, cy + s * dy - s * 0.26, cx + s * r, cy + s * dy + s * 0.18], fill=(246, 164, 196), outline=(210, 110, 150), width=max(1, int(s * 0.04)))
        g.ellipse([cx - s * 0.13, cy - s * 0.95, cx + s * 0.13, cy - s * 0.7], fill=(210, 40, 50))
    _food(img, e, f, 40)

def el_grapes(img, d, e):
    def f(g, cx, cy, s):
        rnd = random.Random(e.get("seed", 8))
        g.line([(cx, cy - s * 0.9), (cx + s * 0.12, cy - s * 1.15)], fill=(110, 80, 40), width=max(2, int(s * 0.08)))
        for row, n in enumerate((4, 3, 3, 2, 1)):
            for k in range(n):
                gx = cx + (k - (n - 1) / 2) * s * 0.34 + rnd.uniform(-s * 0.03, s * 0.03)
                gy = cy - s * 0.7 + row * s * 0.3
                g.ellipse([gx - s * 0.2, gy - s * 0.2, gx + s * 0.2, gy + s * 0.2], fill=(150, 196, 80), outline=(96, 140, 50), width=max(1, int(s * 0.04)))
                g.ellipse([gx - s * 0.1, gy - s * 0.12, gx - s * 0.02, gy - s * 0.04], fill=(214, 236, 170))
    _food(img, e, f, 50)

def el_cheese(img, d, e):
    def f(g, cx, cy, s):
        g.polygon([(cx - s, cy + s * 0.4), (cx + s, cy + s * 0.4), (cx + s, cy - s * 0.3), (cx - s * 0.6, cy - s * 0.5)], fill=(248, 206, 84), outline=(190, 140, 40), width=max(1, int(s * 0.05)))
        g.polygon([(cx - s * 0.6, cy - s * 0.5), (cx + s, cy - s * 0.3), (cx + s * 0.7, cy - s * 0.62)], fill=(252, 226, 130), outline=(190, 140, 40))
        for hx, hy, r in ((-0.4, 0.05, 0.12), (0.2, 0.15, 0.09), (0.6, -0.05, 0.11), (-0.05, -0.15, 0.07)):
            g.ellipse([cx + hx * s - r * s, cy + hy * s - r * s, cx + hx * s + r * s, cy + hy * s + r * s], fill=(222, 170, 56))
    _food(img, e, f, 50)

def el_splat(img, d, e):
    """A squashed blob (a sat-on cupcake or grape)."""
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 40))
    col = tuple(e.get("color", (246, 164, 196)))
    rnd = random.Random(e.get("seed", 4))
    d.ellipse([x - s, y - s * 0.35, x + s, y + s * 0.35], fill=col)
    for _ in range(6):
        a = rnd.uniform(0, 2 * math.pi); r = s * rnd.uniform(1.1, 1.5)
        d.ellipse([x + math.cos(a) * r - s * 0.12, y + math.sin(a) * r * 0.4 - s * 0.1, x + math.cos(a) * r + s * 0.12, y + math.sin(a) * r * 0.4 + s * 0.1], fill=col)

def el_bubble(img, d, e):
    """Soap bubbles from Juneafur's bubble blower. n > 1 scatters a cloud of them."""
    rnd = random.Random(e.get("seed", 6))
    n = int(e.get("n", 1))
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
    for i in range(n):
        if n == 1:
            x, y, r = P(e["x"]), P(e["y"]), P(e.get("r", 40))
        else:
            x = P(e["x"]) + rnd.uniform(-P(e.get("spread", 120)), P(e.get("spread", 120)))
            y = P(e["y"]) + rnd.uniform(-P(e.get("spread", 120)) * 0.6, P(e.get("spread", 120)) * 0.6)
            r = P(e.get("r", 40)) * rnd.uniform(0.4, 1.0)
        ld.ellipse([x - r, y - r, x + r, y + r], fill=(220, 240, 255, 70), outline=(120, 170, 220, 235), width=max(P(2), int(r * 0.07)))
        ld.arc([x - r * 0.8, y - r * 0.8, x + r * 0.8, y + r * 0.8], 200, 250, fill=(255, 255, 255, 240), width=max(2, int(r * 0.12)))
        ld.arc([x - r * 0.9, y - r * 0.9, x + r * 0.9, y + r * 0.9], 20, 60, fill=(250, 190, 230, 200), width=max(2, int(r * 0.06)))
    img.alpha_composite(layer)

def el_pop(img, d, e):
    """A bubble popping: a burst of lines and droplets."""
    x, y, s = P(e["x"]), P(e["y"]), P(e.get("s", 50))
    for a in range(0, 360, 30):
        t = math.radians(a + 15)
        d.line([(x + math.cos(t) * s * 0.45, y + math.sin(t) * s * 0.45), (x + math.cos(t) * s, y + math.sin(t) * s)], fill=(255, 255, 255), width=P(4))
        d.ellipse([x + math.cos(t) * s * 1.2 - P(4), y + math.sin(t) * s * 1.2 - P(4), x + math.cos(t) * s * 1.2 + P(4), y + math.sin(t) * s * 1.2 + P(4)], fill=(180, 214, 244))

def el_ants(img, d, e):
    """A line of ants. x, y = the first ant; dx, dy = step; carry = "sandwich" puts the sandwich on their backs."""
    n, s = int(e.get("n", 10)), P(e.get("s", 9))
    pts = [(P(e["x"] + i * e.get("dx", 28)), P(e["y"] + i * e.get("dy", 0))) for i in range(n)]
    if e.get("carry") == "sandwich":
        mx = sum(p[0] for p in pts[2:n - 2]) / max(1, n - 4); my = sum(p[1] for p in pts[2:n - 2]) / max(1, n - 4)
        el_sandwich(img, d, {"x": mx / S, "y": my / S - e.get("s", 9) * 3.2, "s": e.get("carryS", 60), "rot": e.get("carryRot", 0)})
        d = ImageDraw.Draw(img)
    for x, y in pts:
        for k in (-1, 0, 1):
            d.line([(x + k * s * 0.9, y), (x + k * s * 1.3, y + s * 1.1)], fill=(40, 26, 20), width=P(2))
        for k, r in ((-1.1, 0.55), (0, 0.45), (1.0, 0.7)):
            d.ellipse([x + k * s - r * s, y - r * s, x + k * s + r * s, y + r * s], fill=(52, 32, 24))
        d.line([(x - s * 1.5, y - s * 0.3), (x - s * 2.1, y - s * 1.1)], fill=(40, 26, 20), width=P(2))

def el_bucket(img, d, e):
    """Zoe's feed bucket. tip (degrees) tips it; spill=true pours snacks out of it."""
    s = P(e.get("s", 110))
    g = Image.new("RGBA", (int(s * 2), int(s * 2)), (0, 0, 0, 0)); gd = ImageDraw.Draw(g); cx, cy = s, s
    gd.polygon([(cx - s * 0.5, cy - s * 0.5), (cx + s * 0.5, cy - s * 0.5), (cx + s * 0.4, cy + s * 0.5), (cx - s * 0.4, cy + s * 0.5)], fill=(170, 176, 180), outline=(96, 100, 106), width=P(3))
    gd.ellipse([cx - s * 0.5, cy - s * 0.6, cx + s * 0.5, cy - s * 0.4], fill=(120, 124, 130), outline=(96, 100, 106), width=P(3))
    gd.arc([cx - s * 0.5, cy - s * 1.1, cx + s * 0.5, cy - s * 0.1], 180, 360, fill=(96, 100, 106), width=P(4))
    gd.line([(cx - s * 0.3, cy - s * 0.3), (cx - s * 0.25, cy + s * 0.4)], fill=(210, 214, 218), width=P(5))
    g = g.rotate(e.get("tip", 0), expand=True, resample=Image.BICUBIC)
    img.alpha_composite(g, (int(P(e["x"]) - g.width / 2), int(P(e["y"]) - g.height / 2)))

def el_snacks(img, d, e):
    """Zoe's treats spread out: nuts, seeds, carrot sticks and berries."""
    rnd = random.Random(e.get("seed", 12))
    x, y, sp = P(e["x"]), P(e["y"]), P(e.get("spread", 200))
    ys = e.get("ys", 0.3)
    for _ in range(int(e.get("n", 40))):
        px_, py_ = x + rnd.uniform(-sp, sp), y + rnd.uniform(-sp * ys, sp * ys)
        k = rnd.random()
        if k < 0.3:     # nut
            acorn(d, px_, py_, P(9), rnd.uniform(-2, 2))
        elif k < 0.55:  # berry
            r = P(rnd.uniform(6, 9))
            d.ellipse([px_ - r, py_ - r, px_ + r, py_ + r], fill=rnd.choice([(170, 40, 70), (90, 60, 150), (200, 50, 50)]), outline=INK, width=1)
        elif k < 0.75:  # carrot stick
            a = rnd.uniform(0, math.pi); L = P(20)
            d.line([(px_ - math.cos(a) * L, py_ - math.sin(a) * L * 0.4), (px_ + math.cos(a) * L, py_ + math.sin(a) * L * 0.4)], fill=(240, 140, 50), width=P(7))
        else:           # seeds
            for _ in range(4):
                sx, sy = px_ + rnd.uniform(-P(10), P(10)), py_ + rnd.uniform(-P(5), P(5))
                d.ellipse([sx - P(3), sy - P(2), sx + P(3), sy + P(2)], fill=(226, 206, 150))

def el_plan(img, d, e):
    """Tansy's plan scratched on a piece of bark: numbered steps (no words, just 1–4 and squiggles)."""
    w = P(e.get("w", 200)); h = w * 1.2
    m = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0)); md = ImageDraw.Draw(m)
    md.polygon([(w * 0.05, h * 0.04), (w * 0.95, 0), (w, h * 0.96), (w * 0.08, h)], fill=(196, 156, 104), outline=INK)
    f = font(int(w / 7))
    for i in range(4):
        yy = h * (0.12 + i * 0.21)
        md.text((w * 0.14, yy), f"{i + 1}", fill=INK, font=f)
        md.line(wavy(w * 0.34, w * 0.86, yy + w * 0.08, w * 0.02, 3, i, 20), fill=INK, width=max(2, int(w / 60)))
    m = m.rotate(e.get("rot", 0), expand=True, resample=Image.BICUBIC)
    img.alpha_composite(m, (int(P(e["x"]) - m.width / 2), int(P(e["y"]) - m.height / 2)))


def el_emblem(img, d, e, circle):
    em = Image.open(ROOT / f"images/web/circles/circle-{circle.lower()}.webp").convert("RGBA")
    s = P(e.get("s", 46))
    em = em.resize((s, int(em.height * s / em.width)), Image.LANCZOS)
    em = ImageEnhance.Brightness(em).enhance(0.8)
    a = em.split()[3].point(lambda v: int(v * e.get("opacity", 0.45)))
    em.putalpha(a)
    img.alpha_composite(em, (P(e["x"]) - em.width // 2, P(e["y"]) - em.height // 2))

ELEMENTS = {k[3:]: v for k, v in globals().items() if k.startswith("el_") and k != "el_emblem"}

# ---------------------------------------------------------------- build
def render(scene, circle):
    img = Image.new("RGBA", (W * S, H * S), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    has_emblem = False
    for e in scene["elements"]:
        if e["type"] == "emblem":
            el_emblem(img, d, e, circle); has_emblem = True
        else:
            ELEMENTS[e["type"]](img, d, e)
        d = ImageDraw.Draw(img)
    if not has_emblem:
        raise SystemExit("every scene needs an emblem element (the Circle symbol, small and in the background)")
    return img.convert("RGB").resize((W, H), Image.LANCZOS)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    if not args:
        raise SystemExit(__doc__)
    book_dir = ROOT / args[0]
    spec = json.loads((book_dir / "scenes.json").read_text())
    book = json.loads((book_dir / "book.json").read_text())
    out = book_dir / "images"
    out.mkdir(exist_ok=True)
    for name, scene in spec["scenes"].items():
        if only and name != only:
            continue
        render(scene, book["circle"]).save(out / f"{name}.webp", "WEBP", quality=82, method=6)
        print("wrote", (out / f"{name}.webp").relative_to(ROOT))

if __name__ == "__main__":
    main()
