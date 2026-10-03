"""Validate source sheets and rebuild the lossless WebP cutscene assets.

Run with the bundled Python/Pillow runtime. The generated PNGs are the source;
this script only changes the container format and verifies every fixed cell.
"""

from argparse import ArgumentParser
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SHEETS = (
    ("oli/oli-opening-rear-walk-v1", 48),
    ("oli/oli-opening-reactions-v1", 24),
    ("noel/noel-opening-reactions-v1", 20),
    ("milo/milo-detective-transform-v1", 48),
    ("milo/milo-detective-transform-v2-keys", 48),
    ("milo/milo-detective-transform-v2-inbetweens", 48),
    ("milo/milo-opening-left-walk-v1", 48),
)
DEST = ROOT / "assets/images/detective/starlight"
SOURCE = ROOT / "docs/world/art/characters"
CELL = 512


def bounds(image: Image.Image, threshold: int = 16) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    box = mask.getbbox()
    if box is None:
        raise ValueError("empty frame")
    left, top, right, bottom = box
    return left, top, right - 1, bottom - 1


def validate(image: Image.Image, name: str, padding: int) -> None:
    if image.size != (1536, 1024) or image.mode != "RGBA":
        raise ValueError(f"{name}: expected 1536x1024 RGBA, got {image.size} {image.mode}")
    for index in range(6):
        x, y = index % 3 * CELL, index // 3 * CELL
        frame = image.crop((x, y, x + CELL, y + CELL))
        left, top, right, bottom = bounds(frame)
        if min(left, top, CELL - 1 - right, CELL - 1 - bottom) < padding:
            raise ValueError(f"{name} frame {index}: unsafe alpha bounds {(left, top, right, bottom)}")
        print(f"{name} frame {index}: {(left, top, right, bottom)}")


def preview(image: Image.Image, name: str) -> None:
    target_dir = ROOT / ".art-output/starlight-opening-qa"
    target_dir.mkdir(parents=True, exist_ok=True)
    contact = Image.new("RGBA", (768, 512), "#eee6db")
    draw = ImageDraw.Draw(contact)
    for index in range(6):
        x, y = index % 3 * 256, index // 3 * 256
        for cy in range(0, 256, 32):
            for cx in range(0, 256, 32):
                if (cx // 32 + cy // 32) % 2:
                    draw.rectangle((x + cx, y + cy, x + cx + 31, y + cy + 31), fill="#cfc8bf")
        frame = image.crop((index % 3 * CELL, index // 3 * CELL,
                            (index % 3 + 1) * CELL, (index // 3 + 1) * CELL))
        contact.alpha_composite(frame.resize((256, 256)), (x, y))
        draw.text((x + 8, y + 8), str(index), fill="#16121d")
    contact.convert("RGB").save(target_dir / f"{name}.jpg", quality=92)


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--preview", action="store_true", help="write temporary per-cell contact sheets")
    args = parser.parse_args()
    for stem, padding in SHEETS:
        source = SOURCE / f"{stem}.png"
        image = Image.open(source).convert("RGBA")
        validate(image, source.name, padding)
        if args.preview:
            preview(image, Path(stem).name)
        target = DEST / f"{Path(stem).name}.webp"
        image.save(target, "WEBP", lossless=True, method=6)
        with Image.open(target) as converted:
            validate(converted.convert("RGBA"), target.name, padding)
    print("All source and runtime cells passed.")


if __name__ == "__main__":
    main()
