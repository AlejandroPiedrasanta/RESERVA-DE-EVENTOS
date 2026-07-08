"""Genera los BMPs del wizard de Inno Setup desde un logo PNG.

Uso:
    python scripts/gen_wizard_bmps.py <logo.png> <out_dir>

Produce:
    <out_dir>/wizard_big.bmp    (164x314) — panel izquierdo del wizard
    <out_dir>/wizard_small.bmp  (55x58)   — icono top-right en páginas internas
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw


TOP = (139, 92, 246)      # violet-500
BOTTOM = (196, 181, 253)  # violet-300


def gradient_bg(w: int, h: int, top=TOP, bottom=BOTTOM) -> Image.Image:
    img = Image.new("RGB", (w, h), top)
    dr = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        dr.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def paste_logo(bg: Image.Image, logo: Image.Image, size: int, y: int) -> Image.Image:
    w = bg.size[0]
    l = logo.resize((size, size), Image.LANCZOS)
    bg.paste(l, ((w - size) // 2, y), l)
    return bg


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    logo_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    src = Image.open(logo_path).convert("RGBA")

    big = gradient_bg(164, 314)
    big = paste_logo(big, src, 120, 40)
    ImageDraw.Draw(big).rectangle([0, 260, 164, 314], fill=(88, 28, 135))
    big.save(out_dir / "wizard_big.bmp", format="BMP")

    small = gradient_bg(55, 58)
    small = paste_logo(small, src, 46, 6)
    small.save(out_dir / "wizard_small.bmp", format="BMP")

    print(f"OK: wrote {out_dir}/wizard_big.bmp and {out_dir}/wizard_small.bmp")


if __name__ == "__main__":
    main()
