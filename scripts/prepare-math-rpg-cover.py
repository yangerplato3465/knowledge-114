"""Encode cover layers without cropping, resizing, or changing the source artwork."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/images/math-rpg/cover'
SOURCES = {
    'background-v2.webp': 'docs/world/art/math-rpg/cover-background-v2.png',
    'liwei-standing-v1.webp': 'docs/world/art/characters/liwei/liwei-cover-standing-v1.png',
    'heen-standing-v1.webp': 'docs/world/art/characters/heen/heen-cover-standing-v1.png',
}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, source in SOURCES.items():
        image = Image.open(ROOT / source)
        target = OUTPUT / name
        if image.mode == 'RGBA':
            image.save(target, 'WEBP', lossless=True, exact=True, method=6)
            decoded = Image.open(target).convert('RGBA')
            assert decoded.size == image.size and decoded.tobytes() == image.tobytes()
            alpha = image.getchannel('A')
            assert alpha.getextrema()[0] == 0
            # Generated source has alpha=1 dust; retain it losslessly, never crop the artwork.
            assert all(alpha.crop(box).getextrema()[1] <= 1 for box in (
                (0, 0, image.width, 1), (0, image.height-1, image.width, image.height),
                (0, 0, 1, image.height), (image.width-1, 0, image.width, image.height)))
        else:
            image.save(target, 'WEBP', quality=86, method=6)
        print(f'{name}: {image.width}x{image.height}, {target.stat().st_size} bytes')


if __name__ == '__main__':
    main()
