"""Generates the Navodaya (JNVST Class 6) Mental Ability figure questions as SVG drawings.

    python scripts/daily-quiz/make_navodaya_figures.py      # writes banks-navodaya-figures.json

The JNVST Mental Ability Test is entirely non-verbal. Following its syllabus:
    NAV-MAT1  Pattern Completion · Figure Series Completion · Geometrical Figure Completion
    NAV-MAT2  Mirror Image · Water Image · Embedded Figure
Every question is built from rules (reflections, rotations, counts), so the correct answer is right by
construction and the three wrong options are always visibly different. Output is deterministic (fixed
seed), so re-running gives the same file. Banks are append-only once uploaded: to add more questions,
raise the counts below and keep the seed, so the existing questions come out first and unchanged.
"""
import json
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
INK = "#0f3d2e"
FRAME = "#94a3b8"


def svg(inner, w=100, h=100, frame=True):
    border = f'<rect x="1" y="1" width="{w - 2}" height="{h - 2}" rx="6" fill="#fff" stroke="{FRAME}" stroke-width="2"/>' if frame else f'<rect width="{w}" height="{h}" fill="#fff"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{border}{inner}</svg>'


def g(inner, transform=""):
    return f'<g transform="{transform}">{inner}</g>' if transform else inner


def frames(cells, last="?"):
    """A strip of figures with a final '?' box (figure series)."""
    inner = "".join(
        f'<g transform="translate({i * 100},0)"><rect x="3" y="3" width="94" height="94" rx="6" fill="#fff" stroke="{FRAME}" stroke-width="2"/>{c}</g>'
        for i, c in enumerate(cells)
    )
    n = len(cells)
    inner += f'<g transform="translate({n * 100},0)"><rect x="3" y="3" width="94" height="94" rx="6" fill="#f1f5f9" stroke="{FRAME}" stroke-width="2" stroke-dasharray="6 4"/><text x="50" y="64" font-size="40" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle" fill="{FRAME}">{last}</text></g>'
    return svg(inner, (n + 1) * 100, 100, frame=False)


# ---------------- shapes ----------------
def polygon(n, r=30, cx=50, cy=50, rot=-90, fill="none"):
    pts = " ".join(f"{cx + r * math.cos(math.radians(rot + i * 360 / n)):.1f},{cy + r * math.sin(math.radians(rot + i * 360 / n)):.1f}" for i in range(n))
    return f'<polygon points="{pts}" fill="{fill}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'


def arrow(angle):
    return g(
        f'<line x1="50" y1="80" x2="50" y2="24" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
        f'<polygon points="50,12 36,32 64,32" fill="{INK}"/>',
        f"rotate({angle} 50 50)",
    )


def dots(n):
    cols = 3
    out = ""
    for i in range(n):
        x = 25 + (i % cols) * 25
        y = 25 + (i // cols) * 25
        out += f'<circle cx="{x}" cy="{y}" r="8" fill="{INK}"/>'
    return out


def quad_shade(pos):
    """Square split into four; one quarter shaded (0 TL, 1 TR, 2 BR, 3 BL: clockwise)."""
    xy = [(15, 15), (50, 15), (50, 50), (15, 50)][pos % 4]
    return (
        f'<rect x="{xy[0]}" y="{xy[1]}" width="35" height="35" fill="{INK}"/>'
        f'<rect x="15" y="15" width="70" height="70" fill="none" stroke="{INK}" stroke-width="4"/>'
        f'<line x1="50" y1="15" x2="50" y2="85" stroke="{INK}" stroke-width="3"/><line x1="15" y1="50" x2="85" y2="50" stroke="{INK}" stroke-width="3"/>'
    )


RING = [(20, 20), (50, 20), (80, 20), (80, 50), (80, 80), (50, 80), (20, 80), (20, 50)]


def ring_dot(pos):
    """A dot moving round the eight edge points of a square."""
    x, y = RING[pos % 8]
    return f'<rect x="20" y="20" width="60" height="60" fill="none" stroke="{INK}" stroke-width="3"/><circle cx="{x}" cy="{y}" r="9" fill="{INK}"/>'


# Asymmetric motifs (no mirror or rotational symmetry), drawn in the top-left-oriented 100x100 box.
MOTIFS = [
    f'<line x1="25" y1="15" x2="25" y2="85" stroke="{INK}" stroke-width="5" stroke-linecap="round"/><polygon points="25,15 68,28 25,41" fill="{INK}"/>',  # flag
    f'<line x1="22" y1="78" x2="70" y2="30" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><polygon points="80,20 54,28 72,46" fill="{INK}"/>',  # diagonal arrow
    f'<polyline points="20,20 20,75 58,75" fill="none" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><circle cx="70" cy="30" r="8" fill="{INK}"/>',  # L + dot
    f'<path d="M12,12 L62,12 A50,50 0 0,1 12,62 Z" fill="{INK}"/><rect x="66" y="66" width="16" height="16" fill="none" stroke="{INK}" stroke-width="4"/>',  # quarter disc + box
    f'<polygon points="15,15 72,15 15,52" fill="{INK}"/><circle cx="74" cy="74" r="9" fill="none" stroke="{INK}" stroke-width="4"/>',  # corner triangle + ring
    f'<rect x="18" y="18" width="34" height="18" fill="{INK}"/><rect x="18" y="44" width="18" height="38" fill="none" stroke="{INK}" stroke-width="4"/><circle cx="72" cy="62" r="6" fill="{INK}"/>',  # blocks
]
REFLECT = {"same": "", "h": "translate(100,0) scale(-1,1)", "v": "translate(0,100) scale(1,-1)", "hv": "translate(100,100) scale(-1,-1)"}
ROTATE = {0: "", 90: "rotate(90 50 50)", 180: "rotate(180 50 50)", 270: "rotate(270 50 50)"}


def quadrant(motif, transform):
    return g(motif, transform)


def pattern_question(motif, style, missing):
    """2x2 pattern with one quarter missing. style 'mirror': reflections; 'turn': quarter turns clockwise."""
    if style == "mirror":
        cells = [REFLECT["same"], REFLECT["h"], REFLECT["hv"], REFLECT["v"]]  # TL, TR, BR, BL
        pool = list(REFLECT.values())
    else:
        cells = [ROTATE[0], ROTATE[90], ROTATE[180], ROTATE[270]]
        pool = list(ROTATE.values())
    offs = [(0, 0), (100, 0), (100, 100), (0, 100)]
    inner = ""
    for i, (x, y) in enumerate(offs):
        if i == missing:
            inner += f'<g transform="translate({x},{y})"><rect x="4" y="4" width="92" height="92" fill="#f1f5f9" stroke="{FRAME}" stroke-width="2" stroke-dasharray="6 4"/><text x="50" y="64" font-size="40" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle" fill="{FRAME}">?</text></g>'
        else:
            inner += f'<g transform="translate({x},{y})">{quadrant(motif, cells[i])}</g>'
    inner += f'<rect x="2" y="2" width="196" height="196" fill="none" stroke="{INK}" stroke-width="3"/><line x1="100" y1="2" x2="100" y2="198" stroke="{FRAME}" stroke-width="2"/><line x1="2" y1="100" x2="198" y2="100" stroke="{FRAME}" stroke-width="2"/>'
    fig = svg(inner, 200, 200, frame=False)
    correct = svg(quadrant(motif, cells[missing]))
    wrong = [svg(quadrant(motif, t)) for t in pool if t != cells[missing]]
    return {"q": "Pattern completion: which figure completes the pattern?", "fig": fig, "a": [correct, *wrong]}


def series_questions(rng):
    out = []
    # rotating arrow
    for start, step in [(0, 90), (45, 90), (0, 45), (90, 45), (30, 60), (0, 135)]:
        cells = [arrow(start + i * step) for i in range(4)]
        ans = start + 4 * step
        cands = [ans + d for d in (step, 2 * step, 180, 90, 45, -45, -90)]
        wrong = []
        for c in cands:
            if c % 360 != ans % 360 and all(c % 360 != w % 360 for w in wrong):
                wrong.append(c)
            if len(wrong) == 3:
                break
        out.append({"q": "Figure series: which figure comes next?", "fig": frames(cells), "a": [svg(arrow(ans)), *[svg(arrow(w)) for w in wrong]]})
    # growing dots
    for n in (1, 2, 3):
        cells = [dots(n + i) for i in range(4)]
        k = n + 4
        out.append({"q": "Figure series: which figure comes next?", "fig": frames(cells), "a": [svg(dots(k)), svg(dots(k - 1)), svg(dots(k + 1)), svg(dots(k - 2))]})
    # more sides each time
    for n in (3, 4):
        cells = [polygon(n + i) for i in range(4)]
        k = n + 4
        out.append({"q": "Figure series: which figure comes next?", "fig": frames(cells), "a": [svg(polygon(k)), svg(polygon(k - 1)), svg(polygon(k + 1)), svg(polygon(k - 2))]})
    # shaded quarter moving clockwise / anticlockwise
    for start, d in [(0, 1), (2, -1), (1, 2)]:
        cells = [quad_shade(start + i * d) for i in range(4)]
        ans = (start + 4 * d) % 4
        out.append({"q": "Figure series: which figure comes next?", "fig": frames(cells), "a": [svg(quad_shade(ans)), *[svg(quad_shade(p)) for p in range(4) if p != ans]]})
    # dot moving round a square
    for start, d in [(0, 1), (0, 2), (3, 3), (7, -1)]:
        cells = [ring_dot(start + i * d) for i in range(4)]
        ans = (start + 4 * d) % 8
        wrong = [(ans + o) % 8 for o in (1, 4, 6)]
        out.append({"q": "Figure series: which figure comes next?", "fig": frames(cells), "a": [svg(ring_dot(ans)), *[svg(ring_dot(w)) for w in wrong]]})
    return out


def sector_path(a0, sweep, r=38, cx=50, cy=50):
    a1 = a0 + sweep
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    large = 1 if sweep > 180 else 0
    return f"M{cx},{cy} L{x0:.1f},{y0:.1f} A{r},{r} 0 {large},1 {x1:.1f},{y1:.1f} Z"


def geometry_questions():
    out = []
    # circle with a missing slice
    for a0, sweep, others in [(-90, 90, (60, 135, 180)), (0, 60, (90, 120, 30)), (180, 120, (90, 60, 180)), (-45, 45, (90, 120, 20)), (30, 180, (120, 90, 240))]:
        rest = sector_path(a0 + sweep, 360 - sweep)
        fig = svg(f'<path d="{rest}" fill="{INK}" stroke="{INK}" stroke-width="2"/><path d="{sector_path(a0, sweep)}" fill="#f1f5f9" stroke="{FRAME}" stroke-width="2" stroke-dasharray="5 4"/>', 100, 100)
        piece = lambda s: svg(f'<path d="{sector_path(a0, s)}" fill="{INK}" stroke="{INK}" stroke-width="2"/>')
        out.append({"q": "Geometrical figure completion: which piece completes the circle?", "fig": fig, "a": [piece(sweep), *[piece(s) for s in others]]})
    # square with a missing corner triangle
    for k, corner in [(40, "tr"), (55, "bl"), (30, "br")]:
        tri = {
            "tr": lambda s: f"{85 - s},15 85,15 85,{15 + s}",
            "bl": lambda s: f"15,{85 - s} 15,85 {15 + s},85",
            "br": lambda s: f"85,{85 - s} 85,85 {85 - s},85",
        }[corner]
        flipped = {
            "tr": lambda s: f"{85 - s},15 {85 - s},{15 + s} 85,{15 + s}",
            "bl": lambda s: f"15,{85 - s} {15 + s},{85 - s} {15 + s},85",
            "br": lambda s: f"85,{85 - s} {85 - s},{85 - s} {85 - s},85",
        }[corner]
        sq = f'<rect x="15" y="15" width="70" height="70" fill="{INK}"/><polygon points="{tri(k)}" fill="#f1f5f9" stroke="{FRAME}" stroke-width="2" stroke-dasharray="5 4"/>'
        fig = svg(sq)
        opt = lambda pts: svg(f'<polygon points="{pts}" fill="{INK}"/>')
        other = 20 if k > 35 else 55
        out.append(
            {
                "q": "Geometrical figure completion: which piece completes the square?",
                "fig": fig,
                "a": [opt(tri(k)), opt(tri(other)), opt(flipped(k)), svg(f'<rect x="{50 - k // 2}" y="{50 - k // 2}" width="{k}" height="{k}" fill="{INK}"/>')],
            }
        )
    return out


def text_fig(s, transform="", w=170):
    t = f'<text x="{w // 2}" y="62" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="700" text-anchor="middle" fill="{INK}">{s}</text>'
    return g(t, transform)


def mirror_questions(words, kind):
    w = 170
    flips = {"mirror": f"translate({w},0) scale(-1,1)", "water": "translate(0,100) scale(1,-1)", "turn": f"translate({w},100) scale(-1,-1)", "same": ""}
    out = []
    for s in words:
        if kind == "mirror":
            fig = svg(text_fig(s, w=w) + f'<line x1="{w - 8}" y1="8" x2="{w - 8}" y2="92" stroke="{FRAME}" stroke-width="3" stroke-dasharray="6 4"/>', w, 100)
            q = "Mirror image: a mirror is placed on the dotted line. Which is the mirror image?"
        else:
            fig = svg(text_fig(s, w=w) + f'<line x1="8" y1="92" x2="{w - 8}" y2="92" stroke="#38bdf8" stroke-width="4" stroke-dasharray="6 4"/>', w, 100)
            q = "Water image: water is below the dotted line. Which is the water image?"
        order = [kind, "water" if kind == "mirror" else "mirror", "turn", "same"]
        out.append({"q": q, "fig": fig, "a": [svg(text_fig(s, flips[o], w), w, 100) for o in order]})
    return out


# Embedded figures: simple outline shapes drawn about the centre.
SHAPES = {
    "triangle": lambda r: polygon(3, r),
    "square": lambda r: polygon(4, r, rot=-45),
    "diamond": lambda r: polygon(4, r, rot=-90),
    "pentagon": lambda r: polygon(5, r),
    "hexagon": lambda r: polygon(6, r, rot=0),
    "circle": lambda r: f'<circle cx="50" cy="50" r="{r}" fill="none" stroke="{INK}" stroke-width="4"/>',
    "cross": lambda r: f'<path d="M{50 - r},50 H{50 + r} M50,{50 - r} V{50 + r}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>',
    "star": lambda r: f'<polygon points="{" ".join(f"{50 + (r if i % 2 == 0 else r * 0.45) * math.cos(math.radians(-90 + i * 36)):.1f},{50 + (r if i % 2 == 0 else r * 0.45) * math.sin(math.radians(-90 + i * 36)):.1f}" for i in range(10))}" fill="none" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>',
}


def embedded_questions(rng, count):
    out = []
    names = list(SHAPES)
    seen = set()
    while len(out) < count:
        inside = rng.sample(names, 3)
        key = tuple(sorted(inside))
        if key in seen:
            continue
        seen.add(key)
        sizes = [40, 30, 20]
        fig = svg("".join(SHAPES[n](r) for n, r in zip(inside, sizes)))
        pick = rng.randrange(3)
        hidden, size = inside[pick], sizes[pick]
        wrong = rng.sample([n for n in names if n not in inside], 3)
        out.append({"q": "Embedded figure: which figure is hidden in the figure?", "fig": fig, "a": [svg(SHAPES[hidden](size)), *[svg(SHAPES[n](size)) for n in wrong]]})
    return out


def main():
    rng = random.Random(20261113)
    patterns = []
    for m, motif in enumerate(MOTIFS):
        for style in ("mirror", "turn"):
            patterns.append(pattern_question(motif, style, (m + (style == "turn") * 2) % 4))
    mat1 = patterns + series_questions(rng) + geometry_questions()
    rng.shuffle(mat1)

    mirror_words = ["RF47", "JK39", "PQ26", "EL74", "BRG3", "FJ58", "CK29", "GD61", "LP84", "QR52", "JNV6", "KF73"]
    water_words = ["RF39", "JL47", "PG25", "FK64", "BQ72", "LJ83", "GR15", "KP96", "EJ47", "CF28"]
    mat2 = mirror_questions(mirror_words, "mirror") + mirror_questions(water_words, "water") + embedded_questions(rng, 10)
    rng.shuffle(mat2)

    for bank in (mat1, mat2):
        for q in bank:
            assert len(set(q["a"])) == 4, q["q"]
    out = [{"id": "NAV-MAT1", "questions": mat1}, {"id": "NAV-MAT2", "questions": mat2}]
    path = os.path.join(HERE, "banks-navodaya-figures.json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"NAV-MAT1: {len(mat1)} questions, NAV-MAT2: {len(mat2)} questions -> {path}")


if __name__ == "__main__":
    main()
