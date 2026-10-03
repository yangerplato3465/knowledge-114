"""Register generated 3x2 Milo frames to one scale and planted-foot baseline.

The fixed scale preserves Milo's body size while the wizard hat becomes shorter.
Run this once for each generated sheet before preparing the runtime WebP.
"""

from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


CELL = 512
SCALE = 0.76
FOOT = 450
THRESHOLD = 16


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    original = Image.open(args.source).convert("RGBA")
    if original.size != (1536, 1024):
        raise ValueError(f"Expected a 1536x1024 sheet, got {original.size}")
    registered = Image.new("RGBA", original.size)
    for index in range(6):
        col, row = index % 3, index // 3
        frame = original.crop((col * CELL, row * CELL,
                               (col + 1) * CELL, (row + 1) * CELL))
        frame.putalpha(frame.getchannel("A").point(
            lambda alpha: alpha if alpha >= THRESHOLD else 0))
        box = frame.getchannel("A").getbbox()
        if box is None:
            raise ValueError(f"Frame {index} is empty")
        figure = frame.crop(box)
        figure = figure.resize((round(figure.width * SCALE),
                                round(figure.height * SCALE)), Image.Resampling.LANCZOS)
        x = col * CELL + (CELL - figure.width) // 2
        y = row * CELL + FOOT - figure.height + 1
        if x - col * CELL < 48 or y - row * CELL < 48 or \
                x - col * CELL + figure.width > CELL - 48 or \
                y - row * CELL + figure.height > CELL - 48:
            raise ValueError(f"Frame {index} exceeds its 48px safe margin")
        registered.alpha_composite(figure, (x, y))
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    registered.save(args.destination)


if __name__ == "__main__":
    main()
