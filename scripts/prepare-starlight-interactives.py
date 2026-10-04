"""Prepare the starlight case's independent objects and shared detective icons.

Generated PNG masters live in docs/world/art/detective; this script only makes
uniform, padded WebP runtime images. Each cutout is one complete frame.
"""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/world/art/detective"
RUNTIME = ROOT / "assets/images/detective"

STORY_ITEMS = (
    "duty-slip-v1",
    "returned-envelope-v1",
    "lantern-route-chart-v1",
    "hood-maintenance-note-v1",
    "nightflower-field-note-v1",
    "star-route-tag-v1",
    "scratched-clasp-v1",
    "pollen-vial-v1",
    "old-postmark-slip-v1",
)
SHARED_ICONS = ("magnifier-v1", "drag-hand-v1")
SCENES = (
    "keeper-hut-cleared-v1",
    "trail-interactive-v1",
    "keeper-hut-interactive-v1",
    "nightflower-slope-interactive-v1",
    "postal-bridge-interactive-v1",
)


def cutout(group: str, name: str, size: int, inset: int) -> None:
    source = Image.open(SOURCE / group / f"{name}.png").convert("RGBA")
    output = Image.new("RGBA", (size, size))
    extent = size - 2 * inset
    # Generated masters contain near-zero alpha noise far outside the painted
    # object. Crop by the visible silhouette, then retain an extra margin for
    # soft shadow and glow before fitting the complete cutout in one frame.
    visible = source.getchannel("A").point(lambda alpha: 255 if alpha > 1 else 0).getbbox()
    assert visible, f"{name} has no visible pixels"
    margin = round(source.width * 0.03)
    crop = source.crop((max(0, visible[0] - margin), max(0, visible[1] - margin),
                        min(source.width, visible[2] + margin), min(source.height, visible[3] + margin)))
    crop.thumbnail((extent, extent), Image.Resampling.LANCZOS)
    output.alpha_composite(crop, ((size - crop.width) // 2, (size - crop.height) // 2))
    bounds = output.getchannel("A").getbbox()
    assert bounds and all((bounds[0] >= inset, bounds[1] >= inset,
                           bounds[2] <= size - inset, bounds[3] <= size - inset))
    destination = RUNTIME / group / f"{name}.webp"
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, "WEBP", quality=88, method=6)


def main() -> None:
    for name in SCENES:
        scene = Image.open(SOURCE / f"starlight/{name}.png").convert("RGB")
        assert abs(scene.width - 1586) <= 2 and abs(scene.height - 992) <= 2, f"{name}: unexpected scene size {scene.size}"
        scene = scene.resize((1586, 992), Image.Resampling.LANCZOS)
        scene.save(RUNTIME / f"starlight/{name}.webp", "WEBP", quality=88, method=6)
    for name in STORY_ITEMS:
        cutout("starlight", name, 512, 56)
    for name in SHARED_ICONS:
        cutout("shared", name, 128, 12)


if __name__ == "__main__":
    main()
