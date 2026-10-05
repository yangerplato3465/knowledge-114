"""Rebuild the shared detective UI icons from their PNG masters."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/world/art/detective/shared"
RUNTIME = ROOT / "assets/images/detective/shared"
SIZE = 128
INSET = 12


def prepare(name: str) -> None:
    source = Image.open(SOURCE / f"{name}.png").convert("RGBA")
    output = Image.new("RGBA", (SIZE, SIZE))
    visible = source.getchannel("A").point(lambda alpha: 255 if alpha > 1 else 0).getbbox()
    assert visible, f"{name} has no visible pixels"
    margin = round(source.width * 0.03)
    crop = source.crop((max(0, visible[0] - margin), max(0, visible[1] - margin),
                        min(source.width, visible[2] + margin), min(source.height, visible[3] + margin)))
    crop.thumbnail((SIZE - 2 * INSET, SIZE - 2 * INSET), Image.Resampling.LANCZOS)
    output.alpha_composite(crop, ((SIZE - crop.width) // 2, (SIZE - crop.height) // 2))
    bounds = output.getchannel("A").getbbox()
    assert bounds and bounds[0] >= INSET and bounds[1] >= INSET
    assert bounds[2] <= SIZE - INSET and bounds[3] <= SIZE - INSET
    RUNTIME.mkdir(parents=True, exist_ok=True)
    output.save(RUNTIME / f"{name}.webp", "WEBP", quality=88, method=6)


if __name__ == "__main__":
    for icon in ("magnifier-v1", "drag-hand-v1"):
        prepare(icon)
