"""Generate the Open Graph share image for the landing page.

Brand-matched: dark base, the signature diagonal hairline grid, an accent
blade slash and the KATANA wordmark with the value proposition. Output is a
1200x630 PNG (the standard OG/Twitter card size) written to static/og.png.

Run: python landing/scripts/make-og-image.py
Requires Pillow (already available in the environment).
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Brand tokens (mirrors src/lib/design/tokens.css).
BG = (14, 14, 16)            # --katana-bg-base
PRIMARY = (236, 236, 238)    # --katana-text-primary
SECONDARY = (168, 168, 176)  # --katana-text-secondary
MUTED = (110, 110, 120)      # --katana-text-muted
ACCENT = (255, 92, 77)       # --katana-accent

W, H = 1200, 630
PAD = 80
GRID_SPACING = 34            # matches the landing .grid-bg
GRID_ALPHA = 16              # ~0.06, a touch stronger than on-page for legibility

FONTS = Path("C:/Windows/Fonts")


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def tracked_text(draw, xy, text, fnt, fill, tracking=0):
    """Draw text with extra letter spacing; returns the total width."""
    x, y = xy
    start = x
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return x - tracking - start


def build():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Diagonal hairline grid (-45deg), drawn on an overlay then composited.
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # Lines of the form x + y = c, stepped by the grid spacing along the normal.
    step = GRID_SPACING * (2 ** 0.5)
    c = -H
    while c < W + H:
        od.line([(c, 0), (c + H, H)], fill=(255, 255, 255, GRID_ALPHA), width=2)
        c += step
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Accent blade: a bold diagonal slash at the blade angle, upper-right.
    bx, by = 980, 150
    blade_len = 230
    for off in range(-6, 7):
        draw.line(
            [(bx + off, by + blade_len), (bx + blade_len + off, by)],
            fill=ACCENT,
            width=2,
        )

    # Wordmark.
    mark = font("arialbd.ttf", 150)
    tracked_text(draw, (PAD, 150), "KATANA", mark, PRIMARY, tracking=6)

    # Accent underline tying the mark to the blade angle.
    draw.line([(PAD + 4, 330), (PAD + 470, 330)], fill=ACCENT, width=6)

    # Value proposition (the keyword-bearing line).
    lead = font("segoeuib.ttf", 46)
    draw.text((PAD, 372), "A free, open source video editor", font=lead, fill=PRIMARY)
    draw.text((PAD, 430), "for Windows & Linux", font=lead, fill=PRIMARY)

    # Supporting attributes.
    sub = font("segoeui.ttf", 30)
    draw.text(
        (PAD, 500),
        "Fast  ·  minimalist  ·  multitrack  ·  lossless export",
        font=sub,
        fill=SECONDARY,
    )

    # Domain, bottom-left in accent.
    dom = font("segoeui.ttf", 26)
    draw.text((PAD, H - 70), "katana.milanrother.com", font=dom, fill=ACCENT)

    out = Path(__file__).resolve().parent.parent / "static" / "og.png"
    img.save(out, "PNG")
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    build()
